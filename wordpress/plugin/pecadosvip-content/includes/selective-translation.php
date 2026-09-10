<?php
/**
 * Opt-in automatic translation of non-Legacy content.
 *
 * Scope v2: informational pages (information, about, contact, legal) plus model
 * profiles. Every other content type stays out. The Legacy inventory captured when
 * the tool is enabled is frozen by logical identity and is never translated, and an
 * existing translation in any status is never replaced or republished by this module.
 *
 * The browser performs the translation and the server independently re-checks
 * eligibility, source fingerprint, permissions and destination before writing.
 */
if (!defined('ABSPATH')) { exit; }

function pvc_lt_mode(): string { return 'content-drafts-v2'; }
function pvc_lt_languages(): array { return array('en', 'fr', 'it'); }
function pvc_lt_identity($post): string { return $post->post_type . ':' . (string) get_post_meta($post->ID, 'pv_key', true); }
function pvc_lt_policy(): array { return (array) get_option('pvc_local_translation_policy', array()); }
function pvc_lt_informational($post): bool {
    if (!$post || $post->post_type !== 'pv_page') { return false; }
    $data = (array) get_post_meta($post->ID, 'pv_data', true);
    return in_array($data['kind'] ?? '', array('information', 'about', 'contact', 'legal'), true);
}
/** Scope v2 adds model profiles. Services and cities remain outside the process. */
function pvc_lt_scoped($post): bool {
    if (!$post) { return false; }
    if ($post->post_type === 'pv_profile') { return true; }
    return pvc_lt_informational($post);
}
function pvc_lt_enabled(?array $policy = null): bool {
    $policy = $policy ?? pvc_lt_policy();
    return !empty($policy['enabled']) && ($policy['mode'] ?? '') === pvc_lt_mode();
}
/** Publication is an explicit, revocable choice stored with the policy. Disabled by default. */
function pvc_lt_publishes(?array $policy = null): bool {
    $policy = $policy ?? pvc_lt_policy();
    return pvc_lt_enabled($policy) && !empty($policy['publish']);
}
function pvc_lt_hash($post): string {
    return hash('sha256', wp_json_encode(array($post->post_type, $post->post_status, $post->post_password, $post->post_title, $post->post_content, $post->post_excerpt, (int) $post->menu_order, get_post_meta($post->ID, 'pv_locale', true), get_post_meta($post->ID, 'pv_key', true), get_post_meta($post->ID, 'pv_data', true), (int) get_post_thumbnail_id($post->ID))));
}
function pvc_lt_eligible($post, ?array $policy = null): bool {
    $policy = $policy ?? pvc_lt_policy();
    return pvc_lt_enabled($policy) && pvc_lt_scoped($post)
        && $post->post_status === 'publish' && $post->post_password === ''
        && get_post_meta($post->ID, 'pv_locale', true) === 'es'
        && preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', (string) get_post_meta($post->ID, 'pv_key', true))
        && !in_array(pvc_lt_identity($post), $policy['legacy'] ?? array(), true);
}
function pvc_lt_ready(): bool {
    if (!class_exists('TranslateRocket\\Strings') || !class_exists('DOMDocument')) { return false; }
    $s = \TranslateRocket\Settings::get();
    return $s['source_language'] === 'es' && empty($s['target_languages']) && empty($s['active_provider']);
}
function pvc_lt_guard(): void {
    if (!current_user_can('manage_options')) { wp_send_json_error(array('message' => 'Acceso denegado.'), 403); }
    check_ajax_referer('pvc_local_translation', 'nonce');
    if (!pvc_lt_ready()) { wp_send_json_error(array('message' => 'Se requiere TranslateRocket, origen español y sin destinos globales ni proveedor API.'), 409); }
}
/** The inventory is frozen by logical identity; later edits or date changes cannot change Legacy. */
function pvc_lt_baseline(array $posts, int $anchor): array {
    $legacy = array();
    foreach ($posts as $post) {
        if ((int) $post->ID < $anchor && isset(pvc_types()[$post->post_type])) { $legacy[] = pvc_lt_identity($post); }
    }
    return array_values(array_unique($legacy));
}
/**
 * Legacy cut-off anchor.
 *
 * Historical anchor 465 is used when it still matches. It does not in every
 * installation: on the live site 465 is the English, private record while the published
 * Spanish profile has a different id, so the hard-coded check made the tool impossible
 * to enable. When the historical anchor does not match, the published-or-not source
 * profile of the reference model is used instead, which is strictly more conservative:
 * it freezes more content as Legacy, never less.
 *
 * Fail-closed: without any anchor nothing is enabled.
 */
