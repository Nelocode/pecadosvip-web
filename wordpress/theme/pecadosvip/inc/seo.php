<?php
if (!defined('ABSPATH')) { exit; }

function pvwp_seo_robots(): string {
    if (!function_exists('pvc_seo_indexable') || !pvc_seo_indexable(pvwp_context())) { return 'noindex, nofollow, noarchive'; }
    return 'index, follow, max-image-preview:large';
}
function pvwp_seo_head(): void {
    $c = pvwp_context();
    if (empty($c['owned']) || ($c['status'] ?? 0) !== 200 || !function_exists('pvc_seo_metadata') || pvc_seo_conflict()) { return; }
    $record = $c['route']['record']; $meta = pvc_seo_metadata($record);
    if (!pvc_seo_informational($record)) { return; }
    echo '<meta name="description" content="' . esc_attr($meta['description']) . '">' . "\n";
    echo '<meta name="rating" content="adult">' . "\n";
    // Never publish preview tokens, filters, tracking parameters or guessed hosts.
    if (!empty($c['preview']) || isset($_GET['preview']) || isset($_GET['preview_id'])) { return; }
    $canonical = home_url($c['path']);
    echo '<link rel="canonical" href="' . esc_url($canonical) . '">' . "\n";
    if (pvc_seo_indexable($c)) {
        $type = in_array($c['route']['kind'], array('home', 'profiles', 'services'), true) ? 'page' : $c['route']['kind'];
        foreach (array_keys(pvc_locales()) as $locale) {
            $alternate = pvc_record($type, $locale, $record['key']);
            if ($alternate && pvc_seo_record_allowed($alternate)) { echo '<link rel="alternate" hreflang="' . esc_attr($locale) . '" href="' . esc_url(pvc_seo_url($alternate, $type)) . '">' . "\n"; }
        }
    }
    foreach (array('og:type' => 'website', 'og:title' => $meta['title'], 'og:description' => $meta['description'], 'og:url' => $canonical, 'og:site_name' => get_bloginfo('name')) as $property => $value) {
        echo '<meta property="' . esc_attr($property) . '" content="' . esc_attr($value) . '">' . "\n";
    }
    $image = $record['image'] ?? null;
    if (!empty($image['url'])) { echo '<meta property="og:image" content="' . esc_url($image['url']) . '">' . "\n"; }
    $schema = array('@context' => 'https://schema.org', '@type' => 'WebPage', '@id' => $canonical . '#webpage', 'url' => $canonical, 'name' => $meta['title'], 'description' => $meta['description'], 'inLanguage' => $c['locale'], 'isFamilyFriendly' => false);
    echo '<script type="application/ld+json">' . wp_json_encode($schema, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) . '</script>' . "\n";
}
add_action('wp_head', 'pvwp_seo_head', 5);
