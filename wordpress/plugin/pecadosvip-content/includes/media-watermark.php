<?php
/** Model media derivatives. Original WordPress attachments are never overwritten. */
if (!defined('ABSPATH')) { exit; }

function pvc_watermark_config(): array {
    return (array) apply_filters('pvc_watermark_config', array(
        'version' => '1', 'logo' => PVC_DIR . '/assets/pecadosvip-watermark.png',
        'ffmpeg' => '/usr/bin/ffmpeg', 'ffprobe' => '/usr/bin/ffprobe',
        'image_max_bytes' => 30 * 1024 * 1024, 'image_max_pixels' => 24000000,
        'image_max_edge' => 2560, 'video_max_bytes' => 128 * 1024 * 1024,
        'video_max_seconds' => 180, 'video_max_pixels' => 17000000, 'video_max_edge' => 1920,
        'process_timeout' => 240, 'probe_timeout' => 20, 'max_attempts' => 3,
        'opacity' => .78,
    ));
}
function pvc_wm_kind(string $kind): string { return $kind === 'video' ? 'video' : 'image'; }
function pvc_wm_internal_write(int $delta = 0): bool { static $depth = 0; $depth = max(0, $depth + $delta); return $depth > 0; }
function pvc_wm_key(string $kind): string { return '_pvc_watermark_' . pvc_wm_kind($kind); }
function pvc_wm_source_id($id): int {
    $id = absint($id);
    // Selecting a derivative from the media library must not add a second mark.
    $source = absint(get_post_meta($id, '_pvc_watermark_source', true));
    return $source > 0 && $source !== $id ? $source : $id;
}
function pvc_wm_under(string $path, string $root): bool {
    $path = str_replace('\\', '/', $path); $root = rtrim(str_replace('\\', '/', $root), '/');
    if (DIRECTORY_SEPARATOR === '\\') { $path = strtolower($path); $root = strtolower($root); }
    return str_starts_with($path, $root . '/');
}
function pvc_wm_source_file(int $id, string $kind): string {
    if (get_post_type($id) !== 'attachment') { throw new RuntimeException('invalid_source'); }
    $uploads = wp_get_upload_dir(); $root = realpath($uploads['basedir']);
    $file = get_attached_file($id, true); $resolved = $file ? realpath($file) : false;
    if (!$root || !$resolved || !is_file($resolved) || !is_readable($resolved) || !pvc_wm_under($resolved, $root)) { throw new RuntimeException('missing_source'); }
    $mime = (string) get_post_mime_type($id);
    if ($kind === 'video' && !in_array($mime, array('video/mp4', 'video/quicktime', 'video/webm'), true)) { throw new RuntimeException('unsupported_video'); }
    if ($kind === 'image' && !in_array($mime, array('image/jpeg', 'image/png', 'image/webp'), true)) { throw new RuntimeException('unsupported_image'); }
    $config = pvc_watermark_config(); $bytes = filesize($resolved);
    if (!$bytes || $bytes > (int) $config[$kind . '_max_bytes']) { throw new RuntimeException('file_too_large'); }
    return $resolved;
}
function pvc_wm_generation(): string {
    $config = pvc_watermark_config(); $logo = (string) $config['logo'];
    if (!is_file($logo) || !is_readable($logo)) { throw new RuntimeException('missing_logo'); }
    $hash = hash_file('sha256', $logo);
    return hash('sha256', (string) $config['version'] . ':' . $hash . ':' . wp_json_encode(array_intersect_key($config, array_flip(array('image_max_edge', 'video_max_edge', 'opacity')))));
}
function pvc_wm_signature(int $id, string $kind): string {
    $file = pvc_wm_source_file($id, $kind); clearstatcache(true, $file);
    return hash('sha256', $id . ':' . $kind . ':' . $file . ':' . filesize($file) . ':' . filemtime($file) . ':' . pvc_wm_generation());
}
function pvc_wm_message(string $status, string $error = ''): string {
    if ($status === 'ready') { return 'Marca de agua lista.'; }
    if ($status === 'processing') { return 'Aplicando la marca de agua…'; }
    if ($status === 'queued') { return 'Pendiente de aplicar la marca de agua.'; }
    if ($status === 'not_queued') { return 'Guarda el perfil para preparar este archivo.'; }
    $messages = array('unsupported_image' => 'Usa una imagen JPG, PNG o WebP.', 'unsupported_video' => 'Usa un vídeo MP4, MOV o WebM.', 'file_too_large' => 'El archivo supera el tamaño permitido.', 'image_dimensions' => 'La imagen supera las dimensiones permitidas.', 'video_duration' => 'El vídeo supera la duración permitida.', 'missing_source' => 'No se encuentra el archivo original.', 'missing_logo' => 'La marca de agua todavía no está configurada.');
    return $messages[$error] ?? 'No se pudo preparar el archivo. El original se conserva.';
}
function pvc_watermark_status($id, string $kind = 'image'): array {
    $id = pvc_wm_source_id($id); $kind = pvc_wm_kind($kind);
    $job = get_post_meta($id, pvc_wm_key($kind), true); $job = is_array($job) ? $job : array();
    $state = (string) ($job['state'] ?? 'not_queued');
    if ($state === 'ready') {
        try { if (!hash_equals((string) ($job['signature'] ?? ''), pvc_wm_signature($id, $kind))) { $state = 'not_queued'; } }
        catch (Throwable $error) { $state = 'error'; $job['error'] = $error->getMessage(); }
        $derived_file = !empty($job['derivative_id']) ? get_attached_file((int) $job['derivative_id'], true) : false;
        $poster_file = $kind === 'video' && !empty($job['poster_id']) ? get_attached_file((int) $job['poster_id'], true) : false;
        if (!$derived_file || !is_file($derived_file) || ($kind === 'video' && (!$poster_file || !is_file($poster_file)))) { $state = 'error'; $job['error'] = 'missing_derivative'; }
    }
    return array('status' => $state, 'state' => $state, 'message' => pvc_wm_message($state, (string) ($job['error'] ?? '')), 'attempts' => (int) ($job['attempts'] ?? 0), 'derivative_id' => (int) ($job['derivative_id'] ?? 0), 'updated_at' => (int) ($job['updated_at'] ?? 0));
}
function pvc_wm_image_record(int $id): ?array {
    if (!$id || !wp_attachment_is_image($id)) { return null; }
    $file = get_attached_file($id, true); if (!$file || !is_file($file)) { return null; }
    $image = wp_get_attachment_image_src($id, 'full'); if (!$image) { return null; }
    return array('id' => $id, 'url' => $image[0], 'alt' => (string) get_post_meta($id, '_wp_attachment_image_alt', true), 'width' => (int) $image[1], 'height' => (int) $image[2]);
}
function pvc_watermark_media($id, string $kind = 'image'): ?array {
    $id = pvc_wm_source_id($id); $kind = pvc_wm_kind($kind);
    if (pvc_watermark_status($id, $kind)['state'] !== 'ready') { return null; }
    $job = (array) get_post_meta($id, pvc_wm_key($kind), true); $derived = (int) ($job['derivative_id'] ?? 0);
    if (!$derived || (int) get_post_meta($derived, '_pvc_watermark_source', true) !== $id || get_post_meta($derived, '_pvc_watermark_fingerprint', true) !== ($job['fingerprint'] ?? '')) { return null; }
    if ($kind === 'image') { $image = pvc_wm_image_record($derived); if ($image) { $image['alt'] = (string) get_post_meta($id, '_wp_attachment_image_alt', true); } return $image; }
    $file = get_attached_file($derived, true); $url = wp_get_attachment_url($derived);
    $poster = pvc_wm_image_record((int) ($job['poster_id'] ?? 0));
    if (!$file || !is_file($file) || !$url || !$poster) { return null; }
    $poster['alt'] = (string) get_post_meta($id, '_wp_attachment_image_alt', true);
    return array('id' => $derived, 'url' => $url, 'mime' => 'video/mp4', 'width' => (int) ($job['width'] ?? 0), 'height' => (int) ($job['height'] ?? 0), 'poster' => $poster);
}
function pvc_wm_schedule(int $id, string $kind, string $signature, int $delay = 2, string $token = ''): void {
    if ($token === '') { $token = (string) (((array) get_post_meta($id, pvc_wm_key($kind), true))['token'] ?? ''); }
    $args = array($id, $kind, $signature, $token);
    if (!wp_next_scheduled('pvc_process_model_watermark', $args)) { wp_schedule_single_event(time() + max(1, $delay), 'pvc_process_model_watermark', $args); }
}
function pvc_wm_queue(int $id, string $kind, bool $retry = false): void {
    $id = pvc_wm_source_id($id); if (!$id) { return; }
    $key = pvc_wm_key($kind); $old = (array) get_post_meta($id, $key, true);
    try { $signature = pvc_wm_signature($id, $kind); }
    catch (Throwable $error) { update_post_meta($id, $key, array('state' => 'error', 'attempts' => 0, 'error' => $error->getMessage(), 'updated_at' => time())); return; }
    if (!$retry && ($old['signature'] ?? '') === $signature) {
        if (($old['state'] ?? '') === 'ready' && pvc_watermark_media($id, $kind)) { return; }
        if (($old['state'] ?? '') === 'processing' && time() - (int) ($old['updated_at'] ?? 0) < (int) pvc_watermark_config()['process_timeout'] + 90) { return; }
        if (($old['state'] ?? '') === 'error' && (int) ($old['attempts'] ?? 0) >= (int) pvc_watermark_config()['max_attempts']) { return; }
        if (($old['state'] ?? '') === 'queued') { pvc_wm_schedule($id, $kind, $signature); return; }
    }
    update_post_meta($id, $key, array('state' => 'queued', 'signature' => $signature, 'token' => bin2hex(random_bytes(16)), 'attempts' => $retry || ($old['signature'] ?? '') !== $signature ? 0 : (int) ($old['attempts'] ?? 0), 'updated_at' => time()));
    pvc_wm_schedule($id, $kind, $signature);
    if (function_exists('pvc_bump')) { pvc_bump(); }
}
function pvc_watermark_queue_profile(int $profile_id): void {
    if (get_post_type($profile_id) !== 'pv_profile' || in_array(get_post_status($profile_id), array('trash', 'auto-draft'), true)) { return; }
    $data = (array) get_post_meta($profile_id, 'pv_data', true);
    $images = array_merge(array(get_post_thumbnail_id($profile_id)), (array) ($data['gallery'] ?? array()));
    foreach (array_unique(array_map('absint', $images)) as $id) { pvc_wm_queue($id, 'image'); }
    foreach (array_unique(array_map('absint', (array) ($data['videos'] ?? array()))) as $id) { pvc_wm_queue($id, 'video'); }
}
/** Retry is explicit and capability checked; no public retry endpoint is registered. */
function pvc_watermark_retry_profile(int $profile_id): bool {
    if (get_post_type($profile_id) !== 'pv_profile' || in_array(get_post_status($profile_id), array('trash', 'auto-draft'), true) || !current_user_can('edit_post', $profile_id)) { return false; }
    $data = (array) get_post_meta($profile_id, 'pv_data', true);
    $media = array('image' => array_merge(array(get_post_thumbnail_id($profile_id)), (array) ($data['gallery'] ?? array())), 'video' => (array) ($data['videos'] ?? array()));
    foreach ($media as $kind => $ids) { foreach (array_unique(array_map('absint', $ids)) as $id) {
        if (!$id) { continue; }
        $status = pvc_watermark_status($id, $kind);
        if ($status['state'] === 'ready') { continue; }
        if ($status['state'] === 'processing' && time() - $status['updated_at'] < (int) pvc_watermark_config()['process_timeout'] + 90) { continue; }
        pvc_wm_queue($id, $kind, in_array($status['state'], array('error', 'not_queued', 'processing'), true));
    } }
    return true;
}

