<?php
/**
 * Locale completion for published records.
 *
 * A profile that exists only in the source locale must stay visible and reachable in the
 * other languages instead of disappearing from the listing and returning 404. This file
 * completes a locale with the source record and flags it, so the template can disclose
 * that it is not a translation.
 *
 * Nothing unpublished can enter: every list comes from `pvc_records()`, which only
 * returns published, password-free records.
 */
if (!defined('ABSPATH')) { exit; }

/** Source locale used to complete a locale that has no version of a record yet. */
const PVC_SOURCE_LOCALE = 'es';

function pvc_records_localized(string $type, string $locale, string $source = PVC_SOURCE_LOCALE): array {
    $type = pvc_type($type);
    if ($locale === $source || !isset(pvc_locales()[$locale])) { return pvc_records($type, $locale); }
    $localized = array();
    foreach (pvc_records($type, $locale) as $record) { $localized[$record['key']] = $record; }
    $records = array();
    // Source editorial order first, so a completed record keeps the position the editor
    // chose and a translated record keeps replacing it in place.
    foreach (pvc_records($type, $source) as $record) {
        $key = $record['key'];
        if (isset($localized[$key])) { $records[] = $localized[$key]; unset($localized[$key]); continue; }
        $record['fallback'] = true; $record['sourceLocale'] = $source;
        $records[] = $record;
    }
    // A record published only in this locale is never dropped.
    foreach ($localized as $record) { $records[] = $record; }
    return $records;
}

function pvc_record_localized(string $type, string $locale, string $key): ?array {
    foreach (pvc_records_localized($type, $locale) as $record) { if ($record['key'] === $key) { return $record; } }
    return null;
}

/** Number of records a locale shows because they have no version in that locale yet. */
function pvc_records_fallback_count(string $type, string $locale): int {
    return count(array_filter(pvc_records_localized($type, $locale), static function($record) { return !empty($record['fallback']); }));
}