function pvc_lt_anchor(): ?int {
    $historical = get_post(465);
    if ($historical && $historical->post_type === 'pv_profile'
        && get_post_meta(465, 'pv_key', true) === 'maria' && get_post_meta(465, 'pv_locale', true) === 'es') { return 465; }
    $candidates = get_posts(array('post_type' => 'pv_profile', 'post_status' => array('publish','draft','pending','private','future','trash'),
        'posts_per_page' => 1, 'orderby' => 'ID', 'order' => 'ASC',
        'meta_query' => array(array('key' => 'pv_key', 'value' => 'maria'), array('key' => 'pv_locale', 'value' => 'es'))));
    return $candidates ? (int) $candidates[0]->ID : null;
}
add_action('wp_ajax_pvc_lt_enable', function() {
    pvc_lt_guard();
    $anchor = pvc_lt_anchor();
    if ($anchor === null) {
        wp_send_json_error(array('message' => 'No se encuentra la ficha inicial del proyecto. No se cambió el alcance.'), 409);
    }
    $publish = !empty($_POST['publish']);
    $policy = pvc_lt_policy();
    // A policy from an earlier scope is upgraded in place: the frozen Legacy inventory
    // is preserved verbatim and only the scope and publication flags change.
    if ($policy && ($policy['mode'] ?? '') !== pvc_lt_mode()) {
        $policy['mode'] = pvc_lt_mode();
        $policy['enabled'] = true;
        $policy['publish'] = $publish;
        $policy['upgraded_at_utc'] = gmdate('c');
        $policy['legacy'] = array_values((array) ($policy['legacy'] ?? array()));
        update_option('pvc_local_translation_policy', $policy, false);
        wp_send_json_success(array('legacy_count' => count($policy['legacy']), 'enabled' => true, 'publish' => $publish, 'upgraded' => true));
    }
    if (!$policy) {
        $posts = get_posts(array('post_type' => array_keys(pvc_types()), 'post_status' => array('publish','draft','pending','private','future','trash'), 'posts_per_page' => -1));
        // The anchor model is the first translatable content, exactly as it was when the
        // historical anchor was Maria: its logical identity is removed from the frozen
        // inventory even if an older record shares that identity.
        $legacy = pvc_lt_baseline($posts, $anchor);
        $anchor_post = get_post($anchor);
        if ($anchor_post) { $legacy = array_values(array_diff($legacy, array(pvc_lt_identity($anchor_post)))); }
        $policy = array('enabled' => true, 'mode' => pvc_lt_mode(), 'anchor_id' => $anchor, 'legacy' => $legacy, 'publish' => $publish, 'created_at_utc' => gmdate('c'));
        if (!add_option('pvc_local_translation_policy', $policy, '', false)) { wp_send_json_error(array('message' => 'El alcance cambió en otra sesión. Recarga.'), 409); }
    } else {
        $policy['enabled'] = true;
        $policy['publish'] = $publish;
        update_option('pvc_local_translation_policy', $policy, false);
    }
    wp_send_json_success(array('legacy_count' => count($policy['legacy']), 'enabled' => true, 'publish' => !empty($policy['publish'])));
});
add_action('wp_ajax_pvc_lt_disable', function() {
    pvc_lt_guard();
    $policy = pvc_lt_policy();
    if ($policy) { $policy['enabled'] = false; update_option('pvc_local_translation_policy', $policy, false); }
    wp_send_json_success(array('enabled' => false, 'publish' => !empty($policy['publish'])));
});
/** Publication can be switched without losing the frozen Legacy inventory or the drafts. */
add_action('wp_ajax_pvc_lt_settings', function() {
    pvc_lt_guard();
    $policy = pvc_lt_policy();
    if (!pvc_lt_enabled($policy)) { wp_send_json_error(array('message' => 'Habilita primero la traducción automática.'), 409); }
    $policy['publish'] = !empty($_POST['publish']);
    update_option('pvc_local_translation_policy', $policy, false);
    wp_send_json_success(array('publish' => (bool) $policy['publish']));
});
/** Split HTML into text nodes; tags, attributes, links and Gutenberg comments are kept on the server. */
function pvc_lt_document(string $html): array {
    $doc = new DOMDocument('1.0', 'UTF-8');
    $before = libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="UTF-8"><html><body><div id="pvc-lt-root">' . $html . '</div></body></html>', LIBXML_NONET);
    libxml_clear_errors(); libxml_use_internal_errors($before);
    $xpath = new DOMXPath($doc);
    $root = $xpath->query('//*[@id="pvc-lt-root"]')->item(0);
    $nodes = $xpath->query('.//text()[not(ancestor::script or ancestor::style or ancestor::code or ancestor::pre)]', $root);
    return array($doc, $root, $nodes);
}
function pvc_lt_segments($post): array {
    $segments = array();
    // A profile title is the public stage name: a proper noun carried over unchanged,
    // exactly like a city key. Its biography travels through the excerpt and content.
    if (!in_array($post->post_type, array('pv_profile', 'pv_city'), true) && trim($post->post_title) !== '') { $segments['title'] = $post->post_title; }
    if (trim($post->post_excerpt) !== '') { $segments['excerpt'] = $post->post_excerpt; }
    [, , $nodes] = pvc_lt_document($post->post_content);
    foreach ($nodes as $i => $node) { if (trim($node->nodeValue) !== '') { $segments['content:' . $i] = trim($node->nodeValue); } }
    $data = (array) get_post_meta($post->ID, 'pv_data', true);
    foreach (array('tags', 'conceptTags', 'languages') as $field) {
        foreach ((array) ($data[$field] ?? array()) as $i => $value) { if (is_string($value) && trim($value) !== '') { $segments['data:' . $field . ':' . $i] = $value; } }
    }
    if (!empty($data['coverage']) && is_string($data['coverage'])) { $segments['coverage'] = $data['coverage']; }
    return $segments;
}
function pvc_lt_payload($source, array $translations, string $lang, bool $publish = false): array {
    $data = (array) get_post_meta($source->ID, 'pv_data', true);
    [$doc, $root, $nodes] = pvc_lt_document($source->post_content);
    foreach ($nodes as $i => $node) {
        $key = 'content:' . $i;
        if (isset($translations[$key])) {
            preg_match('/^(\s*)/u', $node->nodeValue, $left); preg_match('/(\s*)$/u', $node->nodeValue, $right);
            $node->nodeValue = ($left[1] ?? '') . $translations[$key] . ($right[1] ?? '');
        }
    }
    $content = ''; foreach ($root->childNodes as $node) { $content .= $doc->saveHTML($node); }
    foreach (array('tags', 'conceptTags', 'languages') as $field) {
        foreach ((array) ($data[$field] ?? array()) as $i => $value) { $data[$field][$i] = $translations['data:' . $field . ':' . $i] ?? $value; }
    }
    if (isset($translations['coverage'])) { $data['coverage'] = $translations['coverage']; }
    return array('post_type' => $source->post_type, 'post_title' => $translations['title'] ?? $source->post_title,
        'post_excerpt' => $translations['excerpt'] ?? $source->post_excerpt, 'post_content' => wp_kses_post($content),
        'menu_order' => (int) $source->menu_order, 'post_status' => $publish ? 'publish' : 'draft',
        'meta_input' => array('pv_locale' => $lang, 'pv_key' => get_post_meta($source->ID, 'pv_key', true), 'pv_data' => $data));
}
/** All statuses count: a draft/private/manual translation must never be replaced or republished. */
function pvc_lt_targets($source, string $lang): array {
    return get_posts(array('post_type' => $source->post_type, 'post_status' => array('publish','draft','pending','private','future','trash'), 'posts_per_page' => -1,
        'meta_query' => array(array('key' => 'pv_key', 'value' => get_post_meta($source->ID, 'pv_key', true)), array('key' => 'pv_locale', 'value' => $lang))));
}
function pvc_lt_type_labels(): array {
    return array('pv_profile' => 'Perfil', 'pv_page' => 'Página informativa', 'pv_service' => 'Servicio', 'pv_city' => 'Ciudad');
}
/**
 * Every pending pair for the current scope, in a stable order.
 *   jobs      source is eligible and no version exists yet in that language
 *   complete  the only version was created by this tool for the current source text
 *   protected any other version exists (draft, private, manual or stale) and is kept
 */
