<?php
/**
 * A profile may declare the places it must not be shown from, at whatever level the model asks
 * for: a country, a province or a city. Two halves decide whether this is safe to ship.
 *
 * With no source configured nothing may change at all, and once a source is configured anything
 * that cannot be evaluated must fail closed rather than expose the profile in a place the model
 * asked to be excluded from.
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
function remove_accents($value) { return strtr((string) $value, array('á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ñ' => 'n', 'Á' => 'A', 'É' => 'E', 'Í' => 'I', 'Ó' => 'O', 'Ú' => 'U', 'Ñ' => 'N')); }

require __DIR__ . '/../plugin/pecadosvip-content/includes/geo-block.php';

function geo_record(string $key, array $data): array { return array('key' => $key, 'title' => $key, 'data' => $data); }
function geo_set(?string $country, ?string $subdivision = null, ?string $city = null): void {
    foreach (array('HTTP_CF_IPCOUNTRY' => $country, 'HTTP_CF_REGION_CODE' => $subdivision, 'HTTP_CF_IPCITY' => $city) as $key => $value) {
        if ($value === null) { unset($_SERVER[$key]); } else { $_SERVER[$key] = $value; }
    }
}

/* 1. The most important property: with no source configured nothing changes, whatever is declared. */
$records = array(geo_record('maria', array('blockedRegions' => array('CO', 'ES-MD', 'Madrid'))), geo_record('jessica', array()));
check(pvc_geo_enabled() === false, 'No header configured means no enforcement');
check(pvc_geo_country() === null && pvc_geo_subdivision() === null && pvc_geo_city() === null, 'Without headers no level can be established');
check(pvc_geo_blocked($records[0]) === false, 'A declared list is inert while nothing reads locations');
check(pvc_geo_visible($records) === $records, 'Every record stays visible while nothing reads locations');

/* 2. Configuration is per level, and only a usable header name counts. */
$GLOBALS['pvqa_options']['pvc_geo_headers'] = array('country' => 'CF-IPCountry');
check(pvc_geo_enabled() === true, 'A configured country header enables enforcement');
check(pvc_geo_configured()['country'] === 'CF-IPCOUNTRY', 'The header name is normalised');
check(pvc_geo_configured()['subdivision'] === '' && pvc_geo_configured()['city'] === '', 'Unset levels stay unread');
$GLOBALS['pvqa_options']['pvc_geo_headers'] = array('country' => 'CF IPCountry');
check(pvc_geo_enabled() === false, 'A name with a space is not a usable header');
$GLOBALS['pvqa_options']['pvc_geo_headers'] = array('country' => 'CF-IPCountry', 'subdivision' => 'CF-Region-Code', 'city' => 'CF-IPCity');

/* 3. The country comes from the configured header, and unknown values fail closed. */
geo_set('ES');
check(pvc_geo_country() === 'ES', 'A two-letter country is read');
check(pvc_geo_blocked(geo_record('x', array('blockedRegions' => array('CO')))) === false, 'A visitor from another country sees the profile');
foreach (array('co' => 'a lower-case value', '' => 'an absent header', 'XX' => 'the unknown value', 'T1' => 'the Tor value', 'ESP' => 'a three-letter value') as $value => $label) {
    geo_set($value === '' ? null : $value);
    check(pvc_geo_blocked(geo_record('x', array('blockedRegions' => array('CO')))) === true, 'A country restriction is enforced for ' . $label);
}

/* 4. Provinces, read from their own header and matched with or without the country prefix. */
geo_set('ES', 'MD');
check(pvc_geo_subdivision() === 'MD', 'The subdivision is read without its country prefix');
check(pvc_geo_blocked(geo_record('x', array('blockedRegions' => array('ES-MD')))) === true, 'A subdivision restriction matches the reported province');
check(pvc_geo_level('MD') === 'country', 'A bare two-letter code is read as a country, because it is ambiguous with one');
check(pvc_geo_blocked(geo_record('x', array('blockedRegions' => array('MD')))) === false, 'A province must carry its country prefix, so a bare code cannot silently mean one');
check(pvc_geo_blocked(geo_record('x', array('blockedRegions' => array('ES-MD')))) === true, 'The prefixed form restricts the province');
check(pvc_geo_blocked(geo_record('x', array('blockedRegions' => array('ES-AN')))) === false, 'Another province in the same country is not matched');
geo_set('CO', 'MD');
check(pvc_geo_blocked(geo_record('x', array('blockedRegions' => array('ES-MD')))) === false, 'The same province code in another country is not matched');
geo_set('ES', 'ES-MD');
check(pvc_geo_subdivision() === 'MD', 'A prefixed region value is understood');
geo_set('ES', null);
check(pvc_geo_blocked(geo_record('x', array('blockedRegions' => array('ES-MD')))) === true, 'A province restriction with no province header fails closed');

