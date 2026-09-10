<?php
/**
 * A deployment that adds editable copy must not publish a site with empty labels, and
 * it must never overwrite what an administrator has already edited.
 *
 * The theme renders every editable label from the `pvc_copy_seed` option. This suite
 * reproduces the real upgrade: a stored copy from a previous build, a shipped seed with
 * new keys, one administrator edit that has to survive, and media entries that the
 * automatic path is not allowed to turn into attachments.
 */
define('ABSPATH', __DIR__);
$checks = 0;
function check($ok, $m) { ++$GLOBALS['checks']; if (!$ok) { throw new \RuntimeException($m); } }

/* ------------------------------------------------------- WordPress stand-ins */

class WP_Error { public function __construct($c = '', $m = '') {} }
function is_wp_error($v) { return $v instanceof WP_Error; }
function add_action($hook, $callback, $priority = 10) { $GLOBALS['pvqa_hooks'][] = array($hook, $priority); }

$GLOBALS['pvqa_options'] = array();
function get_option($key, $default = false) { return array_key_exists($key, $GLOBALS['pvqa_options']) ? $GLOBALS['pvqa_options'][$key] : $default; }
function update_option($key, $value, $autoload = null) { $GLOBALS['pvqa_options'][$key] = $value; return true; }

$GLOBALS['pvqa_theme'] = '';
function get_template_directory() { return $GLOBALS['pvqa_theme']; }

/** Writes a theme tree whose seed and manifest can be replaced between cases. */
function pvqa_theme(string $seed, string $manifest): string {
    $root = $GLOBALS['pvqa_root'];
    @mkdir($root . '/content', 0777, true);
    file_put_contents($root . '/content/seed.json', $seed);
    file_put_contents($root . '/content/manifest.json', $manifest);
    clearstatcache();
    return $root;
}
function pvqa_manifest(string $seal = null): string {
    return json_encode(array('schema' => 2, 'sourceCommit' => str_repeat('a', 40), 'seedSha256' => $seal ?? str_repeat('b', 64)));
}
function pvqa_copy_seed(array $copy): string {
    return json_encode(array('version' => 1, 'copy' => $copy, 'records' => array()));
}

$GLOBALS['pvqa_root'] = sys_get_temp_dir() . '/pecadosvip-copy-upgrade-' . bin2hex(random_bytes(6));
$GLOBALS['pvqa_theme'] = $GLOBALS['pvqa_root'];

require __DIR__ . '/../plugin/pecadosvip-content/includes/import.php';
require __DIR__ . '/../plugin/pecadosvip-content/includes/copy-upgrade.php';

/* The routine has to run before the first public render, not only when an admin logs in. */
check(in_array(array('init', 5), $GLOBALS['pvqa_hooks'], true), 'The upgrade runs on init');

/* A stored copy from the previous build: it has no contact or legal group yet. */
$stored = array(
    'footer' => array('identification' => 'Editado por el administrador', 'note' => 'Aviso propio'),
    'site' => array('logo' => 41),
    'hero' => array('title' => 'Titulo heredado'),
);
$shipped = array(
    'footer' => array('identification' => 'Texto de fabrica', 'note' => 'Aviso de fabrica', 'report' => 'Denunciar'),
    'site' => array('logo' => array('path' => 'assets/media/logo.png'), 'icon' => array('path' => 'assets/media/icon.png')),
    'hero' => array('title' => 'Titulo de fabrica', 'note' => 'Nota nueva'),
    'contact' => array('disabledTitle' => 'Canales desactivados', 'disabledBody' => 'Pendiente de aprobacion', 'disabledButton' => 'No disponible'),
    'legal' => array('provider' => array('name' => 'Pendiente'), 'notReady' => 'Informacion legal no publicada'),
);

/* 1. A site that has never imported keeps using the explicit administrator import. */
$GLOBALS['pvqa_options'] = array('pvc_copy_seed' => array());
check(pvc_copy_upgrade() === false, 'An empty stored copy is left to the explicit import');
check($GLOBALS['pvqa_options']['pvc_copy_seed'] === array(), 'An empty stored copy is not written');
check(!isset($GLOBALS['pvqa_options']['pvc_copy_stamp']), 'An unknown site is not stamped as done');

/* 2. The real upgrade. */
pvqa_theme(pvqa_copy_seed($shipped), pvqa_manifest());
$GLOBALS['pvqa_options'] = array('pvc_copy_seed' => $stored);
$stamp = str_repeat('b', 64);
check(pvc_copy_upgrade() === true, 'A changed build upgrades the stored copy');
$after = $GLOBALS['pvqa_options']['pvc_copy_seed'];

