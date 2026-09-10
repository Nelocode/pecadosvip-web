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
function pvc_copy_upgrade_seed(string $root, string $stamp = ''): ?array {
    $file = realpath($root . '/content/seed.json');
    if (!$file || !str_starts_with($file, $root . DIRECTORY_SEPARATOR) || !is_file($file) || !is_readable($file)) { return null; }
    // Bound both I/O and JSON nesting on an unmarked upgrade. Suppress filesystem
    // warnings if a release changes permissions/files between the checks and read.
    $limit = 8 * 1024 * 1024;
    $bytes = @file_get_contents($file, false, null, 0, $limit + 1);
    if ($bytes === false || strlen($bytes) > $limit) { return null; }
    if ($stamp !== '' && !hash_equals($stamp, hash('sha256', $bytes))) { return null; }
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

/** Small local manifest check; no seed read on the ordinary unchanged-build path. */
function pvc_copy_stamp(): string {
    $root = realpath(get_template_directory());
    if (!$root) { return ''; }
    $file = realpath($root . '/content/manifest.json');
    if (!$file || !str_starts_with($file, $root . DIRECTORY_SEPARATOR) || !is_file($file) || !is_readable($file)) { return ''; }
    $bytes = @file_get_contents($file, false, null, 0, 16385);
    if ($bytes === false || strlen($bytes) > 16384) { return ''; }
    $manifest = json_decode($bytes, true, 16);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($manifest) || ($manifest['schema'] ?? null) !== 2) { return ''; }
    $stamp = $manifest['seedSha256'] ?? null;
    return is_string($stamp) && preg_match('/^[a-f0-9]{64}$/', $stamp) === 1 ? $stamp : '';
}

/** Versioned copy-only migration; no records, publication settings or locale overrides. */
function pvc_maybe_upgrade_copy(): bool {
    $stamp = pvc_copy_stamp();
    if ($stamp === '') { return false; }
    if (get_option('pvc_copy_applied_version', '') === PVC_VERSION && get_option('pvc_copy_stamp', '') === $stamp) { return true; }
    $existing = get_option('pvc_copy_seed', array());
    // Preserve the upstream initialization policy: a site with no imported copy
    // still needs the explicit import, which can also initialize its media.
    if (!is_array($existing) || $existing === array()) { return false; }
    $root = realpath(get_template_directory());
    if (!$root) { return false; }
    $incoming = pvc_copy_upgrade_seed($root, $stamp);
    if ($incoming === null) { return false; }
    $copy = pvc_import_copy(pvc_copy_upgrade_defaults($incoming, $existing), $existing, $root);
    if (is_wp_error($copy)) { return false; }
    // The version is recorded last. A failed data write remains retryable; ordinary
    // editorial forms use pvc_copy_<locale>, which this migration never writes.
    if ($copy !== $existing && !update_option('pvc_copy_seed', $copy, false)) { return false; }
    if (get_option('pvc_copy_stamp', '') !== $stamp && !update_option('pvc_copy_stamp', $stamp, false)) { return false; }
    update_option('pvc_copy_applied_version', PVC_VERSION, false);
    return get_option('pvc_copy_applied_version', '') === PVC_VERSION && get_option('pvc_copy_stamp', '') === $stamp;
}

// Preserve the upstream helper API; its boolean means an upgrade was applied,
// while pvc_maybe_upgrade_copy reports whether this version/build is now ready.
function pvc_copy_upgrade(): bool {
    $before = array(get_option('pvc_copy_applied_version', ''), get_option('pvc_copy_stamp', ''));
    return pvc_maybe_upgrade_copy() && $before !== array(get_option('pvc_copy_applied_version', ''), get_option('pvc_copy_stamp', ''));
}
function pvc_copy_seed_copy(): ?array {
    $root = realpath(get_template_directory()); $stamp = pvc_copy_stamp();
    return $root && $stamp !== '' ? pvc_copy_upgrade_seed($root, $stamp) : null;
}
function pvc_copy_without_media(array $incoming): array { return pvc_copy_upgrade_defaults($incoming, array()); }

// after_setup_theme runs after the active theme is resolved, before init/REST and
// template rendering, including the first anonymous visit. The first request after
// a version OR build change pays one bounded seed read/merge. Ordinary requests
// only inspect version/stamp options and the small manifest (16 KiB maximum), so
// copy-only releases without a version bump still migrate, as upstream intended.
// Unlike admin_init/activation this also covers Docker upgrades.
// A broken seed remains unmarked and is retried, without serving warnings or writes.
add_action('after_setup_theme', 'pvc_maybe_upgrade_copy', 20);
