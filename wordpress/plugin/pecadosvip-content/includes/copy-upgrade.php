<?php
if (!defined('ABSPATH')) { exit; }

/** Only text defaults belong in the automatic upgrade; explicit import owns media. */
function pvc_copy_upgrade_defaults(array $incoming, array $existing): array {
    $defaults = array();
    foreach ($incoming as $key => $value) {
        if (is_array($value)) {
            // Never hash, copy or register a bundled image during a public request.
            // Omit missing media rather than storing 0, so explicit import can add it later.
            if (array_key_exists('path', $value)) { continue; }
            $previous = $existing[$key] ?? null;
            // A deliberately emptied/scalar branch is also an administrator's value.
            if ($previous !== null && !is_array($previous)) { continue; }
            $children = pvc_copy_upgrade_defaults($value, $previous ?? array());
            if ($children !== array() || $value === array()) { $defaults[$key] = $children; }
        } else {
            $defaults[$key] = $value;
        }
    }
    return $defaults;
}

/** Bounded, local-only schema read. Failure must not change any option. */
function pvc_copy_upgrade_seed(string $root): ?array {
    $file = realpath($root . '/content/seed.json');
    if (!$file || !str_starts_with($file, $root . DIRECTORY_SEPARATOR) || !is_file($file) || !is_readable($file)) { return null; }
    // Bound both I/O and JSON nesting on an unmarked upgrade. Suppress filesystem
    // warnings if a release changes permissions/files between the checks and read.
    $limit = 8 * 1024 * 1024;
    $bytes = @file_get_contents($file, false, null, 0, $limit + 1);
    if ($bytes === false || strlen($bytes) > $limit) { return null; }
    $seed = json_decode($bytes, true, 64);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($seed) || ($seed['version'] ?? null) !== 1 || !is_array($seed['copy'] ?? null)) { return null; }
    $locales = array_keys(pvc_locales()); $found = array_keys($seed['copy']);
    sort($locales); sort($found);
    if ($found !== $locales) { return null; }
    foreach ($seed['copy'] as $copy) {
        if (!is_array($copy) || $copy === array()) { return null; }
    }
    return $seed['copy'];
}

/** Versioned copy-only migration; no records, publication settings or locale overrides. */
function pvc_maybe_upgrade_copy(): bool {
    if (get_option('pvc_copy_applied_version', '') === PVC_VERSION) { return true; }
    $root = realpath(get_template_directory());
    if (!$root) { return false; }
    $incoming = pvc_copy_upgrade_seed($root);
    if ($incoming === null) { return false; }
    $existing = get_option('pvc_copy_seed', array());
    if (!is_array($existing)) { return false; }
    $copy = pvc_import_copy(pvc_copy_upgrade_defaults($incoming, $existing), $existing, $root);
    if (is_wp_error($copy)) { return false; }
    // The version is recorded last. A failed data write remains retryable; ordinary
    // editorial forms use pvc_copy_<locale>, which this migration never writes.
    if ($copy !== $existing && !update_option('pvc_copy_seed', $copy, false)) { return false; }
    update_option('pvc_copy_applied_version', PVC_VERSION, false);
    return get_option('pvc_copy_applied_version', '') === PVC_VERSION;
}

// after_setup_theme runs after the active theme is resolved, before init/REST and
// template rendering, including the first anonymous visit. The first request after
// a version change pays one bounded seed read/merge; subsequent requests only read
// the version option. Unlike admin_init/activation this also covers Docker upgrades.
// A broken seed remains unmarked and is retried, without serving warnings or writes.
add_action('after_setup_theme', 'pvc_maybe_upgrade_copy', 20);
