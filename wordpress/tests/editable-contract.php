<?php
/** Included from qa/runtime-check.php after fixtures exist in real Docker WordPress. */
if (!defined('WP_CLI') || !WP_CLI || wp_get_environment_type() !== 'local') { throw new RuntimeException('Local Docker WordPress is required.'); }
$qa_profile = $qa_fixture['published'][0];
$qa_post = get_post($qa_profile['id']);
$qa_original_data = get_post_meta($qa_post->ID, 'pv_data', true);
$qa_original_post = $_POST;
try {
    $qa_data = $qa_original_data; $qa_data['age'] = 34;
    $_POST = array('pvc_meta_nonce' => 'invalid', 'pvc_key' => $qa_profile['key'], 'pvc_locale' => $qa_profile['locale'], 'pvc_data' => $qa_data);
    pvc_save_meta($qa_post->ID, $qa_post);
    $qa_assert(get_post_meta($qa_post->ID, 'pv_data', true) === $qa_original_data, 'Invalid nonce changed protected metadata.');
    wp_set_current_user(0);
    $_POST['pvc_meta_nonce'] = wp_create_nonce('pvc_meta');
    pvc_save_meta($qa_post->ID, $qa_post);
    $qa_assert(get_post_meta($qa_post->ID, 'pv_data', true) === $qa_original_data, 'Unauthenticated writer changed protected metadata.');
    $qa_assert(!pvc_meta_auth(true, 'pv_data', $qa_post->ID), 'Meta authorization must reject unauthenticated writes.');
    wp_set_current_user($qa_admin->ID);
    $_POST['pvc_meta_nonce'] = wp_create_nonce('pvc_meta');
    pvc_save_meta($qa_post->ID, $qa_post);
    $qa_assert(get_post_meta($qa_post->ID, 'pv_data', true)['age'] === 34, 'Valid administrator metabox save must persist.');
    $qa_assert(pvc_record('profile', 'es', $qa_profile['key'])['data']['age'] === 34, 'Saved metadata must immediately reach the public content API.');
    $qa_assert(pvc_meta_auth(false, 'pv_data', $qa_post->ID), 'Administrator meta authorization must permit own editable content.');
} finally {
    $_POST = $qa_original_post;
    wp_set_current_user($qa_admin->ID);
    update_post_meta($qa_post->ID, 'pv_data', $qa_original_data);
}
$qa_assert(is_wp_error(pvc_validate('pv_profile', 'es', 'qa-invalid-age', array('age' => 17))), 'Adult profile constraint must reject an invalid age.');
$qa_assert(is_wp_error(pvc_validate('pv_profile', 'es', $qa_profile['key'], array('age' => 30))), 'Duplicate published locale/key must be rejected.');
$qa_normalized = pvc_record('profile', 'es', $qa_profile['key']);
$qa_assert(count($qa_normalized['gallery']) === 2, 'Gallery must resolve real WordPress attachments.');
$qa_assert($qa_normalized['gallery'][1]['id'] === $qa_fixture['gallery']['id'], 'Gallery ordering must survive WordPress metadata normalization.');
foreach (array_keys(pvc_locales()) as $qa_locale) {
    $qa_assert(isset(pvc_copy($qa_locale)['hero']['titlePrimary']), 'Editable hero copy must exist: ' . $qa_locale);
}
WP_CLI::success('Metadata permissions, invalid/valid nonce, validation, multilingual copy and attachment gallery contracts passed.');
