<?php
/** Offline option-store simulation: real import merge and real temporary seed files. */
define('ABSPATH', __DIR__ . '/');
define('PVC_VERSION', '1.3.1');
$options = array(); $writes = array(); $hooks = array(); $checks = 0;
$themeReads = 0; $failedWrite = ''; $mediaCalls = 0;
$fixture = sys_get_temp_dir() . '/pvc-copy-upgrade-' . bin2hex(random_bytes(8));
mkdir($fixture . '/content', 0700, true);
$themeRoot = $fixture;
$simulateReadFailure = ($argv[1] ?? '') === '--read-failure';
if ($simulateReadFailure) {
    if (function_exists('file_get_contents')) { throw new RuntimeException('Read-failure fixture requires disable_functions=file_get_contents.'); }
    // PHP 8 permits redefining a disabled builtin in this isolated test process.
    function file_get_contents(...$args) {
        if (basename($args[0]) === 'manifest.json' && empty($GLOBALS['failManifestRead'])) { return $GLOBALS['fixtureManifestBytes']; }
        $GLOBALS['failedReads'][] = basename($args[0]);
        return false;
    }
}
class WP_Error {}
function is_wp_error($value) { return $value instanceof WP_Error; }
function add_action($hook, $callback, $priority = 10, ...$args) { $GLOBALS['hooks'][$hook][$priority][] = $callback; }
function pvc_locales() { return array('es'=>'Español', 'en'=>'English', 'fr'=>'Français', 'it'=>'Italiano'); }
function get_template_directory() { $GLOBALS['themeReads']++; return $GLOBALS['themeRoot']; }
function get_option($name, $default = false) { return $GLOBALS['options'][$name] ?? $default; }
function update_option($name, $value, $autoload = null) {
    $GLOBALS['writes'][] = $name;
    if ($GLOBALS['failedWrite'] === $name) { return false; }
    if (array_key_exists($name, $GLOBALS['options']) && $GLOBALS['options'][$name] === $value) { return false; }
    $GLOBALS['options'][$name] = $value;
    return true;
}
function current_user_can(...$args) { throw new RuntimeException('The automatic upgrade must not check user capabilities.'); }
function get_posts(...$args) { $GLOBALS['mediaCalls']++; throw new RuntimeException('The copy upgrade must not look up or import media.'); }
function check($ok, $message) { $GLOBALS['checks']++; if (!$ok) { throw new RuntimeException($message); } }
require __DIR__ . '/../plugin/pecadosvip-content/includes/import.php';
require __DIR__ . '/../plugin/pecadosvip-content/includes/copy-upgrade.php';

function seed_fixture(): array {
    $copy = array();
    foreach (array_keys(pvc_locales()) as $locale) {
        $copy[$locale] = array(
            'footer' => array('x'=>'Default footer', 'empty'=>'Default', 'zero'=>99, 'disabled'=>true),
            'contact' => array('title'=>'Contact', 'disabledTitle'=>'Not available'),
            'legal' => array('provider'=>array('name'=>'Provider'), 'cookies'=>array('title'=>'Cookies')),
            'site' => array('logo'=>array('path'=>'assets/media/missing.png', 'alt'=>'Brand'), 'hero'=>array('path'=>'assets/media/missing.png', 'alt'=>''), 'brandPrimary'=>'Brand'),
            'nested' => array('new'=>array('label'=>'Label', 'image'=>array('path'=>'missing.png'))),
            'emptyList' => array(),
        );
    }
    return array('version'=>1, 'copy'=>$copy, 'records'=>array(array('type'=>'page', 'key'=>'never-import')));
}
function write_seed($seed): void {
    $bytes = is_string($seed) ? $seed : json_encode($seed);
    file_put_contents($GLOBALS['fixture'] . '/content/seed.json', $bytes);
    $GLOBALS['fixtureManifestBytes'] = json_encode(array('schema'=>2, 'seedSha256'=>hash('sha256', $bytes)));
    file_put_contents($GLOBALS['fixture'] . '/content/manifest.json', $GLOBALS['fixtureManifestBytes']);
    clearstatcache();
}
function reset_store(array $initial = array()): void {
    $GLOBALS['options'] = $initial; $GLOBALS['writes'] = array();
    $GLOBALS['themeRoot'] = $GLOBALS['fixture']; $GLOBALS['failedWrite'] = '';
}
function check_no_write(string $message): void {
    $before = $GLOBALS['options']; $GLOBALS['writes'] = array();
    check(pvc_maybe_upgrade_copy() === false, $message . ': upgrade rejected');
    check($GLOBALS['writes'] === array() && $GLOBALS['options'] === $before, $message . ': no option writes');
}

