<?php
/** Local browser translation into native records; TranslateRocket keeps the memory, not the routes. */
if (!defined('ABSPATH')) { exit; }

function pvc_lt_languages(): array { return array('en', 'fr', 'it'); }
function pvc_lt_identity($post): string { return $post->post_type . ':' . (string) get_post_meta($post->ID, 'pv_key', true); }
function pvc_lt_policy(): array { return (array) get_option('pvc_local_translation_policy', array()); }
function pvc_lt_hash($post): string {
    return hash('sha256', wp_json_encode(array($post->post_type, $post->post_status, $post->post_password, $post->post_title, $post->post_content, $post->post_excerpt, (int) $post->menu_order, get_post_meta($post->ID, 'pv_locale', true), get_post_meta($post->ID, 'pv_key', true), get_post_meta($post->ID, 'pv_data', true), (int) get_post_thumbnail_id($post))));
}
function pvc_lt_eligible($post, ?array $policy = null): bool {
    $policy = $policy ?? pvc_lt_policy();
    return !empty($policy['enabled']) && $post && isset(pvc_types()[$post->post_type])
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
add_action('wp_ajax_pvc_lt_enable', function() {
    pvc_lt_guard();
    $anchor = get_post(465);
    if (!$anchor || $anchor->post_type !== 'pv_profile' || get_post_meta(465, 'pv_key', true) !== 'maria' || get_post_meta(465, 'pv_locale', true) !== 'es') {
        wp_send_json_error(array('message' => 'No coincide la ficha inicial Maria (465). No se cambió el alcance.'), 409);
    }
    $policy = pvc_lt_policy();
    if (!$policy) {
        $posts = get_posts(array('post_type' => array_keys(pvc_types()), 'post_status' => array('publish','draft','pending','private','future','trash'), 'posts_per_page' => -1));
        $policy = array('enabled' => true, 'anchor_id' => 465, 'legacy' => pvc_lt_baseline($posts, 465), 'created_at_utc' => gmdate('c'));
        if (!add_option('pvc_local_translation_policy', $policy, '', false)) { wp_send_json_error(array('message' => 'El alcance cambió en otra sesión. Recarga.'), 409); }
    }
    wp_send_json_success(array('legacy_count' => count($policy['legacy']), 'enabled' => !empty($policy['enabled'])));
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
function pvc_lt_payload($source, array $translations, string $lang): array {
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
        'menu_order' => (int) $source->menu_order, 'post_status' => 'draft',
        'meta_input' => array('pv_locale' => $lang, 'pv_key' => get_post_meta($source->ID, 'pv_key', true), 'pv_data' => $data));
}
/** All statuses count: a draft/private/manual translation must never be replaced or republished. */
function pvc_lt_targets($source, string $lang): array {
    return get_posts(array('post_type' => $source->post_type, 'post_status' => array('publish','draft','pending','private','future','trash'), 'posts_per_page' => -1,
        'meta_query' => array(array('key' => 'pv_key', 'value' => get_post_meta($source->ID, 'pv_key', true)), array('key' => 'pv_locale', 'value' => $lang))));
}
function pvc_lt_can_update($target, $source): bool {
    return $target->post_status === 'publish'
        && (int) get_post_meta($target->ID, '_pvc_lt_source', true) === (int) $source->ID
        && hash_equals(pvc_lt_hash($target), (string) get_post_meta($target->ID, '_pvc_lt_generated_hash', true));
}
function pvc_lt_pending(): array {
    $jobs = array(); $protected = 0; $complete = 0;
    $sources = get_posts(array('post_type' => array_keys(pvc_types()), 'post_status' => 'publish', 'has_password' => false, 'posts_per_page' => -1, 'orderby' => 'ID', 'order' => 'ASC', 'meta_key' => 'pv_locale', 'meta_value' => 'es'));
    foreach ($sources as $source) {
        if (!pvc_lt_eligible($source)) { continue; }
        foreach (pvc_lt_languages() as $lang) {
            $targets = pvc_lt_targets($source, $lang);
            $target_id = 0;
            if ($targets) {
                if (count($targets) !== 1 || !pvc_lt_can_update($targets[0], $source)) { ++$protected; continue; }
                if (get_post_meta($targets[0]->ID, '_pvc_lt_source_hash', true) === pvc_lt_hash($source)) { ++$complete; continue; }
                $target_id = (int) $targets[0]->ID;
            }
            $jobs[] = array('id' => (int) $source->ID, 'target_id' => $target_id, 'title' => $source->post_title, 'lang' => $lang, 'fingerprint' => pvc_lt_hash($source), 'segments' => pvc_lt_segments($source));
        }
    }
    return array('jobs' => $jobs, 'complete' => $complete, 'protected' => $protected, 'legacy' => count(pvc_lt_policy()['legacy'] ?? array()));
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
        $target_id = absint($_POST['target_id'] ?? 0);
        $targets = pvc_lt_targets($source, $lang);
        if ($targets && (count($targets) !== 1 || (int) $targets[0]->ID !== $target_id || !pvc_lt_can_update($targets[0], $source))) { throw new RuntimeException('La versión existente se conserva: cambió o no pertenece a la traducción automática.'); }
        if (!$targets && $target_id) { throw new RuntimeException('La traducción fue retirada; no se restaura automáticamente.'); }
        $payload = pvc_lt_payload($source, $translated, $lang);
        $valid = pvc_validate($source->post_type, $lang, $payload['meta_input']['pv_key'], pvc_sanitize_data($payload['meta_input']['pv_data'], $source->post_type), $target_id);
        if (is_wp_error($valid)) { throw new RuntimeException($valid->get_error_message()); }
        $payload['meta_input']['_pvc_lt_source'] = $id;
        $payload['meta_input']['_pvc_lt_source_hash'] = $fingerprint;
        $payload['meta_input']['_pvc_lt_engine'] = 'browser';
        if ($target_id) { $payload['ID'] = $target_id; }
        $target = wp_insert_post(wp_slash($payload), true);
        if (is_wp_error($target)) { throw new RuntimeException($target->get_error_message()); }
        $thumbnail = get_post_thumbnail_id($source); if ($thumbnail) { set_post_thumbnail($target, $thumbnail); }
        clean_post_cache($id); $fresh = get_post($id);
        if (!pvc_lt_eligible($fresh) || !hash_equals(pvc_lt_hash($fresh), $fingerprint)) { throw new RuntimeException('La fuente cambió durante el guardado. La traducción quedó en borrador.'); }
        $published = wp_update_post(array('ID' => $target, 'post_status' => 'publish'), true);
        if (is_wp_error($published)) { throw new RuntimeException($published->get_error_message()); }
        update_post_meta($target, '_pvc_lt_generated_hash', pvc_lt_hash(get_post($target)));
        pvc_lt_remember($source, $lang, $segments, $translated);
        $result = array('id' => $target, 'url' => pvc_route(get_post($target)), 'lang' => $lang);
    } catch (Throwable $e) { $error = $e->getMessage(); }
    finally { delete_option($lock); }
    if ($error !== null) { wp_send_json_error(array('message' => $error), 409); }
    wp_send_json_success($result);
});
/** Withdraw generated versions when their source stops being public. Never restore deleted records. */
function pvc_lt_withdraw($source): void {
    if (!$source || !isset(pvc_types()[$source->post_type]) || get_post_meta($source->ID, 'pv_locale', true) !== 'es') { return; }
    foreach (pvc_lt_languages() as $lang) {
        foreach (pvc_lt_targets($source, $lang) as $target) {
            if ($target->post_status === 'publish' && (int) get_post_meta($target->ID, '_pvc_lt_source', true) === (int) $source->ID) { wp_update_post(array('ID' => $target->ID, 'post_status' => 'draft')); }
        }
    }
}
add_action('transition_post_status', function($new, $old, $source) {
    if ($old === 'publish' && $new !== 'publish') { pvc_lt_withdraw($source); }
}, 50, 3);
add_action('wp_after_insert_post', function($id, $post) {
    if ($post->post_password !== '') { pvc_lt_withdraw($post); }
}, 50, 2);
add_action('before_delete_post', function($id, $post) { pvc_lt_withdraw($post); }, 50, 2);
add_action('admin_menu', function() { add_submenu_page('pecadosvip-content', 'Traducción de contenido nuevo', 'Traducción de contenido nuevo', 'manage_options', 'pvc-local-translation', 'pvc_lt_page'); });
function pvc_lt_page(): void {
    if (!current_user_can('manage_options')) { return; }
    wp_enqueue_script('pvc-local-translation', plugins_url('../assets/local-translation.js', __FILE__), array(), PVC_VERSION, true);
    wp_localize_script('pvc-local-translation', 'PvcLocalTranslation', array('ajax' => admin_url('admin-ajax.php'), 'nonce' => wp_create_nonce('pvc_local_translation')));
    $policy = pvc_lt_policy();
    echo '<div class="wrap"><h1>Traducción de contenido nuevo</h1><p>Español → inglés, francés e italiano. Maria y las altas posteriores. El contenido Legacy y las versiones existentes se conservan.</p>';
    echo '<p>El navegador traduce localmente y guarda cada versión en WordPress y en la memoria de TranslateRocket. No usa una API de pago. Mantén esta pestaña abierta durante el proceso.</p>';
    echo '<p>Las nuevas altas y sus cambios se revisan cada 30 segundos mientras el proceso está iniciado. Se actualizan solo las versiones automáticas que nadie haya editado. Las traducciones humanas y el contenido Legacy se conservan.</p>';
    if (!pvc_lt_ready()) { echo '<div class="notice notice-error"><p>Se requiere TranslateRocket con origen español, sin destinos globales ni proveedor API. No cambies las rutas del sitio.</p></div>'; }
    echo '<p id="pvc-lt-policy">' . ($policy ? 'Alcance activo. Identidades Legacy protegidas: ' . count($policy['legacy']) : 'Alcance pendiente de activar. Referencia: primera ficha Maria, ID 465. Se congela el inventario anterior por tipo y clave.') . '</p>';
    if (!$policy) { echo '<button class="button" id="pvc-lt-enable">Activar alcance desde Maria</button> '; }
    echo '<button class="button button-primary" id="pvc-lt-run">Iniciar traducción local</button> <button class="button" id="pvc-lt-stop" disabled>Detener</button><pre id="pvc-lt-status" role="status" aria-live="polite" style="white-space:pre-wrap">Listo para comprobar el navegador.</pre></div>';
}
