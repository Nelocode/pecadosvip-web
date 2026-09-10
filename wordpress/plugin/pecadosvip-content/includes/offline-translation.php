<?php
/**
 * Offline translation engine: no external API, no key, no network, no browser.
 *
 * It is a glossary-based translator. The vocabulary lives in the plugin, is reviewable
 * and can be extended from WordPress without touching code (`pvc_lt_glossary` option), so
 * a site can grow it as its editorial voice grows.
 *
 * Honest limits, by design:
 * - It translates vocabulary, not prose. Word order follows the source and agreement
 *   between gender and number is not solved.
 * - Every segment reports its coverage. `pvc_lt_auto_translate()` publishes only a fully
 *   covered translation; an incomplete one stays a draft for a human and the untranslated
 *   profile still shows through the locale fallback, disclosed as untranslated.
 */
if (!defined('ABSPATH')) { exit; }

/** Closed vocabulary that must always be exact: spoken languages, availability and genre words. */
function pvc_lt_offline_dictionary(): array {
    $dictionary = array(
        // Spoken languages. Stored lowercase on purpose: the source capitalisation is
        // copied onto the translation, so a list label stays capitalised in every language.
        'inglés' => array('en' => 'english', 'fr' => 'anglais', 'it' => 'inglese'),
        'español' => array('en' => 'spanish', 'fr' => 'espagnol', 'it' => 'spagnolo'),
        'italiano' => array('en' => 'italian', 'fr' => 'italien', 'it' => 'italiano'),
        'francés' => array('en' => 'french', 'fr' => 'français', 'it' => 'francese'),
        'alemán' => array('en' => 'german', 'fr' => 'allemand', 'it' => 'tedesco'),
        'portugués' => array('en' => 'portuguese', 'fr' => 'portugais', 'it' => 'portoghese'),
        'catalán' => array('en' => 'catalan', 'fr' => 'catalan', 'it' => 'catalano'),
        'ruso' => array('en' => 'russian', 'fr' => 'russe', 'it' => 'russo'),
        'árabe' => array('en' => 'arabic', 'fr' => 'arabe', 'it' => 'arabo'),
        // Editorial adjectives and nouns seen in the catalogue.
        'carismática' => array('en' => 'charismatic', 'fr' => 'charismatique', 'it' => 'carismatica'),
        'carismático' => array('en' => 'charismatic', 'fr' => 'charismatique', 'it' => 'carismatico'),
        'romántica' => array('en' => 'romantic', 'fr' => 'romantique', 'it' => 'romantica'),
        'romántico' => array('en' => 'romantic', 'fr' => 'romantique', 'it' => 'romantico'),
        'elegante' => array('en' => 'elegant', 'fr' => 'élégante', 'it' => 'elegante'),
        'sofisticada' => array('en' => 'sophisticated', 'fr' => 'sophistiquée', 'it' => 'sofisticata'),
        'natural' => array('en' => 'natural', 'fr' => 'naturelle', 'it' => 'naturale'),
        'divertida' => array('en' => 'fun', 'fr' => 'amusante', 'it' => 'divertente'),
        'simpática' => array('en' => 'friendly', 'fr' => 'sympathique', 'it' => 'simpatica'),
        'cariñosa' => array('en' => 'affectionate', 'fr' => 'affectueuse', 'it' => 'affettuosa'),
        'discreta' => array('en' => 'discreet', 'fr' => 'discrète', 'it' => 'discreta'),
        'discreto' => array('en' => 'discreet', 'fr' => 'discret', 'it' => 'discreto'),
        'sensual' => array('en' => 'sensual', 'fr' => 'sensuelle', 'it' => 'sensuale'),
        'dulce' => array('en' => 'sweet', 'fr' => 'douce', 'it' => 'dolce'),
        'atractiva' => array('en' => 'attractive', 'fr' => 'attrayante', 'it' => 'attraente'),
        'guapa' => array('en' => 'beautiful', 'fr' => 'belle', 'it' => 'bella'),
        'inteligente' => array('en' => 'intelligent', 'fr' => 'intelligente', 'it' => 'intelligente'),
        'culta' => array('en' => 'cultured', 'fr' => 'cultivée', 'it' => 'colta'),
        'deportista' => array('en' => 'sporty', 'fr' => 'sportive', 'it' => 'sportiva'),
        'joven' => array('en' => 'young', 'fr' => 'jeune', 'it' => 'giovane'),
        'madura' => array('en' => 'mature', 'fr' => 'mûre', 'it' => 'matura'),
        'alta' => array('en' => 'tall', 'fr' => 'grande', 'it' => 'alta'),
        'morena' => array('en' => 'brunette', 'fr' => 'brune', 'it' => 'bruna'),
        'rubia' => array('en' => 'blonde', 'fr' => 'blonde', 'it' => 'bionda'),
        'delgada' => array('en' => 'slim', 'fr' => 'mince', 'it' => 'snella'),
        'refinada' => array('en' => 'refined', 'fr' => 'raffinée', 'it' => 'raffinata'),
        'tranquila' => array('en' => 'calm', 'fr' => 'tranquille', 'it' => 'tranquilla'),
        'independiente' => array('en' => 'independent', 'fr' => 'indépendante', 'it' => 'indipendente'),
        'presencia' => array('en' => 'presence', 'fr' => 'présence', 'it' => 'presenza'),
        'estilo' => array('en' => 'style', 'fr' => 'style', 'it' => 'stile'),
        'elegancia' => array('en' => 'elegance', 'fr' => 'élégance', 'it' => 'eleganza'),
        'belleza' => array('en' => 'beauty', 'fr' => 'beauté', 'it' => 'bellezza'),
        'simpatía' => array('en' => 'friendliness', 'fr' => 'sympathie', 'it' => 'simpatia'),
        'compañía' => array('en' => 'company', 'fr' => 'compagnie', 'it' => 'compagnia'),
        'experiencia' => array('en' => 'experience', 'fr' => 'expérience', 'it' => 'esperienza'),
        'discreción' => array('en' => 'discretion', 'fr' => 'discrétion', 'it' => 'discrezione'),
        'exclusividad' => array('en' => 'exclusivity', 'fr' => 'exclusivité', 'it' => 'esclusività'),
        'placer' => array('en' => 'pleasure', 'fr' => 'plaisir', 'it' => 'piacere'),
        'lujo' => array('en' => 'luxury', 'fr' => 'luxe', 'it' => 'lusso'),
        // Connectives that keep a sentence readable.
        'y' => array('en' => 'and', 'fr' => 'et', 'it' => 'e'),
        'con' => array('en' => 'with', 'fr' => 'avec', 'it' => 'con'),
        'para' => array('en' => 'for', 'fr' => 'pour', 'it' => 'per'),
        'muy' => array('en' => 'very', 'fr' => 'très', 'it' => 'molto'),
        'más' => array('en' => 'more', 'fr' => 'plus', 'it' => 'più'),
        'sin' => array('en' => 'without', 'fr' => 'sans', 'it' => 'senza'),
        'en' => array('en' => 'in', 'fr' => 'à', 'it' => 'a'),
    );
    $custom = (array) get_option('pvc_lt_glossary', array());
    foreach ($custom as $source => $targets) {
        if (!is_string($source) || !is_array($targets)) { continue; }
        $key = pvc_lt_offline_key($source);
        $clean = array();
        foreach (array('en', 'fr', 'it') as $locale) {
            if (isset($targets[$locale]) && is_string($targets[$locale]) && trim($targets[$locale]) !== '') { $clean[$locale] = trim($targets[$locale]); }
        }
        if ($clean) { $dictionary[$key] = array_merge($dictionary[$key] ?? array(), $clean); }
    }
    // Every key is normalised the same way a lookup is, so an accented entry matches a
    // lookup that had its accents removed, and the two can never drift apart.
    $normalised = array();
    foreach ($dictionary as $source => $targets) { $normalised[pvc_lt_offline_key((string) $source)] = $targets; }
    return $normalised;
}
/** Accent- and case-insensitive lookup key. */
function pvc_lt_offline_key(string $word): string {
    $word = function_exists('remove_accents') ? remove_accents($word) : $word;
    return function_exists('mb_strtolower') ? mb_strtolower($word, 'UTF-8') : strtolower($word);
}
/** Copies the source capitalisation onto the first letter of the translation only. */
function pvc_lt_offline_case(string $source, string $translated): string {
    if ($translated === '') { return $translated; }
    $first = function_exists('mb_substr') ? mb_substr($source, 0, 1, 'UTF-8') : substr($source, 0, 1);
    $upper = function_exists('mb_strtoupper') ? mb_strtoupper($first, 'UTF-8') : strtoupper($first);
    $lower = function_exists('mb_strtolower') ? mb_strtolower($first, 'UTF-8') : strtolower($first);
    if ($first === '' || $first === $lower) { return $translated; }
    $head = function_exists('mb_substr') ? mb_substr($translated, 0, 1, 'UTF-8') : substr($translated, 0, 1);
    $tail = function_exists('mb_substr') ? mb_substr($translated, 1, null, 'UTF-8') : substr($translated, 1);
    return (function_exists('mb_strtoupper') ? mb_strtoupper($head, 'UTF-8') : strtoupper($head)) . $tail;
}
/** Singular fallback for a plural that is not in the dictionary. */
function pvc_lt_offline_singular(string $key): ?string {
    foreach (array('es', 's') as $suffix) {
        if (strlen($key) > strlen($suffix) + 2 && substr($key, -strlen($suffix)) === $suffix) { return substr($key, 0, -strlen($suffix)); }
    }
    return null;
}
/** Pluralises a translated singular with the simplest rule of the target language. */
function pvc_lt_offline_plural(string $translated, string $target): string {
    if ($target === 'it') {
        $last = substr($translated, -1);
        if ($last === 'a') { return substr($translated, 0, -1) . 'e'; }
        if ($last === 'o') { return substr($translated, 0, -1) . 'i'; }
        if ($last === 'e') { return substr($translated, 0, -1) . 'i'; }
        return $translated . 'i';
    }
    return $translated . 's';
}
/**
 * Translates one segment. Returns the text, the share of content words it could resolve
 * and whether every one of them was resolved.
 */
