<?php
/**
 * A profile may declare the country it must not be shown from, and that restriction has to
 * hold without ever locking the owner out of their own content.
 *
 * The two halves that need proving are the ones that decide whether this is safe to ship:
 * with no country source configured nothing may change at all, and with one configured an
 * unreadable country must fail closed rather than expose a restricted profile.
 */
define('ABSPATH', __DIR__);
$checks = 0;
function check($ok, $m) { ++$GLOBALS['checks']; if (!$ok) { throw new \RuntimeException($m); } }

$GLOBALS['pvqa_hooks'] = array();
$GLOBALS['pvqa_filters'] = array();
function add_action($hook, $callback = null, $priority = 10) { $GLOBALS['pvqa_hooks'][] = array($hook, $priority); }
function add_filter($hook, $callback = null, $priority = 10, $args = 1) { $GLOBALS['pvqa_filters'][] = array($hook, $callback, $priority, $args); }
function apply_filters($hook, $value) { return $value; }

$GLOBALS['pvqa_options'] = array();
function get_option($key, $default = false) { return array_key_exists($key, $GLOBALS['pvqa_options']) ? $GLOBALS['pvqa_options'][$key] : $default; }
function pvc_type(string $type): string { return str_starts_with($type, 'pv_') ? $type : 'pv_' . $type; }
$GLOBALS['pvqa_admin'] = false;
function is_admin() { return $GLOBALS['pvqa_admin']; }
$GLOBALS['pvqa_can_edit'] = false;
function current_user_can($cap) { return $GLOBALS['pvqa_can_edit']; }
$GLOBALS['pvqa_profiles'] = array();
function get_posts($args = array()) { return array_keys($GLOBALS['pvqa_profiles']); }
function get_post_meta($id, $key, $single = false) { return $GLOBALS['pvqa_profiles'][$id][$key] ?? ''; }

require __DIR__ . '/../plugin/pecadosvip-content/includes/geo-block.php';

/** A profile record that declares a restriction, plus one that does not. */
function geo_record(string $key, string $declared = ''): array {
    return array('key' => $key, 'title' => $key, 'data' => array('blockedCountry' => $declared));
}
$records = array(geo_record('maria', 'CO'), geo_record('jessica'), geo_record('ana', 'MX'));

/* 1. The single most important property: with no source configured nothing changes. */
check(pvc_geo_enabled() === false, 'No header configured means no enforcement');
check(pvc_geo_country() === null, 'Without a header the country cannot be established');
check(pvc_geo_blocked(geo_record('maria', 'CO')) === false, 'A declared restriction is inert while nothing reads countries');
check(pvc_geo_visible($records) === $records, 'Every record stays visible while nothing reads countries');

/* 2. Configuration is read from the option, and only a usable name counts. */
$GLOBALS['pvqa_options']['pvc_geo_header'] = 'CF-IPCountry';
check(pvc_geo_enabled() === true, 'A configured header enables enforcement');
check(pvc_geo_header() === 'CF-IPCOUNTRY', 'The header name is normalised');
$GLOBALS['pvqa_options']['pvc_geo_header'] = 'cf-ipcountry';
check(pvc_geo_header() === 'CF-IPCOUNTRY', 'A lower-case name is accepted');
$GLOBALS['pvqa_options']['pvc_geo_header'] = 'CF IPCountry';
check(pvc_geo_enabled() === false, 'A name with a space is not a usable header');
$GLOBALS['pvqa_options']['pvc_geo_header'] = 'CF_IPCountry';
check(pvc_geo_enabled() === false, 'A name with an underscore is not a usable header');
$GLOBALS['pvqa_options']['pvc_geo_header'] = 'CF-IPCountry';

/* 3. The visitor's country comes from the configured header. */
$_SERVER['HTTP_CF_IPCOUNTRY'] = 'ES';
check(pvc_geo_country() === 'ES', 'A two-letter country is read');
check(pvc_geo_blocked(geo_record('maria', 'CO')) === false, 'A visitor from another country sees the profile');
$_SERVER['HTTP_CF_IPCOUNTRY'] = 'co';
check(pvc_geo_country() === 'CO', 'A lower-case country is normalised');
check(pvc_geo_blocked(geo_record('maria', 'CO')) === true, 'A visitor from the blocked country is refused');
check(pvc_geo_blocked(geo_record('jessica')) === false, 'A profile that declares nothing is never refused');

