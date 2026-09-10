<?php
/** Opt-in translation of informational pages to drafts; no publication or background polling. */
if (!defined('ABSPATH')) { exit; }

function pvc_lt_languages(): array { return array('en', 'fr', 'it'); }
function pvc_lt_identity($post): string { return $post->post_type . ':' . (string) get_post_meta($post->ID, 'pv_key', true); }
function pvc_lt_policy(): array { return (array) get_option('pvc_local_translation_policy', array()); }
function pvc_lt_informational($post): bool {
    if (!$post || $post->post_type !== 'pv_page') { return false; }
    $data = (array) get_post_meta($post->ID, 'pv_data', true);
    return in_array($data['kind'] ?? '', array('information', 'about', 'contact', 'legal'), true);
}
function pvc_lt_hash($post): string {
    return hash('sha256', wp_json_encode(array($post->post_type, $post->post_status, $post->post_password, $post->post_title, $post->post_content, $post->post_excerpt, (int) $post->menu_order, get_post_meta($post->ID, 'pv_locale', true), get_post_meta($post->ID, 'pv_key', true), get_post_meta($post->ID, 'pv_data', true), (int) get_post_thumbnail_id($post))));
}
function pvc_lt_eligible($post, ?array $policy = null): bool {
    $policy = $policy ?? pvc_lt_policy();
    return !empty($policy['enabled']) && ($policy['mode'] ?? '') === 'informational-drafts-v1' && pvc_lt_informational($post)
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
    if ($policy && ($policy['mode'] ?? '') !== 'informational-drafts-v1') {
        wp_send_json_error(array('message' => 'Existe una política anterior de otro alcance. Debe revisarse antes de habilitar esta herramienta.'), 409);
    }
    if (!$policy) {
        $posts = get_posts(array('post_type' => array_keys(pvc_types()), 'post_status' => array('publish','draft','pending','private','future','trash'), 'posts_per_page' => -1));
        $policy = array('enabled' => true, 'mode' => 'informational-drafts-v1', 'anchor_id' => 465, 'legacy' => pvc_lt_baseline($posts, 465), 'created_at_utc' => gmdate('c'));
        if (!add_option('pvc_local_translation_policy', $policy, '', false)) { wp_send_json_error(array('message' => 'El alcance cambió en otra sesión. Recarga.'), 409); }
    } elseif (empty($policy['enabled'])) {
        $policy['enabled'] = true;
        update_option('pvc_local_translation_policy', $policy, false);
    }
    wp_send_json_success(array('legacy_count' => count($policy['legacy']), 'enabled' => !empty($policy['enabled'])));
});
add_action('wp_ajax_pvc_lt_disable', function() {
    pvc_lt_guard();
    $policy = pvc_lt_policy();
    if ($policy) { $policy['enabled'] = false; update_option('pvc_local_translation_policy', $policy, false); }
    wp_send_json_success(array('enabled' => false));
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
function pvc_lt_pending(): array {
    $jobs = array(); $protected = 0; $complete = 0;
    $sources = get_posts(array('post_type' => 'pv_page', 'post_status' => 'publish', 'has_password' => false, 'posts_per_page' => -1, 'orderby' => 'ID', 'order' => 'ASC', 'meta_key' => 'pv_locale', 'meta_value' => 'es'));
    foreach ($sources as $source) {
        if (!pvc_lt_eligible($source)) { continue; }
        foreach (pvc_lt_languages() as $lang) {
            $targets = pvc_lt_targets($source, $lang);
            if ($targets) {
                if (count($targets) === 1 && (int) get_post_meta($targets[0]->ID, '_pvc_lt_source', true) === (int) $source->ID && get_post_meta($targets[0]->ID, '_pvc_lt_source_hash', true) === pvc_lt_hash($source)) { ++$complete; }
                else { ++$protected; }
                continue;
            }
            $jobs[] = array('id' => (int) $source->ID, 'title' => $source->post_title, 'lang' => $lang, 'fingerprint' => pvc_lt_hash($source), 'segments' => pvc_lt_segments($source));
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
        $targets = pvc_lt_targets($source, $lang);
        if ($targets) { throw new RuntimeException('Ya existe una versión en este idioma; se conserva sin cambios.'); }
        $payload = pvc_lt_payload($source, $translated, $lang);
        $valid = pvc_validate($source->post_type, $lang, $payload['meta_input']['pv_key'], pvc_sanitize_data($payload['meta_input']['pv_data'], $source->post_type), 0);
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
        $result = array('id' => $target, 'url' => admin_url('post.php?post=' . $target . '&action=edit'), 'lang' => $lang, 'status' => 'draft');
    } catch (Throwable $e) { $error = $e->getMessage(); }
    finally { delete_option($lock); }
    if ($error !== null) { wp_send_json_error(array('message' => $error), 409); }
    wp_send_json_success($result);
});
add_action('admin_menu', function() { add_submenu_page('pecadosvip-content', 'Borradores de traducción', 'Borradores de traducción', 'manage_options', 'pvc-local-translation', 'pvc_lt_page'); });
function pvc_lt_page(): void {
    if (!current_user_can('manage_options')) { return; }
    wp_enqueue_script('pvc-local-translation', plugins_url('../assets/local-translation.js', __FILE__), array(), PVC_VERSION, true);
    wp_localize_script('pvc-local-translation', 'PvcLocalTranslation', array('ajax' => admin_url('admin-ajax.php'), 'nonce' => wp_create_nonce('pvc_local_translation')));
    $policy = pvc_lt_policy();
    echo '<div class="wrap"><h1>Borradores de traducción</h1><p>Español → inglés, francés e italiano. Solo páginas informativas nuevas, seleccionadas individualmente. El contenido Legacy y las versiones existentes se conservan. Perfiles, servicios y ciudades quedan fuera del proceso.</p>';
    echo '<p>El navegador traduce localmente y guarda borradores para revisión en WordPress y en la memoria de TranslateRocket. No usa una API de pago. La herramienta no publica, no sobrescribe versiones existentes ni procesa altas en segundo plano.</p>';
    echo '<p>Las páginas elegibles deben ser de tipo information, about, contact o legal. El corte histórico del proyecto sigue siendo anterior a la introducción de Maria; Maria no se incluye porque es un perfil.</p>';
    if (!pvc_lt_ready()) { echo '<div class="notice notice-error"><p>Se requiere TranslateRocket con origen español, sin destinos globales ni proveedor API. No cambies las rutas del sitio.</p></div>'; }
    echo '<p id="pvc-lt-policy">' . ($policy ? 'Política guardada. Identidades Legacy protegidas: ' . count($policy['legacy']) : 'Herramienta desactivada. Habilitarla conserva el inventario Legacy; no traduce ni publica por sí solo.') . '</p>';
    if (empty($policy['enabled'])) { echo '<button class="button" id="pvc-lt-enable">Habilitar herramienta de borradores</button> '; }
    else { echo '<button class="button" id="pvc-lt-disable">Deshabilitar herramienta</button> '; }
    echo '<button class="button" id="pvc-lt-refresh">Consultar páginas elegibles</button><p><label for="pvc-lt-source">Página informativa </label><select id="pvc-lt-source"><option value="">Selecciona una página</option></select></p>';
    echo '<button class="button button-primary" id="pvc-lt-run">Preparar borradores de la página seleccionada</button> <button class="button" id="pvc-lt-stop" disabled>Detener</button><pre id="pvc-lt-status" role="status" aria-live="polite" style="white-space:pre-wrap">Sin iniciar.</pre></div>';
}
