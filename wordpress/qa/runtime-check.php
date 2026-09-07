<?php
/** Run against the actual, isolated Docker WordPress database. No static export is treated as runtime evidence. */
if (!defined('WP_CLI') || !WP_CLI || wp_get_environment_type() !== 'local') {
    throw new RuntimeException('Run this check inside the local QA container.');
}
$qa_assert = static function ($condition, $message): void {
    if (!$condition) { throw new RuntimeException($message); }
};
$qa_assert(get_stylesheet() === 'pecadosvip', 'Editable theme must be active.');
foreach (array('pvc_records', 'pvc_record', 'pvc_copy', 'pvc_site', 'pvc_import_seed', 'pvwp_resolve_request') as $function) {
    $qa_assert(function_exists($function), 'Required editable API missing: ' . $function);
}
$qa_native = get_page_by_path('qa-native-page');
$qa_assert($qa_native && strpos($qa_native->post_content, 'QA_NATIVE_PAGE_CONTENT') !== false, 'Native WordPress content must remain intact.');
$qa_assert(get_option('blog_public') === '0', 'QA indexing setting must be preserved.');
$qa_assert(getenv('WP_QA_URL') === untrailingslashit(home_url('/')), 'Root/subdirectory fixture URL mismatch.');

// Lint the exact theme and plugin mounted in the running containers.
$qa_php_count = 0;
foreach (array(get_stylesheet_directory(), WP_PLUGIN_DIR . '/pecadosvip-content') as $qa_source) {
    $qa_iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($qa_source, FilesystemIterator::SKIP_DOTS));
    foreach ($qa_iterator as $qa_file) {
        if ($qa_file->getExtension() !== 'php') { continue; }
        $qa_output = array(); $qa_code = 0;
        exec('php -l ' . escapeshellarg($qa_file->getPathname()) . ' 2>&1', $qa_output, $qa_code);
        $qa_assert($qa_code === 0, 'PHP syntax: ' . implode("\n", $qa_output));
        $qa_php_count++;
    }
}

$qa_admin = get_user_by('login', 'pecadosvip_qa');
$qa_assert((bool) $qa_admin, 'QA administrator missing.');
wp_set_current_user($qa_admin->ID);
$qa_seed_path = get_stylesheet_directory() . '/content/seed.json';
$qa_seed_document = json_decode(file_get_contents($qa_seed_path), true, 512, JSON_THROW_ON_ERROR);
$qa_seed_identities = array();
$qa_expected_counts = array();
foreach ($qa_seed_document['records'] as $qa_seed_record) {
    $qa_type = pvc_type($qa_seed_record['type']);
    $qa_identity = $qa_type . ':' . $qa_seed_record['locale'] . ':' . $qa_seed_record['key'];
    $qa_assert(!isset($qa_seed_identities[$qa_identity]), 'Duplicate identity in seed: ' . $qa_identity);
    $qa_ids = get_posts(array('post_type' => $qa_type, 'post_status' => array('publish', 'draft', 'pending', 'future', 'private', 'trash'), 'posts_per_page' => -1, 'fields' => 'ids', 'meta_query' => array(array('key' => 'pv_key', 'value' => $qa_seed_record['key']), array('key' => 'pv_locale', 'value' => $qa_seed_record['locale']))));
    $qa_assert(count($qa_ids) === 1, 'Seed identity must exist exactly once in WordPress: ' . $qa_identity);
    $qa_seed_identities[$qa_identity] = (int) $qa_ids[0];
    $qa_expected_counts[$qa_seed_record['locale']][$qa_seed_record['type']] = ($qa_expected_counts[$qa_seed_record['locale']][$qa_seed_record['type']] ?? 0) + 1;
}
$qa_assert(count($qa_seed_identities) === 224, 'The complete initial seed must contain 224 identities.');
foreach (array_keys(pvc_locales()) as $qa_locale) {
    foreach (array('profile' => 6, 'service' => 34, 'city' => 8, 'page' => 8) as $qa_type => $qa_expected) {
        $qa_assert(($qa_expected_counts[$qa_locale][$qa_type] ?? 0) === $qa_expected, 'Initial seed identity count mismatch: ' . $qa_locale . '/' . $qa_type);
    }
}

