<?php
/**
 * Creates the missing locale versions of a profile from a reviewed JSON map.
 *
 * WordPress-only: run it inside the installation that owns the content, never from the
 * repository. Reuses the same payload builder as the browser translation tool, so the
 * result is an ordinary editorial record with the same provenance metadata.
 *
 *   wp eval-file wordpress/tools/apply-profile-translations.php
 *   PVC_TRANSLATE_PUBLISH=1 wp eval-file wordpress/tools/apply-profile-translations.php
 *   PVC_TRANSLATIONS=/ruta/al/mapa.json wp eval-file wordpress/tools/apply-profile-translations.php
 *
 * Guarantees:
 * - Never overwrites a version that already exists, in any status.
 * - Creates drafts unless PVC_TRANSLATE_PUBLISH=1 is set explicitly.
 * - Validates every record with the plugin's own rules before writing.
 * - Refuses a body whose node count does not match the map instead of guessing.
 */
if (!defined('ABSPATH')) { exit; }
if (!function_exists('pvc_lt_payload') || !function_exists('pvc_lt_segments') || !function_exists('pvc_validate')) {
    echo "PecadosVip Contenido debe estar activo.\n";
    return;
}

$pvc_map_path = getenv('PVC_TRANSLATIONS') ?: __DIR__ . '/profile-translations.json';
$pvc_publish = getenv('PVC_TRANSLATE_PUBLISH') === '1';
if (!is_readable($pvc_map_path)) { echo "No se puede leer el mapa: {$pvc_map_path}\n"; return; }
$pvc_map = json_decode((string) file_get_contents($pvc_map_path), true);
if (!is_array($pvc_map) || ($pvc_map['schema'] ?? '') !== 'pecadosvip.profile-translations' || !isset($pvc_map['profiles'])) {
    echo "Mapa no compatible.\n";
    return;
}
$pvc_source = (string) ($pvc_map['sourceLocale'] ?? 'es');
$pvc_created = 0; $pvc_skipped = 0; $pvc_failed = 0;

foreach ((array) $pvc_map['profiles'] as $pvc_key => $pvc_locales) {
    $pvc_source_record = pvc_record('profile', $pvc_source, (string) $pvc_key);
    if (!$pvc_source_record) { echo "OMITIDO {$pvc_key}: no hay ficha publicada en {$pvc_source}.\n"; ++$pvc_failed; continue; }
    $pvc_post = get_post((int) $pvc_source_record['id']);
    $pvc_segments = pvc_lt_segments($pvc_post);
    $pvc_content_keys = array_values(array_filter(array_keys($pvc_segments), static function($segment) { return strpos($segment, 'content:') === 0; }));
    $pvc_source_languages = (array) ($pvc_source_record['data']['languages'] ?? array());

    foreach ((array) $pvc_locales as $pvc_locale => $pvc_payload) {
        if (!is_array($pvc_payload)) { echo "OMITIDO {$pvc_key}/{$pvc_locale}: contenido no válido.\n"; ++$pvc_failed; continue; }
        if (pvc_lt_targets($pvc_post, (string) $pvc_locale)) { echo "OMITIDO {$pvc_key}/{$pvc_locale}: ya existe una versión; se conserva.\n"; ++$pvc_skipped; continue; }

        $pvc_translations = array();
        // Body: one shorthand when the fixture has a single text node, explicit keys otherwise.
        if (array_key_exists('content', $pvc_payload)) {
            if (count($pvc_content_keys) !== 1) {
                echo "OMITIDO {$pvc_key}/{$pvc_locale}: la ficha tiene " . count($pvc_content_keys) . " nodos de texto; usa content:0, content:1…\n";
                ++$pvc_failed; continue;
            }
            $pvc_translations[$pvc_content_keys[0]] = (string) $pvc_payload['content'];
        }
        $pvc_missing = array();
        foreach ($pvc_content_keys as $pvc_segment) {
            if (isset($pvc_payload[$pvc_segment])) { $pvc_translations[$pvc_segment] = (string) $pvc_payload[$pvc_segment]; }
            elseif (!isset($pvc_translations[$pvc_segment])) { $pvc_missing[] = $pvc_segment; }
        }
        if ($pvc_missing) { echo "OMITIDO {$pvc_key}/{$pvc_locale}: falta el texto de " . implode(', ', $pvc_missing) . "\n"; ++$pvc_failed; continue; }
        if (isset($pvc_segments['excerpt'])) {
            if (!isset($pvc_payload['excerpt'])) { echo "OMITIDO {$pvc_key}/{$pvc_locale}: falta el extracto.\n"; ++$pvc_failed; continue; }
            $pvc_translations['excerpt'] = (string) $pvc_payload['excerpt'];
        }
        // Spoken languages are mapped by source value, so the order never matters.
        $pvc_language_map = is_array($pvc_payload['languages'] ?? null) ? $pvc_payload['languages'] : array();
        foreach ($pvc_source_languages as $pvc_index => $pvc_language) {
            if (!isset($pvc_segments['data:languages:' . $pvc_index])) { continue; }
            $pvc_replacement = $pvc_language_map[$pvc_language] ?? null;
            $pvc_translations['data:languages:' . $pvc_index] = is_string($pvc_replacement) ? $pvc_replacement : (string) $pvc_language;
        }

        try {
            $pvc_result = pvc_lt_payload($pvc_post, $pvc_translations, (string) $pvc_locale, $pvc_publish);
            $pvc_valid = pvc_validate('pv_profile', (string) $pvc_locale, (string) $pvc_key, pvc_sanitize_data($pvc_result['meta_input']['pv_data'], 'pv_profile'), 0, $pvc_publish);
            if (is_wp_error($pvc_valid)) { echo "FALLÓ {$pvc_key}/{$pvc_locale}: " . $pvc_valid->get_error_message() . "\n"; ++$pvc_failed; continue; }
            $pvc_result['meta_input']['_pvc_lt_source'] = (int) $pvc_post->ID;
            $pvc_result['meta_input']['_pvc_lt_source_hash'] = pvc_lt_hash($pvc_post);
            $pvc_result['meta_input']['_pvc_lt_engine'] = 'offline-map';
            $pvc_id = wp_insert_post(wp_slash($pvc_result), true);
            if (is_wp_error($pvc_id)) { echo "FALLÓ {$pvc_key}/{$pvc_locale}: " . $pvc_id->get_error_message() . "\n"; ++$pvc_failed; continue; }
            $pvc_thumbnail = get_post_thumbnail_id($pvc_post);
            if ($pvc_thumbnail) { set_post_thumbnail($pvc_id, $pvc_thumbnail); }
            $pvc_status = get_post_status($pvc_id);
            echo "CREADO {$pvc_key}/{$pvc_locale}: {$pvc_status} id={$pvc_id} revision=" . pvc_revision() . "\n";
            ++$pvc_created;
        } catch (Throwable $pvc_error) {
            echo "FALLÓ {$pvc_key}/{$pvc_locale}: " . $pvc_error->getMessage() . "\n";
            ++$pvc_failed;
        }
    }
}
if ($pvc_created) { pvc_bump(); }
echo "\nResumen: {$pvc_created} creados, {$pvc_skipped} omitidos por existir, {$pvc_failed} fallidos. Publicación: " . ($pvc_publish ? 'activada' : 'borradores') . ".\n";
