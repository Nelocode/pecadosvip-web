<?php
/** Generic editorial slots shared by individual profiles; empty until the editor supplies content. */
if (!defined('ABSPATH')) { exit; }

function pvwp_profile_information(): void {
    if (!function_exists('pvc_profile_information')) { return; }
    $locale = pvwp_context()['locale'] ?? 'es';
    foreach (pvc_profile_information($locale) as $slot => $block) {
        if (empty($block['enabled'])) { continue; }
        $title = trim($block['title']); $body = trim($block['body']); $label = trim($block['buttonLabel']); $url = '';
        if ($label !== '' && $block['pageKey'] !== '' && function_exists('pvc_record')) {
            // pvc_record only returns published records in this exact language.
            $page = pvc_record('page', $locale, $block['pageKey']);
            if ($page && in_array($page['data']['kind'] ?? '', array('information', 'about', 'legal'), true)) {
                $path = pvwp_record_path('page', $page);
                if (preg_match('#^[a-z0-9]+(?:[-/][a-z0-9]+)*$#D', $path) && !preg_match('#^(wp-|api(?:/|$)|es(?:/|$)|en(?:/|$)|fr(?:/|$)|it(?:/|$)|perfiles(?:/|$)|servicios(?:/|$))#', $path)) {
                    $url = home_url('/' . $locale . '/' . $path);
                }
            }
        }
        if ($title === '' && $body === '' && $url === '') { continue; }
        echo '<div class="pvn-profile-information" data-information-slot="' . esc_attr($slot) . '">';
        if ($title !== '') { echo '<h2>' . esc_html($title) . '</h2>'; }
        if ($body !== '') { echo '<div class="pvn-profile-information-body">' . esc_html($body) . '</div>'; }
        if ($url !== '') { echo '<a class="pvn-profile-information-button" href="' . esc_url($url) . '">' . esc_html($label) . '</a>'; }
        echo '</div>';
    }
}
