<?php
/** Offline contracts for optional, blank-by-default profile information spaces. */
define('ABSPATH', __DIR__ . '/');
$checks = 0;
$options = array();
$optionReads = array();
$optionWrites = array();
$recordReads = array();
$pages = array();
$locale = 'es';
$hooks = array();
$canManage = true;
$validNonce = true;
$nonceChecks = array();

function check($condition, string $message): void {
    $GLOBALS['checks']++;
    if (!$condition) { throw new RuntimeException($message); }
}
function add_action($hook, $callback, ...$args): void { $GLOBALS['hooks'][$hook][] = $callback; }
function add_filter(...$args): void {}
class InformationTestStop extends RuntimeException {}
function current_user_can($capability, ...$args): bool { return $capability === 'manage_options' && $GLOBALS['canManage']; }
function wp_die($message, ...$args): void { throw new InformationTestStop((string) $message); }
function wp_unslash($value) {
    return is_array($value) ? array_map('wp_unslash', $value) : (is_string($value) ? stripslashes($value) : $value);
}
function check_admin_referer($action, $field): int {
    $GLOBALS['nonceChecks'][] = array($action, $field);
    if (!$GLOBALS['validNonce']) { wp_die('Nonce rejected.'); }
    return 1;
}
function pvc_locales(): array { return array('es'=>'Español', 'en'=>'English', 'fr'=>'Français', 'it'=>'Italiano'); }
function get_option($name, $default = false) {
    $GLOBALS['optionReads'][] = $name;
    return array_key_exists($name, $GLOBALS['options']) ? $GLOBALS['options'][$name] : $default;
}
function update_option($name, ...$args) {
    $GLOBALS['optionWrites'][] = $name;
    throw new RuntimeException('Reading or rendering information must never write options.');
}
function add_option($name, ...$args) { return update_option($name, ...$args); }
function delete_option($name) { return update_option($name); }
function sanitize_key($value): string { return preg_replace('/[^a-z0-9_-]/', '', strtolower((string) $value)); }
function sanitize_text_field($value): string {
    if (!is_scalar($value)) { return ''; }
    return trim(preg_replace('/\s+/u', ' ', strip_tags((string) $value)));
}
function sanitize_textarea_field($value): string {
    return is_scalar($value) ? trim(str_replace(array("\r\n", "\r"), "\n", strip_tags((string) $value))) : '';
}
function rest_sanitize_boolean($value): bool {
    return is_string($value) && in_array(strtolower($value), array('false', '0'), true) ? false : (bool) $value;
}
function esc_html($value): string { return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function esc_attr($value): string { return esc_html($value); }
function esc_url($value): string { return esc_html($value); }
function pvwp_context(): array { return array('locale'=>$GLOBALS['locale']); }
function pvwp_record_path(string $type, array $record): string {
    $custom = trim((string) ($record['data']['route'] ?? ''), '/');
    return $custom !== '' ? $custom : (($record['data']['kind'] ?? '') === 'legal' ? 'legal/' : '') . $record['key'];
}
function home_url(string $path = '/'): string { return 'https://example.test' . $path; }
function pvwp_url(string $suffix = '', ?string $language = null): string {
    return home_url('/' . ($language ?? $GLOBALS['locale']) . ($suffix !== '' ? '/' . ltrim($suffix, '/') : ''));
}
/** Matches the production repository contract: only published records are returned. */
function pvc_record(string $type, string $language, string $key): ?array {
    $GLOBALS['recordReads'][] = array($type, $language, $key);
    $record = $GLOBALS['pages'][$language][$key] ?? null;
    return is_array($record) && ($record['status'] ?? '') === 'publish' ? $record : null;
}

require __DIR__ . '/../plugin/pecadosvip-content/includes/profile-information.php';
require __DIR__ . '/../theme/pecadosvip/inc/profile-information.php';

function reset_information(array $blocks = array(), string $language = 'es'): void {
    $GLOBALS['locale'] = $language;
    $GLOBALS['options'] = array('pvc_profile_information_' . $language=>$blocks);
    $GLOBALS['optionReads'] = array(); $GLOBALS['recordReads'] = array(); $GLOBALS['pages'] = array();
}
function render_information(): string {
    ob_start();
    try { pvwp_profile_information(); return (string) ob_get_contents(); }
    finally { ob_end_clean(); }
}
function information_block(array $values = array()): array {
    return array_replace(array('enabled'=>true, 'title'=>'Información', 'body'=>'Texto de ejemplo.', 'buttonLabel'=>'', 'pageKey'=>''), $values);
}
function information_page(string $kind = 'information', string $route = 'informacion/privacidad', string $status = 'publish'): array {
    return array('key'=>'privacidad-ejemplo', 'title'=>'Información general', 'locale'=>$GLOBALS['locale'], 'status'=>$status, 'data'=>array('kind'=>$kind, 'route'=>$route));
}

/* Opening the editor or rendering a profile does not initialize the database. */
$defaults = pvc_profile_information_defaults();
check(array_keys($defaults) === array('slot1', 'slot2', 'slot3'), 'Exactly three information spaces are available');
foreach ($defaults as $slot=>$block) {
    check($block === array('enabled'=>false, 'title'=>'', 'body'=>'', 'buttonLabel'=>'', 'pageKey'=>''), $slot . ' starts disabled with every content field empty');
}
check($optionReads === array() && $optionWrites === array(), 'Defaults require no option reads or writes');
check(pvc_profile_information('es') === $defaults, 'Missing stored settings return empty defaults');
check($optionWrites === array(), 'Missing settings are not written back');

/* Malformed settings cannot add slots, nested content or markup. */
foreach (array(null, false, true, 42, 'not an object', new stdClass()) as $raw) {
    check(pvc_profile_information_sanitize($raw) === $defaults, 'Malformed outer settings safely become defaults');
}
$clean = pvc_profile_information_sanitize(array(
    'slot1'=>array('enabled'=>'1', 'title'=>' <strong>Información</strong> ', 'body'=>" <b>Primer párrafo.</b>\n\nSegundo párrafo. ", 'buttonLabel'=>' <i>Leer más</i> ', 'pageKey'=>'PRIVACIDAD-EJEMPLO', 'extra'=>'ignored'),
    'slot2'=>array('enabled'=>'false', 'title'=>array('bad'), 'body'=>new stdClass(), 'buttonLabel'=>array('bad'), 'pageKey'=>array('bad')),
    'slot3'=>'invalid slot',
    'slot4'=>array('enabled'=>true, 'title'=>'Never rendered'),
));
check(array_keys($clean) === array_keys($defaults), 'Unknown slots are discarded');
check(array_keys($clean['slot1']) === array_keys($defaults['slot1']), 'Unknown fields are discarded');
check($clean['slot1']['enabled'] === true, 'The submitted enabled flag becomes a boolean');
check($clean['slot1']['title'] === 'Información', 'Titles strip markup while preserving Unicode');
check($clean['slot1']['body'] === "Primer párrafo.\n\nSegundo párrafo.", 'Body text strips markup and preserves paragraph breaks');
check($clean['slot1']['buttonLabel'] === 'Leer más', 'Button labels strip markup');
check($clean['slot1']['pageKey'] === 'privacidad-ejemplo', 'Page keys are normalized');
check($clean['slot2'] === $defaults['slot2'], 'Nested field values and a false checkbox remain empty and disabled');
check($clean['slot3'] === $defaults['slot3'], 'A malformed slot falls back independently');
foreach (array(false, 'false', '0', 0, '', array('1'), new stdClass()) as $disabled) {
    check(pvc_profile_information_sanitize(array('slot1'=>array('enabled'=>$disabled)))['slot1']['enabled'] === false, 'Invalid or false checkbox values do not enable a block');
}

/* Each locale has independent storage, with no fallback to another language. */
reset_information(array('slot1'=>information_block(array('title'=>'Solo español'))));
$options['pvc_profile_information_en'] = array('slot1'=>information_block(array('title'=>'English information')));
check(pvc_profile_information('es')['slot1']['title'] === 'Solo español', 'Spanish settings come from their own option');
check(pvc_profile_information('en')['slot1']['title'] === 'English information', 'English settings remain independent');
check(pvc_profile_information('fr') === $defaults, 'Missing French settings do not fall back to Spanish');
$readsBefore = $optionReads;
check(pvc_profile_information('de') === array(), 'Unsupported locale is rejected');
check($optionReads === $readsBefore, 'Unsupported locale does not query arbitrary option names');
check($optionWrites === array(), 'Reading language settings does not rewrite any option');

/* Empty or disabled information leaves the existing public profile untouched. */
reset_information();
check(render_information() === '', 'Default settings emit no empty wrapper');
reset_information(array('slot1'=>information_block(array('enabled'=>false))));
check(render_information() === '', 'Stored text remains hidden until its block is enabled');
reset_information(array('slot1'=>information_block(array('title'=>'  ', 'body'=>" \n "))));
check(render_information() === '', 'An enabled but blank block emits nothing');
reset_information(array('slot1'=>information_block(array('title'=>'', 'body'=>'', 'buttonLabel'=>'Leer más', 'pageKey'=>'privacidad-ejemplo'))));
$pages['es']['privacidad-ejemplo'] = information_page();
$html = render_information();
check(str_contains($html, '<a ') && str_contains($html, 'Leer más'), 'An explicitly configured button can be useful without title or body');
check(!preg_match('/<h[1-6][^>]*>\s*<\/h[1-6]>/', $html), 'A button-only space creates no empty heading');
$pages = array();
check(render_information() === '', 'A button-only space with no valid destination emits nothing');

/* Partial content is useful, plain text, and does not require a button. */
reset_information(array('slot1'=>information_block(array('body'=>''))));
$html = render_information();
check(str_contains($html, 'Información') && !str_contains($html, '<a '), 'A title-only information block needs no button');
reset_information(array('slot1'=>information_block(array('title'=>'', 'body'=>"Primera línea.\nSegunda línea."))));
$html = render_information();
check(str_contains($html, 'Primera línea.') && str_contains($html, 'Segunda línea.'), 'A body-only block preserves both lines');
check(str_contains($html, "Primera línea.\nSegunda línea.") || preg_match('/Primera línea\.(?:<br\s*\/?[>]|<\/p>)/', $html), 'Line breaks remain representable in rendered text');
check(!preg_match('/<h[1-6][^>]*>\s*<\/h[1-6]>/', $html), 'A body-only block creates no empty heading');
reset_information(array('slot1'=>information_block(array('title'=>'A & B "C"', 'body'=>'Texto & detalle "seguro".'))));
$html = render_information();
check(str_contains($html, 'A &amp; B &quot;C&quot;'), 'Title characters are HTML escaped');
check(str_contains($html, 'Texto &amp; detalle &quot;seguro&quot;.'), 'Body characters are HTML escaped');

/* A destination is an existing informational page in the current language. */
$linked = information_block(array('buttonLabel'=>'Leer & revisar', 'pageKey'=>'privacidad-ejemplo'));
reset_information(array('slot1'=>$linked));
check(!str_contains(render_information(), '<a '), 'A missing page creates no broken button');
$pages['es']['privacidad-ejemplo'] = information_page('information', 'informacion/privacidad', 'draft');
check(!str_contains(render_information(), '<a '), 'A draft page creates no public button');
$pages['es']['privacidad-ejemplo'] = information_page();
$html = render_information();
check(str_contains($html, 'href="https://example.test/es/informacion/privacidad"'), 'Published page destination uses the actual localized route');
check(str_contains($html, 'Leer &amp; revisar'), 'The optional button label is escaped');
check(in_array(array('page', 'es', 'privacidad-ejemplo'), $recordReads, true), 'The lookup requests only a page in the current language');
foreach (array('information', 'about', 'legal') as $kind) {
    $pages['es']['privacidad-ejemplo'] = information_page($kind);
    check(str_contains(render_information(), '<a '), 'Published ' . $kind . ' pages are valid information destinations');
}
foreach (array('contact', 'home', 'profiles', 'services', '') as $kind) {
    $pages['es']['privacidad-ejemplo'] = information_page($kind);
    check(!str_contains(render_information(), '<a '), 'Page kind ' . $kind . ' is not an information destination');
}
foreach (array('../private', 'https://outside.example/path', 'informacion?redirect=elsewhere', 'informacion#fragment', 'wp-admin', 'es/otra', 'info/../private') as $path) {
    $pages['es']['privacidad-ejemplo'] = information_page('information', $path);
    check(!str_contains(render_information(), '<a '), 'An invalid or reserved destination route is omitted: ' . $path);
}
reset_information(array('slot1'=>$linked), 'en');
$pages['es']['privacidad-ejemplo'] = information_page();
check(!str_contains(render_information(), '<a '), 'A Spanish page cannot supply an English destination');
check($recordReads === array(array('page', 'en', 'privacidad-ejemplo')), 'Only the requested language is consulted');
$pages['en']['privacidad-ejemplo'] = information_page('information', 'information/privacy');
check(str_contains(render_information(), 'href="https://example.test/en/information/privacy"'), 'English page uses its independently edited route');
reset_information(array('slot1'=>information_block(array('pageKey'=>'privacidad-ejemplo'))));
$pages['es']['privacidad-ejemplo'] = information_page();
check(!str_contains(render_information(), '<a '), 'An empty button label produces no unnamed link');

/* Independent blocks render in editorial order without affecting hidden slots. */
reset_information(array(
    'slot1'=>information_block(array('title'=>'Primer bloque')),
    'slot2'=>information_block(array('title'=>'Texto oculto', 'enabled'=>false)),
    'slot3'=>information_block(array('title'=>'Tercer bloque')),
));
$html = render_information();
check(str_contains($html, 'Primer bloque') && str_contains($html, 'Tercer bloque'), 'Multiple enabled spaces render independently');
check(!str_contains($html, 'Texto oculto'), 'Disabled content is absent from the HTML');
check(strpos($html, 'Primer bloque') < strpos($html, 'Tercer bloque'), 'Space order is stable');
check($optionWrites === array(), 'The complete suite performs no persistent writes');

/* The save endpoint rejects unauthorized, malformed and unverified submissions before writes. */
$saveHandlers = $hooks['admin_post_pvc_save_profile_information'] ?? array();
check(count($saveHandlers) === 1, 'Exactly one authenticated save handler is registered');
check(!isset($hooks['admin_post_nopriv_pvc_save_profile_information']), 'No anonymous save handler is exposed');
$save = $saveHandlers[0];
function rejected_information_save(callable $save, string $message): void {
    $before = $GLOBALS['options']; $readsBefore = $GLOBALS['optionReads']; $stopped = false;
    try { $save(); } catch (InformationTestStop $error) { $stopped = true; }
    check($stopped, $message . ': request is stopped');
    check($GLOBALS['options'] === $before && $GLOBALS['optionWrites'] === array(), $message . ': no persisted data changes');
    check($GLOBALS['optionReads'] === $readsBefore, $message . ': rejected before reading stored data');
}
$_POST = array('locale'=>'es', 'blocks'=>array('slot1'=>information_block()), 'pvc_profile_information_nonce'=>'test-nonce');
$canManage = false; $validNonce = true; $nonceChecks = array();
rejected_information_save($save, 'A user without manage_options');
check($nonceChecks === array(), 'Insufficient capability is rejected before nonce processing');
$canManage = true; $_POST['locale'] = 'de';
rejected_information_save($save, 'An unsupported submitted locale');
check($nonceChecks === array(), 'Invalid locale is rejected before nonce processing');
$_POST['locale'] = 'es'; $validNonce = false;
rejected_information_save($save, 'An invalid request nonce');
check($nonceChecks === array(array('pvc_profile_information_es', 'pvc_profile_information_nonce')), 'Nonce action is scoped to the submitted locale');
check($optionWrites === array(), 'Read, render and rejected-save contracts perform no persistent writes');

echo json_encode(array('ok'=>true, 'assertions'=>$checks, 'persistentWrites'=>count($optionWrites), 'environment'=>'offline WordPress contract simulation'), JSON_PRETTY_PRINT) . PHP_EOL;