// These hooks cover the classic editor, REST/Gutenberg and /admin-models, whose
// metadata is written after wp_update_post. No attachment upload is transformed inline.
foreach (array('added_post_meta', 'updated_post_meta', 'deleted_post_meta') as $hook) {
    add_action($hook, function($meta_id, $post_id, $key) { if (in_array($key, array('_thumbnail_id', 'pv_data'), true)) { pvc_watermark_queue_profile((int) $post_id); } }, 40, 3);
}
add_action('save_post_pv_profile', function($id) { pvc_watermark_queue_profile((int) $id); }, 40);
add_action('rest_after_insert_pv_profile', function($post) { pvc_watermark_queue_profile((int) $post->ID); }, 40);
add_action('pvc_process_model_watermark', 'pvc_watermark_process', 10, 4);

// A new mark/version also prepares existing non-trashed model media in bounded batches.
add_action('init', function() {
    try { $generation = pvc_wm_generation(); } catch (Throwable $error) { return; }
    if (get_option('pvc_watermark_generation', '') === $generation) { return; }
    update_option('pvc_watermark_generation', $generation, false);
    wp_schedule_single_event(time() + 2, 'pvc_watermark_scan_profiles', array(0, $generation));
}, 40);
add_action('pvc_watermark_scan_profiles', function($offset, $generation) {
    if (get_option('pvc_watermark_generation', '') !== $generation) { return; }
    $ids = get_posts(array('post_type' => 'pv_profile', 'post_status' => array('publish', 'draft', 'pending', 'private', 'future'), 'fields' => 'ids', 'posts_per_page' => 20, 'offset' => absint($offset), 'orderby' => 'ID', 'order' => 'ASC'));
    foreach ($ids as $id) { pvc_watermark_queue_profile((int) $id); }
    if (count($ids) === 20) { wp_schedule_single_event(time() + 10, 'pvc_watermark_scan_profiles', array(absint($offset) + 20, $generation)); }
}, 10, 2);

