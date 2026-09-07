<?php
if (!defined('WP_CLI') || !WP_CLI || wp_get_environment_type() !== 'local') {
    throw new RuntimeException('Cleanup is restricted to the local Docker QA database.');
}
$qa_fixture = get_option('pvc_qa_fixture', array());
foreach (($qa_fixture['posts'] ?? array()) as $qa_id) {
    $qa_post = get_post((int) $qa_id);
    if ($qa_post && strpos((string) get_post_meta($qa_post->ID, 'pv_key', true), 'qa-') === 0 && isset(pvc_types()[$qa_post->post_type])) {
        wp_delete_post($qa_post->ID, true);
    }
}
foreach (($qa_fixture['attachments'] ?? array()) as $qa_id) {
    $qa_post = get_post((int) $qa_id);
    if ($qa_post && $qa_post->post_type === 'attachment' && strpos($qa_post->post_title, 'QA gallery ') === 0) { wp_delete_attachment($qa_post->ID, true); }
}
foreach (($qa_fixture['originalCopy'] ?? array()) as $qa_locale => $qa_original) {
    if (!isset(pvc_locales()[$qa_locale])) { continue; }
    if ($qa_original === null) { delete_option('pvc_copy_' . $qa_locale); }
    else { update_option('pvc_copy_' . $qa_locale, $qa_original, false); }
}
delete_option('pvc_qa_fixture');
WP_CLI::success('Only disposable QA records, media and text overrides were removed/restored.');
