<?php
/** Contract tests with isolated WordPress state. No provider calls or real records. */
define('ABSPATH', __DIR__);
$hooks = $meta = $posts = $options = array(); $checks = 0;
function add_action($name, $fn, ...$rest) { $GLOBALS['hooks'][$name][] = $fn; }
function get_option($key, $default = false) { return $GLOBALS['options'][$key] ?? $default; }
function add_option($key, $value, ...$rest) { if (isset($GLOBALS['options'][$key])) { return false; } $GLOBALS['options'][$key] = $value; return true; }
function get_post_meta($id, $key, $single = false) { return $GLOBALS['meta'][$id][$key] ?? ''; }
function get_post_thumbnail_id($post) { return (int) get_post_meta(is_object($post) ? $post->ID : $post, '_thumbnail_id', true); }
function wp_json_encode($v) { return json_encode($v); }
function wp_kses_post($v) { return $v; }
function pvc_types() { return array_fill_keys(array('pv_profile','pv_service','pv_city','pv_page'), array()); }
function get_posts($query) {
    return array_values(array_filter($GLOBALS['posts'], function($p) use ($query) {
        if (!in_array($p->post_type, (array) $query['post_type'], true) || !in_array($p->post_status, (array) $query['post_status'], true)) { return false; }
        if (isset($query['has_password']) && $query['has_password'] === false && $p->post_password !== '') { return false; }
        if (isset($query['meta_key']) && get_post_meta($p->ID, $query['meta_key'], true) !== $query['meta_value']) { return false; }
        foreach ($query['meta_query'] ?? array() as $m) { if (get_post_meta($p->ID, $m['key'], true) !== $m['value']) { return false; } }
        return true;
    }));
}
function wp_update_post($p) { $GLOBALS['posts'][$p['ID']]->post_status = $p['post_status']; return $p['ID']; }
function fixture($id, $key, $locale = 'es', $status = 'publish', $type = 'pv_profile') {
    $p = (object) array('ID' => $id, 'post_type' => $type, 'post_status' => $status, 'post_password' => '', 'post_title' => $key, 'post_content' => '<p>Un <strong>mensaje</strong> y <a href="/es/perfiles">enlace</a>.</p><!-- keep --><code>do_not_translate()</code>', 'post_excerpt' => 'Resumen', 'menu_order' => 1);
    $GLOBALS['posts'][$id] = $p; $GLOBALS['meta'][$id] = array('pv_key' => $key, 'pv_locale' => $locale, 'pv_data' => array('age' => 25, 'height' => '1,70 m', 'tags' => array('Amable'), 'languages' => array('Español'), 'services' => array('servicio-original'), 'gallery' => array(44), 'videos' => array(45)), '_thumbnail_id' => 44);
    return $p;
}
function check($ok, $message) { ++$GLOBALS['checks']; if (!$ok) { throw new RuntimeException($message); } }
require __DIR__ . '/../plugin/pecadosvip-content/includes/selective-translation.php';
$legacy = fixture(100, 'conservado'); $anchor = fixture(465, 'maria', 'es', 'private'); $maria = fixture(531, 'maria'); $new = fixture(600, 'nuevo');
$options['pvc_local_translation_policy'] = array('enabled' => true, 'legacy' => pvc_lt_baseline(array_values($posts), 465));
check(!pvc_lt_eligible($legacy), 'Legacy excluded');
$legacy->post_content = 'Edited after Maria'; $legacy->post_date = '2099-01-01';
check(!pvc_lt_eligible($legacy), 'Editing and changing date cannot reclassify Legacy');
check(!pvc_lt_eligible($anchor), 'Private original Maria excluded');
check(pvc_lt_eligible($maria), 'Published Maria included');
check(pvc_lt_eligible($new), 'New record included');
$recreated = fixture(700, 'conservado'); check(!pvc_lt_eligible($recreated), 'Recreated legacy identity excluded');
foreach (array('draft','private','trash','future','pending') as $status) { $new->post_status = $status; check(!pvc_lt_eligible($new), $status . ' excluded'); }
$new->post_status = 'publish'; $new->post_password = 'protected'; check(!pvc_lt_eligible($new), 'Password protected excluded'); $new->post_password = '';
$meta[600]['pv_locale'] = 'en'; check(!pvc_lt_eligible($new), 'Target never retranslated'); $meta[600]['pv_locale'] = 'es';
check(!pvc_lt_eligible($new, array()), 'No scope means no translation');
$parts = pvc_lt_segments($maria); check(!isset($parts['title']), 'Profile names preserved');
check(!in_array('do_not_translate()', $parts, true), 'Code excluded');
check(!in_array('/es/perfiles', $parts, true), 'Link attributes excluded');
check(!in_array('servicio-original', $parts, true), 'Relation identifiers excluded');
$translated = array_map(static fn($v) => 'EN ' . $v, $parts);
$payload = pvc_lt_payload($maria, $translated, 'en');
check($payload['post_title'] === 'maria', 'Name unchanged');
check(str_contains($payload['post_content'], '<strong>EN mensaje</strong>'), 'HTML formatting preserved');
check(str_contains($payload['post_content'], 'href="/es/perfiles"'), 'Link target preserved');
check(str_contains($payload['post_content'], '<!-- keep -->'), 'Comments preserved');
check(str_contains($payload['post_content'], 'do_not_translate()'), 'Code content preserved');
check($payload['meta_input']['pv_key'] === 'maria', 'Route key preserved');
foreach (array('age','height','services','gallery','videos') as $field) { check($payload['meta_input']['pv_data'][$field] === $meta[531]['pv_data'][$field], $field . ' unchanged'); }
check($payload['meta_input']['pv_data']['tags'][0] === 'EN Amable', 'Eligible label translated');
check($payload['post_status'] === 'draft', 'Draft staging before validation');
$hash = pvc_lt_hash($maria); $maria->post_content .= ' Changed'; check($hash !== pvc_lt_hash($maria), 'Concurrent edit invalidates source fingerprint');
$hash = pvc_lt_hash($maria); $meta[531]['pv_data']['age'] = 26; check($hash !== pvc_lt_hash($maria), 'Metadata edit invalidates source fingerprint');
$manual = fixture(801, 'maria', 'fr', 'draft'); $pending = pvc_lt_pending();
check(!array_filter($pending['jobs'], static fn($j) => $j['id'] === 531 && $j['lang'] === 'fr'), 'Manual draft target protected');
$generated = fixture(802, 'maria', 'en'); $meta[802]['_pvc_lt_source'] = 531; $meta[802]['_pvc_lt_source_hash'] = pvc_lt_hash($maria);
$meta[802]['_pvc_lt_generated_hash'] = pvc_lt_hash($generated);
check(pvc_lt_pending()['complete'] === 1, 'Already generated version recognized');
$maria->post_excerpt .= ' Changed'; check(pvc_lt_pending()['protected'] === 1, 'Manual target remains protected');
check(count(array_filter(pvc_lt_pending()['jobs'], static fn($j) => $j['target_id'] === 802)) === 1, 'Unedited generated target gets source updates');
$generated->post_content .= ' Human correction'; check(!pvc_lt_can_update($generated, $maria), 'Human correction blocks overwrite');
check(pvc_lt_pending()['protected'] === 2, 'Human corrected translation preserved');
pvc_lt_withdraw($maria); check($generated->post_status === 'draft', 'Withdrawing source withdraws generated target'); check($manual->post_status === 'draft', 'Manual target untouched');
$generated->post_status = 'publish'; $maria->post_password = 'private';
$hooks['wp_after_insert_post'][0](531, $maria); check($generated->post_status === 'draft', 'Password protection withdraws generated target');
$generated->post_status = 'publish'; $hooks['before_delete_post'][0](531, $maria); check($generated->post_status === 'draft', 'Permanent source deletion withdraws generated target');
check(isset($hooks['wp_ajax_pvc_lt_enable'], $hooks['wp_ajax_pvc_lt_pending'], $hooks['wp_ajax_pvc_lt_store']), 'Authenticated handlers registered');
check(!isset($hooks['wp_ajax_nopriv_pvc_lt_store']), 'No anonymous write handler');
echo json_encode(array('ok' => true, 'assertions' => $checks), JSON_PRETTY_PRINT) . PHP_EOL;