/* 4. An unreadable country fails closed. */
foreach (array('' => 'an absent header', 'XX' => 'the unknown value', 'T1' => 'the Tor value', 'ESP' => 'a three-letter value', '1' => 'a numeric value', 'E1' => 'a mixed value') as $value => $label) {
    if ($value === '') { unset($_SERVER['HTTP_CF_IPCOUNTRY']); } else { $_SERVER['HTTP_CF_IPCOUNTRY'] = $value; }
    check(pvc_geo_country() === null, 'Country is unreadable for ' . $label);
    check(pvc_geo_blocked(geo_record('maria', 'CO')) === true, 'A declared restriction is enforced for ' . $label);
}

/* 5. A malformed declaration is not a restriction, so it cannot hide a profile by accident. */
foreach (array('', 'COL', 'XX', 'C0', '1') as $declared) {
    check(pvc_geo_declared(geo_record('x', $declared)) === '', 'The declaration "' . $declared . '" is not a country');
    check(pvc_geo_blocked(geo_record('x', $declared)) === false, 'The declaration "' . $declared . '" hides nothing');
}

/* 6. Listing behaviour: only the restricted profiles leave, in order, across every locale. */
$_SERVER['HTTP_CF_IPCOUNTRY'] = 'CO';
check(array_column(pvc_geo_visible($records), 'key') === array('jessica', 'ana'), 'Only the restricted profile leaves the listing');
$_SERVER['HTTP_CF_IPCOUNTRY'] = 'MX';
check(array_column(pvc_geo_visible($records), 'key') === array('maria', 'jessica'), 'A different restriction removes a different profile');
$_SERVER['HTTP_CF_IPCOUNTRY'] = 'ES';
check(array_column(pvc_geo_visible($records), 'key') === array('maria', 'jessica', 'ana'), 'An unrestricted country sees the full listing in order');

/* 7. The restriction never applies to the people who run the site. */
$_SERVER['HTTP_CF_IPCOUNTRY'] = 'CO';
$GLOBALS['pvqa_can_edit'] = true;
check(pvc_geo_visible($records) === $records, 'An editor always sees every profile');
$GLOBALS['pvqa_can_edit'] = false;
$GLOBALS['pvqa_admin'] = true;
check(pvc_geo_visible($records) === $records, 'The administration always sees every profile');
$GLOBALS['pvqa_admin'] = false;

/* 8. Only profiles are restricted: services, cities and pages are untouched. */
check(pvc_geo_visible($records, 'service') === $records, 'Services are never restricted');
check(pvc_geo_visible($records, 'pv_city') === $records, 'Cities are never restricted');
check(pvc_geo_visible($records, 'page') === $records, 'Informational pages are never restricted');

/* 9. It reaches every public projection through one filter, which is what makes the
      listing, the detail route, the canonical link and the REST catalogue agree. */
check(in_array(array('pvc_records', 'pvc_geo_visible', 10, 2), $GLOBALS['pvqa_filters'], true), 'The filter is registered on pvc_records with the type argument');
check(in_array(array('admin_menu', 10), $GLOBALS['pvqa_hooks'], true), 'The screen is registered in the administration');

/* 10. The administration can report how many profiles declare a restriction. */
$GLOBALS['pvqa_profiles'] = array(
    1 => array('pv_data' => array('blockedCountry' => 'CO')),
    2 => array('pv_data' => array('blockedCountry' => '')),
    3 => array('pv_data' => array('blockedCountry' => 'mx')),
    4 => array('pv_data' => array('blockedCountry' => 'ESP')),
    5 => array(),
);
check(pvc_geo_declared_count() === 2, 'Exactly the profiles with a usable country are counted');

unset($_SERVER['HTTP_CF_IPCOUNTRY']);
echo json_encode(array('ok' => true, 'assertions' => $checks), JSON_PRETTY_PRINT) . PHP_EOL;
