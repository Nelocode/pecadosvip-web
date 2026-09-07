<?php
if (!defined('ABSPATH')) { exit; }

/** Theme-local sources only. No downloads, path traversal, or external media requests. */
function pvc_import_path(string $root, string $relative) {
    if ($relative === '' || str_contains($relative, '\\') || str_contains($relative, '..') || str_starts_with($relative, '/') || preg_match('/^[a-z][a-z0-9+.-]*:/i', $relative)) { return new WP_Error('pvc_asset_path', 'La ruta de una imagen no es local o no es válida.'); }
    $candidate = realpath($root . DIRECTORY_SEPARATOR . $relative); $resolved_root = realpath($root);
    if (!$candidate || !$resolved_root || !str_starts_with($candidate, $resolved_root . DIRECTORY_SEPARATOR) || !is_file($candidate) || !is_readable($candidate)) { return new WP_Error('pvc_asset_missing', 'No se encuentra una imagen dentro del tema: ' . basename($relative)); }
    return $candidate;
}
function pvc_import_media($asset, string $root) {
    if (is_numeric($asset)) { return pvc_media($asset) ? (int) $asset : 0; }
    if (!is_array($asset) || !isset($asset['path'])) { return 0; }
    $path = pvc_import_path($root, (string) $asset['path']); if (is_wp_error($path)) { return $path; }
    $hash = hash_file('sha256', $path); $existing = get_posts(array('post_type' => 'attachment', 'post_status' => 'inherit', 'posts_per_page' => 1, 'fields' => 'ids', 'meta_key' => '_pvc_source_hash', 'meta_value' => $hash));
    if ($existing) { return (int) $existing[0]; }
    require_once ABSPATH . 'wp-admin/includes/file.php'; require_once ABSPATH . 'wp-admin/includes/image.php';
    $type = wp_check_filetype_and_ext($path, basename($path));
    if (empty($type['type']) || !str_starts_with($type['type'], 'image/') || $type['type'] === 'image/svg+xml') { return new WP_Error('pvc_asset_type', 'Formato de imagen no permitido: ' . basename($path)); }
    $bytes = file_get_contents($path); if ($bytes === false) { return new WP_Error('pvc_asset_read', 'No se puede leer una imagen local.'); }
    $upload = wp_upload_bits('pecadosvip-' . substr($hash, 0, 20) . '.' . $type['ext'], null, $bytes);
    if (!empty($upload['error'])) { return new WP_Error('pvc_upload', $upload['error']); }
    $id = wp_insert_attachment(array('post_mime_type' => $type['type'], 'post_title' => sanitize_text_field($asset['alt'] ?? pathinfo($path, PATHINFO_FILENAME)), 'post_status' => 'inherit'), $upload['file'], 0, true);
    if (is_wp_error($id)) { return $id; }
    update_post_meta($id, '_pvc_source_hash', $hash); update_post_meta($id, '_wp_attachment_image_alt', sanitize_text_field($asset['alt'] ?? ''));
    // The bundled images are already optimized. Record dimensions without regenerating dozens of copies.
    $size = wp_getimagesize($upload['file']); $uploads = wp_get_upload_dir();
    wp_update_attachment_metadata($id, array('width' => (int) ($size[0] ?? 0), 'height' => (int) ($size[1] ?? 0), 'file' => _wp_relative_upload_path($upload['file']), 'filesize' => filesize($upload['file']), 'sizes' => array()));
    return (int) $id;
}
function pvc_import_copy($incoming, $existing, string $root) {
    if (is_array($incoming) && isset($incoming['path'])) { return $existing !== null ? $existing : pvc_import_media($incoming, $root); }
    if (!is_array($incoming)) { return $existing !== null ? $existing : (is_scalar($incoming) ? $incoming : ''); }
    $result = is_array($existing) ? $existing : array();
    foreach ($incoming as $key => $value) {
        $merged = pvc_import_copy($value, $result[$key] ?? null, $root); if (is_wp_error($merged)) { return $merged; } $result[$key] = $merged;
    }
    return $result;
}
/** Idempotent explicit import. An optional limit allows the admin to process bounded batches. */
function pvc_import_seed(string $path, int $offset = 0, int $limit = 0) {
    if (!current_user_can('manage_options')) { return new WP_Error('pvc_import_forbidden', 'Se requieren permisos de administrador para importar.', array('status' => 403)); }
    if (!post_type_exists('pv_profile')) { pvc_register(); }
    $theme_root = realpath(get_template_directory()); $file = realpath($path);
    if (!$theme_root || !$file || !str_starts_with($file, $theme_root . DIRECTORY_SEPARATOR) || $file !== realpath($theme_root . '/content/seed.json') || !is_readable($file)) { return new WP_Error('pvc_seed_path', 'La importación solo acepta content/seed.json dentro del tema activo.'); }
    $seed = json_decode((string) file_get_contents($file), true);
    if (!is_array($seed) || ($seed['version'] ?? null) !== 1 || !isset($seed['copy'], $seed['records']) || !is_array($seed['records'])) { return new WP_Error('pvc_seed_schema', 'El archivo de contenido inicial no tiene un formato compatible.'); }
    if ($offset < 0 || $limit < 0 || $limit > 100) { return new WP_Error('pvc_seed_batch', 'Lote de importación no válido.'); }
    // Only missing defaults are added. User overrides and all existing content remain authoritative.
    $existing_copy = (array) get_option('pvc_copy_seed', array()); $copy = pvc_import_copy($seed['copy'], $existing_copy, $theme_root);
    if (is_wp_error($copy)) { return $copy; }
    update_option('pvc_copy_seed', $copy, false);
    $records = array_slice($seed['records'], $offset, $limit ?: null); $created = 0; $skipped = 0; $errors = array(); $processed = 0;
    foreach ($records as $record) {
        $processed++; $type = pvc_type((string) ($record['type'] ?? '')); $locale = (string) ($record['locale'] ?? ''); $key = (string) ($record['key'] ?? '');
        if (!isset(pvc_types()[$type])) { $errors[] = 'Tipo desconocido en el contenido inicial.'; continue; }
        $data = (array) ($record['data'] ?? array()); $valid = pvc_validate($type, $locale, $key, pvc_sanitize_data($data, $type), 0, false);
        if (is_wp_error($valid)) { $errors[] = $key . ': ' . $valid->get_error_message(); continue; }
        $existing = get_posts(array('post_type' => $type, 'post_status' => array('publish', 'draft', 'pending', 'future', 'private', 'trash'), 'posts_per_page' => 1, 'fields' => 'ids', 'meta_query' => array(array('key' => 'pv_key', 'value' => $key), array('key' => 'pv_locale', 'value' => $locale))));
        if ($existing) { $skipped++; continue; }
        $image = pvc_import_media($record['image'] ?? null, $theme_root); if (is_wp_error($image)) { $errors[] = $key . ': ' . $image->get_error_message(); continue; }
        $gallery = array(); $bad_media = false;
        foreach (($data['gallery'] ?? array()) as $asset) { $media = pvc_import_media($asset, $theme_root); if (is_wp_error($media)) { $errors[] = $key . ': ' . $media->get_error_message(); $bad_media = true; break; } if ($media) { $gallery[] = $media; } }
        if ($bad_media) { continue; }
        if (array_key_exists('gallery', $data)) { $data['gallery'] = $gallery; }
        $id = wp_insert_post(array('post_type' => $type, 'post_status' => 'publish', 'post_title' => sanitize_text_field($record['title'] ?? $key), 'post_content' => wp_kses_post($record['content'] ?? ''), 'post_excerpt' => sanitize_textarea_field($record['excerpt'] ?? ''), 'menu_order' => (int) ($record['order'] ?? 0), 'post_name' => sanitize_title($key . '-' . $locale), 'meta_input' => array('pv_key' => $key, 'pv_locale' => $locale, 'pv_data' => pvc_sanitize_data($data, $type))), true);
        if (is_wp_error($id)) { $errors[] = $key . ': ' . $id->get_error_message(); continue; }
        if ($image) { set_post_thumbnail($id, $image); } $created++;
    }
    pvc_bump(); $next = min(count($seed['records']), $offset + $processed);
    return array('created' => $created, 'skipped' => $skipped, 'errors' => $errors, 'next' => $next, 'total' => count($seed['records']), 'complete' => $next >= count($seed['records']), 'revision' => pvc_revision());
}
add_action('wp_ajax_pvc_import_seed', function() {
    if (!current_user_can('manage_options')) { wp_send_json_error(array('message' => 'No tienes permisos para importar.'), 403); }
    check_ajax_referer('pvc_import', 'nonce');
    $result = pvc_import_seed(get_template_directory() . '/content/seed.json', absint($_POST['offset'] ?? 0), 12);
    if (is_wp_error($result)) { wp_send_json_error(array('message' => $result->get_error_message()), 400); }
    if ($result['errors']) { wp_send_json_error(array('message' => implode(' ', $result['errors']), 'result' => $result), 400); }
    wp_send_json_success($result);
});