function pvc_wm_stage(): string {
    $base = rtrim(sys_get_temp_dir(), '/\\'); $dir = $base . DIRECTORY_SEPARATOR . 'pvc-watermark-' . bin2hex(random_bytes(16));
    if (!mkdir($dir, 0700)) { throw new RuntimeException('storage_error'); }
    return $dir;
}
function pvc_wm_remove_stage(string $dir): void {
    $root = realpath(sys_get_temp_dir()); $real = realpath($dir);
    if (!$root || !$real || !pvc_wm_under($real, $root) || !str_starts_with(basename($real), 'pvc-watermark-')) { return; }
    foreach (scandir($real) ?: array() as $name) {
        if ($name === '.' || $name === '..') { continue; }
        $file = $real . DIRECTORY_SEPARATOR . $name;
        if (is_file($file) && !is_link($file)) { unlink($file); }
    }
    @rmdir($real);
}
function pvc_wm_storage_dir(int $id = 0): string {
    $uploads = wp_get_upload_dir(); if (!empty($uploads['error'])) { throw new RuntimeException('storage_error'); }
    $root = realpath($uploads['basedir']); if (!$root || !is_dir($root)) { throw new RuntimeException('storage_error'); }
    $directory = $root;
    // Validate each parent BEFORE creating the next directory: recursive mkdir
    // would follow an existing symlink and could create directories outside uploads.
    foreach ($id > 0 ? array('pvc-watermarked', (string) $id) : array('pvc-watermarked') as $part) {
        $directory .= '/' . $part;
        if (is_link($directory) || (!is_dir($directory) && !@mkdir($directory, 0755) && !is_dir($directory))) { throw new RuntimeException('storage_error'); }
        $real = realpath($directory); if (!$real || !pvc_wm_under($real, $root)) { throw new RuntimeException('storage_error'); }
    }
    return $directory;
}
function pvc_wm_promote(string $stage, int $id, string $fingerprint, array $files): string {
    $parent = pvc_wm_storage_dir($id);
    // Each registered attachment owns its files. Reusing a former directory would
    // let deleting an older attachment delete the active generation's files too.
    $final = $parent . '/' . substr($fingerprint, 0, 24) . '-' . bin2hex(random_bytes(8));
    $pending = $parent . '/.pending-' . bin2hex(random_bytes(12));
    if (!mkdir($pending, 0755)) { throw new RuntimeException('storage_error'); }
    try {
        foreach ($files as $name) {
            if ($name !== basename($name) || !is_file($stage . '/' . $name) || !copy($stage . '/' . $name, $pending . '/' . $name)) { throw new RuntimeException('storage_error'); }
        }
        if (!rename($pending, $final)) { throw new RuntimeException('storage_error'); }
        return $final;
    } finally {
        if (is_dir($pending)) { foreach (scandir($pending) ?: array() as $name) { if ($name !== '.' && $name !== '..' && is_file($pending . '/' . $name)) { unlink($pending . '/' . $name); } } @rmdir($pending); }
    }
}
function pvc_wm_image_info(string $file): array {
    $info = @getimagesize($file);
    if (!$info || !in_array($info['mime'] ?? '', array('image/jpeg', 'image/png', 'image/webp'), true)) { throw new RuntimeException('unsupported_image'); }
    if ($info[0] < 1 || $info[1] < 1 || $info[0] * $info[1] > (int) pvc_watermark_config()['image_max_pixels']) { throw new RuntimeException('image_dimensions'); }
    return $info;
}
function pvc_wm_memory_check(int $pixels): void {
    if (function_exists('wp_raise_memory_limit')) { wp_raise_memory_limit('image'); }
    $raw = trim((string) ini_get('memory_limit')); if ($raw === '-1' || $raw === '') { return; }
    $limit = (int) $raw; $unit = strtolower(substr($raw, -1));
    if (in_array($unit, array('k', 'm', 'g'), true)) { $limit *= 1024 ** (array_search($unit, array('k', 'm', 'g'), true) + 1); }
    if ($limit > 0 && memory_get_usage(true) + $pixels * 8 + 48 * 1024 * 1024 > $limit) { throw new RuntimeException('image_memory'); }
}
function pvc_wm_load_image(string $file) {
    if (!extension_loaded('gd')) { throw new RuntimeException('missing_image_runtime'); }
    $info = pvc_wm_image_info($file); pvc_wm_memory_check($info[0] * $info[1]);
    $loaders = array('image/jpeg' => 'imagecreatefromjpeg', 'image/png' => 'imagecreatefrompng', 'image/webp' => 'imagecreatefromwebp');
    $loader = $loaders[$info['mime']]; if (!function_exists($loader)) { throw new RuntimeException('missing_image_runtime'); }
    $image = @$loader($file); if (!$image) { throw new RuntimeException('image_decode'); }
    imagealphablending($image, false); imagesavealpha($image, true);
    return $image;
}
function pvc_wm_save_image($image, string $file, string $mime): void {
    $ok = false;
    if ($mime === 'image/jpeg') { $ok = imagejpeg($image, $file, 90); }
    elseif ($mime === 'image/png') { imagesavealpha($image, true); $ok = imagepng($image, $file, 6); }
    elseif ($mime === 'image/webp' && function_exists('imagewebp')) { $ok = imagewebp($image, $file, 88); }
    if (!$ok || !is_file($file) || filesize($file) === 0) { throw new RuntimeException('image_encode'); }
}
function pvc_wm_orient($image, string $file, string $mime) {
    if ($mime !== 'image/jpeg') { return $image; }
    if (!function_exists('exif_read_data')) { throw new RuntimeException('missing_image_runtime'); }
    $exif = @exif_read_data($file); $orientation = (int) ($exif['Orientation'] ?? 1);
    if ($orientation === 2) { imageflip($image, IMG_FLIP_HORIZONTAL); }
    elseif ($orientation === 4) { imageflip($image, IMG_FLIP_VERTICAL); }
    elseif (in_array($orientation, array(3, 5, 6, 7, 8), true)) {
        $angle = $orientation === 3 ? 180 : ($orientation === 8 ? 90 : -90);
        $rotated = imagerotate($image, $angle, 0); if (!$rotated) { throw new RuntimeException('image_orientation'); }
        imagedestroy($image); $image = $rotated;
        if ($orientation === 5) { imageflip($image, IMG_FLIP_HORIZONTAL); }
        if ($orientation === 7) { imageflip($image, IMG_FLIP_VERTICAL); }
    }
    return $image;
}
function pvc_wm_scaled_logo(int $width, int $height) {
    $config = pvc_watermark_config(); $logo = pvc_wm_load_image((string) $config['logo']);
    $margin = max(2, (int) round(min($width, $height) * .03));
    $target_width = min(max(80, (int) round($width * .22)), 400, max(1, $width - 2 * $margin));
    $target_height = max(1, (int) round(imagesy($logo) * $target_width / imagesx($logo)));
    if ($target_height > $height - 2 * $margin) { $target_height = max(1, $height - 2 * $margin); $target_width = max(1, (int) round(imagesx($logo) * $target_height / imagesy($logo))); }
    $scaled = imagecreatetruecolor($target_width, $target_height); imagealphablending($scaled, false); imagesavealpha($scaled, true);
    imagefill($scaled, 0, 0, imagecolorallocatealpha($scaled, 0, 0, 0, 127));
    imagecopyresampled($scaled, $logo, 0, 0, 0, 0, $target_width, $target_height, imagesx($logo), imagesy($logo)); imagedestroy($logo);
    $opacity = max(.1, min(1, (float) $config['opacity']));
    for ($y = 0; $y < $target_height; $y++) { for ($x = 0; $x < $target_width; $x++) {
        $pixel = imagecolorat($scaled, $x, $y); $alpha = ($pixel >> 24) & 0x7f;
        imagesetpixel($scaled, $x, $y, (((int) round(127 - (127 - $alpha) * $opacity)) << 24) | ($pixel & 0xffffff));
    } }
    return array($scaled, $margin);
}
function pvc_wm_mark_image(string $file): void {
    $info = pvc_wm_image_info($file); $image = pvc_wm_load_image($file);
    try {
        [$logo, $margin] = pvc_wm_scaled_logo(imagesx($image), imagesy($image));
        imagealphablending($image, true);
        imagecopy($image, $logo, imagesx($image) - imagesx($logo) - $margin, imagesy($image) - imagesy($logo) - $margin, 0, 0, imagesx($logo), imagesy($logo));
        imagedestroy($logo); pvc_wm_save_image($image, $file, $info['mime']);
    } finally { imagedestroy($image); }
}
/** Create/crop all public sizes BEFORE marking every final file. Nothing is registered yet. */
function pvc_wm_render_image(string $source, string $stage, string $basename = 'image'): array {
    $info = pvc_wm_image_info($source); $mime = $info['mime'];
    $extension = array('image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp')[$mime];
    $image = pvc_wm_orient(pvc_wm_load_image($source), $source, $mime);
    $file = $stage . '/' . $basename . '.' . $extension;
    try {
        $factor = min(1, (int) pvc_watermark_config()['image_max_edge'] / max(imagesx($image), imagesy($image)));
        if ($factor < 1) {
            $scaled = imagecreatetruecolor(max(1, (int) round(imagesx($image) * $factor)), max(1, (int) round(imagesy($image) * $factor)));
            imagealphablending($scaled, false); imagesavealpha($scaled, true); imagefill($scaled, 0, 0, imagecolorallocatealpha($scaled, 0, 0, 0, 127));
            imagecopyresampled($scaled, $image, 0, 0, 0, 0, imagesx($scaled), imagesy($scaled), imagesx($image), imagesy($image));
            imagedestroy($image); $image = $scaled;
        }
        pvc_wm_save_image($image, $file, $mime);
    } finally { imagedestroy($image); }
    $editor = wp_get_image_editor($file); if (is_wp_error($editor)) { throw new RuntimeException('image_editor'); }
    $sizes = $editor->multi_resize(wp_get_registered_image_subsizes());
    if (is_wp_error($sizes) || !is_array($sizes)) { throw new RuntimeException('image_sizes'); }
    $files = array(basename($file));
    foreach ($sizes as $size) {
        $name = (string) ($size['file'] ?? '');
        if ($name === '' || $name !== basename($name) || !is_file($stage . '/' . $name)) { throw new RuntimeException('image_sizes'); }
        $files[] = $name;
    }
    foreach (array_unique($files) as $name) { pvc_wm_mark_image($stage . '/' . $name); }
    foreach ($sizes as &$size) { clearstatcache(true, $stage . '/' . $size['file']); $size['filesize'] = filesize($stage . '/' . $size['file']); } unset($size);
    $final = pvc_wm_image_info($file); clearstatcache(true, $file);
    return array('file' => basename($file), 'width' => $final[0], 'height' => $final[1], 'mime' => $mime, 'filesize' => filesize($file), 'sizes' => $sizes, 'files' => array_values(array_unique($files)));
}
function pvc_wm_store_attachment_file(int $id, string $file): string {
    $uploads = wp_get_upload_dir(); $root = realpath($uploads['basedir']); $resolved = realpath($file);
    if (!$root || !$resolved || !is_file($resolved) || !pvc_wm_under($resolved, $root)) { throw new RuntimeException('attachment_error'); }
    $root = rtrim(wp_normalize_path($root), '/'); $resolved = wp_normalize_path($resolved);
    $relative = substr($resolved, strlen($root) + 1);
    if (!str_starts_with($relative, 'pvc-watermarked/')) { throw new RuntimeException('attachment_error'); }
    // WordPress can compare an absolute path with a basedir containing mixed
    // Windows separators. Store the validated relative path explicitly so it
    // cannot prepend uploads a second time when resolving the attachment.
    update_post_meta($id, '_wp_attached_file', $relative);
    $registered = get_attached_file($id, true); $registered = $registered ? realpath($registered) : false;
    if (!$registered || !is_file($registered)) { throw new RuntimeException('attachment_error'); }
    $registered = wp_normalize_path($registered);
    if ((DIRECTORY_SEPARATOR === '\\' ? strcasecmp($registered, $resolved) : strcmp($registered, $resolved)) !== 0) { throw new RuntimeException('attachment_error'); }
    return $relative;
}
function pvc_wm_register_image(int $source_id, string $directory, array $image, string $fingerprint): int {
    pvc_wm_internal_write(1); $id = 0;
    try {
    // wp_insert_attachment forwards this through wp_insert_post/unslashing.
    // Normalize native Windows separators before WordPress persists the path.
    $file = wp_normalize_path($directory . '/' . $image['file']);
    $id = wp_insert_attachment(array('post_mime_type' => $image['mime'], 'post_title' => get_the_title($source_id) . ' · PecadosVip', 'post_status' => 'inherit', 'post_parent' => 0), $file, 0, true);
    if (is_wp_error($id) || !$id) { throw new RuntimeException('attachment_error'); }
    $relative = pvc_wm_store_attachment_file((int) $id, $file);
    update_post_meta($id, '_pvc_watermark_source', $source_id); update_post_meta($id, '_pvc_watermark_fingerprint', $fingerprint);
    update_post_meta($id, '_wp_attachment_image_alt', (string) get_post_meta($source_id, '_wp_attachment_image_alt', true));
    if (wp_update_attachment_metadata($id, array('file' => $relative, 'width' => $image['width'], 'height' => $image['height'], 'filesize' => $image['filesize'], 'sizes' => $image['sizes'], 'image_meta' => array())) === false) { throw new RuntimeException('attachment_error'); }
    return (int) $id;
    } catch (Throwable $error) { if (is_int($id) && $id > 0) { wp_delete_attachment($id, true); } throw $error;
    } finally { pvc_wm_internal_write(-1); }
}

