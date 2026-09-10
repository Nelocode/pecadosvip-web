<?php
/** Behavioral tests with an in-memory WP adapter; not a substitute for WordPress HTTP QA. */
define('ABSPATH', __DIR__);
define('PVC_DIR', __DIR__ . '/../plugin/pecadosvip-content');
define('HOUR_IN_SECONDS', 3600);
define('DAY_IN_SECONDS', 86400);
$options = array('blog_public' => '1'); $meta = array(); $posts = array(); $records = array(); $actions = array(); $scheduled = array();
$site = 'https://pecadosvip.example.org/subsite'; $environment = 'production'; $revision = '1'; $allowed = true; $count = 0;
function add_action($name, $callback, ...$args) { $GLOBALS['actions'][$name][] = $callback; }
function do_action($name, ...$args) { foreach ($GLOBALS['actions'][$name] ?? array() as $callback) { $callback(...$args); } }
function register_deactivation_hook(...$args) {}
function get_option($name, $default = false) { return $GLOBALS['options'][$name] ?? $default; }
function update_option($name, $value, ...$args) { $GLOBALS['options'][$name] = $value; }
function home_url($path = '') { return $GLOBALS['site'] . $path; }
function untrailingslashit($s) { return rtrim($s, '/'); }
function wp_parse_url($url, $component = -1) { return parse_url($url, $component); }
function wp_get_environment_type() { return $GLOBALS['environment']; }
function pvwp_ready() { return true; }
function pvc_revision() { return $GLOBALS['revision']; }
function wp_strip_all_tags($s) { return strip_tags($s); }
function strip_shortcodes($s) { return preg_replace('/\[[^\]]+\]/', '', $s); }
function get_bloginfo($key) { return 'PecadosVip'; }
function get_post_meta($id, $key, ...$args) { return $GLOBALS['meta'][$id][$key] ?? ''; }
function update_post_meta($id, $key, $value) { $GLOBALS['meta'][$id][$key] = $value; }
function delete_post_meta($id, $key) { unset($GLOBALS['meta'][$id][$key]); }
function get_post($id) { return $GLOBALS['posts'][$id] ?? null; }
function get_post_type($id) { return get_post($id)->post_type ?? ''; }
function pvc_types() { return array('pv_page' => array(), 'pv_city' => array(), 'pv_service' => array(), 'pv_profile' => array()); }
function pvc_locales() { return array('es' => 'Español', 'en' => 'English', 'fr' => 'Français', 'it' => 'Italiano'); }
function pvc_type($type) { return str_starts_with($type, 'pv_') ? $type : 'pv_' . $type; }
function pvc_suffix($type, $key, $data) { return $key === 'home' ? '' : ($type === 'pv_profile' ? 'perfiles/' . $key : ($data['route'] ?? $key)); }
function pvc_records($type, $locale) { return array_values(array_filter($GLOBALS['records'], static fn($r) => $r['type'] === $type && $r['locale'] === $locale && get_post($r['id'])->post_status === 'publish' && get_post($r['id'])->post_password === '')); }
function pvc_record($type, $locale, $key) { foreach (pvc_records($type, $locale) as $r) { if ($r['key'] === $key) { return $r; } } return null; }
function wp_next_scheduled($hook) { return $GLOBALS['scheduled'][$hook] ?? false; }
function wp_schedule_event($time, $frequency, $hook) { $GLOBALS['scheduled'][$hook] = $time; }
function wp_clear_scheduled_hook($hook) { unset($GLOBALS['scheduled'][$hook]); }
function wp_sitemaps_get_max_urls($type) { return 2; }
function wp_register_sitemap_provider($name, $provider) { $GLOBALS['provider'] = $provider; }
function get_post_modified_time(...$args) { return '2026-09-10T00:00:00+00:00'; }
function current_user_can(...$args) { return $GLOBALS['allowed']; }
function wp_is_post_revision($id) { return false; }
function wp_is_post_autosave($id) { return false; }
function wp_unslash($s) { return $s; }
function sanitize_text_field($s) { return strip_tags($s); }
function sanitize_key($s) { return preg_replace('/[^a-z0-9_-]/', '', $s); }
function wp_verify_nonce($s, $action) { return $s === 'valid'; }
function wp_die(...$args) { throw new RuntimeException('Forbidden'); }
function check_admin_referer($action) { if (($_POST['_wpnonce'] ?? '') !== 'valid') { throw new RuntimeException('Invalid nonce'); } }
function esc_attr($s) { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }
function esc_html($s) { return esc_attr($s); }
function esc_url($s) { return esc_attr($s); }
function admin_url($s) { return home_url('/wp-admin/' . $s); }
function get_edit_post_link($id) { return admin_url('post.php?post=' . $id . '&action=edit'); }
function wp_nonce_field(...$args) { echo '<input type="hidden" value="fixture">'; }
function checked($a, $b, $echo = true) { return $a === $b ? 'checked' : ''; }
function selected($a, $b, $echo = true) { return $a === $b ? 'selected' : ''; }
function submit_button($text, ...$args) { echo '<button>' . esc_html($text) . '</button>'; }
function wp_date($format, $time) { return gmdate($format, $time); }
function absint($n) { return abs((int) $n); }
function wp_json_encode($value, $flags = 0) { return json_encode($value, $flags); }
function pvwp_context() { return $GLOBALS['context']; }
class WP_Sitemaps_Provider { public $name; public $object_type; }
require PVC_DIR . '/includes/seo.php';
require __DIR__ . '/../theme/pecadosvip/inc/seo.php';
function check($condition, $label) { if (!$condition) { throw new RuntimeException($label); } $GLOBALS['count']++; }
function fixture($id, $locale = 'es', $key = 'madrid', $type = 'page') {
    $GLOBALS['posts'][$id] = (object) array('ID' => $id, 'post_type' => 'pv_' . $type, 'post_status' => 'publish', 'post_password' => '');
    return array('id' => $id, 'type' => $type, 'locale' => $locale, 'key' => $key, 'title' => 'Madrid', 'excerpt' => 'Información editorial de Madrid.', 'content' => '<p>Contenido de la ciudad.</p>', 'data' => array('kind' => 'information', 'synthetic' => false, 'coverage' => 'Madrid'));
}
$records[] = fixture(1); $records[] = fixture(2, 'en'); $records[] = fixture(3, 'es', 'barcelona');
$context = array('owned' => true, 'status' => 200, 'path' => '/es/madrid', 'locale' => 'es', 'query' => array(), 'route' => array('kind' => 'page', 'record' => $records[0]));
check(!pvc_seo_indexable($context), 'Default is noindex');
$options['pvc_seo_settings'] = array('enabled' => true, 'site_url' => $site, 'daily' => true);
check(pvc_seo_indexable($context), 'Published real content on approved production origin can be indexed');
foreach (array('local', 'staging', 'development') as $env) { $environment = $env; check(!pvc_seo_indexable($context), $env . ' stays noindex'); } $environment = 'production';
foreach (array('http://pecadosvip.example.org/subsite', 'https://mappra.easypanel.host', 'https://127.0.0.1', 'https://localhost', 'https://site.test', 'https://other.example.org') as $url) {
    $site = $url; check(!pvc_seo_indexable($context), 'Host gate ' . $url);
}
$site = 'https://pecadosvip.example.org/subsite'; $options['blog_public'] = '0'; check(!pvc_seo_indexable($context), 'WP visibility respected'); $options['blog_public'] = '1';
foreach (array(404, 503, 302) as $status) { $c = $context; $c['status'] = $status; check(!pvc_seo_indexable($c), 'Non-200 excluded'); }
$c = $context; $c['preview'] = true; check(!pvc_seo_indexable($c), 'Preview excluded');
$c = $context; $c['query'] = array('city' => 'madrid'); check(!pvc_seo_indexable($c), 'Faceted URL excluded');
foreach (array('preview', 'preview_id') as $param) { $_GET[$param] = '1'; check(!pvc_seo_indexable($context), 'Preview parameter excluded'); $_GET = array(); }
$c = $context; $c['route']['record']['data']['synthetic'] = true; check(!pvc_seo_indexable($c), 'Synthetic excluded');
$meta[1]['pv_seo_noindex'] = '1'; check(!pvc_seo_indexable($context), 'Editorial exclusion'); unset($meta[1]);
$posts[1]->post_password = 'secret'; check(!pvc_seo_indexable($context), 'Password protected excluded'); $posts[1]->post_password = '';
$posts[1]->post_status = 'draft'; check(!pvc_seo_indexable($context), 'Withdrawal immediately excludes'); $posts[1]->post_status = 'publish';
check(pvc_seo_metadata($records[0])['description'] === 'Información editorial de Madrid.', 'Excerpt used without invented copy');
$r = $records[0]; $r['excerpt'] = ''; check(pvc_seo_metadata($r)['description'] === 'Contenido de la ciudad.', 'Fallback body stripped');
check(mb_strlen(pvc_seo_text(str_repeat('á', 200), 160)) === 160, 'Unicode truncation');
$meta[1]['pv_seo_title'] = 'Título elegido'; check(pvc_seo_metadata($r)['title'] === 'Título elegido', 'Manual title preserved'); unset($meta[1]);
ob_start(); pvwp_seo_head(); $head = ob_get_clean();
check(str_contains($head, 'rel="canonical" href="' . $site . '/es/madrid"'), 'Subdirectory canonical');
check(substr_count($head, 'name="description"') === 1, 'One description');
check(substr_count($head, 'hreflang=') === 2, 'Only published translations');
check(str_contains($head, 'name="rating" content="adult"'), 'Adult content identified');
check(str_contains($head, '"@type":"WebPage"'), 'Truthful WebPage schema');
$context['query'] = array('city' => 'madrid'); ob_start(); pvwp_seo_head(); $filtered = ob_get_clean();
check(!str_contains($filtered, 'hreflang='), 'No filtered alternates'); check(!str_contains($filtered, '?city'), 'Canonical strips filters'); $context['query'] = array();
$_GET = array('preview_id' => '1'); ob_start(); pvwp_seo_head(); $preview = ob_get_clean(); check(!str_contains($preview, 'canonical'), 'No preview canonical or token'); $_GET = array();
$context['route']['record']['title'] = '</script><script>alert("x")</script>';
ob_start(); pvwp_seo_head(); $unsafe = ob_get_clean(); check(!str_contains($unsafe, '<script>alert'), 'Markup escaped in head'); $context['route']['record'] = $records[0];
foreach ($actions['wp_sitemaps_init'] as $callback) { $callback(); }
check($provider->get_max_num_pages() === 2, 'Sitemap paginated'); check(count($provider->get_url_list(2)) === 1, 'Last sitemap page');
check($provider->get_url_list(1)[0]['loc'] === $site . '/es/madrid', 'Sitemap uses canonical URLs');
$posts[1]->post_status = 'draft'; $meta[3]['pv_seo_noindex'] = '1';
check($provider->get_max_num_pages() === 1 && count($provider->get_url_list(1)) === 1, 'Sitemap removes withdrawn and excluded records');
$posts[1]->post_status = 'publish'; unset($meta[3]);
$options['blog_public'] = '0'; check($provider->get_url_list(1) === array(), 'Provider closes immediately when visibility changes'); $options['blog_public'] = '1';
pvc_seo_schedule(); $next = wp_next_scheduled('pvc_seo_daily_audit'); pvc_seo_schedule(); check($next === wp_next_scheduled('pvc_seo_daily_audit'), 'Single scheduled job');
$options['pvc_seo_settings']['daily'] = false; pvc_seo_schedule(); check(!wp_next_scheduled('pvc_seo_daily_audit'), 'Pause clears job');
$report = pvc_seo_audit(); check($report['total'] === 3 && $report['eligible'] === 3, 'Audit counts real published records'); check($report['issues'] > 0, 'Audit detects duplicate and missing translations');
$revision = '2'; check(get_option('pvc_seo_report')['revision'] !== pvc_revision(), 'Editorial revision marks report stale');
$_POST = array('pvc_seo_nonce' => 'invalid', 'pv_seo_title' => 'Attack'); pvc_seo_save_meta(1); check(get_post_meta(1, 'pv_seo_title', true) === '', 'Invalid nonce cannot write');
$_POST['pvc_seo_nonce'] = 'valid'; $allowed = false; pvc_seo_save_meta(1); check(get_post_meta(1, 'pv_seo_title', true) === '', 'Unprivileged caller cannot write');
try { pvc_seo_save_settings(); check(false, 'Settings require permission'); } catch (RuntimeException $e) { check($e->getMessage() === 'Forbidden', 'Settings require permission'); }
$allowed = true; try { pvc_seo_save_settings(); check(false, 'Settings require nonce'); } catch (RuntimeException $e) { check($e->getMessage() === 'Invalid nonce', 'Settings require nonce'); }
$_POST = array('pvc_seo_nonce' => 'valid', 'pv_seo_title' => '<b>Manual</b>', 'pv_seo_noindex' => '1'); pvc_seo_save_meta(1);
check(get_post_meta(1, 'pv_seo_title', true) === 'Manual' && !pvc_seo_record_allowed($records[0]), 'Authorized editorial override');
$_POST = array('pvc_seo_nonce' => 'valid'); pvc_seo_save_meta(1); check(get_post_meta(1, 'pv_seo_title', true) === '', 'Clear returns to automatic');
ob_start(); pvc_seo_admin(); $html = ob_get_clean(); check(str_contains($html, 'Plan SEO proactivo'), 'UI points to evidence and goals'); check(str_contains($html, 'Hay cambios posteriores'), 'UI marks stale report');
$allowed = false; ob_start(); pvc_seo_admin(); check(ob_get_clean() === '', 'Admin report stays private'); $allowed = true;
foreach (array('profile', 'service', 'city') as $excluded_type) {
    $excluded_record = fixture(90, 'es', 'excluded', $excluded_type);
    check(!pvc_seo_record_allowed($excluded_record), 'No promotion or indexing of ' . $excluded_type);
}
$excluded_record = fixture(90);
$excluded_record['data']['kind'] = 'home';
check(!pvc_seo_record_allowed($excluded_record), 'Home/catalog are outside informational scope');
unset($posts[90]);
if (!function_exists('pvp_guard_request')) { function pvp_guard_request() {} }
check(in_array('La protección pública está activa. El SEO no puede reabrir el sitio ni habilitar su indexación.', pvc_seo_blockers(), true), 'Public protection cannot be overridden from SEO');
define('WPSEO_VERSION', 'test'); check(!pvc_seo_indexable($context), 'Conflicting SEO plugin blocks activation'); ob_start(); pvwp_seo_head(); check(ob_get_clean() === '', 'Conflicting plugin produces no duplicate metadata');
echo json_encode(array('result' => 'PASS', 'checks' => $count, 'adapter' => 'in-memory WordPress functions; production runtime not verified'), JSON_PRETTY_PRINT) . PHP_EOL;
