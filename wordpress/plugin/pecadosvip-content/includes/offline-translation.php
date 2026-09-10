<?php
/**
 * Offline translation engine: no external API, no key, no network, no browser.
 *
 * It is a glossary-based translator. The vocabulary lives in `offline-glossary.php`,
 * which is meant to be read and edited by a person, and a site can extend it from
 * WordPress through the `pvc_lt_glossary` option without touching code.
 *
 * Honest limits, by design:
 * - It translates vocabulary, not prose. Word order follows the source and agreement
 *   between gender and number is not solved; that is why every gender variant is written
 *   out explicitly in the glossary instead of being guessed.
 * - Every segment reports its coverage. `pvc_lt_auto_translate()` publishes only a fully
 *   covered translation; an incomplete one stays a draft for a human, and the untranslated
 *   profile still shows through the locale fallback, disclosed as untranslated.
 */
if (!defined('ABSPATH')) { exit; }
require_once __DIR__ . '/offline-glossary.php';

/** The glossary plus whatever the site has added, with every key normalised. */
function pvc_lt_offline_dictionary(): array {
    $dictionary = pvc_lt_offline_base_dictionary();
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
/** Longest phrase first, so a multi-word entry wins over its single words. */
function pvc_lt_offline_phrases(): array {
    $phrases = array();
    foreach (array_keys(pvc_lt_offline_dictionary()) as $key) {
        if (strpos($key, ' ') !== false) { $phrases[$key] = true; }
    }
    return $phrases;
}
/**
 * Translates one segment. Returns the text, the share of content words it could resolve
 * and whether every one of them was resolved.
 */
function pvc_lt_offline_translate(string $text, string $target): array {
    $dictionary = pvc_lt_offline_dictionary();
    $phrases = pvc_lt_offline_phrases();
    $tokens = preg_split('/(\s+|[^\p{L}\p{N}]+)/u', $text, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY);
    if (!is_array($tokens)) { return array('text' => $text, 'coverage' => 0.0, 'complete' => false, 'changed' => false); }
    $out = ''; $words = 0; $known = 0; $changed = false; $index = 0; $total = count($tokens);
    while ($index < $total) {
        $token = $tokens[$index];
        if (!preg_match('/^\p{L}+$/u', $token)) { $out .= $token; ++$index; continue; }
        // Greedy multi-word match: the longest phrase starting here wins. Only the tokens
        // actually read are consumed, so a truncated candidate can never skip text.
        $matched = false;
        for ($span = 4; $span >= 2 && !$matched; $span--) {
            $candidate = ''; $used = 0;
            for ($offset = 0; $offset < $span * 2 - 1 && $index + $offset < $total; $offset++) { $candidate .= $tokens[$index + $offset]; ++$used; }
            if ($used < 3) { continue; }
            $key = pvc_lt_offline_key(trim($candidate));
            if (isset($phrases[$key]) && isset($dictionary[$key][$target])) {
                ++$words;
                ++$known;
                $rendered = pvc_lt_offline_case(trim($candidate), $dictionary[$key][$target]);
                if ($rendered !== trim($candidate)) { $changed = true; }
                $out .= $rendered;
                $index += $used;
                $matched = true;
            }
        }
        if ($matched) { continue; }
        ++$words;
        $key = pvc_lt_offline_key($token);
        $hit = $dictionary[$key][$target] ?? null;
        if ($hit === null) {
            $singular = pvc_lt_offline_singular($key);
            $base = $singular !== null ? ($dictionary[$singular][$target] ?? null) : null;
            if ($base !== null) { $hit = pvc_lt_offline_plural($base, $target); }
        }
        if ($hit === null) { $out .= $token; ++$index; continue; }
        ++$known;
        $rendered = pvc_lt_offline_case($token, $hit);
        if ($rendered !== $token) { $changed = true; }
        $out .= $rendered;
        ++$index;
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
