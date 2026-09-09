<?php
/** PHP contract tests for the profile projection, controls and rendered videos.
 * Run: php wordpress/tests/profile-media-contract-test.php
 * WordPress storage and the asynchronous processor are replaced by fixtures;
 * the plugin's normalization, validation and rendering functions execute directly.
 */
define('ABSPATH', __DIR__ . '/');
class WP_Post {
    public int $ID = 100;
    public string $post_type = 'pv_profile';
    public string $post_title = 'Perfil de prueba';
    public string $post_content = '<p>Descripción de prueba.</p>';
    public string $post_excerpt = 'Resumen';
    public int $menu_order = 0;
}
class WP_Error { public function __construct(public string $code, public string $message, public array $data = array()) {} public function get_error_message() { return $this->message; } }
class WP_REST_Request extends ArrayObject { public function get_param($key) { return $this[$key] ?? null; } }
function add_action($hook, $callback, ...$args) { if ($hook === 'wp_ajax_pvc_retry_watermark') { $GLOBALS['profile_retry_callback'] = $callback; } }
function add_filter(...$args) {}
function apply_filters($hook, $value) { return $value; }
function absint($value) { return abs((int) $value); }
function sanitize_text_field($value) { return trim(strip_tags((string) $value)); }
function rest_sanitize_boolean($value) { return (bool) $value; }
function is_wp_error($value) { return $value instanceof WP_Error; }
function get_current_user_id() { return 1; }
function set_transient(...$args) {}
function get_post_status($id) { return 'draft'; }
function get_post_type($id) { return $id === 900 ? 'pv_service' : 'pv_profile'; }
function get_post_field($field, $id) { return ''; }
function get_the_title($post) { return $post->post_title; }
function get_post_thumbnail_id($post) { return $GLOBALS['profile_thumbnail']; }
function get_post_meta($id, $key, $single = true) {
    if ($key === 'pv_data') { return array('age' => 27, 'gallery' => array(1, 2), 'videos' => array(3, 4)); }
    return array('pv_key' => 'prueba', 'pv_locale' => 'es', '_wp_attachment_image_alt' => 'Descripción de imagen')[$key] ?? '';
}
function wp_attachment_is_image($id) { return in_array($id, array(1, 2, 101), true); }
function wp_get_attachment_image_src($id, $size) { return array('https://example.test/original-' . $id . '.jpg', 900, 1200); }
function wp_get_attachment_url($id) { return 'https://example.test/original-' . $id . '.mp4'; }
function get_post_mime_type($id) { return $id === 3 || $id === 4 ? 'video/mp4' : 'image/jpeg'; }
function esc_attr($value) { return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'); }
function esc_html($value) { return esc_attr($value); }
function esc_url($value) { return esc_attr($value); }
function pvwp_context() { return array('locale' => 'es'); }
function current_user_can(...$args) { return $GLOBALS['profile_can_edit'] ?? true; }
function wp_create_nonce($action) { return 'nonce-' . $action; }
class ProfileAjaxResponse extends RuntimeException { public function __construct(public int $status, public array $payload) { parent::__construct('AJAX response'); } }
function wp_send_json_error($data, $status = 400) { throw new ProfileAjaxResponse($status, array('success' => false, 'data' => $data)); }
function wp_send_json_success($data) { throw new ProfileAjaxResponse(200, array('success' => true, 'data' => $data)); }
function check_ajax_referer($action, $field) { if (($_POST[$field] ?? '') !== wp_create_nonce($action)) { wp_send_json_error(array(), 403); } }
function pvc_watermark_retry_profile($id) { $GLOBALS['profile_retry_called'] = $id; return true; }
function pvc_watermark_status($id, $kind = 'image') { return array('status' => in_array($id, array(1, 3), true) ? 'ready' : ($id === 2 ? 'processing' : 'error'), 'message' => 'Usa un vídeo MP4, MOV o WebM.'); }
function pvc_watermark_media($id, $kind = 'image'): ?array {
    if ($kind === 'image' && $id === 1) { return array('id' => 101, 'url' => 'https://example.test/marked-101.jpg', 'alt' => 'Imagen', 'width' => 900, 'height' => 1200); }
    if ($kind === 'video' && $id === 3) { return array('id' => 103, 'url' => 'https://example.test/marked-103.mp4', 'mime' => 'video/mp4', 'width' => 1280, 'height' => 720, 'poster' => array('id' => 104, 'url' => 'https://example.test/marked-poster-104.jpg')); }
    return null;
}
$plugin = dirname(__DIR__) . '/plugin/pecadosvip-content';
$source = file_get_contents($plugin . '/pecadosvip-content.php');
// Load the core with its real functions; the processor API above controls readiness.
$module_boundary = strpos($source, "require_once PVC_DIR . '/includes/media-watermark.php';");
if ($module_boundary === false) { throw new RuntimeException('Watermark module is not required by the plugin.'); }
eval(substr($source, 5, $module_boundary - 5));
require $plugin . '/includes/admin.php';
require dirname(__DIR__) . '/theme/pecadosvip/inc/render.php';
$count = 0;
function profile_check($condition, string $message): void { global $count; if (!$condition) { throw new RuntimeException($message); } $count++; }
$post = new WP_Post(); $GLOBALS['profile_thumbnail'] = 2;
$profile = pvc_normalize($post);
profile_check($profile['image'] === null, 'Pending featured image must have no original fallback.');
profile_check(count($profile['gallery']) === 1 && $profile['gallery'][0]['id'] === 101, 'Gallery must omit pending sources and expose the ready derivative.');
profile_check(count($profile['videos']) === 1 && $profile['videos'][0]['id'] === 103, 'Videos must omit failed sources and expose the ready derivative.');
profile_check(!str_contains(json_encode($profile), 'original-'), 'The public profile projection must not contain original URLs.');
$GLOBALS['profile_thumbnail'] = 1;
profile_check(pvc_normalize($post)['image']['id'] === 101, 'Featured image must use derivative attachment ID for responsive variants.');
$post->post_type = 'pv_service';
$service = pvc_normalize($post);
profile_check(str_contains($service['image']['url'], 'original-1'), 'Services retain their existing image projection.');
profile_check(count($service['gallery']) === 2 && !array_key_exists('videos', $service), 'Service gallery and schema remain unchanged.');
foreach (array('pv_service', 'pv_city', 'pv_page') as $type) { profile_check(!isset(pvc_fields($type)['videos']), 'Videos must be profile-only: ' . $type); }
profile_check(pvc_data_schema('pv_profile')['properties']['videos']['items']['type'] === 'integer', 'Video attachment IDs must have an integer-array REST schema.');
profile_check(pvc_sanitize_data(array('videos' => array('3', '3', '', 4)), 'pv_profile')['videos'] === array(3, 4), 'Video IDs preserve order and remove duplicates and empty controls.');
ob_start(); pvwp_profile_videos($profile); $html = ob_get_clean();
foreach (array('<video controls playsinline preload="metadata"', 'poster="https://example.test/marked-poster-104.jpg"', 'src="https://example.test/marked-103.mp4"', 'type="video/mp4"', 'width="1280" height="720"') as $expected) { profile_check(str_contains($html, $expected), 'Rendered video is missing: ' . $expected); }
profile_check(!str_contains($html, 'autoplay') && !str_contains($html, 'original-'), 'Public videos must not autoplay or reference original media.');
ob_start(); pvwp_profile_videos(array('videos' => array())); $empty = ob_get_clean();
profile_check($empty === '', 'No video markup when no processed video is ready.');
ob_start(); pvc_gallery_control('pvc_data[videos]', array(3, 4), 'video', true); $control = ob_get_clean();
foreach (array('data-kind="video"', '<video controls playsinline preload="metadata"', 'name="pvc_data[videos][]"', 'data-state="ready"', 'data-state="error"', 'Usa un vídeo MP4, MOV o WebM.') as $expected) { profile_check(str_contains($control, $expected), 'Video editor control is missing: ' . $expected); }
foreach (array('<img src="/original.jpg">', '<video src="/original.mp4"></video>', '[gallery ids="1,2"]', '[embed]https://example.test[/embed]', '<iframe src="https://example.test"></iframe>', '<p style="background:url(/original.jpg)">Texto</p>', "https://youtu.be/example\n", '<p>https://youtu.be/example</p>', '<a href="https://example.test/original.webp">Foto</a>') as $content) {
    profile_check(is_wp_error(pvc_validate_profile_content('pv_profile', $content)), 'Inline media must be rejected with a useful error.');
    profile_check(pvc_validate_profile_content('pv_service', $content) === true, 'Inline media restriction must not alter service content.');
}
$text = '<p>Descripción con <strong>formato</strong> y <a href="https://example.test/contacto">un enlace</a>.</p>';
profile_check(pvc_validate_profile_content('pv_profile', $text) === true, 'Ordinary rich text and navigation links remain valid.');
$unsafe = '<img src="/original.jpg">';
$draft = pvc_insert_guard(array('post_type' => 'pv_profile', 'post_status' => 'publish', 'post_content' => $unsafe), array());
profile_check($draft['post_status'] === 'draft' && $draft['post_content'] === $unsafe, 'Classic publication guard preserves original content as draft.');
$request = new WP_REST_Request(array('id' => 100, 'status' => 'publish'));
$rest = pvc_rest_validate((object) array('post_type' => 'pv_profile', 'post_content' => $unsafe), $request);
profile_check(is_wp_error($rest) && $rest->code === 'pvc_profile_inline_media', 'REST must return the actionable inline media validation error.');
foreach (array(array(false, 100, 'nonce-pvc_watermark_retry_100', 403), array(true, 100, 'invalid', 403), array(true, 900, 'nonce-pvc_watermark_retry_900', 403), array(true, 100, 'nonce-pvc_watermark_retry_100', 200)) as [$can_edit, $profile_id, $nonce, $expected_status]) {
    $GLOBALS['profile_can_edit'] = $can_edit; $GLOBALS['profile_retry_called'] = null;
    $_POST = array('profile_id' => $profile_id, 'nonce' => $nonce);
    try { ($GLOBALS['profile_retry_callback'])(); throw new RuntimeException('Retry endpoint did not return a response.'); }
    catch (ProfileAjaxResponse $response) {
        profile_check($response->status === $expected_status, 'Retry endpoint must enforce post type, edit capability and per-profile nonce.');
        profile_check($expected_status === 200 ? $GLOBALS['profile_retry_called'] === 100 : $GLOBALS['profile_retry_called'] === null, 'Only an authorized valid request may call the retry processor.');
    }
}
echo 'PASS: ' . $count . " profile media contract assertions.\n";
