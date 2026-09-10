<?php
/** Disposable Linux WordPress integration fixtures: no remote media or production data. */
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { exit(1); }
require '/var/www/html/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
$wm_phase = $argv[1] ?? '';
$wm_assertions = 0;
function wm_qa_assert(bool $condition, string $message): void {
    $GLOBALS['wm_assertions']++;
    if (!$condition) { throw new RuntimeException($message); }
}
wm_qa_assert(wp_get_environment_type() === 'local', 'Only the local QA environment is permitted.');
wm_qa_assert(defined('DISABLE_WP_CRON') && DISABLE_WP_CRON, 'QA must disable request-spawned cron workers.');
wm_qa_assert(home_url() === 'http://127.0.0.1:8088', 'Only the isolated loopback QA database is permitted.');
wm_qa_assert(in_array($wm_phase, array('prepare', 'verify', 'cleanup'), true), 'Unknown QA phase.');
wm_qa_assert(function_exists('pvc_watermark_process'), 'Watermark plugin must be active.');
$wm_admin = get_user_by('login', 'pecadosvip_qa');
wm_qa_assert((bool) $wm_admin, 'Disposable QA administrator is required.');
wp_set_current_user($wm_admin->ID);

function wm_qa_save(array $fixture): void { update_option('pvc_watermark_qa_fixture', $fixture, false); }
function wm_qa_attachment(string $file, string $mime, array &$fixture): int {
    $id = wp_insert_attachment(array('post_title' => 'QA watermark generated fixture', 'post_mime_type' => $mime, 'post_status' => 'inherit'), $file, 0, true);
    wm_qa_assert(!is_wp_error($id) && $id > 0, 'Cannot register disposable fixture attachment.');
    $fixture['sources'][] = $id;
    update_post_meta($id, '_pvc_watermark_qa_fixture', $fixture['token']);
    wm_qa_save($fixture);
    if (str_starts_with($mime, 'image/')) { wp_update_attachment_metadata($id, wp_generate_attachment_metadata($id, $file)); }
    return $id;
}
function wm_qa_mark_visible(string $file, string $kind = 'image'): bool {
    $image = pvc_wm_load_image($file); $marked = 0; $opaque = true;
    // Fixture is uniform dark blue. Gold/ivory high-luminance pixels must occur
    // in the photo corner or the lower center of a video and its poster crops.
    $area = $kind === 'video' ? array(.20, .60, .80, .85) : array(.60, .65, 1, 1);
    for ($y = (int) (imagesy($image) * $area[1]); $y < imagesy($image) * $area[3]; $y += 2) {
        for ($x = (int) (imagesx($image) * $area[0]); $x < imagesx($image) * $area[2]; $x += 2) {
            // Imagick can emit indexed PNG crops. imagecolorat then returns a
            // palette index, not packed RGB; resolve either representation.
            $color = imagecolorsforindex($image, imagecolorat($image, $x, $y));
            // The fixture is opaque: a transparent logo must never punch holes
            // in the original background, even on an indexed WordPress crop.
            if ($color['alpha'] !== 0) { $opaque = false; }
            if ($color['red'] > 115 && $color['green'] > 85) { $marked++; }
        }
    }
    imagedestroy($image); return $marked > 5 && $opaque;
}
function wm_qa_check_image(int $id, string $kind = 'image'): void {
    $file = get_attached_file($id);
    wm_qa_assert(is_file($file) && wm_qa_mark_visible($file, $kind), 'Full-size photo/poster must contain the visible mark and preserve its opaque background.');
    $metadata = wp_get_attachment_metadata($id);
    wm_qa_assert(!empty($metadata['sizes']['thumbnail']), 'A real WordPress cropped thumbnail must exist.');
    foreach ($metadata['sizes'] as $name => $size) {
        wm_qa_assert(wm_qa_mark_visible(dirname($file) . '/' . $size['file'], $kind), 'Generated image subsize must retain the mark and opaque background after cropping: ' . $name . ' (' . $size['width'] . 'x' . $size['height'] . ').');
    }
}
function wm_qa_process(int $id, string $kind, array &$fixture): array {
    $job = (array) get_post_meta($id, pvc_wm_key($kind), true);
    wm_qa_assert(!empty($job['signature']), 'Saving profile metadata must queue its media automatically.');
    wm_qa_assert(wp_next_scheduled('pvc_process_model_watermark', array($id, $kind, $job['signature'], $job['token'])) !== false, 'A real WP-Cron event must be queued.');
    $deadline = time() + 120;
    do {
        // Execute the real registered cron callback for this fixture only.
        do_action('pvc_process_model_watermark', $id, $kind, $job['signature'], $job['token']);
        $status = pvc_watermark_status($id, $kind);
        if ($status['state'] === 'ready') { break; }
        if ($status['state'] === 'error') { throw new RuntimeException('Fixture processing failed: ' . $status['message']); }
        sleep(1);
    } while (time() < $deadline);
    wm_qa_assert($status['state'] === 'ready', 'Real image/video processing must reach ready.');
    $media = pvc_watermark_media($id, $kind);
    wm_qa_assert(is_array($media) && $media['id'] !== $id, 'A separate marked derivative is required.');
    foreach (array_filter(array($media['id'], $media['poster']['id'] ?? 0)) as $derived) {
        $fixture['derivatives'][] = $derived;
        update_post_meta($derived, '_pvc_watermark_qa_fixture', $fixture['token']);
    }
    wm_qa_save($fixture);
    return $media;
}
function wm_qa_cleanup(array $fixture): void {
    if (!$fixture) { return; }
    foreach (array_merge($fixture['posts'] ?? array(), $fixture['derivatives'] ?? array(), $fixture['sources'] ?? array()) as $id) {
        if (!get_post($id)) { continue; }
        wm_qa_assert(get_post_meta($id, '_pvc_watermark_qa_fixture', true) === $fixture['token'], 'Refusing to delete an attachment outside this fixture.');
        if (get_post_type($id) === 'attachment') { wp_delete_attachment($id, true); }
        else { wp_delete_post($id, true); }
    }
    foreach ($fixture['temporaryFiles'] ?? array() as $file) {
        $root = realpath(wp_get_upload_dir()['basedir']); $real = realpath($file);
        if ($real && $root && pvc_wm_under($real, $root) && str_starts_with(basename($real), 'qa-watermark-' . $fixture['token'])) { unlink($real); }
    }
    delete_option('pvc_watermark_qa_fixture');
}

