<?php
/** Offline contracts for optional, blank-by-default profile information spaces. */
define('ABSPATH', __DIR__ . '/');
$checks = 0;
$options = array();
$optionReads = array();
$optionWrites = array();
$recordReads = array();
$pages = array();
$wordpressPages = array();
$wordpressQueries = array();
$wordpressReads = array();
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
function esc_textarea($value): string { return esc_html($value); }
function admin_url(string $path = ''): string { return 'https://example.test/wp-admin/' . $path; }
function add_query_arg(array $values, string $url): string { return $url . '?' . http_build_query($values); }
function wp_nonce_field($action, $name): void { echo '<input name="' . esc_attr($name) . '" value="test-nonce">'; }
function selected($selected, $current = true, $display = true): string {
    $html = (string) $selected === (string) $current ? 'selected="selected"' : '';
    if ($display) { echo $html; }
    return $html;
}
function checked($checked, $current = true, $display = true): string {
    $html = (string) $checked === (string) $current ? 'checked="checked"' : '';
    if ($display) { echo $html; }
    return $html;
}
function submit_button($label): void { echo '<button>' . esc_html($label) . '</button>'; }
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
function pvc_records(string $type, string $language): array {
    return array_values(array_filter($GLOBALS['pages'][$language] ?? array(), static fn($page) => ($page['status'] ?? '') === 'publish'));
}
function pvc_suffix(string $type, string $key, array $data): string {
    if ($type !== 'pv_page') { throw new RuntimeException('The page selector must resolve only pv_page routes.'); }
    $custom = trim((string) ($data['route'] ?? ''), '/');
    return ($data['kind'] ?? '') === 'home' ? '' : ($custom !== '' ? $custom : (($data['kind'] ?? '') === 'legal' ? 'legal/' : '') . $key);
}
function get_post($id) {
    $id = is_object($id) ? $id->ID : $id;
    $GLOBALS['wordpressReads'][] = $id;
    return $GLOBALS['wordpressPages'][$id] ?? null;
}
function get_posts(array $query): array {
    $GLOBALS['wordpressQueries'][] = $query;
    return array_values(array_filter($GLOBALS['wordpressPages'], static function($post) use ($query) {
        return (!isset($query['post_type']) || $post->post_type === $query['post_type'])
            && (!isset($query['post_status']) || $post->post_status === $query['post_status'])
            && (!array_key_exists('has_password', $query) || (bool) ($post->post_password !== '') === $query['has_password']);
    }));
}
function get_permalink($post) {
    $post = is_object($post) ? $post : ($GLOBALS['wordpressPages'][$post] ?? null);
    return $post->permalink ?? false;
}
function get_the_title($post): string {
    $post = is_object($post) ? $post : ($GLOBALS['wordpressPages'][$post] ?? null);
    return $post->post_title ?? '';
}

require __DIR__ . '/../plugin/pecadosvip-content/includes/profile-information.php';
require __DIR__ . '/../theme/pecadosvip/inc/profile-information.php';

