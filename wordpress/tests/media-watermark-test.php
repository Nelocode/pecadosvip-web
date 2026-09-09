<?php
/** Standalone: simulated WP storage/hooks; real GD and optional FFmpeg processing.
 * php tests/media-watermark-test.php --ffmpeg=/path/ffmpeg --ffprobe=/path/ffprobe
 * This is not a substitute for the real WordPress/Docker integration suite.
 */
declare(strict_types=1);
ini_set('memory_limit', '512M');
$wm_args = getopt('', array('ffmpeg:', 'ffprobe:', 'artifacts:'));
$wm_root = str_replace('\\', '/', rtrim(sys_get_temp_dir(), '/\\')) . '/pvc-watermark-test-' . bin2hex(random_bytes(8));
mkdir($wm_root, 0700); mkdir($wm_root . '/uploads');
define('ABSPATH', $wm_root . '/'); define('PVC_DIR', dirname(__DIR__) . '/plugin/pecadosvip-content');
$wm_posts = array(); $wm_meta = array(); $wm_hooks = array(); $wm_events = array(); $wm_options = array(); $wm_next_id = 100; $wm_assertions = 0; $wm_can_edit = true; $wm_config = array();
class WP_Error {}
function is_wp_error($value): bool { return $value instanceof WP_Error; }
function absint($value): int { return abs((int) $value); }
function wp_json_encode($value): string { return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); }
function wp_normalize_path($path): string { return str_replace('\\', '/', $path); }
function add_action($hook, $callback, $priority = 10, $args = 1): void { $GLOBALS['wm_hooks'][$hook][] = array($priority, $callback, $args); }
function add_filter($hook, $callback, $priority = 10, $args = 1): void { add_action($hook, $callback, $priority, $args); }
function do_action($hook, ...$args): void { $hooks = $GLOBALS['wm_hooks'][$hook] ?? array(); usort($hooks, fn($a, $b) => $a[0] <=> $b[0]); foreach ($hooks as $item) { $item[1](...array_slice($args, 0, $item[2])); } }
function apply_filters($hook, $value, ...$args) { if ($hook === 'pvc_watermark_config') { return array_merge($value, $GLOBALS['wm_config']); } foreach ($GLOBALS['wm_hooks'][$hook] ?? array() as $item) { $value = $item[1](...array_slice(array_merge(array($value), $args), 0, $item[2])); } return $value; }
function get_post_type($id) { return $GLOBALS['wm_posts'][(int) $id]['post_type'] ?? false; }
function get_post_status($id) { return $GLOBALS['wm_posts'][(int) $id]['post_status'] ?? false; }
function get_post_mime_type($id) { return $GLOBALS['wm_posts'][(int) $id]['post_mime_type'] ?? false; }
function get_the_title($id): string { return $GLOBALS['wm_posts'][(int) $id]['post_title'] ?? ''; }
function get_post_meta($id, $key, $single = true) { return $GLOBALS['wm_meta'][(int) $id][$key] ?? ''; }
function update_post_meta($id, $key, $value, $previous = ''): bool {
    if (!empty($GLOBALS['wm_before_meta'])) { $GLOBALS['wm_before_meta']($id, $key, $value, $previous); }
    if ($previous !== '' && get_post_meta($id, $key) !== $previous) { return false; }
    $exists = array_key_exists($key, $GLOBALS['wm_meta'][(int) $id] ?? array()); $GLOBALS['wm_meta'][(int) $id][$key] = $value; do_action($exists ? 'updated_post_meta' : 'added_post_meta', 1, (int) $id, $key, $value); return true;
}
function get_post_thumbnail_id($id): int { return (int) get_post_meta($id, '_thumbnail_id'); }
function set_post_thumbnail($id, $image): void { update_post_meta($id, '_thumbnail_id', (int) $image); }
function get_attached_file($id, $unfiltered = false) {
    $file = get_post_meta($id, '_wp_attached_file');
    if ($file === '') { return $GLOBALS['wm_posts'][(int) $id]['file'] ?? false; } // Existing fixture uploads.
    // Match WordPress: a C:/ path is not treated as native Windows absolute here.
    return !str_starts_with($file, '/') && !preg_match('|^.:\\\\|', $file) ? wp_get_upload_dir()['basedir'] . '/' . $file : $file;
}
function wp_get_upload_dir(): array { $root = $GLOBALS['wm_root']; if (DIRECTORY_SEPARATOR === '\\') { $root = str_replace('/', '\\', $root); } return array('basedir' => $root . '/uploads', 'baseurl' => 'https://example.test/uploads', 'error' => false); }
function _wp_relative_upload_path($file): string { $basedir = wp_get_upload_dir()['basedir']; return str_starts_with($file, $basedir) ? ltrim(substr($file, strlen($basedir)), '/') : $file; }
function wp_get_attachment_url($id) { $file = get_post_meta($id, '_wp_attached_file'); if ($file === '') { $file = _wp_relative_upload_path(get_attached_file($id)); } return $file ? wp_get_upload_dir()['baseurl'] . '/' . $file : false; }
function wp_attachment_is_image($id): bool { return str_starts_with((string) get_post_mime_type($id), 'image/'); }
function wp_get_attachment_image_src($id, $size) { $file = get_attached_file($id); $image = $file && is_file($file) ? @getimagesize($file) : false; return $image ? array(wp_get_attachment_url($id), $image[0], $image[1]) : false; }
function wp_insert_attachment($post, $file, $parent = 0, $error = false) {
    // WordPress unslashes wp_insert_post inputs. Native Windows backslashes must
    // be normalized before registration, or the persisted file path is corrupted.
    $id = ++$GLOBALS['wm_next_id']; $GLOBALS['wm_posts'][$id] = array_merge($post, array('post_type' => 'attachment', 'file' => stripslashes($file)));
    if (str_contains(wp_normalize_path($file), '/pvc-watermarked/')) { $GLOBALS['wm_meta'][$id]['_wp_attached_file'] = _wp_relative_upload_path(stripslashes($file)); }
    if (!empty($GLOBALS['wm_after_insert'])) { $GLOBALS['wm_after_insert']($id); } return $id;
}
function wp_update_attachment_metadata($id, $metadata): bool { return update_post_meta($id, '_wp_attachment_metadata', $metadata); }
function wp_delete_attachment($id, $force): void { do_action('delete_attachment', (int) $id); $file = get_attached_file($id); $metadata = (array) get_post_meta($id, '_wp_attachment_metadata'); foreach ($metadata['sizes'] ?? array() as $size) { $path = dirname($file) . '/' . $size['file']; if (is_file($path)) { unlink($path); } } if ($file && is_file($file)) { unlink($file); } unset($GLOBALS['wm_posts'][$id], $GLOBALS['wm_meta'][$id]); }
function wp_mkdir_p($dir): bool { return is_dir($dir) || mkdir($dir, 0755, true); }
function wp_raise_memory_limit($context): void {}
function pvc_bump(): void {}
function current_user_can(...$args): bool { return $GLOBALS['wm_can_edit']; }
function wp_next_scheduled($hook, $args) { return $GLOBALS['wm_events'][$hook . ':' . serialize($args)] ?? false; }
function wp_schedule_single_event($time, $hook, $args): void { $GLOBALS['wm_events'][$hook . ':' . serialize($args)] = $time; }
function wp_clear_scheduled_hook($hook, $args): void { unset($GLOBALS['wm_events'][$hook . ':' . serialize($args)]); }
function get_option($key, $default = false) { return $GLOBALS['wm_options'][$key] ?? $default; }
function update_option($key, $value, $autoload = false): void { $GLOBALS['wm_options'][$key] = $value; }
function get_posts($args): array { $ids = array(); foreach ($GLOBALS['wm_posts'] as $id => $post) { if ($post['post_type'] === ($args['post_type'] ?? '') && in_array($post['post_status'], (array) ($args['post_status'] ?? array()), true)) { $ids[] = $id; } } sort($ids); return array_slice($ids, $args['offset'] ?? 0, $args['posts_per_page'] ?? null); }
function wp_get_registered_image_subsizes(): array { return array('thumbnail' => array('width' => 150, 'height' => 150, 'crop' => true), 'portrait' => array('width' => 120, 'height' => 200, 'crop' => true), 'medium' => array('width' => 320, 'height' => 0, 'crop' => false)); }
class WM_Test_Image_Editor {
    public function __construct(private string $file) {}
    public function multi_resize(array $sizes): array {
        $info = getimagesize($this->file); $result = array();
        foreach ($sizes as $key => $size) {
            $w = $size['width']; $h = $size['height'];
            if (!$h) { $h = max(1, (int) round($info[1] * $w / $info[0])); }
            if ($w >= $info[0] && $h >= $info[1]) { continue; }
            $input = pvc_wm_load_image($this->file); $output = imagecreatetruecolor($w, $h); imagealphablending($output, false); imagesavealpha($output, true); imagefill($output, 0, 0, imagecolorallocatealpha($output, 0, 0, 0, 127));
            $crop_w = $info[0]; $crop_h = $info[1];
            if ($size['crop']) { if ($crop_w / $crop_h > $w / $h) { $crop_w = (int) round($crop_h * $w / $h); } else { $crop_h = (int) round($crop_w * $h / $w); } }
            imagecopyresampled($output, $input, 0, 0, (int) (($info[0] - $crop_w) / 2), (int) (($info[1] - $crop_h) / 2), $w, $h, $crop_w, $crop_h);
            $name = pathinfo($this->file, PATHINFO_FILENAME) . '-' . $w . 'x' . $h . '.' . pathinfo($this->file, PATHINFO_EXTENSION);
            pvc_wm_save_image($output, dirname($this->file) . '/' . $name, $info['mime']); imagedestroy($input); imagedestroy($output);
            $result[$key] = array('file' => $name, 'width' => $w, 'height' => $h, 'mime-type' => $info['mime']);
        }
        return $result;
    }
}
function wp_get_image_editor($file): WM_Test_Image_Editor { return new WM_Test_Image_Editor($file); }
require PVC_DIR . '/includes/media-watermark.php';
function wm_check(bool $condition, string $message): void { $GLOBALS['wm_assertions']++; if (!$condition) { throw new RuntimeException($message); } }
function wm_source(string $extension): int {
    $mime = array('jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp')[$extension];
    $file = $GLOBALS['wm_root'] . '/uploads/portrait & space ' . ++$GLOBALS['wm_next_id'] . '.' . $extension;
    $image = imagecreatetruecolor(800, 600); imagefill($image, 0, 0, imagecolorallocate($image, 20, 30, 40)); pvc_wm_save_image($image, $file, $mime); imagedestroy($image);
    return wp_insert_attachment(array('post_mime_type' => $mime, 'post_status' => 'inherit', 'post_title' => 'Fixture'), $file);
}
function wm_run(int $id, string $kind = 'image'): void { $job = (array) get_post_meta($id, pvc_wm_key($kind)); pvc_watermark_process($id, $kind, $job['signature'] ?? ''); }
function wm_mark_present(string $file): bool {
    $image = pvc_wm_load_image($file); $found = 0;
    for ($y = (int) (imagesy($image) * .65); $y < imagesy($image); $y += 2) { for ($x = (int) (imagesx($image) * .65); $x < imagesx($image); $x += 2) { $pixel = imagecolorat($image, $x, $y); $r = ($pixel >> 16) & 255; $g = ($pixel >> 8) & 255; if ($r > 130 && $r > $g + 40) { $found++; } } }
    imagedestroy($image); return $found > 5;
}
function wm_check_indexed_png_background(): void {
    $config = $GLOBALS['wm_config']; $GLOBALS['wm_config']['logo'] = PVC_DIR . '/assets/pecadosvip-watermark.png';
    $results = array();
    try {
        foreach (array('indexed', 'truecolor') as $kind) {
            $image = $kind === 'indexed' ? imagecreate(150, 150) : imagecreatetruecolor(150, 150);
            imagefill($image, 0, 0, imagecolorallocate($image, 20, 30, 50));
            $file = $GLOBALS['wm_root'] . '/' . $kind . '-thumbnail.png'; imagepng($image, $file); imagedestroy($image);
            $input = imagecreatefrompng($file);
            wm_check(imageistruecolor($input) === ($kind === 'truecolor'), 'Regression fixture must exercise both indexed and truecolor PNG decoding.');
            imagedestroy($input); pvc_wm_mark_image($file); $results[$kind] = imagecreatefrompng($file);
        }
        $background = 0; $mark = 0; $preserved = true; $equivalent = true;
        for ($y = 0; $y < 150; $y++) { for ($x = 0; $x < 150; $x++) {
            $expected = imagecolorsforindex($results['truecolor'], imagecolorat($results['truecolor'], $x, $y));
            $actual = imagecolorsforindex($results['indexed'], imagecolorat($results['indexed'], $x, $y));
            if ($expected === array('red' => 20, 'green' => 30, 'blue' => 50, 'alpha' => 0)) {
                $background++; if ($actual !== $expected) { $preserved = false; }
            } else { $mark++; }
            if ($actual !== $expected) { $equivalent = false; }
        } }
        wm_check($background > 0 && $mark > 5, 'Reference thumbnail must contain both untouched background and a visible real brand mark.');
        wm_check($preserved, 'Indexed PNG must preserve the opaque background beneath transparent parts of the watermark.');
        wm_check($equivalent, 'Indexed PNG alpha compositing must match the equivalent truecolor thumbnail.');
    } finally {
        foreach ($results as $image) { imagedestroy($image); }
        $GLOBALS['wm_config'] = $config;
    }
}
function wm_clean(string $dir): void {
    $real = realpath($dir); $root = realpath($GLOBALS['wm_root']);
    if (!$real || !$root || ($real !== $root && !pvc_wm_under($real, $root))) { throw new RuntimeException('Unsafe fixture cleanup'); }
    foreach (scandir($real) as $name) { if ($name === '.' || $name === '..') { continue; } $path = $real . '/' . $name; if (is_link($path)) { unlink($path); } elseif (is_dir($path)) { wm_clean($path); } else { unlink($path); } } rmdir($real);
}
$wm_results = array();
try {
    wm_check(extension_loaded('gd') && function_exists('exif_read_data'), 'GD and EXIF are required for this test.');
    wm_check_indexed_png_background();
    $wm_results[] = 'Indexed PNG thumbnail: transparent logo areas preserve the original opaque background and match truecolor compositing';
    $logo = imagecreatetruecolor(240, 60); imagefill($logo, 0, 0, imagecolorallocate($logo, 255, 0, 0)); imagestring($logo, 4, 40, 20, 'PecadosVip', imagecolorallocate($logo, 255, 255, 255)); imagepng($logo, $wm_root . '/logo.png'); imagedestroy($logo);
    $wm_config = array('logo' => $wm_root . '/logo.png', 'opacity' => .9, 'ffmpeg' => $wm_args['ffmpeg'] ?? '/usr/bin/ffmpeg', 'ffprobe' => $wm_args['ffprobe'] ?? '/usr/bin/ffprobe');
    $wm_posts[1] = array('post_type' => 'pv_profile', 'post_status' => 'publish');
    $wm_posts[2] = array('post_type' => 'pv_city', 'post_status' => 'publish');
    $wm_posts[3] = array('post_type' => 'pv_profile', 'post_status' => 'trash');
    foreach (array('jpg', 'png', 'webp') as $format) {
        $source = wm_source($format); $before = hash_file('sha256', get_attached_file($source));
        set_post_thumbnail(1, $source);
        wm_check(pvc_watermark_status($source)['state'] === 'queued', 'Profile attachment metadata must enqueue work.');
        wm_check(pvc_watermark_media($source) === null, 'A queued original must not be exposed as public media.');
        wm_check(hash_file('sha256', get_attached_file($source)) === $before, 'Queueing must not transform the upload inline.');
        wm_run($source); $media = pvc_watermark_media($source);
        wm_check($media !== null && $media['id'] !== $source, 'Image processing must produce a separate ready attachment: ' . $format . ' / ' . wp_json_encode(get_post_meta($source, pvc_wm_key('image'))));
        wm_check(str_starts_with(get_post_meta($media['id'], '_wp_attached_file'), 'pvc-watermarked/'), 'Image attachment path must be stored relative to mixed-separator uploads.');
        wm_check(hash_file('sha256', get_attached_file($source)) === $before, 'Original image hash changed.');
        wm_check(wm_mark_present(get_attached_file($media['id'])), 'Full image must contain the watermark.');
        $metadata = get_post_meta($media['id'], '_wp_attachment_metadata');
        wm_check(count($metadata['sizes']) === 3, 'Expected three generated image sizes.');
        foreach ($metadata['sizes'] as $size) { wm_check(wm_mark_present(dirname(get_attached_file($media['id'])) . '/' . $size['file']), 'Every crop and resized image must contain its own mark.'); }
        $derived_id = $media['id']; $derived_hash = hash_file('sha256', get_attached_file($derived_id)); pvc_watermark_queue_profile(1); wm_run($source);
        wm_check(pvc_watermark_media($source)['id'] === $derived_id && hash_file('sha256', get_attached_file($derived_id)) === $derived_hash, 'Repeated saves must not duplicate or deepen the mark.');
        update_post_meta($source, '_wp_attachment_image_alt', 'Updated accessible description');
        wm_check(pvc_watermark_media($source)['alt'] === 'Updated accessible description', 'Alt edits must be reflected without re-encoding.');
        // Editing a derived attachment can crop away its corner. Its metadata must invalidate readiness.
        update_post_meta($derived_id, '_wp_attachment_metadata', $metadata);
        wm_check(pvc_watermark_media($source) === null && pvc_watermark_status($source)['state'] === 'queued', 'Derivative edits must invalidate the public media.');
        wm_run($source); wm_check(pvc_watermark_media($source) !== null, 'A derivative edit must be recoverable from the untouched original.');
        $new_media = pvc_watermark_media($source);
        wm_check(get_attached_file($new_media['id']) !== get_attached_file($derived_id), 'Generations must not share files across separately deletable attachments.');
        wp_delete_attachment($derived_id, true);
        wm_check(pvc_watermark_media($source)['id'] === $new_media['id'], 'Deleting an obsolete attachment must preserve the active marked generation.');
        pvc_watermark_retry_profile(1);
        wm_check(pvc_watermark_media($source)['id'] === $new_media['id'], 'Manual retry must preserve ready media.');
    }
    $wm_results[] = 'JPG/PNG/WebP: deferred work, originals, full+all crop sizes, idempotence, live alt and derivative-edit recovery';
    $unrelated = wm_source('png'); set_post_thumbnail(2, $unrelated); set_post_thumbnail(3, $unrelated);
    wm_check(pvc_watermark_status($unrelated)['state'] === 'not_queued', 'City and trashed-profile uploads must not be processed.');
    $source = wm_source('jpg'); update_post_meta(1, 'pv_data', array('gallery' => array($source, $source), 'videos' => array()));
    $job = get_post_meta($source, pvc_wm_key('image')); $signature = $job['signature'];
    $lock = fopen($wm_root . '/uploads/pvc-watermarked/.worker.lock', 'c'); flock($lock, LOCK_EX | LOCK_NB); wm_run($source); flock($lock, LOCK_UN); fclose($lock);
    wm_check(pvc_watermark_status($source)['attempts'] === 0, 'A busy worker lock must not consume an attempt.');
    $wm_config['version'] = 'fixture-v2'; pvc_watermark_queue_profile(1); pvc_watermark_process($source, 'image', $signature);
    wm_check(pvc_watermark_status($source)['attempts'] === 0, 'A stale generation must not execute.');
    wm_run($source); $media = pvc_watermark_media($source); wm_check($media !== null, 'Current generation must succeed.');
    $old_derived = $media['id']; $original_sha = hash_file('sha256', get_attached_file($source));
    $wm_config['version'] = 'fixture-v3'; pvc_watermark_queue_profile(1);
    wm_check(pvc_watermark_status($source)['state'] === 'queued' && pvc_watermark_media($source) === null, 'A new generation must requeue already-ready media without serving its obsolete derivative.');
    wm_run($source); $media = pvc_watermark_media($source);
    wm_check($media !== null && $media['id'] !== $old_derived && hash_file('sha256', get_attached_file($source)) === $original_sha, 'A new generation must replace ready derivatives while preserving original bytes.');
    pvc_watermark_queue_profile(1); wm_run($source);
    wm_check(pvc_watermark_media($source)['id'] === $media['id'], 'Saving after a generation upgrade must preserve the same ready derivative.');
    wp_delete_attachment($media['id'], true); wm_check(pvc_watermark_media($source) === null, 'Deleting a derivative must stop public resolution.'); wm_run($source); wm_check(pvc_watermark_media($source) !== null, 'Deleted derivative must be recreated automatically.');
    $wm_can_edit = false; wm_check(!pvc_watermark_retry_profile(1), 'Retry must require edit capability.'); $wm_can_edit = true;
    $retry_source = wm_source('png'); set_post_thumbnail(1, $retry_source);
    $retry_job = get_post_meta($retry_source, pvc_wm_key('image'));
    $retry_args = array($retry_source, 'image', $retry_job['signature'], $retry_job['token']);
    wp_clear_scheduled_hook('pvc_process_model_watermark', $retry_args); pvc_watermark_retry_profile(1);
    wm_check((bool) wp_next_scheduled('pvc_process_model_watermark', $retry_args), 'Retry must restore a queued job whose event disappeared.');
    $retry_job['state'] = 'processing'; $retry_job['attempts'] = 3; update_post_meta($retry_source, pvc_wm_key('image'), $retry_job); pvc_watermark_retry_profile(1);
    wm_check(get_post_meta($retry_source, pvc_wm_key('image')) === $retry_job, 'Retry must leave an active processor alone.');
    $retry_job['updated_at'] = time() - 1000; update_post_meta($retry_source, pvc_wm_key('image'), $retry_job); pvc_watermark_retry_profile(1);
    wm_check(pvc_watermark_status($retry_source)['state'] === 'queued' && pvc_watermark_status($retry_source)['attempts'] === 0, 'Retry must reset attempts for an abandoned processor.');
    // Requeue with the same source signature during registration; CAS must preserve
    // the new token and its event, and delete only the losing worker's attachments.
    $race_source = wm_source('jpg'); set_post_thumbnail(1, $race_source);
    $race_old = get_post_meta($race_source, pvc_wm_key('image')); $race_count = count($wm_posts);
    $wm_after_insert = function($id) use ($race_source): void { $GLOBALS['wm_after_insert'] = null; pvc_wm_queue($race_source, 'image', true); };
    wm_run($race_source); $race_new = get_post_meta($race_source, pvc_wm_key('image'));
    wm_check($race_new['state'] === 'queued' && $race_new['token'] !== $race_old['token'] && count($wm_posts) === $race_count, 'Concurrent registration must not replace a newer job or leave a losing attachment.');
    wm_check((bool) wp_next_scheduled('pvc_process_model_watermark', array($race_source, 'image', $race_new['signature'], $race_new['token'])), 'The new event must survive cleanup of the old worker.');
    pvc_watermark_process($race_source, 'image', $race_old['signature'], $race_old['token']);
    wm_check(get_post_meta($race_source, pvc_wm_key('image')) === $race_new, 'A stale watchdog token must not run the new job.');
    wm_run($race_source); wm_check(pvc_watermark_media($race_source) !== null, 'The new job must recover after a losing concurrent worker.');
    // Exercise the atomic metadata comparison itself, after the final source check.
    pvc_wm_queue($race_source, 'image', true);
    $wm_before_meta = function($id, $key, $value, $previous) use ($race_source): void {
        if ($id === $race_source && $key === pvc_wm_key('image') && is_array($value) && ($value['state'] ?? '') === 'ready') { $GLOBALS['wm_before_meta'] = null; pvc_wm_queue($race_source, 'image', true); }
    };
    wm_run($race_source); wm_check(pvc_watermark_status($race_source)['state'] === 'queued' && pvc_watermark_media($race_source) === null, 'Atomic publication must not overwrite a concurrent queued job.'); wm_run($race_source); wm_check(pvc_watermark_media($race_source) !== null, 'CAS loser must leave the new job recoverable.');
    $bad_file = $wm_root . '/uploads/corrupt.jpg'; file_put_contents($bad_file, 'not an image'); $bad = wp_insert_attachment(array('post_mime_type' => 'image/jpeg', 'post_status' => 'inherit'), $bad_file);
    set_post_thumbnail(1, $bad); for ($i = 0; $i < 4; $i++) { wm_run($bad); }
    wm_check(pvc_watermark_status($bad)['state'] === 'error' && pvc_watermark_status($bad)['attempts'] === 3 && pvc_watermark_media($bad) === null, 'Failed jobs must stop after three attempts and never fall back to the original.');
    $failed = get_post_meta($bad, pvc_wm_key('image')); $failed['state'] = 'processing'; update_post_meta($bad, pvc_wm_key('image'), $failed); wm_run($bad);
    wm_check(pvc_watermark_status($bad)['state'] === 'error', 'Exhausted watchdog must not leave processing forever.');
    $outside = $wm_root . '/outside.jpg'; copy(get_attached_file($source), $outside); $outside_id = wp_insert_attachment(array('post_mime_type' => 'image/jpeg', 'post_status' => 'inherit'), $outside); set_post_thumbnail(1, $outside_id);
    wm_check(pvc_watermark_status($outside_id)['state'] === 'error', 'A source outside the uploads root must be rejected.');
    $wm_results[] = 'scope, shared-file lock, stale tokens, deletion recovery, selective retry, atomic publication races, permissions, bounded retries/watchdog and source path boundary';
    $start = microtime(true); $timed_out = false; try { pvc_wm_exec(array(PHP_BINARY, '-r', 'sleep(5);'), 1); } catch (RuntimeException $error) { $timed_out = $error->getMessage() === 'video_timeout'; }
    wm_check($timed_out && microtime(true) - $start < 4, 'Subprocess timeout must terminate the child promptly.');
    if (is_file($wm_config['ffmpeg']) && is_file($wm_config['ffprobe'])) {
        foreach (array(true, false) as $with_audio) {
            $video_path = $wm_root . '/uploads/clip & space ' . ($with_audio ? 'audio' : 'silent') . '.mp4';
            $args = array($wm_config['ffmpeg'], '-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=0x142030:s=480x640:d=1.2:r=24');
            if ($with_audio) { $args = array_merge($args, array('-f', 'lavfi', '-i', 'sine=frequency=800:duration=1.2', '-c:a', 'aac', '-shortest')); }
            $args = array_merge($args, array('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-threads', '1', $video_path)); pvc_wm_exec($args, 30);
            $video = wp_insert_attachment(array('post_mime_type' => 'video/mp4', 'post_status' => 'inherit', 'post_title' => 'Video fixture'), $video_path); $before = hash_file('sha256', $video_path);
            update_post_meta(1, 'pv_data', array('gallery' => array(), 'videos' => array($video)));
            wm_check(pvc_watermark_media($video, 'video') === null, 'Queued video must not resolve to its source.'); wm_run($video, 'video'); $media = pvc_watermark_media($video, 'video');
            wm_check($media !== null && $media['mime'] === 'video/mp4' && $media['id'] !== $video, 'Video processing failed: ' . wp_json_encode(get_post_meta($video, pvc_wm_key('video'))));
            wm_check(str_starts_with(get_post_meta($media['id'], '_wp_attached_file'), 'pvc-watermarked/') && str_starts_with(get_post_meta($media['poster']['id'], '_wp_attached_file'), 'pvc-watermarked/'), 'Video and poster attachment paths must be stored relative to mixed-separator uploads.');
            wm_check(hash_file('sha256', $video_path) === $before, 'Original video changed.');
            $probe = pvc_wm_probe(get_attached_file($media['id'])); wm_check($probe['audio'] === $with_audio && $probe['width'] === 480 && $probe['height'] === 640, 'Video must retain audio presence and portrait aspect.');
            $frame = $wm_root . '/frame.jpg'; pvc_wm_exec(array($wm_config['ffmpeg'], '-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-ss', '0.6', '-i', get_attached_file($media['id']), '-frames:v', '1', $frame), 20);
            wm_check(wm_mark_present($frame), 'Watermark must be burned into video pixels.');
            wm_check(wm_mark_present(get_attached_file($media['poster']['id'])), 'Video poster must contain the mark.');
            $poster_meta = get_post_meta($media['poster']['id'], '_wp_attachment_metadata'); foreach ($poster_meta['sizes'] as $size) { wm_check(wm_mark_present(dirname(get_attached_file($media['poster']['id'])) . '/' . $size['file']), 'Video poster crops must contain a mark.'); }
            update_post_meta($media['poster']['id'], '_wp_attachment_metadata', $poster_meta); wm_check(pvc_watermark_media($video, 'video') === null, 'Poster edits must invalidate the video generation.'); wm_run($video, 'video'); wm_check(pvc_watermark_media($video, 'video') !== null, 'Poster-edit recovery failed.');
            $wm_config['video_max_seconds'] = .5; pvc_wm_queue($video, 'video', true); wm_run($video, 'video'); wm_check(pvc_watermark_status($video, 'video')['state'] === 'error' && pvc_watermark_media($video, 'video') === null, 'Overlong videos must be rejected without source fallback.'); unset($wm_config['video_max_seconds']);
        }
        $wm_results[] = 'Real FFmpeg: portrait video with/without audio, burned-in frame, full+cropped posters, source SHA, poster-edit recovery and duration limit';
    } else { $wm_results[] = 'SKIPPED: FFmpeg binary paths were not supplied or unavailable'; }
    if (!empty($wm_args['artifacts'])) {
        $artifacts = rtrim($wm_args['artifacts'], '/\\'); if (!wp_mkdir_p($artifacts)) { throw new RuntimeException('Cannot create artifact directory.'); }
        // Optional review artifacts use the real brand mark and synthetic media.
        // They contain no uploaded customer media and are safe to keep after tests.
        $wm_config['logo'] = PVC_DIR . '/assets/pecadosvip-watermark.png';
        $sample = wm_source('jpg'); set_post_thumbnail(1, $sample); wm_run($sample); $sample_media = pvc_watermark_media($sample);
        wm_check($sample_media !== null, 'Actual brand asset must render successfully.');
        copy(get_attached_file($sample_media['id']), $artifacts . '/imagen-sintetica-marcada.jpg');
        $sample_meta = get_post_meta($sample_media['id'], '_wp_attachment_metadata');
        copy(dirname(get_attached_file($sample_media['id'])) . '/' . $sample_meta['sizes']['thumbnail']['file'], $artifacts . '/miniatura-marcada.jpg');
        if (!empty($video)) {
            pvc_wm_queue($video, 'video', true); wm_run($video, 'video'); $sample_video = pvc_watermark_media($video, 'video'); wm_check($sample_video !== null, 'Actual brand asset must render onto video.');
            copy(get_attached_file($sample_video['id']), $artifacts . '/video-sintetico-marcado.mp4');
            copy(get_attached_file($sample_video['poster']['id']), $artifacts . '/portada-video-marcada.jpg');
            pvc_wm_exec(array($wm_config['ffmpeg'], '-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-ss', '0.6', '-i', get_attached_file($sample_video['id']), '-frames:v', '1', $artifacts . '/fotograma-video-marcado.jpg'), 20);
        }
        $wm_results[] = 'Review artifacts: real apple + PecadosVip brand mark on synthetic image, cropped thumbnail and video';
    }
    $report = array('ok' => true, 'assertions' => $wm_assertions, 'php' => PHP_VERSION, 'storage' => 'WordPress stubs; real GD and FFmpeg transformations', 'checks' => $wm_results);
    if (!empty($artifacts)) { file_put_contents($artifacts . '/resultado-backend.json', json_encode($report, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL); }
    echo wp_json_encode($report) . PHP_EOL;
} finally { wm_clean($wm_root); }
