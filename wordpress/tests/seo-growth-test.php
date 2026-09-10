<?php
/** Reuses the in-memory WP adapter; no network or real credentials. */
require __DIR__ . '/seo-test.php';
class WP_Error {
    public function __construct(public string $code, public string $message) {}
    public function get_error_message() { return $this->message; }
}
function is_wp_error($value) { return $value instanceof WP_Error; }
function add_option($key, $value, ...$args) { if (array_key_exists($key, $GLOBALS['options'])) { return false; } $GLOBALS['options'][$key] = $value; return true; }
function delete_option($key) { unset($GLOBALS['options'][$key]); }
function trailingslashit($s) { return rtrim($s, '/') . '/'; }
function wp_safe_redirect($url) { throw new RuntimeException('redirect'); }
function wp_remote_post($url, $args) {
    $GLOBALS['requests'][] = array('url' => $url, 'args' => $args);
    if (isset($GLOBALS['http_error'])) { return array('status' => $GLOBALS['http_error'], 'body' => 'Sensitive error body should not be retained'); }
    if (str_contains($url, '/token')) { return array('status' => 200, 'body' => '{"access_token":"fixture-only-token"}'); }
    $body = json_decode($args['body'], true); $GLOBALS['query_bodies'][] = $body;
    if (isset($body['dimensions'])) { return array('status' => 200, 'body' => json_encode(array('rows' => $GLOBALS['discovery_rows'] ?? array()))); }
    if (!empty($GLOBALS['missing_rows'])) { return array('status' => 200, 'body' => '{}'); }
    if (!empty($GLOBALS['bad_metrics'])) { return array('status' => 200, 'body' => '{"rows":[{"clicks":101,"impressions":10,"ctr":2,"position":0}]}'); }
    return array('status' => 200, 'body' => '{"rows":[{"clicks":10,"impressions":100,"ctr":0.1,"position":8}]}');
}
function wp_remote_retrieve_response_code($r) { return $r['status']; }
function wp_remote_retrieve_body($r) { return $r['body']; }
$start_count = $count;
$metric = static fn($position, $clicks = 10, $impressions = 100, $ctr = .1) => array('position' => $position, 'clicks' => $clicks, 'impressions' => $impressions, 'ctr' => $ctr);
check(pvc_growth_compare(null, $metric(3), 3)['kind'] === 'insufficient', 'No results are not zeros or ranking collapse');
check(pvc_growth_compare($metric(2, 1, 5), null, 3)['kind'] === 'insufficient', 'Small samples do not trigger optimization');
check(pvc_growth_compare($metric(2), $metric(2), 3)['kind'] === 'defend', 'Defend achieved average goal');
check(pvc_growth_compare($metric(6), $metric(3), 3)['kind'] === 'regression', 'Ranking regression');
check(pvc_growth_compare($metric(6, 5), $metric(6, 20), 3)['kind'] === 'regression', 'Clicks regression');
check(pvc_growth_compare($metric(6, 10, 200, .05), $metric(6), 3)['kind'] === 'ctr', 'CTR fall with stable position');
check(pvc_growth_compare($metric(8), null, 3)['kind'] === 'opportunity', 'Near-page opportunity');
check(pvc_growth_compare($metric(30), null, 3)['kind'] === 'develop', 'Distant target');
$period = pvc_growth_periods(strtotime('2026-09-10T05:00:00Z'));
check($period['current'] === array('2026-08-10', '2026-09-06'), 'Reporting periods honor Pacific time');
check((strtotime($period['current'][1]) - strtotime($period['current'][0])) / 86400 == 27, '28-day inclusive period');
check(strtotime($period['previous'][1]) + 86400 === strtotime($period['current'][0]), 'Adjacent non-overlapping periods');
check(pvc_growth_property_valid('sc-domain:pecadosvip.example.org'), 'Own domain property');
check(pvc_growth_property_valid($site . '/'), 'Own exact URL-prefix property');
check(!pvc_growth_property_valid('sc-domain:evil.example.org'), 'Other property rejected');
check(!pvc_growth_property_valid('https://pecadosvip.example.org/'), 'Parent prefix not silently accepted for subdirectory');
$meta[1]['pv_locale'] = 'es'; $meta[1]['pv_key'] = 'madrid';
$target = pvc_growth_validate_target(array('post_id' => 1, 'query' => 'consulta madrid', 'goal' => 3), pvc_seo_inventory());
check(!is_wp_error($target) && $target['country'] === 'esp', 'Valid real-page target defaults to Spain');
check(is_wp_error(pvc_growth_validate_target(array('post_id' => 999, 'query' => 'madrid'), pvc_seo_inventory())), 'Unpublished target rejected');
check(is_wp_error(pvc_growth_validate_target(array('post_id' => 1, 'query' => '', 'goal' => 0), pvc_seo_inventory())), 'Invalid goal rejected');
$meta[1]['pv_seo_noindex'] = '1'; check(is_wp_error(pvc_growth_validate_target(array('post_id' => 1, 'query' => 'madrid'), pvc_seo_inventory())), 'Excluded page cannot be target'); unset($meta[1]['pv_seo_noindex']);
$id = pvc_growth_target_key($target); $targets = array($id => $target); $options['pvc_growth_targets'] = $targets;
$options['pvc_growth_settings'] = array('sync' => false, 'property' => 'sc-domain:pecadosvip.example.org');
$requests = array(); pvc_growth_sync(); check(!$requests, 'Disabled synchronization makes no request');
$options['pvc_growth_settings']['sync'] = true; pvc_growth_sync();
check(!$requests && isset($options['pvc_growth_measurements'][$id]['error']), 'Missing credentials are explicit without a network request');
check(!get_option('pvc_growth_lock'), 'Lock released on configuration failure');
foreach (array('PVC_SEO_GSC_CLIENT_ID', 'PVC_SEO_GSC_CLIENT_SECRET', 'PVC_SEO_GSC_REFRESH_TOKEN') as $name) { putenv($name . '=fixture-only'); }
pvc_growth_sync();
check(count($requests) === 3, 'One token and two comparable requests per worker');
check($requests[0]['args']['redirection'] === 0 && $requests[0]['args']['sslverify'], 'No credential forwarding redirects and TLS verification');
check($query_bodies[0]['dataState'] === 'final' && $query_bodies[0]['aggregationType'] === 'byPage', 'Final data and page aggregation');
check(count($query_bodies[0]['dimensionFilterGroups'][0]['filters']) === 3, 'Exact page/query/country filters');
check($options['pvc_growth_measurements'][$id]['current']['position'] === 8.0, 'Actual response stored');
check(!str_contains(json_encode($options), 'fixture-only'), 'Credentials and tokens never stored in options');
$old = $options['pvc_growth_measurements'][$id]; $http_error = 429; pvc_growth_sync();
$failed = $options['pvc_growth_measurements'][$id];
check($failed['current'] === $old['current'] && $failed['time'] === $old['time'], 'Failure retains last success rather than inventing zeros');
check(str_contains($failed['error'], '429') && !str_contains($failed['error'], 'Sensitive'), 'Errors are actionable without raw response leakage'); unset($http_error);
$requests = array(); $options['pvc_growth_lock'] = time(); pvc_growth_sync(); check(!$requests, 'Concurrent worker blocked'); unset($options['pvc_growth_lock']);
$missing_rows = true; pvc_growth_sync(); check($options['pvc_growth_measurements'][$id]['current'] === null, 'Empty response stored as absent observation'); unset($missing_rows);
$bad_metrics = true; pvc_growth_sync(); check(isset($options['pvc_growth_measurements'][$id]['error']), 'Malformed metrics are not accepted'); unset($bad_metrics);
pvc_growth_sync(); $plan = pvc_growth_refresh_plan(); check($plan['actions']['target-' . $id]['kind'] === 'opportunity', 'Measurements drive opportunity action');
$options['pvc_growth_plan']['actions']['target-' . $id]['state'] = 'reviewed'; $plan = pvc_growth_refresh_plan();
check($plan['actions']['target-' . $id]['state'] === 'reviewed', 'Unchanged evidence preserves reviewed status');
$options['pvc_growth_measurements'][$id]['current']['position'] = 15;
$plan = pvc_growth_refresh_plan(); check($plan['actions']['target-' . $id]['state'] === 'pending' && $plan['actions']['target-' . $id]['kind'] === 'regression', 'New regression reopens action');
$options['pvc_growth_measurements'][$id]['time'] = time() - 4 * DAY_IN_SECONDS; $plan = pvc_growth_refresh_plan();
check($plan['actions']['target-' . $id]['kind'] === 'measurement', 'Stale evidence does not trigger growth claim');
$posts[1]->post_status = 'draft'; $plan = pvc_growth_refresh_plan(); check($plan['actions']['target-' . $id]['kind'] === 'excluded', 'Withdrawal suppresses promotion action'); $posts[1]->post_status = 'publish';
$allowed = false; try { pvc_growth_save(); check(false, 'Growth settings require admin'); } catch (RuntimeException $e) { check($e->getMessage() === 'Forbidden', 'Growth settings require admin'); }
$allowed = true; $_POST = array(); try { pvc_growth_save(); check(false, 'Growth nonce required'); } catch (RuntimeException $e) { check($e->getMessage() === 'Invalid nonce', 'Growth nonce required'); }
pvc_growth_schedule(); $scheduled_at = wp_next_scheduled('pvc_growth_sync'); pvc_growth_schedule(); check(wp_next_scheduled('pvc_growth_sync') === $scheduled_at, 'No duplicate hourly jobs');
$options['pvc_growth_settings']['sync'] = false; pvc_growth_schedule(); check(!wp_next_scheduled('pvc_growth_sync'), 'Pausing clears hourly job');
ob_start(); pvc_growth_admin(); $admin_html = ob_get_clean(); check(str_contains($admin_html, 'Meta inicial sugerida') && str_contains($admin_html, 'no un puesto exacto'), 'Panel distinguishes goal and regional measurement');
check(!str_contains($admin_html, 'fixture-only'), 'Admin UI never renders secrets');
$allowed = false; ob_start(); pvc_growth_admin(); check(ob_get_clean() === '', 'Growth dashboard stays private'); $allowed = true;
$options['pvc_growth_settings']['sync'] = true;
$discovery_rows = array(
    array('keys' => array('consulta madrid', $site . '/es/madrid'), 'impressions' => 200, 'position' => 6),
    array('keys' => array('<script>alert(1)</script>', $site . '/es/madrid'), 'impressions' => 40, 'position' => 9),
    array('keys' => array('dominio ajeno', 'https://evil.example.org/es/madrid'), 'impressions' => 1000, 'position' => 6),
    array('keys' => array('pocas impresiones', $site . '/es/madrid'), 'impressions' => 3, 'position' => 8),
    array('keys' => array('ya cumple meta', $site . '/es/madrid'), 'impressions' => 80, 'position' => 2),
);
$requests = array(); pvc_growth_discover(); $discovery = $options['pvc_growth_discovery'];
check(count($requests) === 2, 'Discovery limited to token plus one API request');
check(count($discovery['rows']) === 2 && $discovery['rows'][0]['query'] === 'consulta madrid', 'Discovery accepts only relevant eligible observed pages with evidence');
check(!str_contains($discovery['rows'][1]['query'], '<script'), 'Discovered query markup sanitized');
$http_error = 503; pvc_growth_discover(); check($options['pvc_growth_discovery']['rows'] === $discovery['rows'], 'Discovery failure preserves dated old results'); unset($http_error);
$posts[1]->post_status = 'draft'; pvc_growth_discover(); check(!$options['pvc_growth_discovery']['rows'], 'Discovery excludes withdrawn pages'); $posts[1]->post_status = 'publish';
$_POST = array('_wpnonce' => 'valid', 'operation' => 'action', 'action_id' => 'target-' . $id, 'fingerprint' => 'outdated', 'state' => 'reviewed');
try { pvc_growth_save(); } catch (RuntimeException $e) { check($e->getMessage() === 'redirect', 'Authenticated action returns to dashboard'); }
check($options['pvc_growth_plan']['actions']['target-' . $id]['state'] !== 'reviewed', 'Stale action submission cannot acknowledge newer evidence');
$_POST = array('_wpnonce' => 'valid', 'operation' => 'remove', 'target_id' => $id);
try { pvc_growth_save(); } catch (RuntimeException $e) { check($e->getMessage() === 'redirect', 'Target removal returns to dashboard'); }
check(!pvc_growth_targets() && !isset($options['pvc_growth_measurements'][$id]), 'Removal clears only selected target and history');
$options['pvc_growth_settings']['sync'] = false; $requests = array(); pvc_growth_discover(); check(!$requests, 'Discovery also honors disabled synchronization');
foreach (array('PVC_SEO_GSC_CLIENT_ID', 'PVC_SEO_GSC_CLIENT_SECRET', 'PVC_SEO_GSC_REFRESH_TOKEN') as $name) { putenv($name); }
echo json_encode(array('result' => 'PASS', 'growthChecks' => $count - $start_count, 'totalChecks' => $count, 'network' => 'mocked; OAuth and production not connected'), JSON_PRETTY_PRINT) . PHP_EOL;
