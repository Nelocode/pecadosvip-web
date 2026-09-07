<?php
/** Configure only the disposable, separately named Docker QA WordPress database. */
if (!defined('WP_CLI') || !WP_CLI || wp_get_environment_type() !== 'local') {
    throw new RuntimeException('This initializer is only for the local Docker QA site.');
}

$qa_url = getenv('WP_QA_URL');
if (!is_string($qa_url) || !preg_match('~^http://127\.0\.0\.1:\d+(?:/demo)?$~', $qa_url)) {
    throw new RuntimeException('Expected a loopback QA URL.');
}

update_option('home', $qa_url);
update_option('siteurl', $qa_url);
update_option('blog_public', 0);
update_option('permalink_structure', '/%postname%/');
require_once ABSPATH . 'wp-admin/includes/plugin.php';
$qa_admin = get_user_by('login', 'pecadosvip_qa');
if (!$qa_admin) {
    throw new RuntimeException('The QA administrator has not been installed.');
}
wp_set_current_user($qa_admin->ID);
$qa_activation = activate_plugin('pecadosvip-content/pecadosvip-content.php');
if (is_wp_error($qa_activation)) {
    throw new RuntimeException($qa_activation->get_error_message());
}
switch_theme('pecadosvip');
if (!function_exists('pvc_import_seed')) {
    throw new RuntimeException('The editable content plugin did not expose its seed importer.');
}
$qa_seed = pvc_import_seed(get_stylesheet_directory() . '/content/seed.json');
if (is_wp_error($qa_seed)) {
    throw new RuntimeException($qa_seed->get_error_message());
}
if (!is_array($qa_seed) || !empty($qa_seed['errors']) || ($qa_seed['complete'] ?? false) !== true) {
    $qa_errors = is_array($qa_seed) && isset($qa_seed['errors']) && is_array($qa_seed['errors']) ? implode(' ', $qa_seed['errors']) : '';
    throw new RuntimeException('Initial editable content import did not complete successfully. ' . $qa_errors);
}
flush_rewrite_rules(false);
// WP-CLI runs under PHP CLI, where Apache detection is unavailable. The QA web
// container is explicitly Apache; use WordPress's own generated rewrite rules.
require_once ABSPATH . 'wp-admin/includes/misc.php';
global $wp_rewrite;
if (!insert_with_markers(ABSPATH . '.htaccess', 'WordPress', explode("\n", $wp_rewrite->mod_rewrite_rules()))) {
    throw new RuntimeException('Could not persist Apache permalink rules in the QA WordPress volume.');
}

$qa_native = get_page_by_path('qa-native-page');
if (!$qa_native) {
    $qa_native_id = wp_insert_post([
        'post_type' => 'page',
        'post_status' => 'publish',
        'post_title' => 'Página nativa de control',
        'post_name' => 'qa-native-page',
        'post_content' => 'QA_NATIVE_PAGE_CONTENT',
    ], true);
    if (is_wp_error($qa_native_id)) {
        throw new RuntimeException($qa_native_id->get_error_message());
    }
} else {
    $qa_native_id = $qa_native->ID;
}

WP_CLI::success('Local Docker theme and editable content plugin activated; content seeded and native control page ID ' . $qa_native_id . '.');