check(($after['contact']['disabledTitle'] ?? null) === 'Canales desactivados', 'A new contact label is added');
check(($after['contact']['disabledBody'] ?? null) === 'Pendiente de aprobacion', 'A second new contact label is added');
check(($after['contact']['disabledButton'] ?? null) === 'No disponible', 'A third new contact label is added');
check(($after['legal']['notReady'] ?? null) === 'Informacion legal no publicada', 'A new legal label is added');
check(($after['legal']['provider']['name'] ?? null) === 'Pendiente', 'A nested new legal label is added');
check(($after['hero']['note'] ?? null) === 'Nota nueva', 'A new key inside an existing group is added');

check(($after['footer']['identification'] ?? null) === 'Editado por el administrador', 'An administrator edit is never overwritten');
check(($after['footer']['note'] ?? null) === 'Aviso propio', 'A second administrator edit is never overwritten');
check(($after['hero']['title'] ?? null) === 'Titulo heredado', 'An edited key in a new group survives');
check(($after['footer']['report'] ?? null) === 'Denunciar', 'A brand new key in an edited group is added');

check(($after['site']['logo'] ?? null) === 41, 'An existing media reference is preserved');
check(!array_key_exists('icon', (array) $after['site']), 'The automatic path never creates attachments from media entries');
check($GLOBALS['pvqa_options']['pvc_copy_stamp'] === $stamp, 'The shipped build is recorded as applied');

/* 3. Idempotent: a second request changes nothing and does not rewrite the option. */
$before = $GLOBALS['pvqa_options']['pvc_copy_seed'];
check(pvc_copy_upgrade() === false, 'The second run reports nothing to do');
check($GLOBALS['pvqa_options']['pvc_copy_seed'] === $before, 'The second run changes nothing');

/* 4. A new build adds only what is still missing. */
$GLOBALS['pvqa_options']['pvc_copy_stamp'] = 'old';
pvqa_theme(pvqa_copy_seed(array_merge($shipped, array('coverage' => array('title' => 'Cobertura')))), pvqa_manifest(str_repeat('c', 64)));
check(pvc_copy_upgrade() === true, 'A later build upgrades again');
$after2 = $GLOBALS['pvqa_options']['pvc_copy_seed'];
check(($after2['coverage']['title'] ?? null) === 'Cobertura', 'The later build adds its new group');
check(($after2['footer']['identification'] ?? null) === 'Editado por el administrador', 'The later build still respects the administrator');

/* 5. Fail closed: a seed that is not usable leaves the stored copy untouched. */
foreach (array('{"version":2,"copy":{}}', 'not json', '{"version":1}', '{"version":1,"copy":"texto"}') as $bad) {
    $GLOBALS['pvqa_options'] = array('pvc_copy_seed' => $stored);
    pvqa_theme($bad, pvqa_manifest(str_repeat('d', 64)));
    check(pvc_copy_upgrade() === false, 'An unusable seed is refused');
    check($GLOBALS['pvqa_options']['pvc_copy_seed'] === $stored, 'An unusable seed writes nothing');
    check(!isset($GLOBALS['pvqa_options']['pvc_copy_stamp']), 'An unusable seed is not stamped as done');
}

/* 6. Fail closed: without an identifiable build there is nothing to upgrade towards. */
foreach (array('{"schema":1,"seedSha256":"' . str_repeat('b', 64) . '"}', '{"schema":2,"seedSha256":"corto"}', '{"schema":2}', 'no json') as $badManifest) {
    $GLOBALS['pvqa_options'] = array('pvc_copy_seed' => $stored);
    pvqa_theme(pvqa_copy_seed($shipped), $badManifest);
    check(pvc_copy_upgrade() === false, 'An unidentifiable build is refused');
    check($GLOBALS['pvqa_options']['pvc_copy_seed'] === $stored, 'An unidentifiable build writes nothing');
}

/* 7. Fail closed: a missing theme payload is not an upgrade. */
$GLOBALS['pvqa_options'] = array('pvc_copy_seed' => $stored);
@unlink($GLOBALS['pvqa_root'] . '/content/seed.json');
clearstatcache();
check(pvc_copy_upgrade() === false, 'A missing seed is refused');
check($GLOBALS['pvqa_options']['pvc_copy_seed'] === $stored, 'A missing seed writes nothing');

@unlink($GLOBALS['pvqa_root'] . '/content/manifest.json');
@rmdir($GLOBALS['pvqa_root'] . '/content');
@rmdir($GLOBALS['pvqa_root']);

echo json_encode(array('ok' => true, 'assertions' => $checks), JSON_PRETTY_PRINT) . PHP_EOL;