// Reimport must preserve a real edited initial record and a user text override.
// Only these two local QA values are touched and restored, including on assertion failure.
$qa_existing_id = (int) reset($qa_seed_identities);
$qa_existing_title = get_post_field('post_title', $qa_existing_id, 'raw');
$qa_existing_override = get_option('pvc_copy_es', null);
$qa_reimport_title = 'QA REIMPORT PRESERVES EDITED TITLE';
$qa_reimport_copy = 'QA REIMPORT PRESERVES EDITED SPANISH COPY';
try {
    $qa_updated = wp_update_post(array('ID' => $qa_existing_id, 'post_title' => $qa_reimport_title), true);
    $qa_assert(!is_wp_error($qa_updated), 'Cannot set editable initial record for reimport test.');
    $qa_override = is_array($qa_existing_override) ? $qa_existing_override : array();
    $qa_override['hero']['titlePrimary'] = $qa_reimport_copy;
    update_option('pvc_copy_es', $qa_override, false);
    $qa_reimport = pvc_import_seed($qa_seed_path);
    $qa_assert(!is_wp_error($qa_reimport), 'Repeat seed import returned WP_Error.');
    $qa_assert(is_array($qa_reimport) && empty($qa_reimport['errors']) && ($qa_reimport['complete'] ?? false) === true, 'Repeat import was incomplete or contained errors.');
    $qa_assert(($qa_reimport['created'] ?? -1) === 0 && ($qa_reimport['skipped'] ?? -1) === 224 && ($qa_reimport['total'] ?? -1) === 224, 'Repeat import must skip all 224 existing identities and create none.');
    $qa_assert(get_post_field('post_title', $qa_existing_id, 'raw') === $qa_reimport_title, 'Repeat import overwrote a title edited in WordPress.');
    $qa_assert(pvc_copy('es')['hero']['titlePrimary'] === $qa_reimport_copy, 'Repeat import overwrote a WordPress text override.');
} finally {
    wp_update_post(array('ID' => $qa_existing_id, 'post_title' => $qa_existing_title));
    if ($qa_existing_override === null) { delete_option('pvc_copy_es'); }
    else { update_option('pvc_copy_es', $qa_existing_override, false); }
}
WP_CLI::success('All 224 seed identities exist; repeat import skips them and preserves edited content and copy.');
$qa_fixture = array('posts' => array(), 'attachments' => array(), 'originalCopy' => array(), 'seedRoutes' => array(), 'seedMedia' => array(), 'published' => array(), 'hidden' => array());
$qa_seed_counts = array();
foreach (array_keys(pvc_locales()) as $qa_locale) {
    $qa_fixture['originalCopy'][$qa_locale] = get_option('pvc_copy_' . $qa_locale, null);
    $qa_fixture['seedRoutes'][] = array('path' => '/' . $qa_locale, 'locale' => $qa_locale);
    $qa_fixture['seedRoutes'][] = array('path' => '/' . $qa_locale . '/perfiles', 'locale' => $qa_locale);
    $qa_fixture['seedRoutes'][] = array('path' => '/' . $qa_locale . '/servicios', 'locale' => $qa_locale);
    foreach (array('profile', 'service', 'city', 'page') as $qa_type) {
        $qa_records = pvc_records($qa_type, $qa_locale);
        $qa_assert(count($qa_records) > 0, 'Seed must contain editable ' . $qa_type . ' records in ' . $qa_locale);
        $qa_seed_counts[$qa_locale][$qa_type] = count($qa_records);
        foreach ($qa_records as $qa_record) {
            $qa_url = pvc_route(get_post($qa_record['id']));
            $qa_path = substr($qa_url, strlen(untrailingslashit(home_url('/'))));
            $qa_fixture['seedRoutes'][] = array('path' => $qa_path, 'locale' => $qa_locale);
            foreach (array_merge(array($qa_record['image']), $qa_record['gallery']) as $qa_image) {
                if ($qa_image) { $qa_fixture['seedMedia'][$qa_image['url']] = $qa_image['url']; }
            }
        }
    }
    foreach (array('logo', 'hero', 'mosaic', 'icon') as $qa_slot) {
        $qa_image = pvc_site($qa_locale)[$qa_slot] ?? null;
        if ($qa_image) { $qa_fixture['seedMedia'][$qa_image['url']] = $qa_image['url']; }
    }
}
$qa_fixture['seedMedia'] = array_values($qa_fixture['seedMedia']);
$qa_fixture['seedCounts'] = $qa_seed_counts;

