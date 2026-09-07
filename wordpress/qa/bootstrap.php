<?php
/** Install only the disposable local Docker site without printing credentials. */
if (!defined('WP_CLI') || !WP_CLI) {
    throw new RuntimeException('Run this installer with WP-CLI.');
}
define('WP_INSTALLING', true);
require '/var/www/html/wp-load.php';
if (wp_get_environment_type() !== 'local') {
    throw new RuntimeException('This installer is only for the local Docker QA site.');
}
if (!is_blog_installed()) {
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $qa_password = trim(file_get_contents('/run/secrets/admin_password'));
    if (strlen($qa_password) < 24) {
        throw new RuntimeException('A generated local administrator secret is required.');
    }
    $qa_url = getenv('WP_QA_URL');
    if (!is_string($qa_url) || !preg_match('~^http://127\.0\.0\.1:\d+(?:/demo)?$~', $qa_url)) {
        throw new RuntimeException('Expected a loopback QA URL.');
    }
    wp_install('PecadosVip - QA WordPress', 'pecadosvip_qa', 'qa@example.invalid', false, '', $qa_password);
    update_option('home', $qa_url);
    update_option('siteurl', $qa_url);
    unset($qa_password);
}
WP_CLI::success('Local Docker WordPress database ready.');
