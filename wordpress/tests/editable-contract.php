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
$qa_sources = array_values($qa_original_data['gallery']);
$qa_hashes = array();
foreach ($qa_sources as $qa_source_id) {
    $qa_hashes[$qa_source_id] = hash_file('sha256', get_attached_file($qa_source_id));
    if (pvc_watermark_status($qa_source_id)['state'] !== 'ready') {
        $qa_pending = pvc_record('profile', 'es', $qa_profile['key']);
        $qa_assert(!in_array($qa_source_id, array_column($qa_pending['gallery'], 'id'), true), 'Pending gallery sources must not appear as original public attachments.');
        $qa_assert(strpos(wp_json_encode($qa_pending, JSON_UNESCAPED_SLASHES), wp_get_attachment_url($qa_source_id)) === false, 'Pending profile projection leaked an original URL.');
    }
    // Run only the jobs belonging to this isolated fixture. Do not bypass the
    // processor: asynchronous publication is checked using real marked files.
    pvc_wm_queue($qa_source_id, 'image');
    for ($qa_attempt = 0; $qa_attempt < (int) pvc_watermark_config()['max_attempts'] && pvc_watermark_status($qa_source_id)['state'] !== 'ready'; $qa_attempt++) {
        $qa_job = (array) get_post_meta($qa_source_id, pvc_wm_key('image'), true);
        $qa_assert(!empty($qa_job['signature']), 'Fixture image must have a queued processing signature.');
        pvc_watermark_process($qa_source_id, 'image', $qa_job['signature']);
    }
    $qa_assert(pvc_watermark_status($qa_source_id)['state'] === 'ready', 'Real fixture image processing did not finish ready.');
    $qa_assert(hash_file('sha256', get_attached_file($qa_source_id)) === $qa_hashes[$qa_source_id], 'Processing must preserve the original fixture attachment bytes.');
}
$qa_normalized = pvc_record('profile', 'es', $qa_profile['key']);
$qa_assert(count($qa_normalized['gallery']) === 2, 'Gallery must resolve two ready WordPress derivatives.');
foreach ($qa_normalized['gallery'] as $qa_index => $qa_image) {
    $qa_assert($qa_image['id'] !== $qa_sources[$qa_index], 'Profile gallery must expose a derivative, not its original attachment ID.');
    $qa_assert((int) get_post_meta($qa_image['id'], '_pvc_watermark_source', true) === (int) $qa_sources[$qa_index], 'Gallery source order must survive asynchronous derivative normalization.');
}
$qa_fixture['markedGallery'] = pvc_watermark_media($qa_fixture['gallery']['id']);
$qa_assert(!empty($qa_fixture['markedGallery']['url']), 'HTTP fixtures require the real marked gallery URL.');
$qa_fixture['attachments'][] = $qa_fixture['markedGallery']['id'];
update_option('pvc_qa_fixture', $qa_fixture, false);
foreach ($qa_fixture['published'] as $qa_item) {
    if ($qa_item['type'] !== 'service') { continue; }
    $qa_service = pvc_record('service', $qa_item['locale'], $qa_item['key']);
    $qa_assert(array_column($qa_service['gallery'], 'id') === $qa_sources, 'Services must retain their original image-gallery behavior.');
}
foreach ($qa_fixture['hidden'] as $qa_item) { $qa_assert(pvc_record($qa_item['type'], $qa_item['locale'], $qa_item['key']) === null, 'Processing media must not publish draft/private/password-protected content.'); }
foreach (array_keys(pvc_locales()) as $qa_locale) {
    $qa_assert(isset(pvc_copy($qa_locale)['hero']['titlePrimary']), 'Editable hero copy must exist: ' . $qa_locale);
}
WP_CLI::success('Metadata permissions, nonce, validation, multilingual copy, asynchronous marked galleries and publication boundaries passed.');
