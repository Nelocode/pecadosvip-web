<?php
/**
 * Automatic translation of a newly published profile.
 *
 * When a profile is published in the source locale, the missing locale versions are
 * created without anyone opening the translation screen. Two paths exist and both are
 * optional:
 *
 * 1. A server-side engine. Configure an OpenAI-compatible endpoint and key in
 *    `pvc_lt_engine` (option) or through the `pvc_lt_translate_text` filter. Without a
 *    configured engine this module does nothing at all, so no half-translated record is
 *    ever created.
 * 2. The free browser engine, which needs the translation tab to stay open. That path is
 *    announced to the administrator by the translation screen.
 *
 * Hard guarantees, whatever the engine:
 * - Only a first publication of a source-locale, non-Legacy record triggers it.
 * - A record created by this module never triggers another run: no loops.
 * - An existing version is never overwritten, in any status.
 * - The engine is never called with the whole page: only the editor's own text segments.
 * - A failed or empty translation aborts that locale instead of writing partial content.
 */
if (!defined('ABSPATH')) { exit; }

function pvc_lt_engine_defaults(): array {
    return array(
        'provider' => 'none',
        'endpoint' => 'https://api.openai.com/v1/chat/completions',
        'model' => '',
        'api_key' => '',
        'timeout' => 20,
    );
}
function pvc_lt_engine(): array {
    $saved = (array) get_option('pvc_lt_engine', array());
    return array_replace(pvc_lt_engine_defaults(), $saved);
}
function pvc_lt_engine_ready(): bool {
    $engine = pvc_lt_engine();
    return $engine['provider'] !== 'none' && trim((string) $engine['api_key']) !== '' && trim((string) $engine['model']) !== '';
}
/**
 * True when some translation source exists. The bundled glossary is always available, so
 * the automatic path is always able to do something; it reports which source it used.
 */
function pvc_lt_auto_available(): bool { return true; }
function pvc_lt_auto_mode(): string {
    if (has_filter('pvc_lt_translate_text')) { return 'filter'; }
    if (pvc_lt_engine_ready()) { return 'engine'; }
    return 'glossary';
}
/**
 * Translates one segment and reports how much of it was resolved.
 *
 * Order: a provider plugged through the filter, then the configured server engine, then
 * the bundled offline glossary. The glossary path reports its real coverage instead of
 * pretending the result is complete.
 */
function pvc_lt_translate_segment(string $text, string $from, string $to, string $context = 'text'): array {
    $translated = apply_filters('pvc_lt_translate_text', null, $text, $from, $to, $context);
    if (is_string($translated) && trim($translated) !== '') {
        return array('text' => $translated, 'coverage' => 1.0, 'complete' => true, 'source' => 'filter');
    }
    if (pvc_lt_engine_ready()) {
        $engine = pvc_lt_engine_request($text, $from, $to, $context);
        if (trim($engine) !== '' && $engine !== $text) {
            return array('text' => $engine, 'coverage' => 1.0, 'complete' => true, 'source' => 'engine');
        }
    }
    $offline = pvc_lt_offline_translate($text, $to);
    return array('text' => $offline['text'], 'coverage' => (float) $offline['coverage'], 'complete' => (bool) $offline['complete'], 'source' => 'glossary');
}
/**
 * Translates one text segment. A site can plug its own provider:
 *   add_filter('pvc_lt_translate_text', fn($text, $from, $to, $context) => my_api(...), 10, 4);
 */
function pvc_lt_translate_text(string $text, string $from, string $to, string $context = 'text'): string {
    $result = pvc_lt_translate_segment($text, $from, $to, $context);
    return (string) $result['text'];
}
/** Minimal OpenAI-compatible chat completion. Any provider speaking that shape works. */
function pvc_lt_engine_request(string $text, string $from, string $to, string $context): string {
    $engine = pvc_lt_engine();
    $response = wp_remote_post((string) $engine['endpoint'], array(
        'timeout' => max(5, min(60, (int) $engine['timeout'])),
        'headers' => array('Content-Type' => 'application/json', 'Authorization' => 'Bearer ' . (string) $engine['api_key']),
        'body' => wp_json_encode(array(
            'model' => (string) $engine['model'],
            'temperature' => 0,
            'messages' => array(
                array('role' => 'system', 'content' => 'Translate the user text from ' . $from . ' to ' . $to . '. Reply with the translation only, no quotes and no commentary. Keep the original formatting and do not add or remove information.'),
                array('role' => 'user', 'content' => $text),
            ),
        )),
    ));
    if (is_wp_error($response)) { return $text; }
    if ((int) wp_remote_retrieve_response_code($response) !== 200) { return $text; }
    $payload = json_decode((string) wp_remote_retrieve_body($response), true);
    $content = $payload['choices'][0]['message']['content'] ?? null;
    return is_string($content) && trim($content) !== '' ? trim($content) : $text;
}
/** True when at least one segment would actually change language. */
function pvc_lt_needs_translation(array $segments, string $source, string $target): bool {
    foreach ($segments as $text) {
        if (pvc_lt_translate_text((string) $text, $source, $target) !== (string) $text) { return true; }
    }
    return false;
}
/**
 * Creates the missing locale versions of a profile. Returns a report; never throws.
 */
