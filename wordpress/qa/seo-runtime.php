<?php
/** Run with wp eval-file in an isolated local QA database, never on production. */
if (!defined('WP_CLI') || !WP_CLI || wp_get_environment_type() !== 'local') { throw new RuntimeException('Local WP-CLI QA only.'); }
$seo_assert = static function($condition, $label) { if (!$condition) { throw new RuntimeException($label); } };
$seo_assert(function_exists('pvc_seo_audit') && function_exists('pvwp_seo_head'), 'Matching theme and plugin required');
$seo_saved_settings = get_option('pvc_seo_settings', null);
$seo_saved_report = get_option('pvc_seo_report', null);
$seo_saved_growth = array();
foreach (array('pvc_growth_targets', 'pvc_growth_settings', 'pvc_growth_plan') as $seo_option) { $seo_saved_growth[$seo_option] = get_option($seo_option, null); }
$seo_id = 0;
try {
    $seo_id = wp_insert_post(array('post_type' => 'pv_page', 'post_status' => 'draft', 'post_title' => 'SEO QA Madrid', 'post_excerpt' => 'Información de prueba de Madrid.', 'meta_input' => array('pv_locale' => 'es', 'pv_key' => 'qa-seo-' . wp_generate_password(8, false, false), 'pv_data' => array('kind' => 'information', 'synthetic' => false, 'zone' => 'madrid', 'coverage' => 'Madrid'))), true);
    $seo_assert(!is_wp_error($seo_id), 'Fixture insertion');
    // Use the existing editorial validator and normal publication path.
    update_post_meta($seo_id, 'pv_key', 'qa-seo-' . $seo_id);
    wp_update_post(array('ID' => $seo_id, 'post_status' => 'publish'));
    $seo_record = pvc_record('page', 'es', 'qa-seo-' . $seo_id);
    $seo_assert((bool) $seo_record && pvc_seo_record_allowed($seo_record), 'Real published fixture eligible');
    $seo_assert(pvc_seo_metadata($seo_record)['description'] === 'Información de prueba de Madrid.', 'Description from actual WP data');
    update_post_meta($seo_id, 'pv_seo_title', 'Título manual de QA');
    $seo_assert(pvc_seo_metadata($seo_record)['title'] === 'Título manual de QA', 'Metadata updates immediately');
    $seo_target = pvc_growth_validate_target(array('post_id' => $seo_id, 'query' => 'consulta tecnica madrid', 'goal' => 3), pvc_seo_inventory());
    $seo_assert(!is_wp_error($seo_target), 'Proactive target uses actual eligible WP record');
    $seo_target_id = pvc_growth_target_key($seo_target);
    update_option('pvc_growth_targets', array($seo_target_id => $seo_target), false);
    update_option('pvc_growth_settings', array('sync' => false, 'property' => ''), false);
    $seo_plan = pvc_growth_refresh_plan();
    $seo_assert($seo_plan['actions']['target-' . $seo_target_id]['kind'] === 'measurement', 'Missing connection is not a ranking');
    update_post_meta($seo_id, 'pv_seo_noindex', true);
    $seo_assert(!pvc_seo_record_allowed($seo_record), 'Editorial exclusion');
    delete_post_meta($seo_id, 'pv_seo_noindex');
    wp_update_post(array('ID' => $seo_id, 'post_status' => 'draft'));
    $seo_assert(!pvc_seo_record_allowed($seo_record) && !pvc_record('page', 'es', 'qa-seo-' . $seo_id), 'Withdrawal removes actual WP record');
    $seo_plan = pvc_growth_refresh_plan();
    $seo_assert($seo_plan['actions']['target-' . $seo_target_id]['kind'] === 'excluded', 'Proactive plan responds to actual withdrawal');
    update_option('pvc_seo_settings', array('enabled' => true, 'site_url' => home_url(), 'daily' => false), false);
    $seo_assert((bool) pvc_seo_blockers(), 'Local environment cannot be indexed even with enabled option');
    do_action('pvc_seo_daily_audit');
    $seo_assert(get_option('pvc_seo_report')['revision'] === pvc_revision(), 'Cron callback writes current audit');
    pvc_seo_schedule();
    $seo_assert(!wp_next_scheduled('pvc_seo_daily_audit'), 'Disabled schedule removed');
    WP_CLI::success('SEO runtime: WP records, projection, exclusion, withdrawal, local guard and cron callback passed. Production HTTP not tested.');
} finally {
    if (is_int($seo_id) && $seo_id > 0) { wp_delete_post($seo_id, true); }
    if ($seo_saved_settings === null) { delete_option('pvc_seo_settings'); } else { update_option('pvc_seo_settings', $seo_saved_settings, false); }
    if ($seo_saved_report === null) { delete_option('pvc_seo_report'); } else { update_option('pvc_seo_report', $seo_saved_report, false); }
    foreach ($seo_saved_growth as $seo_option => $seo_value) { if ($seo_value === null) { delete_option($seo_option); } else { update_option($seo_option, $seo_value, false); } }
    pvc_seo_schedule();
}