/* 5. Cities are free text, folded so case and accents do not matter. */
geo_set('ES', 'MD', 'Málaga');
check(pvc_geo_city() === 'malaga', 'The city is folded');
check(pvc_geo_blocked(geo_record('x', array('blockedRegions' => array('malaga')))) === true, 'A city restriction matches ignoring case and accents');
check(pvc_geo_blocked(geo_record('x', array('blockedRegions' => array('Madrid')))) === false, 'A different city is not matched');
geo_set('ES', 'MD', null);
check(pvc_geo_blocked(geo_record('x', array('blockedRegions' => array('Madrid')))) === true, 'A city restriction with no city header fails closed');

/* 6. Levels are recognised from the selector itself. */
check(pvc_geo_level('CO') === 'country', 'Two letters are a country');
check(pvc_geo_level('ES-MD') === 'subdivision', 'A prefixed code is a subdivision');
check(pvc_geo_level('Madrid') === 'city', 'Anything else is a city');

/* 7. The declared list is normalised and ignores what is not a place. */
geo_set('ES');
check(pvc_geo_selectors(geo_record('x', array('blockedRegions' => array(' co ', '', 'XX', 'T1', 'ES-MD', 'Málaga')))) === array('CO', 'ES-MD', 'malaga'), 'Empty and unknown entries are dropped, the rest normalised');
check(pvc_geo_selectors(geo_record('x', array('blockedRegions' => "CO\nES-MD"))) === array('CO', 'ES-MD'), 'A newline separated value is accepted');
check(pvc_geo_selectors(geo_record('x', array('blockedCountry' => 'CO'))) === array('CO'), 'A single country stored by an earlier release still works');

/* 8. A level some profile relies on while no header reads it is reported, because the
      restriction cannot be honoured and that profile is being withheld from everyone. */
$GLOBALS['pvqa_profiles'] = array(
    1 => array('pv_data' => array('blockedRegions' => array('CO'))),
    2 => array('pv_data' => array('blockedRegions' => array('ES-MD'))),
    3 => array('pv_data' => array('blockedRegions' => array('Madrid', 'CO'))),
    4 => array('pv_data' => array('blockedCountry' => 'CO')),
);
$GLOBALS['pvqa_options']['pvc_geo_headers'] = array('country' => 'CF-IPCountry');
check(pvc_geo_unreadable_levels() === array('subdivision' => 1, 'city' => 1), 'Levels without a header are reported with how many profiles need them');
$GLOBALS['pvqa_options']['pvc_geo_headers'] = array('country' => 'CF-IPCountry', 'subdivision' => 'CF-Region-Code', 'city' => 'CF-IPCity');
check(pvc_geo_unreadable_levels() === array(), 'Nothing is reported once every declared level has a header');

/* 9. The restriction never applies to the people who run the site, nor to anything but profiles. */
geo_set('CO', 'MD', 'Madrid');
$blocked = array(geo_record('x', array('blockedRegions' => array('CO'))));
$GLOBALS['pvqa_can_edit'] = true;
check(pvc_geo_visible($blocked) === $blocked, 'An editor always sees every profile');
$GLOBALS['pvqa_can_edit'] = false;
$GLOBALS['pvqa_admin'] = true;
check(pvc_geo_visible($blocked) === $blocked, 'The administration always sees every profile');
$GLOBALS['pvqa_admin'] = false;
check(pvc_geo_visible($blocked, 'service') === $blocked, 'Services are never restricted');
check(pvc_geo_visible($blocked, 'pv_city') === $blocked, 'Cities are never restricted');

/* 10. It reaches every public projection through one filter. */
check(in_array(array('pvc_records', 'pvc_geo_visible', 10, 2), $GLOBALS['pvqa_filters'], true), 'The filter is registered on pvc_records with the type argument');
check(in_array(array('admin_menu', 10), $GLOBALS['pvqa_hooks'], true), 'The screen is registered in the administration');

/* 11. The field the resolver reads must exist in the editor, or the whole feature is
       unreachable: the resolver would read a key that nothing can ever write. */
$plugin = (string) file_get_contents(__DIR__ . '/../plugin/pecadosvip-content/pecadosvip-content.php');
check(str_contains($plugin, "'blockedRegions'"), 'The editor declares the field the resolver reads');
check(preg_match("/'blockedRegions' => array\([^;]*'type' => 'array'/", $plugin) === 1, 'The declared field is a list, not a single value');

geo_set(null, null, null);
echo json_encode(array('ok' => true, 'assertions' => $checks), JSON_PRETTY_PRINT) . PHP_EOL;