function pvc_lt_pending(): array {
    $jobs = array(); $protected = 0; $complete = 0;
    $policy = pvc_lt_policy();
    $publish = pvc_lt_publishes($policy);
    $sources = get_posts(array('post_type' => array_keys(pvc_types()), 'post_status' => 'publish', 'has_password' => false, 'posts_per_page' => -1, 'orderby' => 'ID', 'order' => 'ASC', 'meta_key' => 'pv_locale', 'meta_value' => 'es'));
    foreach ($sources as $source) {
        if (!pvc_lt_eligible($source, $policy)) { continue; }
        foreach (pvc_lt_languages() as $lang) {
            $targets = pvc_lt_targets($source, $lang);
            if ($targets) {
                if (count($targets) === 1 && (int) get_post_meta($targets[0]->ID, '_pvc_lt_source', true) === (int) $source->ID && get_post_meta($targets[0]->ID, '_pvc_lt_source_hash', true) === pvc_lt_hash($source)) { ++$complete; }
                else { ++$protected; }
                continue;
            }
            $jobs[] = array('id' => (int) $source->ID, 'type' => $source->post_type, 'title' => $source->post_title, 'lang' => $lang, 'publish' => $publish, 'fingerprint' => pvc_lt_hash($source), 'segments' => pvc_lt_segments($source));
        }
    }
    return array('jobs' => $jobs, 'complete' => $complete, 'protected' => $protected, 'publish' => $publish, 'legacy' => count($policy['legacy'] ?? array()), 'labels' => pvc_lt_type_labels());
}
add_action('wp_ajax_pvc_lt_pending', function() { pvc_lt_guard(); wp_send_json_success(pvc_lt_pending()); });
function pvc_lt_remember($source, string $lang, array $segments, array $translated): void {
    global $wpdb;
    $items = array();
    foreach ($segments as $key => $text) { $items[] = array('original' => $text, 'type' => 'text', 'context' => 'pvc-local:' . $source->ID . ':' . $key); }
    \TranslateRocket\Strings::remember_batch($items, array($lang), pvc_route($source), $source->post_title);
    $table = \TranslateRocket\Database::strings_table();
    foreach ($segments as $key => $text) {
        $hash = \TranslateRocket\Strings::hash(trim($text), 'text', 'pvc-local:' . $source->ID . ':' . $key);
        $id = (int) $wpdb->get_var($wpdb->prepare("SELECT id FROM {$table} WHERE string_hash = %s", $hash));
        if ($id) { \TranslateRocket\Strings::save_translation($id, $lang, $translated[$key], 1, 'browser'); }
    }
}
add_action('wp_ajax_pvc_lt_store', function() {
    pvc_lt_guard();
    $id = absint($_POST['id'] ?? 0); $lang = sanitize_key($_POST['lang'] ?? '');
    if (!in_array($lang, pvc_lt_languages(), true)) { wp_send_json_error(array('message' => 'Idioma no permitido.'), 400); }
    // Publication never comes from the request: it is read from the stored policy.
    $publish = pvc_lt_publishes();
    $source = get_post($id);
    if (!pvc_lt_eligible($source) || !current_user_can('edit_post', $id)) { wp_send_json_error(array('message' => 'Contenido excluido o no publicado.'), 409); }
    $fingerprint = sanitize_text_field(wp_unslash($_POST['fingerprint'] ?? ''));
    if (!hash_equals(pvc_lt_hash($source), $fingerprint)) { wp_send_json_error(array('message' => 'La fuente cambió. Recarga y traduce la versión actual.'), 409); }
    $segments = pvc_lt_segments($source);
    $translated = json_decode(wp_unslash($_POST['translations'] ?? '{}'), true);
    if (!is_array($translated) || array_diff_key($segments, $translated) || array_diff_key($translated, $segments)) { wp_send_json_error(array('message' => 'Traducción incompleta.'), 400); }
    foreach ($translated as $key => $value) {
        if (!is_string($value) || trim($value) === '' || strlen($value) > max(4096, strlen($segments[$key]) * 12)) { wp_send_json_error(array('message' => 'Texto traducido no válido.'), 400); }
        $translated[$key] = sanitize_textarea_field($value);
        if ($translated[$key] === '') { wp_send_json_error(array('message' => 'Texto traducido vacío.'), 400); }
    }
    $lock = 'pvc_lt_lock_' . $id . '_' . $lang;
    if (!add_option($lock, gmdate('c'), '', false)) { wp_send_json_error(array('message' => 'Otra sesión está procesando esta traducción.'), 409); }
    $result = null; $error = null;
    try {
        $targets = pvc_lt_targets($source, $lang);
        if ($targets) { throw new RuntimeException('Ya existe una versión en este idioma; se conserva sin cambios.'); }
        $payload = pvc_lt_payload($source, $translated, $lang, $publish);
        $valid = pvc_validate($source->post_type, $lang, $payload['meta_input']['pv_key'], pvc_sanitize_data($payload['meta_input']['pv_data'], $source->post_type), 0, $publish);
        if (is_wp_error($valid)) { throw new RuntimeException($valid->get_error_message()); }
        $payload['meta_input']['_pvc_lt_source'] = $id;
        $payload['meta_input']['_pvc_lt_source_hash'] = $fingerprint;
        $payload['meta_input']['_pvc_lt_engine'] = 'browser';
        $target = wp_insert_post(wp_slash($payload), true);
        if (is_wp_error($target)) { throw new RuntimeException($target->get_error_message()); }
        $thumbnail = get_post_thumbnail_id($source); if ($thumbnail) { set_post_thumbnail($target, $thumbnail); }
        clean_post_cache($id); $fresh = get_post($id);
        if (!pvc_lt_eligible($fresh) || !hash_equals(pvc_lt_hash($fresh), $fingerprint)) { throw new RuntimeException('La fuente cambió durante el guardado. La traducción quedó en borrador.'); }
        pvc_lt_remember($source, $lang, $segments, $translated);
        // The insertion guard can still demote a failed publication: report what exists.
        $stored = get_post_status($target) === 'publish' ? 'publish' : 'draft';
        $result = array('id' => $target, 'url' => admin_url('post.php?post=' . $target . '&action=edit'), 'lang' => $lang, 'status' => $stored, 'type' => $source->post_type);
    } catch (Throwable $e) { $error = $e->getMessage(); }
    finally { delete_option($lock); }
    if ($error !== null) { wp_send_json_error(array('message' => $error), 409); }
    wp_send_json_success($result);
});
/**
 * Publishes only translation drafts created by this tool for a source that is still
 * eligible and unchanged. Anything else keeps its current status.
 */
