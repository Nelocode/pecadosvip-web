<?php
/**
 * A profile that only exists in Spanish must stay visible and reachable in the other
 * three languages, disclosed as untranslated, and never expose unpublished records.
 */
define('ABSPATH',__DIR__);
$checks=0;
function check($ok,$m){++$GLOBALS['checks'];if(!$ok)throw new \RuntimeException($m);}
function pvc_type(string $type): string { return str_starts_with($type, 'pv_') ? $type : 'pv_' . $type; }
function pvc_locales(): array { return array('es' => 'Español', 'en' => 'English', 'fr' => 'Français', 'it' => 'Italiano'); }
/** Fixture store: only what each locale actually publishes. */
function pvc_records(string $type, string $locale): array {
    $published = array(
        'es' => array(array('key' => 'alicia', 'title' => 'Alicia', 'locale' => 'es'), array('key' => 'maria', 'title' => 'Maria', 'locale' => 'es')),
        'en' => array(array('key' => 'alicia', 'title' => 'Alicia (EN)', 'locale' => 'en')),
        'fr' => array(),
        'it' => array(array('key' => 'nuevo', 'title' => 'Solo italiano', 'locale' => 'it')),
    );
    return $type === 'pv_profile' ? ($published[$locale] ?? array()) : array();
}
require __DIR__.'/../plugin/pecadosvip-content/includes/localized-records.php';

$es = pvc_records_localized('profile', 'es');
check(array_column($es, 'key') === array('alicia', 'maria'), 'The source locale is returned untouched');
check(pvc_records_fallback_count('profile', 'es') === 0, 'The source locale completes nothing');

$en = pvc_records_localized('profile', 'en');
check(array_column($en, 'key') === array('alicia', 'maria'), 'A missing version is completed, in source editorial order');
check($en[0]['title'] === 'Alicia (EN)', 'The translated version wins over the source record');
check(empty($en[0]['fallback']), 'A translated record is not flagged');
check(!empty($en[1]['fallback']) && $en[1]['sourceLocale'] === 'es', 'The completed record is flagged as a fallback');
check($en[1]['title'] === 'Maria', 'The completed record keeps the source content');
check(pvc_records_fallback_count('profile', 'en') === 1, 'Exactly one record is completed for English');

$fr = pvc_records_localized('profile', 'fr');
check(array_column($fr, 'key') === array('alicia', 'maria'), 'A locale with nothing published shows the source records');
check(pvc_records_fallback_count('profile', 'fr') === 2, 'Both records are completed for French');

$it = pvc_records_localized('profile', 'it');
check(array_column($it, 'key') === array('alicia', 'maria', 'nuevo'), 'A record published only in this locale is appended, never dropped');
check(empty($it[2]['fallback']), 'A locale-only record is not a fallback');

check(pvc_record_localized('profile', 'en', 'maria')['fallback'] === true, 'A single completed lookup is flagged');
check(pvc_record_localized('profile', 'en', 'alicia')['title'] === 'Alicia (EN)', 'A single translated lookup wins');
check(pvc_record_localized('profile', 'en', 'inexistente') === null, 'An unknown key resolves to null');
check(pvc_record_localized('profile', 'de', 'maria') === null, 'An unsupported locale is not completed');
check(pvc_records_localized('profile', 'de') === array(), 'An unsupported locale is not completed in bulk');
check(pvc_records_localized('city', 'en') === array(), 'Other content types are untouched');
check(pvc_records_localized('profile', 'es', 'es') === pvc_records('pv_profile', 'es'), 'Explicit source locale short-circuits');
echo json_encode(['ok'=>true,'assertions'=>$checks],JSON_PRETTY_PRINT).PHP_EOL;