/** Argument arrays bypass the shell; a temporary output file avoids blocking
 * Windows pipes, allowing the same enforced timeout on Windows and Linux. */
function pvc_wm_exec(array $arguments, int $timeout): string {
    if (!function_exists('proc_open') || !is_file((string) ($arguments[0] ?? ''))) { throw new RuntimeException('missing_video_runtime'); }
    $output = tmpfile(); if (!$output) { throw new RuntimeException('storage_error'); }
    $null = PHP_OS_FAMILY === 'Windows' ? 'NUL' : '/dev/null'; $pipes = array();
    // stderr is deliberately discarded: errors are safe codes, never paths or
    // embedded media metadata. stdout (ffprobe JSON) is capped at one MiB.
    $process = @proc_open($arguments, array(0 => array('file', $null, 'r'), 1 => $output, 2 => array('file', $null, 'w')), $pipes, null, null, array('bypass_shell' => true));
    if (!is_resource($process)) { fclose($output); throw new RuntimeException('video_process'); }
    $deadline = microtime(true) + max(1, $timeout); $exit = -1; $failure = '';
    try {
        do {
            $status = proc_get_status($process);
            if (!$status['running']) { $exit = (int) $status['exitcode']; break; }
            if (microtime(true) > $deadline) { $failure = 'video_timeout'; }
            elseif ((int) (fstat($output)['size'] ?? 0) > 1048576) { $failure = 'video_output_limit'; }
            if ($failure !== '') { proc_terminate($process); usleep(100000); $status = proc_get_status($process); if ($status['running']) { proc_terminate($process, 9); } break; }
            usleep(20000);
        } while (true);
        if ((int) (fstat($output)['size'] ?? 0) > 1048576 && $failure === '') { $failure = 'video_output_limit'; }
        rewind($output); $stdout = (string) fread($output, 1048576);
    } finally { $closed = proc_close($process); fclose($output); if ($exit < 0) { $exit = $closed; } }
    if ($failure !== '') { throw new RuntimeException($failure); }
    if ($exit !== 0) { throw new RuntimeException('video_process'); }
    return $stdout;
}
function pvc_wm_probe(string $file, int $timeout = 0): array {
    $config = pvc_watermark_config();
    $json = pvc_wm_exec(array($config['ffprobe'], '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height,duration,sample_aspect_ratio:stream_tags=rotate:stream_side_data=rotation', '-of', 'json', $file), $timeout ?: (int) $config['probe_timeout']);
    $probe = json_decode($json, true); if (!is_array($probe)) { throw new RuntimeException('video_probe'); }
    $video = null; $audio = false;
    foreach (($probe['streams'] ?? array()) as $stream) { if (($stream['codec_type'] ?? '') === 'video' && $video === null) { $video = $stream; } if (($stream['codec_type'] ?? '') === 'audio') { $audio = true; } }
    if (!$video || empty($video['width']) || empty($video['height'])) { throw new RuntimeException('video_probe'); }
    $duration = (float) ($probe['format']['duration'] ?? $video['duration'] ?? 0);
    if (!is_finite($duration) || $duration <= 0) { throw new RuntimeException('video_probe'); }
    $rotation = (int) ($video['tags']['rotate'] ?? 0); foreach (($video['side_data_list'] ?? array()) as $side) { if (isset($side['rotation'])) { $rotation = (int) $side['rotation']; } }
    $width = (int) $video['width']; $height = (int) $video['height'];
    $sar = explode(':', (string) ($video['sample_aspect_ratio'] ?? '1:1')); $ratio = count($sar) === 2 && (float) $sar[1] > 0 ? (float) $sar[0] / (float) $sar[1] : 1;
    if ($ratio <= 0 || !is_finite($ratio)) { $ratio = 1; }
    $display_width = max(1, (int) round($width * $ratio)); $display_height = $height;
    if (abs($rotation) % 180 === 90) { [$display_width, $display_height] = array($display_height, $display_width); }
    return array('width' => $width, 'height' => $height, 'display_width' => $display_width, 'display_height' => $display_height, 'duration' => $duration, 'audio' => $audio);
}
function pvc_wm_remaining(float $deadline, int $limit): int {
    $remaining = (int) floor($deadline - microtime(true)); if ($remaining < 1) { throw new RuntimeException('video_timeout'); }
    return min($remaining, $limit);
}
function pvc_wm_render_video(string $source, string $stage, float $deadline): array {
    $config = pvc_watermark_config(); $input = pvc_wm_probe($source, pvc_wm_remaining($deadline, (int) $config['probe_timeout']));
    if ($input['duration'] > (float) $config['video_max_seconds']) { throw new RuntimeException('video_duration'); }
    if ($input['width'] * $input['height'] > (int) $config['video_max_pixels']) { throw new RuntimeException('video_dimensions'); }
    $scale = min(1, (int) $config['video_max_edge'] / max($input['display_width'], $input['display_height']));
    $width = max(2, (int) floor($input['display_width'] * $scale / 2) * 2); $height = max(2, (int) floor($input['display_height'] * $scale / 2) * 2);
    [$logo, $margin] = pvc_wm_scaled_logo($width, $height); $logo_file = $stage . '/watermark-overlay.png';
    try { pvc_wm_save_image($logo, $logo_file, 'image/png'); } finally { imagedestroy($logo); }
    $video_file = $stage . '/video.mp4';
    $filter = '[0:v:0]scale=' . $width . ':' . $height . ',setsar=1[base];[base][1:v:0]overlay=W-w-' . $margin . ':H-h-' . $margin . ':format=auto[out]';
    pvc_wm_exec(array($config['ffmpeg'], '-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-threads', '1', '-i', $source, '-i', $logo_file, '-filter_complex_threads', '1', '-filter_complex', $filter, '-map', '[out]', '-map', '0:a:0?', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p', '-threads', '1', '-c:a', 'aac', '-b:a', '128k', '-map_metadata', '-1', '-metadata:s:v:0', 'rotate=0', '-movflags', '+faststart', $video_file), pvc_wm_remaining($deadline, (int) $config['process_timeout']));
    $result = pvc_wm_probe($video_file, pvc_wm_remaining($deadline, (int) $config['probe_timeout']));
    if (abs($result['duration'] - $input['duration']) > max(.5, $input['duration'] * .02) || ($input['audio'] && !$result['audio']) || $result['width'] !== $width || $result['height'] !== $height) { throw new RuntimeException('video_verification'); }
    // Produce an unmarked poster from the original. Each final poster crop then
    // receives its own mark, avoiding clipped or doubled logos on thumbnails.
    $poster_source = $stage . '/poster-source.jpg';
    pvc_wm_exec(array($config['ffmpeg'], '-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-threads', '1', '-i', $source, '-ss', '0', '-frames:v', '1', '-vf', 'scale=' . $width . ':' . $height . ',setsar=1', '-q:v', '2', $poster_source), pvc_wm_remaining($deadline, (int) $config['process_timeout']));
    $poster = pvc_wm_render_image($poster_source, $stage, 'poster');
    return array('file' => 'video.mp4', 'width' => $width, 'height' => $height, 'duration' => $result['duration'], 'poster' => $poster, 'files' => array_merge(array('video.mp4'), $poster['files']));
}

function pvc_watermark_process($source_id, $kind, $signature, $token = ''): void {
    $id = absint($source_id); $kind = pvc_wm_kind((string) $kind); $signature = (string) $signature; $key = pvc_wm_key($kind);
    $job = (array) get_post_meta($id, $key, true);
    $token = (string) $token; if ($token === '') { $token = (string) ($job['token'] ?? ''); }
    $event_args = array($id, $kind, $signature, $token);
    if (($job['token'] ?? '') !== $token) { return; }
    if (($job['signature'] ?? '') !== $signature || ($job['state'] ?? '') === 'ready') { return; }
    if ((int) ($job['attempts'] ?? 0) >= (int) pvc_watermark_config()['max_attempts']) {
        $job['state'] = 'error'; $job['error'] = $job['error'] ?? 'worker_interrupted'; $job['updated_at'] = time(); update_post_meta($id, $key, $job);
        wp_clear_scheduled_hook('pvc_process_model_watermark', $event_args); return;
    }
    try { $lock_dir = pvc_wm_storage_dir(); }
    catch (Throwable $error) {
        $job['state'] = 'error'; $job['error'] = 'storage_error'; $job['attempts'] = (int) ($job['attempts'] ?? 0) + 1; $job['updated_at'] = time(); update_post_meta($id, $key, $job);
        if ($job['attempts'] < (int) pvc_watermark_config()['max_attempts']) { pvc_wm_schedule($id, $kind, $signature, 60, $token); } return;
    }
    $lock = !is_link($lock_dir . '/.worker.lock') ? @fopen($lock_dir . '/.worker.lock', 'c') : false;
    if (!$lock) {
        $job['state'] = 'error'; $job['error'] = 'storage_error'; $job['attempts'] = (int) ($job['attempts'] ?? 0) + 1; $job['updated_at'] = time(); update_post_meta($id, $key, $job);
        if ($job['attempts'] < (int) pvc_watermark_config()['max_attempts']) { pvc_wm_schedule($id, $kind, $signature, 60, $token); } return;
    }
    if (!flock($lock, LOCK_EX | LOCK_NB)) { fclose($lock); pvc_wm_schedule($id, $kind, $signature, 60, $token); return; }
    $stage = ''; $created = array(); $config = pvc_watermark_config(); $processing = array();
    try {
        // Recheck after acquiring the global lock: only one heavy processor runs
        // per shared uploads filesystem, even when WP-Cron invocations overlap.
        $job = (array) get_post_meta($id, $key, true);
        if (($job['signature'] ?? '') !== $signature || ($job['token'] ?? '') !== $token || ($job['state'] ?? '') === 'ready') { return; }
        $expected = $job;
        $job['state'] = 'processing'; $job['attempts'] = (int) ($job['attempts'] ?? 0) + 1; $job['updated_at'] = time(); unset($job['error']);
        if (!update_post_meta($id, $key, $job, $expected)) { return; }
        $processing = $job;
        wp_clear_scheduled_hook('pvc_process_model_watermark', $event_args);
        // Watchdog recovers a PHP fatal error or terminated worker without exposing
        // its unfinished derivative. flock is released automatically on process exit.
        pvc_wm_schedule($id, $kind, $signature, (int) $config['process_timeout'] + 90, $token);
        $file = pvc_wm_source_file($id, $kind);
        if (!hash_equals($signature, pvc_wm_signature($id, $kind))) { throw new RuntimeException('source_changed'); }
        $original_hash = hash_file('sha256', $file); $generation = pvc_wm_generation();
        $fingerprint = hash('sha256', $kind . ':' . $original_hash . ':' . $generation);
        $stage = pvc_wm_stage();
        $result = $kind === 'image' ? pvc_wm_render_image($file, $stage) : pvc_wm_render_video($file, $stage, microtime(true) + (int) $config['process_timeout']);
        // A source or logo edited while work runs must not publish obsolete output.
        $latest = (array) get_post_meta($id, $key, true);
        if (($latest['signature'] ?? '') !== $signature || !hash_equals($original_hash, hash_file('sha256', $file)) || !hash_equals($generation, pvc_wm_generation())) { throw new RuntimeException('source_changed'); }
        $directory = pvc_wm_promote($stage, $id, $fingerprint, $result['files']);
        if ($kind === 'image') { $derived = pvc_wm_register_image($id, $directory, $result, $fingerprint); $created[] = $derived; }
        else {
            $poster = pvc_wm_register_image($id, $directory, $result['poster'], $fingerprint); $created[] = $poster;
            $video_file = wp_normalize_path($directory . '/video.mp4');
            $derived = wp_insert_attachment(array('post_mime_type' => 'video/mp4', 'post_title' => get_the_title($id) . ' · PecadosVip', 'post_status' => 'inherit', 'post_parent' => 0), $video_file, 0, true);
            if (is_wp_error($derived) || !$derived) { throw new RuntimeException('attachment_error'); }
            $derived = (int) $derived; $created[] = $derived;
            update_post_meta($derived, '_pvc_watermark_source', $id); update_post_meta($derived, '_pvc_watermark_fingerprint', $fingerprint);
            pvc_wm_internal_write(1);
            try { pvc_wm_store_attachment_file($derived, $video_file); if (wp_update_attachment_metadata($derived, array('width' => $result['width'], 'height' => $result['height'], 'length' => $result['duration'], 'filesize' => filesize($video_file))) === false) { throw new RuntimeException('attachment_error'); } set_post_thumbnail($derived, $poster); }
            finally { pvc_wm_internal_write(-1); }
            $job['poster_id'] = $poster;
        }
        foreach ($created as $created_id) {
            update_post_meta($created_id, '_pvc_watermark_kind', $kind);
            $registered_file = get_attached_file($created_id, true);
            if (!$registered_file || !is_file($registered_file)) { throw new RuntimeException('attachment_error'); }
        }
        // A replacement during attachment registration must keep its newer queued
        // job. The previous metadata value makes publication an atomic compare-and-swap.
        if (!hash_equals($signature, pvc_wm_signature($id, $kind)) || !hash_equals($original_hash, hash_file('sha256', $file)) || !hash_equals($generation, pvc_wm_generation())) { throw new RuntimeException('source_changed'); }
        $job = array_merge($job, array('state' => 'ready', 'derivative_id' => $derived, 'fingerprint' => $fingerprint, 'original_sha256' => $original_hash, 'width' => $result['width'], 'height' => $result['height'], 'updated_at' => time()));
        if (!update_post_meta($id, $key, $job, $processing)) { throw new RuntimeException('source_changed'); }
        wp_clear_scheduled_hook('pvc_process_model_watermark', $event_args);
        if (function_exists('pvc_bump')) { pvc_bump(); }
    } catch (Throwable $error) {
        pvc_wm_internal_write(1);
        try { foreach ($created as $created_id) { wp_delete_attachment($created_id, true); } }
        finally { pvc_wm_internal_write(-1); }
        $latest = (array) get_post_meta($id, $key, true);
        if ($latest === $processing) {
            $job['state'] = 'error'; $job['error'] = $error->getMessage(); $job['updated_at'] = time(); unset($job['derivative_id'], $job['poster_id']);
            if (update_post_meta($id, $key, $job, $processing)) {
                wp_clear_scheduled_hook('pvc_process_model_watermark', $event_args);
                if ((int) $job['attempts'] < (int) $config['max_attempts']) { pvc_wm_schedule($id, $kind, $signature, 60 * (int) $job['attempts'], $token); }
            }
        }
    } finally { if ($stage !== '') { pvc_wm_remove_stage($stage); } flock($lock, LOCK_UN); fclose($lock); }
}

function pvc_wm_invalidate_derivative(int $attachment_id): void {
    if (pvc_wm_internal_write()) { return; }
    $source = absint(get_post_meta($attachment_id, '_pvc_watermark_source', true));
    if (!$source || get_post_type($source) !== 'attachment') { return; }
    $kind = pvc_wm_kind((string) get_post_meta($attachment_id, '_pvc_watermark_kind', true));
    $job = (array) get_post_meta($source, pvc_wm_key($kind), true);
    // Older generations own separate files and cannot affect the active result.
    if ((int) ($job['derivative_id'] ?? 0) !== $attachment_id && (int) ($job['poster_id'] ?? 0) !== $attachment_id) { return; }
    pvc_wm_queue($source, $kind, true);
}
// Replacing a source in the media library queues a new generation for an already
// managed model attachment. Other site media are not affected.
foreach (array('added_post_meta', 'updated_post_meta') as $hook) {
    add_action($hook, function($meta_id, $post_id, $key) {
        if (!in_array($key, array('_wp_attached_file', '_wp_attachment_metadata'), true) || get_post_type($post_id) !== 'attachment' || pvc_wm_internal_write()) { return; }
        $source = absint(get_post_meta($post_id, '_pvc_watermark_source', true));
        if ($source) { pvc_wm_invalidate_derivative((int) $post_id); return; }
        foreach (array('image', 'video') as $kind) { if (get_post_meta($post_id, pvc_wm_key($kind), true)) { pvc_wm_queue((int) $post_id, $kind); } }
    }, 40, 3);
}
add_filter('wp_generate_attachment_metadata', function($metadata, $attachment_id) {
    pvc_wm_invalidate_derivative((int) $attachment_id);
    return $metadata;
}, 40, 2);
add_action('delete_attachment', function($attachment_id) {
    pvc_wm_invalidate_derivative((int) $attachment_id);
}, 10);