function pvc_lt_publish_drafts(): array {
    $published = 0; $skipped = 0;
    $drafts = get_posts(array('post_type' => array_keys(pvc_types()), 'post_status' => 'draft', 'posts_per_page' => -1, 'orderby' => 'ID', 'order' => 'ASC',
        'meta_query' => array(array('key' => '_pvc_lt_source', 'compare' => 'EXISTS'))));
    foreach ($drafts as $draft) {
        $source = get_post((int) get_post_meta($draft->ID, '_pvc_lt_source', true));
        $locale = (string) get_post_meta($draft->ID, 'pv_locale', true);
        if (!$source || !in_array($locale, pvc_lt_languages(), true) || !pvc_lt_eligible($source)
            || !hash_equals(pvc_lt_hash($source), (string) get_post_meta($draft->ID, '_pvc_lt_source_hash', true))) { ++$skipped; continue; }
        $data = pvc_sanitize_data(get_post_meta($draft->ID, 'pv_data', true), $draft->post_type);
        $valid = pvc_validate($draft->post_type, $locale, (string) get_post_meta($draft->ID, 'pv_key', true), $data, (int) $draft->ID, true);
        if (is_wp_error($valid)) { ++$skipped; continue; }
        if (is_wp_error(wp_update_post(array('ID' => $draft->ID, 'post_status' => 'publish'), true))) { ++$skipped; continue; }
        if (get_post_status($draft->ID) === 'publish') { ++$published; } else { ++$skipped; }
    }
    if ($published) { pvc_bump(); }
    return array('published' => $published, 'skipped' => $skipped);
}
add_action('wp_ajax_pvc_lt_publish', function() {
    pvc_lt_guard();
    if (!pvc_lt_publishes()) { wp_send_json_error(array('message' => 'Activa la publicación automática antes de publicar los borradores existentes.'), 409); }
    wp_send_json_success(pvc_lt_publish_drafts());
});
add_action('admin_menu', function() { add_submenu_page('pecadosvip-content', 'Traducción automática', 'Traducción automática', 'manage_options', 'pvc-local-translation', 'pvc_lt_page'); });
function pvc_lt_page(): void {
    if (!current_user_can('manage_options')) { return; }
    wp_enqueue_script('pvc-local-translation', plugins_url('../assets/local-translation.js', __FILE__), array(), PVC_VERSION, true);
    wp_localize_script('pvc-local-translation', 'PvcLocalTranslation', array('ajax' => admin_url('admin-ajax.php'), 'nonce' => wp_create_nonce('pvc_local_translation')));
    $policy = pvc_lt_policy(); $enabled = pvc_lt_enabled($policy); $publish = $enabled && !empty($policy['publish']);
    $stale = $policy && !$enabled;
    echo '<div class="wrap"><h1>Traducción automática</h1>';
    echo '<p>Español → inglés, francés e italiano. Alcance: <strong>páginas informativas y perfiles de modelos</strong> que no forman parte del inventario Legacy. Los servicios y las ciudades quedan fuera del proceso. Las versiones existentes se conservan siempre.</p>';
    echo '<p>El navegador traduce localmente y el servidor guarda el resultado. No usa una API de pago y no traduce en segundo plano: el proceso se ejecuta cuando pulsas el botón.</p>';
    if (!pvc_lt_ready()) { echo '<div class="notice notice-error"><p>Se requiere TranslateRocket con origen español, sin destinos globales ni proveedor API. No cambies las rutas del sitio.</p></div>'; }
    if ($stale) { echo '<div class="notice notice-warning"><p>Existe una política de un alcance anterior. Al habilitar se conserva el inventario Legacy y se amplía el alcance a los perfiles de modelos.</p></div>'; }
    echo '<p id="pvc-lt-policy">' . ($policy ? 'Política guardada. Identidades Legacy protegidas: ' . count($policy['legacy'] ?? array()) . '. Publicación automática: ' . ($publish ? 'activada' : 'desactivada') . '.' : 'Herramienta desactivada. Habilitarla conserva el inventario Legacy; no traduce ni publica por sí solo.') . '</p>';
    if (!$enabled) {
        echo '<p><label><input type="checkbox" id="pvc-lt-publish-enable" value="1"' . ($stale && !empty($policy['publish']) ? ' checked' : '') . '> Publicar automáticamente las traducciones creadas</label></p>';
        echo '<p class="description">Si lo activas, el perfil traducido queda publicado y se muestra en los cuatro idiomas. Si lo dejas vacío, se guardan borradores para revisión. Puedes cambiarlo después sin perder nada.</p>';
        echo '<button class="button button-primary" id="pvc-lt-enable">' . ($stale ? 'Ampliar el alcance y habilitar' : 'Habilitar traducción automática') . '</button> ';
    } else {
        echo '<p><label><input type="checkbox" id="pvc-lt-publish-toggle" value="1"' . ($publish ? ' checked' : '') . '> Publicar automáticamente las traducciones creadas</label> <button class="button" id="pvc-lt-publish-save">Guardar esta opción</button></p>';
        echo '<button class="button" id="pvc-lt-disable">Deshabilitar herramienta</button> ';
        echo '<button class="button" id="pvc-lt-publish-now">Publicar borradores de traducción existentes</button> ';
    }
    echo '<button class="button" id="pvc-lt-refresh">Consultar contenido pendiente</button>';
    echo '<p><label for="pvc-lt-source">Traducir solo un elemento </label><select id="pvc-lt-source"><option value="">Toda la cola pendiente (automático)</option></select></p>';
    echo '<button class="button button-primary" id="pvc-lt-run">Traducir automáticamente lo pendiente</button> <button class="button" id="pvc-lt-stop" disabled>Detener</button><pre id="pvc-lt-status" role="status" aria-live="polite" style="white-space:pre-wrap">Sin iniciar.</pre>';
    $mode = function_exists('pvc_lt_auto_mode') ? pvc_lt_auto_mode() : 'glossary';
    $size = function_exists('pvc_lt_offline_dictionary_size') ? pvc_lt_offline_dictionary_size() : 0;
    $modes = array(
        'engine' => 'Motor en servidor configurado: cada modelo nueva se traduce sola al publicarse, sin abrir nada.',
        'filter' => 'Proveedor propio conectado por filtro: cada modelo nueva se traduce sola al publicarse.',
        'glossary' => 'Traductor propio en el servidor, sin APIs ni servicios externos: glosario editorial de ' . $size . ' entradas. Cada modelo nueva se traduce sola al publicarse. Si una frase usa vocabulario que no está en el glosario, la traducción queda en borrador marcada para revisar, y el perfil sigue visible con el respaldo de idioma.',
    );
    echo '<h2>Traducción automática al publicar</h2>';
    echo '<p id="pvc-lt-engine">' . esc_html($modes[$mode] ?? $modes['glossary']) . '</p>';
    echo '<p class="description">El glosario se amplía sin tocar código con la opción <code>pvc_lt_glossary</code> (español → en/fr/it). Traduce vocabulario, no prosa: no reordena la frase.</p>';
    echo '<p><label><input type="checkbox" id="pvc-lt-auto" value="1"> Traducir automáticamente lo nuevo mientras esta pestaña siga abierta</label></p>';
    echo '</div>';
}