function pvc_lt_offline_translate(string $text, string $target): array {
    $dictionary = pvc_lt_offline_dictionary();
    $tokens = preg_split('/(\s+|[^\p{L}\p{N}]+)/u', $text, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY);
    if (!is_array($tokens)) { return array('text' => $text, 'coverage' => 0.0, 'complete' => false); }
    $out = ''; $words = 0; $known = 0; $changed = false;
    foreach ($tokens as $token) {
        if (!preg_match('/^\p{L}+$/u', $token)) { $out .= $token; continue; }
        ++$words;
        $key = pvc_lt_offline_key($token);
        $hit = $dictionary[$key][$target] ?? null;
        if ($hit === null) {
            $singular = pvc_lt_offline_singular($key);
            $base = $singular !== null ? ($dictionary[$singular][$target] ?? null) : null;
            if ($base !== null) { $hit = pvc_lt_offline_plural($base, $target); }
        }
        if ($hit === null) { $out .= $token; continue; }
        ++$known;
        $rendered = pvc_lt_offline_case($token, $hit);
        if ($rendered !== $token) { $changed = true; }
        $out .= $rendered;
    }
    // Cast explicitly: PHP returns an int for an exact integer division, and the caller
    // compares coverage strictly.
    return array('text' => $out, 'coverage' => $words === 0 ? 1.0 : (float) ($known / $words), 'complete' => $words > 0 && $known === $words, 'changed' => $changed);
}
/** Whether this segment contains anything translatable at all. */
function pvc_lt_offline_has_words(string $text): bool {
    return (bool) preg_match('/\p{L}{2,}/u', $text);
}
function pvc_lt_offline_dictionary_size(): int { return count(pvc_lt_offline_dictionary()); }