try {
    $seed = seed_fixture(); write_seed($seed);
    if ($simulateReadFailure) {
        reset_store(array('pvc_copy_seed'=>array('es'=>array('footer'=>array('x'=>'Own')))));
        check(is_file($fixture . '/content/seed.json') && is_readable($fixture . '/content/seed.json'), 'Regular file passes real filesystem prechecks');
        check_no_write('Simulated read failure after valid filesystem prechecks');
        check(($GLOBALS['failedReads'] ?? array()) === array('seed.json'), 'Seed read was actually attempted');
        $GLOBALS['failManifestRead'] = true; $GLOBALS['failedReads'] = array();
        check_no_write('Simulated manifest read failure');
        check($GLOBALS['failedReads'] === array('manifest.json'), 'Manifest read was actually attempted');
        echo json_encode(array('ok'=>true, 'assertions'=>$checks, 'readFailureSimulated'=>true)) . PHP_EOL;
        return;
    }
    $old = $seed['copy'];
    foreach (array_keys(pvc_locales()) as $locale) {
        unset($old[$locale]['contact'], $old[$locale]['legal'], $old[$locale]['nested'], $old[$locale]['site']['hero'], $old[$locale]['emptyList']);
        $old[$locale]['footer'] = array('x'=>'Administrator footer', 'empty'=>'', 'zero'=>0, 'disabled'=>false);
        $old[$locale]['site']['logo'] = 123;
    }
    $editorOverride = array('footer'=>array('x'=>'Locale override'), 'contact'=>array('title'=>'Custom contact'));
    $policy = array('enabled'=>false, 'publish'=>false);
    $legacy = array('frozen'=>array(15, 26));
    reset_store(array('pvc_copy_seed'=>$old, 'pvc_copy_es'=>$editorOverride, 'pvc_lt_policy'=>$policy, 'pvc_lt_legacy'=>$legacy));
    check(($hooks['after_setup_theme'][20] ?? array()) === array('pvc_maybe_upgrade_copy'), 'Runs before public rendering, after active theme resolution');
    $migrationHooks = array();
    foreach ($hooks as $hook => $priorities) { foreach ($priorities as $priority => $callbacks) { foreach ($callbacks as $callback) {
        if (in_array($callback, array('pvc_maybe_upgrade_copy','pvc_copy_upgrade'), true)) { $migrationHooks[] = array($hook,$priority,$callback); }
    } } }
    check($migrationHooks === array(array('after_setup_theme',20,'pvc_maybe_upgrade_copy')), 'Exactly one automatic migration hook');
    check(pvc_maybe_upgrade_copy() === true, 'Old database upgrade succeeds without administrator capabilities');
    foreach (array_keys(pvc_locales()) as $locale) {
        $copy = $options['pvc_copy_seed'][$locale];
        check($copy['contact'] === $seed['copy'][$locale]['contact'], $locale . ': contact defaults added');
        check($copy['legal'] === $seed['copy'][$locale]['legal'], $locale . ': legal defaults added');
        check($copy['footer'] === $old[$locale]['footer'], $locale . ': manual values, empty string, zero and false preserved');
        check($copy['site']['logo'] === 123 && !array_key_exists('hero', $copy['site']), $locale . ': old media preserved and new media omitted');
        check($copy['nested']['new'] === array('label'=>'Label'), $locale . ': nested text added without its media');
    }
    check($options['pvc_copy_es'] === $editorOverride, 'Per-language editor overrides untouched');
    check($options['pvc_lt_policy'] === $policy && $options['pvc_lt_legacy'] === $legacy, 'Publication policy and frozen inventory untouched');
    check($writes === array('pvc_copy_seed', 'pvc_copy_stamp', 'pvc_copy_applied_version'), 'Data, build stamp and version written in that order');
    check(array_key_exists('emptyList', $options['pvc_copy_seed']['es']) && $options['pvc_copy_seed']['es']['emptyList'] === array(), 'New empty collections remain valid defaults');
    check($mediaCalls === 0, 'No media import queries');
    $snapshot = $options; $writes = array(); $reads = $themeReads;
    check(pvc_maybe_upgrade_copy() === true && $options === $snapshot && $writes === array(), 'Second execution is an exact no-op');
    check($themeReads === $reads + 1, 'Unchanged version/build only resolves the small manifest');
    unlink($fixture . '/content/seed.json');
    check(pvc_maybe_upgrade_copy() === true && $themeReads === $reads + 2 && $writes === array(), 'Unchanged version/build does not read the unavailable seed');
    check(pvc_copy_upgrade() === false && $writes === array(), 'Upstream API reports no applied upgrade on a no-op');

    reset_store(array('pvc_copy_seed'=>$old));
    check_no_write('Missing/unreadable seed');
    mkdir($fixture . '/content/seed.json');
    check_no_write('Seed is a directory, not a readable regular file');
    rmdir($fixture . '/content/seed.json');
    foreach (array('{invalid', "\xff\xfe", array('version'=>2,'copy'=>$seed['copy']), array('version'=>'1','copy'=>$seed['copy']), array('version'=>1), array('version'=>1,'copy'=>'invalid'), array('version'=>1,'copy'=>array())) as $invalid) {
        write_seed($invalid); check_no_write('Invalid JSON or schema');
    }
    $invalid = $seed; unset($invalid['copy']['fr']); write_seed($invalid); check_no_write('Missing locale');
    $invalid = $seed; $invalid['copy']['it'] = 'invalid'; write_seed($invalid); check_no_write('Invalid locale copy');
    write_seed(str_repeat(' ', 8 * 1024 * 1024 + 1)); check_no_write('Oversized seed');
    write_seed($seed);

    unlink($fixture . '/content/manifest.json'); check_no_write('Missing manifest');
    mkdir($fixture . '/content/manifest.json'); check_no_write('Manifest is a directory');
    rmdir($fixture . '/content/manifest.json');
    foreach (array('{invalid', array('schema'=>'2', 'seedSha256'=>str_repeat('a',64)), array('schema'=>2), array('schema'=>2,'seedSha256'=>123), array('schema'=>2,'seedSha256'=>str_repeat('a',63)), str_repeat(' ',16385)) as $invalid) {
        file_put_contents($fixture . '/content/manifest.json', is_string($invalid) ? $invalid : json_encode($invalid));
        clearstatcache(); check_no_write('Invalid manifest JSON, schema, hash or size');
    }
    file_put_contents($fixture . '/content/manifest.json', json_encode(array('schema'=>2,'seedSha256'=>str_repeat('a',64))));
    check_no_write('Valid seed and manifest disagree on exact seed bytes');
    write_seed($seed);

    reset_store(array('pvc_copy_seed'=>'Unexpected stored value')); check_no_write('Malformed stored copy preserved');
    $errorCopy = $old; $errorCopy['es']['footer']['x'] = new WP_Error;
    reset_store(array('pvc_copy_seed'=>$errorCopy)); check_no_write('WP_Error from the real pvc_import_copy merge');
    reset_store(array('pvc_copy_seed'=>$old)); $failedWrite = 'pvc_copy_seed';
    check(pvc_maybe_upgrade_copy() === false, 'Failed data write is reported');
    check(!isset($options['pvc_copy_applied_version']) && $options['pvc_copy_seed'] === $old, 'Failed data write never marks the version');
    check(!isset($options['pvc_copy_stamp']), 'Failed data write never marks the build');
    $failedWrite = ''; check(pvc_maybe_upgrade_copy() === true, 'A failed write can be retried');
    reset_store(array('pvc_copy_seed'=>$old)); $failedWrite = 'pvc_copy_stamp';
    check(pvc_maybe_upgrade_copy() === false && isset($options['pvc_copy_seed']['es']['contact']), 'Stamp failure preserves successfully merged data');
    check(!isset($options['pvc_copy_stamp']) && !isset($options['pvc_copy_applied_version']), 'Failed stamp never marks the version');
    $failedWrite = ''; $writes = array();
    check(pvc_maybe_upgrade_copy() === true && $writes === array('pvc_copy_stamp','pvc_copy_applied_version'), 'Stamp retry does not rewrite already merged data');
    reset_store(array('pvc_copy_seed'=>$old)); $failedWrite = 'pvc_copy_applied_version';
    check(pvc_maybe_upgrade_copy() === false && isset($options['pvc_copy_seed']['es']['contact']), 'Marker failure does not roll back successfully merged data');
    check(!isset($options['pvc_copy_applied_version']), 'Failed marker remains retryable');
    $failedWrite = ''; $writes = array();
    check(pvc_maybe_upgrade_copy() === true && $writes === array('pvc_copy_applied_version'), 'Marker retry does not rewrite already merged copy');
    $oldStamp = $options['pvc_copy_stamp']; $seed['copy']['es']['contact']['newLabel'] = 'New label'; write_seed($seed);
    check(pvc_copy_upgrade() === true && $options['pvc_copy_seed']['es']['contact']['newLabel'] === 'New label', 'A new build applies defaults without a plugin version change');
    check($options['pvc_copy_stamp'] !== $oldStamp && $options['pvc_copy_seed']['es']['footer']['x'] === 'Administrator footer', 'New build updates the stamp and preserves edits');
    $writes = array(); check(pvc_copy_upgrade() === false && $writes === array(), 'New build becomes an exact no-op');
    $options['pvc_copy_applied_version'] = '1.2.0';
    check(pvc_copy_upgrade() === true && $writes === array('pvc_copy_applied_version'), 'A plugin version change migrates even with the same build');
    check(pvc_copy_seed_copy() === $seed['copy'], 'Upstream seed helper validates the coherent local build');
    check(pvc_copy_without_media($seed['copy']) === pvc_copy_upgrade_defaults($seed['copy'], array()), 'Upstream media helper retains text-only filtering');
    reset_store(array('pvc_copy_seed'=>$seed['copy']));
    check(pvc_maybe_upgrade_copy() === true && $writes === array('pvc_copy_stamp','pvc_copy_applied_version'), 'Existing complete copy only needs build and version stamps');
    $scalar = $old; $scalar['es']['contact'] = ''; reset_store(array('pvc_copy_seed'=>$scalar));
    check(pvc_maybe_upgrade_copy() === true && $options['pvc_copy_seed']['es']['contact'] === '', 'An existing scalar branch is not replaced by an incoming object');
    reset_store(); check_no_write('Fresh option store requires explicit import');
    reset_store(array('pvc_copy_seed'=>array())); check_no_write('Empty imported copy requires explicit import');
    check($mediaCalls === 0, 'No scenario imports media');

    // Optional real built seed, passed explicitly so Docker fixtures do not require a dist mount.
    if (isset($argv[1])) {
        $builtBytes = (string) file_get_contents($argv[1]);
        $built = json_decode($builtBytes, true, 64, JSON_THROW_ON_ERROR);
        check(($built['version'] ?? null) === 1, 'Built seed schema recognized');
        $oldBuilt = pvc_copy_upgrade_defaults($built['copy'], array());
        foreach (array_keys(pvc_locales()) as $locale) { unset($oldBuilt[$locale]['contact'], $oldBuilt[$locale]['legal']); }
        $oldBuilt['es']['footer']['x'] = 'Administrator footer';
        write_seed($builtBytes); reset_store(array('pvc_copy_seed'=>$oldBuilt));
        check(pvc_maybe_upgrade_copy() === true, 'Actual build upgrades an old database');
        foreach (array_keys(pvc_locales()) as $locale) {
            check($options['pvc_copy_seed'][$locale]['contact'] === $built['copy'][$locale]['contact'], $locale . ': real contact group migrated');
            check($options['pvc_copy_seed'][$locale]['legal'] === $built['copy'][$locale]['legal'], $locale . ': real legal group migrated');
        }
        check($options['pvc_copy_seed']['es']['footer']['x'] === 'Administrator footer', 'Real build preserves custom footer');
        $snapshot = $options; $writes = array();
        check(pvc_maybe_upgrade_copy() === true && $options === $snapshot && $writes === array(), 'Real build second execution is a no-op');
    }
    $process = proc_open(array(PHP_BINARY, '-d', 'disable_functions=file_get_contents', __FILE__, '--read-failure'), array(0=>array('pipe','r'), 1=>array('pipe','w'), 2=>array('pipe','w')), $pipes);
    check(is_resource($process), 'Read-failure subprocess started');
    fclose($pipes[0]); $out = stream_get_contents($pipes[1]); $err = stream_get_contents($pipes[2]); fclose($pipes[1]); fclose($pipes[2]);
    $code = proc_close($process); $readFailure = json_decode($out, true);
    check($code === 0 && $err === '' && ($readFailure['ok'] ?? false), 'Read-failure fixture succeeds without warnings: ' . $err);
    check(($readFailure['readFailureSimulated'] ?? false) === true && ($readFailure['assertions'] ?? 0) === 7, 'Unreadable manifest and seed branches perform no option writes');
    echo json_encode(array('ok'=>true, 'assertions'=>$checks, 'readFailureAssertions'=>$readFailure['assertions'], 'mediaImportCalls'=>$mediaCalls, 'builtSeedChecked'=>isset($argv[1])), JSON_PRETTY_PRINT) . PHP_EOL;
} finally {
    if (is_file($fixture . '/content/seed.json')) { unlink($fixture . '/content/seed.json'); }
    if (is_file($fixture . '/content/manifest.json')) { unlink($fixture . '/content/manifest.json'); }
    rmdir($fixture . '/content'); rmdir($fixture);
}