$wm_fixture = (array) get_option('pvc_watermark_qa_fixture', array());
if ($wm_phase === 'cleanup') {
    wm_qa_cleanup($wm_fixture);
    echo 'PVC_WATERMARK_QA:' . wp_json_encode(array('phase' => $wm_phase, 'passed' => true, 'assertions' => $wm_assertions)) . PHP_EOL;
    exit;
}
wm_qa_assert(extension_loaded('gd') && extension_loaded('exif'), 'GD/EXIF must be installed in the Apache runtime.');
$wm_config = pvc_watermark_config();
wm_qa_assert(is_executable($wm_config['ffmpeg']) && is_executable($wm_config['ffprobe']), 'Production FFmpeg/FFprobe paths must work unchanged.');
if ($wm_phase === 'prepare') {
    wm_qa_assert(!$wm_fixture, 'Clean up the previous disposable fixture before preparing another.');
    $wm_fixture = array('token' => bin2hex(random_bytes(8)), 'sources' => array(), 'derivatives' => array(), 'posts' => array(), 'temporaryFiles' => array());
    wm_qa_save($wm_fixture);
    $uploads = wp_upload_dir();
    wm_qa_assert(empty($uploads['error']), 'QA uploads must be writable by www-data.');
    $prefix = $uploads['path'] . '/qa-watermark-' . $wm_fixture['token'];
    $image = imagecreatetruecolor(1200, 800); imagefill($image, 0, 0, imagecolorallocate($image, 20, 30, 50));
    imagepng($image, $prefix . '-source.png'); imagedestroy($image);
    $wm_fixture['temporaryFiles'][] = $prefix . '-source.png'; wm_qa_save($wm_fixture);
    $image_id = wm_qa_attachment($prefix . '-source.png', 'image/png', $wm_fixture);
    pvc_wm_exec(array($wm_config['ffmpeg'], '-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=0x141e32:s=640x360:r=24:d=1', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', $prefix . '-source.mp4'), 30);
    $wm_fixture['temporaryFiles'][] = $prefix . '-source.mp4'; wm_qa_save($wm_fixture);
    $video_id = wm_qa_attachment($prefix . '-source.mp4', 'video/mp4', $wm_fixture);
    $wm_fixture['imageSource'] = $image_id; $wm_fixture['videoSource'] = $video_id;
    foreach ($wm_fixture['sources'] as $id) { $wm_fixture['sourceHashes'][$id] = hash_file('sha256', get_attached_file($id)); }
    $key = 'qa-watermark-' . $wm_fixture['token']; $wm_fixture['key'] = $key; wm_qa_save($wm_fixture);
    $post = wp_insert_post(array('post_type' => 'pv_profile', 'post_status' => 'publish', 'post_title' => 'QA WATERMARK GENERATED FIXTURE', 'post_name' => $key, 'post_content' => '<p>Disposable generated color fixture.</p>', 'meta_input' => array('pv_locale' => 'es', 'pv_key' => $key, '_pvc_watermark_qa_fixture' => $wm_fixture['token'], 'pv_data' => array('synthetic' => true, 'age' => 30, 'homeZone' => 'madrid', 'cities' => array('madrid'), 'availability' => 'unavailable', 'gallery' => array($image_id), 'videos' => array($video_id)))), true);
    wm_qa_assert(!is_wp_error($post) && $post > 0, 'Cannot create the disposable profile.');
    $wm_fixture['posts'][] = $post; wm_qa_save($wm_fixture); set_post_thumbnail($post, $image_id);
    $pending = pvc_record('profile', 'es', $key);
    wm_qa_assert($pending['image'] === null && $pending['gallery'] === array() && $pending['videos'] === array(), 'Pending profile media must not expose original files.');
    $wm_fixture['image'] = wm_qa_process($image_id, 'image', $wm_fixture);
    $wm_fixture['video'] = wm_qa_process($video_id, 'video', $wm_fixture);
    $wm_fixture['frame'] = $prefix . '-marked-frame.png';
    pvc_wm_exec(array($wm_config['ffmpeg'], '-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-i', get_attached_file($wm_fixture['video']['id']), '-frames:v', '1', $wm_fixture['frame']), 30);
    $wm_fixture['temporaryFiles'][] = $wm_fixture['frame']; wm_qa_save($wm_fixture);
}
wm_qa_assert(!empty($wm_fixture['image']) && !empty($wm_fixture['video']), 'Persistent fixture media are missing.');
foreach ($wm_fixture['sourceHashes'] as $id => $sha) { wm_qa_assert(hash_file('sha256', get_attached_file($id)) === $sha, 'Original fixture bytes must survive processing and restart unchanged.'); }
foreach (array('image', 'video') as $kind) {
    $id = $wm_fixture[$kind . 'Source']; $before = pvc_watermark_media($id, $kind);
    wm_qa_assert(is_array($before) && $before['id'] === $wm_fixture[$kind]['id'], 'Stored ready derivative must remain stable.');
    pvc_watermark_queue_profile($wm_fixture['posts'][0]);
    wm_qa_assert(pvc_watermark_media($id, $kind)['id'] === $before['id'], 'Saving again must not create another marked generation.');
}
wm_qa_check_image($wm_fixture['image']['id']);
wm_qa_check_image($wm_fixture['video']['poster']['id'], 'video');
wm_qa_assert(wm_qa_mark_visible($wm_fixture['frame'], 'video'), 'Decoded MP4 frame must contain the actual logo in its lower center.');
$probe = json_decode(pvc_wm_exec(array($wm_config['ffprobe'], '-v', 'error', '-show_streams', '-show_format', '-of', 'json', get_attached_file($wm_fixture['video']['id'])), 20), true, 512, JSON_THROW_ON_ERROR);
$video_streams = array_values(array_filter($probe['streams'], fn($stream) => $stream['codec_type'] === 'video'));
$audio_streams = array_values(array_filter($probe['streams'], fn($stream) => $stream['codec_type'] === 'audio'));
wm_qa_assert(count($video_streams) === 1 && $video_streams[0]['codec_name'] === 'h264', 'Output must contain one H.264 video stream.');
wm_qa_assert(count($audio_streams) === 1 && $audio_streams[0]['codec_name'] === 'aac', 'Fixture audio must be retained as AAC.');
wm_qa_assert($video_streams[0]['width'] === 640 && $video_streams[0]['height'] === 360, 'Encoded fixture dimensions changed unexpectedly.');
wm_qa_assert((float) $probe['format']['duration'] >= .9 && (float) $probe['format']['duration'] < 1.5, 'Encoded duration must preserve the fixture clip.');
$record = pvc_record('profile', 'es', $wm_fixture['key']);
wm_qa_assert($record['image']['id'] === $wm_fixture['image']['id'] && $record['videos'][0]['id'] === $wm_fixture['video']['id'], 'Public catalog must project the ready marked media.');
$media = array();
foreach (array('image' => $wm_fixture['image'], 'video' => $wm_fixture['video'], 'poster' => $wm_fixture['video']['poster']) as $kind => $item) {
    $media[] = array('kind' => $kind, 'url' => $item['url'], 'sha256' => hash_file('sha256', get_attached_file($item['id'])));
}
echo 'PVC_WATERMARK_QA:' . wp_json_encode(array('phase' => $wm_phase, 'passed' => true, 'assertions' => $wm_assertions, 'database' => $GLOBALS['wpdb']->db_version(), 'php' => PHP_VERSION, 'profileUrl' => pvc_route(get_post($wm_fixture['posts'][0])), 'originalUrls' => array_map('wp_get_attachment_url', $wm_fixture['sources']), 'derivativeIds' => $wm_fixture['derivatives'], 'media' => $media, 'artifacts' => array(array('name' => 'marked-photo.png', 'path' => get_attached_file($wm_fixture['image']['id'])), array('name' => 'marked-video-frame.png', 'path' => $wm_fixture['frame']))), JSON_UNESCAPED_SLASHES) . PHP_EOL;
