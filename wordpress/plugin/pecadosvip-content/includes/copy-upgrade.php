<?php
/**
 * Keeps the stored editable copy in step with the copy the theme build ships.
 *
 * Every editable label on the site is rendered from the `pvc_copy_seed` option, and the
 * only writer of that option used to be pvc_import_seed(), which is an explicit
 * administrator action. A deployment that introduces new copy keys therefore published a
 * site whose new sections rendered with empty labels until somebody re-ran the import by
 * hand: the feature looked broken when only the migration was missing.
 *
 * This routine closes that gap. When the identity of the shipped seed changes, the keys
 * that the stored copy does not have yet are filled in.
 *
 * Two properties are deliberate:
 *
 * - It never overwrites. pvc_import_copy() only fills keys that are absent, so an
 *   administrator edit always wins and running this twice changes nothing.
 * - It fails closed. An unreadable, unexpected or unidentifiable seed leaves the stored
 *   copy untouched rather than publishing partial text.
 *
 * It also never creates attachments. Media entries (`{"path": ...}`) are left to the
 * explicit administrator import, so no anonymous front-end request can write files.
 */
if (!defined('ABSPATH')) { exit; }

/** Identity of the copy the active theme build ships, or '' when it cannot be established. */
function pvc_copy_stamp(): string {
    $root = realpath(get_template_directory());
    if (!$root) { return ''; }
    $file = realpath($root . '/content/manifest.json');
    if (!$file || !str_starts_with($file, $root . DIRECTORY_SEPARATOR) || !is_readable($file)) { return ''; }
    $manifest = json_decode((string) file_get_contents($file), true);
    if (!is_array($manifest) || (int) ($manifest['schema'] ?? 0) !== 2) { return ''; }
    $seal = (string) ($manifest['seedSha256'] ?? '');
    return preg_match('/^[0-9a-f]{64}$/', $seal) === 1 ? $seal : '';
}

/** The copy section of the shipped seed, or null when it is not usable. */
function pvc_copy_seed_copy(): ?array {
    $root = realpath(get_template_directory());
    if (!$root) { return null; }
    $file = realpath($root . '/content/seed.json');
    if (!$file || !str_starts_with($file, $root . DIRECTORY_SEPARATOR) || !is_readable($file)) { return null; }
    $seed = json_decode((string) file_get_contents($file), true);
    if (!is_array($seed) || (int) ($seed['version'] ?? 0) !== 1 || !isset($seed['copy']) || !is_array($seed['copy'])) { return null; }
    return $seed['copy'];
}

/** Drops media entries so the automatic path cannot create attachments. */
function pvc_copy_without_media(array $incoming): array {
    $text = array();
    foreach ($incoming as $key => $value) {
        if (is_array($value) && isset($value['path'])) { continue; }
        $text[$key] = is_array($value) ? pvc_copy_without_media($value) : $value;
    }
    return $text;
}

/**
 * Fills the missing editable copy for the shipped build and reports whether the stored
 * copy now matches it. A refused or failing merge returns false and is retried on the
 * next request instead of being recorded as done.
 */
function pvc_copy_upgrade(): bool {
    $stamp = pvc_copy_stamp();
    if ($stamp === '' || get_option('pvc_copy_stamp') === $stamp) { return false; }
    $existing = (array) get_option('pvc_copy_seed', array());
    // A site that has never imported keeps using the explicit administrator import: it is
    // the only path allowed to build the attachments that some copy entries reference.
    if (!$existing) { return false; }
    $incoming = pvc_copy_seed_copy();
    if ($incoming === null) { return false; }
    $root = (string) realpath(get_template_directory());
    $merged = pvc_import_copy(pvc_copy_without_media($incoming), $existing, $root);
    if (is_wp_error($merged)) { return false; }
    update_option('pvc_copy_seed', $merged, false);
    update_option('pvc_copy_stamp', $stamp, false);
    return true;
}

// Before the first template render, because the public site needs the copy on its first visit.
add_action('init', function () { pvc_copy_upgrade(); }, 5);