$qa_images = get_posts(array('post_type' => 'attachment', 'post_mime_type' => 'image', 'post_status' => 'inherit', 'numberposts' => 2, 'orderby' => 'ID', 'order' => 'ASC'));
$qa_assert(count($qa_images) >= 1, 'Seed images must have become WordPress attachments.');
$qa_cover_id = $qa_images[0]->ID;
$qa_source_path = get_attached_file($qa_cover_id);
$qa_assert(is_string($qa_source_path) && is_readable($qa_source_path), 'Imported attachment must have a real local file.');
require_once ABSPATH . 'wp-admin/includes/image.php';
$qa_suffix = strtolower(wp_generate_password(8, false, false));
$qa_upload = wp_upload_bits('pecadosvip-qa-gallery-' . $qa_suffix . '.' . pathinfo($qa_source_path, PATHINFO_EXTENSION), null, file_get_contents($qa_source_path));
$qa_assert(empty($qa_upload['error']), 'QA gallery upload failed.');
$qa_attachment = wp_insert_attachment(array('post_mime_type' => get_post_mime_type($qa_cover_id), 'post_title' => 'QA gallery ' . $qa_suffix, 'post_status' => 'inherit'), $qa_upload['file'], 0, true);
$qa_assert(!is_wp_error($qa_attachment), 'QA gallery attachment failed.');
wp_update_attachment_metadata($qa_attachment, wp_generate_attachment_metadata($qa_attachment, $qa_upload['file']));
update_post_meta($qa_attachment, '_wp_attachment_image_alt', 'QA editable gallery ' . $qa_suffix);
$qa_fixture['attachments'][] = $qa_attachment;
$qa_fixture['gallery'] = pvc_media($qa_attachment);
$qa_assert(!empty($qa_fixture['gallery']['url']), 'Gallery attachment normalization failed.');
update_option('pvc_qa_fixture', $qa_fixture, false);

$qa_create = static function (string $type, string $locale, string $status = 'publish', bool $password_protected = false) use (&$qa_fixture, $qa_suffix, $qa_cover_id, $qa_attachment, $qa_assert): array {
    $key = 'qa-' . $type . '-' . $locale . '-' . $status . ($password_protected ? '-password' : '') . '-' . $qa_suffix;
    $data = array('synthetic' => true, 'gallery' => array($qa_cover_id, $qa_attachment));
    if ($type === 'profile') { $data += array('age' => 30, 'cities' => array('madrid'), 'homeZone' => 'madrid', 'availability' => 'on-request', 'languages' => array($locale)); }
    if ($type === 'service') { $data['group'] = pvc_records('service', $locale)[0]['data']['group'] ?? 'companionship'; }
    if ($type === 'city') { $data['zone'] = 'madrid'; $data['coverage'] = 'QA coverage'; }
    if ($type === 'page') { $data['kind'] = 'page'; $data['route'] = $key; }
    $title = 'QA BEFORE ' . $type . ' ' . $locale . ' ' . $qa_suffix;
    $id = wp_insert_post(array('post_type' => pvc_type($type), 'post_status' => $status, 'post_password' => $password_protected ? wp_generate_password(24) : '', 'post_title' => $title, 'post_name' => $key, 'post_excerpt' => 'QA BEFORE EXCERPT ' . $qa_suffix, 'post_content' => '<p>QA BEFORE CONTENT ' . $qa_suffix . '</p>', 'meta_input' => array('pv_key' => $key, 'pv_locale' => $locale, 'pv_data' => $data)), true);
    $qa_assert(!is_wp_error($id), 'Cannot create editable QA ' . $type);
    $qa_fixture['posts'][] = $id;
    update_option('pvc_qa_fixture', $qa_fixture, false);
    set_post_thumbnail($id, $qa_cover_id);
    $qa_assert(get_post_status($id) === $status, 'QA record status changed unexpectedly: ' . $key);
    $url = pvc_route(get_post($id));
    return array('id' => $id, 'type' => $type, 'locale' => $locale, 'key' => $key, 'title' => $title, 'afterTitle' => 'QA AFTER ' . $type . ' ' . $locale . ' ' . $qa_suffix, 'afterContent' => 'QA AFTER CONTENT ' . $type . ' ' . $locale . ' ' . $qa_suffix, 'path' => substr($url, strlen(untrailingslashit(home_url('/')))), 'status' => $status);
};
foreach (array_keys(pvc_locales()) as $qa_locale) {
    foreach (array('profile', 'service') as $qa_type) { $qa_fixture['published'][] = $qa_create($qa_type, $qa_locale); }
}
foreach (array('city', 'page') as $qa_type) { $qa_fixture['published'][] = $qa_create($qa_type, 'es'); }
$qa_fixture['hidden'][] = $qa_create('profile', 'es', 'draft');
$qa_fixture['hidden'][] = $qa_create('service', 'es', 'private');
$qa_fixture['hidden'][] = $qa_create('profile', 'es', 'publish', true);
foreach ($qa_fixture['hidden'] as $qa_hidden) {
    $qa_assert(pvc_record($qa_hidden['type'], $qa_hidden['locale'], $qa_hidden['key']) === null, 'Draft/private records must not appear in the public API.');
}

// Durable bookkeeping lets the runner remove only its own disposable fixtures after a failed HTTP assertion.
update_option('pvc_qa_fixture', $qa_fixture, false);
require '/theme-tests/editable-contract.php';
WP_CLI::success('Editable WordPress API, seed and ' . $qa_php_count . ' PHP syntax checks passed.');
WP_CLI::line('PVWP_QA_FIXTURE:' . wp_json_encode($qa_fixture, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