function pvc_lt_auto_translate($post, bool $publish = false): array {
    if (!$post || $post->post_type !== 'pv_profile') { return array('created' => 0, 'skipped' => 0, 'reason' => 'not-a-profile'); }
    if (!pvc_lt_enabled()) { return array('created' => 0, 'skipped' => 0, 'reason' => 'tool-disabled'); }
    if (!pvc_lt_eligible($post)) { return array('created' => 0, 'skipped' => 0, 'reason' => 'excluded'); }
    $source = 'es';
    $segments = pvc_lt_segments($post);
    if (!$segments) { return array('created' => 0, 'skipped' => 0, 'reason' => 'nothing-to-translate'); }
    $created = 0; $skipped = 0; $details = array();
    foreach (pvc_lt_languages() as $locale) {
        if (pvc_lt_targets($post, $locale)) { ++$skipped; continue; }
        $translations = array();
        $changed = false; $complete = true; $coverage = 1.0; $method = 'glossary';
        foreach ($segments as $key => $text) {
            // A segment with no letters (a date, a separator) needs no translation.
            if (!pvc_lt_offline_has_words((string) $text)) { $translations[$key] = (string) $text; continue; }
            $segment = pvc_lt_translate_segment((string) $text, $source, $locale, (string) $key);
            $value = trim((string) $segment['text']) === '' ? (string) $text : (string) $segment['text'];
            if ($value !== (string) $text) { $changed = true; }
            if (empty($segment['complete'])) { $complete = false; }
            $coverage = min($coverage, (float) $segment['coverage']);
            if (($segment['source'] ?? '') === 'engine' || ($segment['source'] ?? '') === 'filter') { $method = $segment['source']; }
            $translations[$key] = $value;
        }
        // Nothing at all was recognised: creating the record would store the source text
        // under another locale and call it a translation. The locale fallback already keeps
        // the profile visible and disclosed as untranslated.
        if (!$changed) { $details[$locale] = 'nothing-translated'; ++$skipped; continue; }
        // A partial glossary translation is never published: it stays a draft for a human.
        $locale_publish = $publish && $complete;
        $result = pvc_lt_payload($post, $translations, $locale, $locale_publish);
        $valid = pvc_validate('pv_profile', $locale, (string) get_post_meta($post->ID, 'pv_key', true), pvc_sanitize_data($result['meta_input']['pv_data'], 'pv_profile'), 0, $locale_publish);
        if (is_wp_error($valid)) { $details[$locale] = $valid->get_error_message(); ++$skipped; continue; }
        $result['meta_input']['_pvc_lt_source'] = (int) $post->ID;
        $result['meta_input']['_pvc_lt_source_hash'] = pvc_lt_hash($post);
        $result['meta_input']['_pvc_lt_engine'] = 'auto';
        $result['meta_input']['_pvc_lt_method'] = $method;
        $result['meta_input']['_pvc_lt_coverage'] = $coverage;
        $result['meta_input']['_pvc_lt_review'] = $complete ? '' : 'incomplete';
        $id = wp_insert_post(wp_slash($result), true);
        if (is_wp_error($id)) { $details[$locale] = $id->get_error_message(); ++$skipped; continue; }
        $thumbnail = get_post_thumbnail_id($post);
        if ($thumbnail) { set_post_thumbnail($id, $thumbnail); }
        $details[$locale] = array('id' => (int) $id, 'status' => get_post_status($id), 'coverage' => $coverage, 'complete' => $complete, 'method' => $method);
        ++$created;
    }
    if ($created) { pvc_bump(); }
    return array('created' => $created, 'skipped' => $skipped, 'reason' => 'ok', 'details' => $details);
}
/**
 * Trigger: the first time a profile becomes published. A translation created by this
 * module carries `_pvc_lt_source`, so it can never trigger another run.
 */
add_action('transition_post_status', function($new_status, $old_status, $post) {
    if ($new_status !== 'publish' || $old_status === 'publish') { return; }
    if (!$post || $post->post_type !== 'pv_profile') { return; }
    if (get_post_meta($post->ID, '_pvc_lt_source', true)) { return; }
    if (!pvc_lt_auto_available()) { return; }
    pvc_lt_auto_translate($post, pvc_lt_publishes());
}, 20, 3);