function reset_information(array $blocks = array(), string $language = 'es'): void {
    $GLOBALS['locale'] = $language;
    $GLOBALS['options'] = array('pvc_profile_information_' . $language=>$blocks);
    $GLOBALS['optionReads'] = array(); $GLOBALS['recordReads'] = array(); $GLOBALS['pages'] = array();
    $GLOBALS['wordpressPages'] = array(); $GLOBALS['wordpressQueries'] = array(); $GLOBALS['wordpressReads'] = array();
}
function render_information(): string {
    ob_start();
    try { pvwp_profile_information(); return (string) ob_get_contents(); }
    finally { ob_end_clean(); }
}
function render_information_admin(): string {
    $_GET = array('lang'=>$GLOBALS['locale']);
    ob_start();
    try { pvc_profile_information_admin(); return (string) ob_get_contents(); }
    finally { ob_end_clean(); }
}
function information_block(array $values = array()): array {
    return array_replace(array('enabled'=>true, 'title'=>'Información', 'body'=>'Texto de ejemplo.', 'buttonLabel'=>'', 'pageKey'=>''), $values);
}
function information_page(string $kind = 'information', string $route = 'informacion/privacidad', string $status = 'publish'): array {
    return array('key'=>'privacidad-ejemplo', 'title'=>'Información general', 'locale'=>$GLOBALS['locale'], 'status'=>$status, 'data'=>array('kind'=>$kind, 'route'=>$route));
}
function wordpress_page(int $id, array $values = array()): object {
    return (object) array_replace(array('ID'=>$id, 'post_type'=>'page', 'post_status'=>'publish', 'post_password'=>'', 'post_title'=>'Información general', 'permalink'=>'https://example.test/manual/accesibilidad/'), $values);
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
foreach (array('wp:1', 'wp:918', 'wp:123456789') as $key) {
    check(pvc_profile_information_sanitize(array('slot1'=>array('pageKey'=>$key)))['slot1']['pageKey'] === $key, 'A standard WordPress ID token survives sanitation unchanged: ' . $key);
}
check(pvc_profile_information_sanitize(array('slot1'=>$clean['slot1']))['slot1'] === $clean['slot1'], 'Existing native settings remain stable through another read or save');

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

/* Native destinations retain their existing keys and use the current language. */
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
foreach (array('information', 'about', 'legal', 'contact', 'profiles', 'services', '') as $kind) {
    $pages['es']['privacidad-ejemplo'] = information_page($kind);
    check(str_contains(render_information(), '<a '), 'Published ' . $kind . ' native pages are selectable without a kind allowlist');
}
$pages['es']['privacidad-ejemplo'] = information_page('home', '');
check(str_contains(render_information(), 'href="https://example.test/es"'), 'Native home pages resolve to the locale root');
foreach (array('perfiles', 'servicios', 'contacto', 'informacion/legal') as $path) {
    $pages['es']['privacidad-ejemplo'] = information_page('information', $path);
    check(str_contains(render_information(), 'href="https://example.test/es/' . $path . '"'), 'An actual native catalog or content route remains selectable: ' . $path);
}
foreach (array('../private', 'https://outside.example/path', 'informacion?redirect=elsewhere', 'informacion#fragment', 'wp-admin', 'wp-json/example', 'api', 'api/otro', 'es/otra', 'en', 'fr/otra', 'it/otra', 'info/../private') as $path) {
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

/* WordPress pages use a separate identity and their real permalink in every locale. */
reset_information(array('slot1'=>information_block(array('buttonLabel'=>'Leer más', 'pageKey'=>'wp:918'))));
$wordpressPages[918] = wordpress_page(918);
$destination = pvc_profile_information_destination('wp:918', 'es');
check(is_array($destination) && $destination['key'] === 'wp:918' && $destination['source'] === 'wordpress', 'A WordPress page resolves with its explicit namespace and source');
check($destination['title'] === 'Información general' && $destination['url'] === 'https://example.test/manual/accesibilidad/', 'A WordPress destination keeps its own title and hierarchical permalink');
$html = render_information();
check(str_contains($html, 'href="https://example.test/manual/accesibilidad/"'), 'Public rendering uses the existing WordPress permalink');
check(!str_contains($html, '/es/manual/'), 'The selected block language does not add a path prefix to a WordPress permalink');
check($recordReads === array(), 'WordPress tokens do not fall through into native record lookup');
$wordpressPages[918]->permalink = 'https://example.test/?page_id=918&preview_mode=plain';
check(pvc_profile_information_destination('wp:918', 'es')['url'] === $wordpressPages[918]->permalink, 'Plain permalinks preserve their query string exactly');
check(str_contains(render_information(), 'href="https://example.test/?page_id=918&amp;preview_mode=plain"'), 'Permalink query separators are escaped only for HTML output');
$options['pvc_profile_information_en'] = array('slot1'=>information_block(array('title'=>'English heading', 'buttonLabel'=>'Read more', 'pageKey'=>'wp:918')));
$locale = 'en';
check(str_contains(render_information(), 'English heading') && str_contains(render_information(), '?page_id=918'), 'An editor can independently select the same WordPress page in another language');
check(pvc_profile_information('es')['slot1']['buttonLabel'] === 'Leer más', 'Rendering another language leaves the Spanish selection and text unchanged');
check(pvc_profile_information_destination('wp:918', 'de') === null, 'Unsupported block languages do not resolve destinations');

/* Stale or protected WordPress destinations lose only the link, never the authored text. */
foreach (array('draft', 'pending', 'future', 'private', 'trash', 'auto-draft') as $status) {
    $wordpressPages[918] = wordpress_page(918, array('post_status'=>$status));
    check(pvc_profile_information_destination('wp:918', 'en') === null, 'A ' . $status . ' WordPress page is unavailable as a public destination');
    $html = render_information();
    check(!str_contains($html, '<a ') && str_contains($html, 'English heading'), 'The ' . $status . ' destination hides its button while preserving block text');
}
foreach (array('post', 'attachment', 'pv_page', 'pv_profile') as $type) {
    $wordpressPages[918] = wordpress_page(918, array('post_type'=>$type));
    check(pvc_profile_information_destination('wp:918', 'en') === null, 'A WordPress token cannot address a ' . $type . ' record');
}
$wordpressPages[918] = wordpress_page(918, array('post_password'=>'example-only-password'));
check(pvc_profile_information_destination('wp:918', 'en') === null, 'A password-protected page is excluded even when its status is publish');
$wordpressPages[918] = wordpress_page(918, array('permalink'=>false));
check(pvc_profile_information_destination('wp:918', 'en') === null, 'A page without a permalink is not linked');
$wordpressPages = array();
check(pvc_profile_information_destination('wp:918', 'en') === null, 'A deleted WordPress page is not linked');
$wordpressPages[918] = wordpress_page(918);
foreach (array('wp:0', 'wp:-1', 'wp:0918', 'wp:+918', 'wp:918.0', 'wp:918x', 'WP:918', 'wp: 918', 'wp:918 ', "wp:918\n", 'wp:99999999999999999999999999999999999999') as $invalid) {
    check(pvc_profile_information_destination($invalid, 'en') === null, 'A malformed or out-of-range WordPress token cannot resolve: ' . json_encode($invalid));
}

/* The editor lists native pages alongside all published, public WordPress pages. */
reset_information(array('slot1'=>information_block(array('pageKey'=>'wp:918', 'buttonLabel'=>'Leer más'))));
$pages['es']['privacidad-ejemplo'] = information_page();
$pages['es']['privacidad-secundaria'] = array_replace(information_page('legal', 'legal/segunda'), array('key'=>'privacidad-secundaria'));
$pages['es']['draft-native'] = array_replace(information_page('information', 'informacion/borrador', 'draft'), array('key'=>'draft-native'));
$pages['es']['invalid-native'] = array_replace(information_page('information', 'wp-admin'), array('key'=>'invalid-native'));
$pages['en']['english-only'] = array_replace(information_page(), array('key'=>'english-only', 'locale'=>'en'));
$wordpressPages[918] = wordpress_page(918);
$wordpressPages[919] = wordpress_page(919, array('permalink'=>'https://example.test/otra/informacion/'));
$wordpressPages[920] = wordpress_page(920, array('post_status'=>'draft'));
$wordpressPages[921] = wordpress_page(921, array('post_status'=>'private'));
$wordpressPages[922] = wordpress_page(922, array('post_password'=>'example-only-password'));
$wordpressPages[923] = wordpress_page(923, array('post_type'=>'post'));
$available = pvc_profile_information_pages('es');
check(isset($available['privacidad-ejemplo'], $available['privacidad-secundaria'], $available['wp:918'], $available['wp:919']), 'The selector combines published native records and ordinary WordPress pages');
check($available['privacidad-ejemplo']['source'] === 'pecadosvip', 'Native keys preserve their identity and distinguish their source');
check(!isset($available['draft-native'], $available['invalid-native'], $available['english-only'], $available['wp:920'], $available['wp:921'], $available['wp:922'], $available['wp:923']), 'The selector omits unavailable routes, other native languages, drafts, private pages, protected pages and non-pages');
check(count($wordpressQueries) === 1, 'Listing the selector performs one WordPress page query');
$query = $wordpressQueries[0];
check(($query['post_type'] ?? null) === 'page' && ($query['post_status'] ?? null) === 'publish', 'The query explicitly requests published standard WordPress pages');
check(array_key_exists('has_password', $query) && $query['has_password'] === false, 'The WordPress query excludes password-protected pages');
check(($query['posts_per_page'] ?? null) === -1 && ($query['suppress_filters'] ?? null) === false, 'The editor lists all results and honors registered WordPress filters');
check(!isset($query['meta_query'], $query['meta_key'], $query['meta_value']), 'Standard pages do not require PecadosVip language metadata');
check(pvc_profile_information_pages('de') === array(), 'An unsupported locale yields no selectable destinations');
$html = render_information_admin();
check(str_contains($html, 'value="wp:918"') && str_contains($html, 'value="privacidad-ejemplo"'), 'The actual editor includes both page identities in its options');
check(preg_match('/<option\b[^>]*value="wp:918"[^>]*selected/', $html) === 1, 'The stored WordPress destination remains selected in the form');
check(str_contains($html, 'manual/accesibilidad') && str_contains($html, 'otra/informacion'), 'Duplicate page titles are distinguishable by destination URL in the selector');
check(str_contains($html, 'informacion/privacidad') && str_contains($html, 'legal/segunda'), 'Duplicate native titles also expose their distinct destination URLs');
$options['pvc_profile_information_es']['slot1']['pageKey'] = 'wp:777';
$html = render_information_admin();
check(preg_match('/<option\b[^>]*value="wp:777"[^>]*selected/', $html) === 1, 'An unavailable saved selection is preserved in the editor instead of being silently replaced');
check(str_contains($html, 'Texto de ejemplo.'), 'Opening an editor with an unavailable destination preserves its authored body');
check($optionWrites === array(), 'Destination discovery and editor rendering never modify stored content');

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
