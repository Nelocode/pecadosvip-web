<?php
if (!defined('ABSPATH')) { exit; }

function pvc_growth_credentials_ready(): bool {
    foreach (array('PVC_SEO_GSC_CLIENT_ID', 'PVC_SEO_GSC_CLIENT_SECRET', 'PVC_SEO_GSC_REFRESH_TOKEN') as $name) { if (!getenv($name)) { return false; } }
    return true;
}
function pvc_growth_http(string $url, array $args) {
    $response = wp_remote_post($url, array_merge(array('timeout' => 8, 'redirection' => 0, 'sslverify' => true, 'limit_response_size' => 65536), $args));
    if (is_wp_error($response)) { return new WP_Error('gsc_network', 'No se pudo consultar Google. Se conserva la última medición.'); }
    $status = wp_remote_retrieve_response_code($response);
    if ($status !== 200) { return new WP_Error('gsc_http', 'Google respondió HTTP ' . $status . '. Revisa acceso o cuota; no se reemplazaron los resultados por ceros.'); }
    $body = json_decode(wp_remote_retrieve_body($response), true);
    return is_array($body) ? $body : new WP_Error('gsc_json', 'Respuesta de Google no válida.');
}
function pvc_growth_token() {
    if (!pvc_growth_credentials_ready()) { return new WP_Error('gsc_setup', 'Conexión pendiente: configura OAuth de Search Console en el alojamiento.'); }
    $body = pvc_growth_http('https://oauth2.googleapis.com/token', array('body' => array('client_id' => getenv('PVC_SEO_GSC_CLIENT_ID'), 'client_secret' => getenv('PVC_SEO_GSC_CLIENT_SECRET'), 'refresh_token' => getenv('PVC_SEO_GSC_REFRESH_TOKEN'), 'grant_type' => 'refresh_token')));
    if (is_wp_error($body)) { return $body; }
    return !empty($body['access_token']) && is_string($body['access_token']) && !preg_match('/[\r\n]/', $body['access_token']) ? $body['access_token'] : new WP_Error('gsc_token', 'Google no devolvió un token válido.');
}
function pvc_growth_query(string $token, string $property, string $url, array $target, array $period) {
    $filters = array(array('dimension' => 'page', 'operator' => 'equals', 'expression' => $url), array('dimension' => 'query', 'operator' => 'equals', 'expression' => $target['query']), array('dimension' => 'country', 'operator' => 'equals', 'expression' => $target['country']));
    if ($target['device'] !== 'all') { $filters[] = array('dimension' => 'device', 'operator' => 'equals', 'expression' => $target['device']); }
    $response = pvc_growth_http('https://www.googleapis.com/webmasters/v3/sites/' . rawurlencode($property) . '/searchAnalytics/query', array('headers' => array('Authorization' => 'Bearer ' . $token, 'Content-Type' => 'application/json'), 'body' => wp_json_encode(array('startDate' => $period[0], 'endDate' => $period[1], 'type' => 'web', 'dataState' => 'final', 'aggregationType' => 'byPage', 'dimensionFilterGroups' => array(array('groupType' => 'and', 'filters' => $filters)), 'rowLimit' => 1))));
    if (is_wp_error($response)) { return $response; }
    if (!isset($response['rows']) || $response['rows'] === array()) { return null; }
    $row = $response['rows'][0] ?? null;
    foreach (array('clicks', 'impressions', 'ctr', 'position') as $key) { if (!is_array($row) || !isset($row[$key]) || !is_numeric($row[$key]) || !is_finite((float) $row[$key]) || $row[$key] < 0) { return new WP_Error('gsc_metrics', 'Google devolvió métricas no válidas.'); } }
    if ($row['clicks'] > $row['impressions'] || $row['ctr'] > 1 || ($row['impressions'] > 0 && $row['position'] < 1)) { return new WP_Error('gsc_metrics', 'Google devolvió métricas fuera de rango.'); }
    return array_intersect_key(array_map('floatval', $row), array_flip(array('clicks', 'impressions', 'ctr', 'position')));
}
function pvc_growth_property_valid(string $property): bool {
    $host = (string) wp_parse_url(home_url(), PHP_URL_HOST);
    return $property === 'sc-domain:' . $host || $property === trailingslashit(home_url());
}
add_action('pvc_growth_sync', 'pvc_growth_tick');
function pvc_growth_tick(): void {
    $discovery = (array) get_option('pvc_growth_discovery', array());
    if (($discovery['attempt'] ?? 0) < time() - DAY_IN_SECONDS) { pvc_growth_discover(); }
    else { pvc_growth_sync(); }
}
function pvc_growth_discover(): void {
    $settings = pvc_growth_settings();
    if (!$settings['sync'] || !pvc_growth_property_valid($settings['property']) || !add_option('pvc_growth_lock', time(), '', false)) { return; }
    try {
        $old = (array) get_option('pvc_growth_discovery', array()); $result = $old; $result['attempt'] = time();
        $token = pvc_growth_token(); $period = pvc_growth_periods()['current'];
        $response = is_wp_error($token) ? $token : pvc_growth_http('https://www.googleapis.com/webmasters/v3/sites/' . rawurlencode($settings['property']) . '/searchAnalytics/query', array('limit_response_size' => 262144, 'headers' => array('Authorization' => 'Bearer ' . $token, 'Content-Type' => 'application/json'), 'body' => wp_json_encode(array('startDate' => $period[0], 'endDate' => $period[1], 'type' => 'web', 'dataState' => 'final', 'aggregationType' => 'byPage', 'dimensions' => array('query', 'page'), 'dimensionFilterGroups' => array(array('groupType' => 'and', 'filters' => array(array('dimension' => 'country', 'operator' => 'equals', 'expression' => 'esp')))), 'rowLimit' => 500))));
        if (is_wp_error($response)) { $result['error'] = $response->get_error_message(); }
        else {
            $eligible = array(); foreach (pvc_seo_inventory() as $row) { if (pvc_seo_record_allowed($row['record'])) { $eligible[$row['url']] = $row['record']['id']; } }
            $opportunities = array();
            foreach (($response['rows'] ?? array()) as $row) {
                $query = $row['keys'][0] ?? ''; $url = $row['keys'][1] ?? '';
                if (!is_string($query) || $query === '' || mb_strlen($query) > 150 || !is_string($url) || !isset($eligible[untrailingslashit($url)])) { continue; }
                if (!isset($row['impressions'], $row['position']) || !is_numeric($row['impressions']) || !is_numeric($row['position']) || !is_finite((float) $row['impressions']) || !is_finite((float) $row['position']) || $row['impressions'] < 30 || $row['position'] <= 3 || $row['position'] > 20) { continue; }
                $opportunities[] = array('post_id' => $eligible[untrailingslashit($url)], 'query' => sanitize_text_field($query), 'url' => $url, 'position' => (float) $row['position'], 'impressions' => (float) $row['impressions']);
            }
            usort($opportunities, static fn($a, $b) => $b['impressions'] <=> $a['impressions']);
            $result = array('time' => time(), 'attempt' => time(), 'period' => $period, 'property' => $settings['property'], 'rows' => array_slice($opportunities, 0, 20));
        }
        if (pvc_growth_settings() === $settings) { update_option('pvc_growth_discovery', $result, false); }
        pvc_growth_refresh_plan();
    } finally { delete_option('pvc_growth_lock'); }
}
function pvc_growth_sync(): void {
    $settings = pvc_growth_settings();
    if (!$settings['sync'] || !pvc_growth_property_valid($settings['property'])) { return; }
    // Atomic option insertion prevents duplicate workers. All HTTP calls have an 8s timeout.
    // Do not steal abandoned locks automatically; surface a recoverable administrative issue.
    if (!add_option('pvc_growth_lock', time(), '', false)) { return; }
    try {
        $targets = pvc_growth_targets(); $data = (array) get_option('pvc_growth_measurements', array());
        if (!$targets) { return; }
        // Oldest attempt first: one target per hour, at most 12 targets / cycle.
        uksort($targets, static fn($a, $b) => ($data[$a]['attempt'] ?? 0) <=> ($data[$b]['attempt'] ?? 0));
        $id = array_key_first($targets); $target = $targets[$id]; $old = $data[$id] ?? array();
        $post = get_post($target['post_id']);
        $record = $post ? pvc_record(substr($post->post_type, 3), get_post_meta($post->ID, 'pv_locale', true), get_post_meta($post->ID, 'pv_key', true)) : null;
        $sample = $old; $sample['attempt'] = time();
        if (!$record || !pvc_seo_record_allowed($record)) { $sample['error'] = 'La página objetivo ya no es elegible; revisa o elimina el objetivo.'; }
        else {
            $url = pvc_seo_url($record, substr($post->post_type, 3)); $periods = pvc_growth_periods();
            $token = pvc_growth_token();
            $current = is_wp_error($token) ? $token : pvc_growth_query($token, $settings['property'], $url, $target, $periods['current']);
            $previous = is_wp_error($current) ? $current : pvc_growth_query($token, $settings['property'], $url, $target, $periods['previous']);
            if (is_wp_error($previous)) { $sample['error'] = $previous->get_error_message(); }
            else {
                $history = (array) ($old['history'] ?? array());
                $history[$periods['current'][1]] = array('current' => $current, 'previous' => $previous, 'periods' => $periods, 'url' => $url, 'property' => $settings['property']);
                $sample = array('time' => time(), 'attempt' => time(), 'current' => $current, 'previous' => $previous, 'periods' => $periods, 'url' => $url, 'property' => $settings['property'], 'history' => array_slice($history, -12, null, true));
            }
        }
        // Re-read so a removed target is not resurrected after a concurrent admin edit.
        if (isset(pvc_growth_targets()[$id]) && pvc_growth_settings() === $settings) {
            $latest = (array) get_option('pvc_growth_measurements', array()); $latest[$id] = $sample;
            update_option('pvc_growth_measurements', $latest, false);
        }
        pvc_growth_refresh_plan();
    } finally { delete_option('pvc_growth_lock'); }
}
