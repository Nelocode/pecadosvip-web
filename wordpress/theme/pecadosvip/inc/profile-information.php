<?php
/** Generic editorial slots shared by individual profiles; empty until the editor supplies content. */
if (!defined('ABSPATH')) { exit; }

function pvwp_profile_information(): void {
    if (!function_exists('pvc_profile_information')) { return; }
    $locale = pvwp_context()['locale'] ?? 'es';
    foreach (pvc_profile_information($locale) as $slot => $block) {
        if (empty($block['enabled'])) { continue; }
        $title = trim($block['title']); $body = trim($block['body']); $label = trim($block['buttonLabel']); $url = '';
        if ($label !== '' && $block['pageKey'] !== '' && function_exists('pvc_profile_information_destination')) {
            $page = pvc_profile_information_destination($block['pageKey'], $locale);
            if ($page) { $url = $page['url']; }
        }
        if ($title === '' && $body === '' && $url === '') { continue; }
        echo '<div class="pvn-profile-information" data-information-slot="' . esc_attr($slot) . '">';
        if ($title !== '') { echo '<h2>' . esc_html($title) . '</h2>'; }
        if ($body !== '') { echo '<div class="pvn-profile-information-body">' . esc_html($body) . '</div>'; }
        if ($url !== '') { echo '<a class="pvn-profile-information-button" href="' . esc_url($url) . '">' . esc_html($label) . '</a>'; }
        echo '</div>';
    }
}
