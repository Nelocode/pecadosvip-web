<?php
/** Proactive planning: evidence-based actions, never automatic promotional publishing. */
if (!defined('ABSPATH')) { exit; }

function pvc_growth_settings(): array {
    return array_merge(array('sync' => false, 'property' => ''), (array) get_option('pvc_growth_settings', array()));
}
function pvc_growth_targets(): array { return (array) get_option('pvc_growth_targets', array()); }
function pvc_growth_target_key(array $target): string {
    return hash('sha256', wp_json_encode(array($target['post_id'], $target['query'], $target['country'], $target['device'])));
}
function pvc_growth_periods(?int $now = null): array {
    $end = (new DateTimeImmutable('@' . ($now ?? time())))->setTimezone(new DateTimeZone('America/Los_Angeles'))->setTime(0, 0)->modify('-3 days');
    return array('current' => array($end->modify('-27 days')->format('Y-m-d'), $end->format('Y-m-d')), 'previous' => array($end->modify('-55 days')->format('Y-m-d'), $end->modify('-28 days')->format('Y-m-d')));
}
function pvc_growth_compare(?array $current, ?array $previous, int $goal): array {
    if (!$current || $current['impressions'] < 30) { return array('kind' => 'insufficient', 'priority' => 80, 'action' => 'Recopilar más datos antes de cambiar el contenido.', 'reason' => 'Menos de 30 impresiones observadas o consulta no devuelta por Google. No equivale a posición cero.'); }
    if ($previous && $previous['impressions'] >= 30 && (($current['position'] - $previous['position'] >= 2) || ($previous['clicks'] >= 10 && $current['clicks'] < $previous['clicks'] * .7))) {
        return array('kind' => 'regression', 'priority' => 10, 'action' => 'Investigar la caída y revisar cambios recientes, indexación e intención de búsqueda.', 'reason' => 'Empeora al menos 2 posiciones medias o pierde más del 30% de clics entre períodos comparables.');
    }
    if ($previous && $previous['impressions'] >= 30 && $previous['ctr'] > 0 && $current['ctr'] < $previous['ctr'] * .7 && abs($current['position'] - $previous['position']) <= 1) {
        return array('kind' => 'ctr', 'priority' => 20, 'action' => 'Revisar título y descripción frente a la intención de la consulta; preparar una propuesta editorial.', 'reason' => 'El CTR baja más del 30% con posición media parecida. Es una señal para investigar, no una causa demostrada.');
    }
    if ($current['position'] <= $goal) { return array('kind' => 'defend', 'priority' => 50, 'action' => 'Mantener la página útil y actualizada; vigilar retrocesos.', 'reason' => 'Alcanza la meta de posición media en este período. No garantiza un puesto fijo.'); }
    if ($current['position'] <= 20) { return array('kind' => 'opportunity', 'priority' => 30, 'action' => 'Priorizar esta página: revisar cobertura local, utilidad y enlaces internos relacionados.', 'reason' => 'La consulta ya registra visibilidad en posiciones medias próximas al objetivo.'); }
    return array('kind' => 'develop', 'priority' => 60, 'action' => 'Revisar si la página responde a esta búsqueda y desarrollar contenido local verificable.', 'reason' => 'La posición media todavía está alejada de la meta.');
}
function pvc_growth_refresh_plan(): array {
    $report = (array) get_option('pvc_seo_report', array());
    $data = (array) get_option('pvc_growth_measurements', array());
    $previous_plan = (array) get_option('pvc_growth_plan', array());
    $actions = array(); $blockers = pvc_seo_blockers();
    if ($blockers) { $actions['site-blockers'] = array('priority' => 0, 'action' => 'Resolver los bloqueos de indexación con el responsable de la publicación.', 'reason' => implode(' ', $blockers), 'post_id' => 0); }
    foreach (($report['rows'] ?? array()) as $row) {
        if (!$row['issues'] || !$row['eligible']) { continue; }
        $actions['editorial-' . $row['id']] = array('priority' => $row['eligible'] ? 40 : 70, 'action' => 'Revisar ' . $row['title'] . ' (' . $row['locale'] . ')', 'reason' => implode(' ', $row['issues']), 'post_id' => $row['id']);
    }
    foreach (pvc_growth_targets() as $id => $target) {
        $sample = $data[$id] ?? array();
        $post = get_post($target['post_id']);
        $record = $post ? pvc_record(substr($post->post_type, 3), get_post_meta($post->ID, 'pv_locale', true), get_post_meta($post->ID, 'pv_key', true)) : null;
        $scope = $record ? pvc_seo_url($record, substr($post->post_type, 3)) : '';
        $fresh = !empty($sample['time']) && $sample['time'] >= time() - 3 * DAY_IN_SECONDS && ($sample['property'] ?? '') === pvc_growth_settings()['property'] && ($sample['url'] ?? '') === $scope && empty($sample['error']);
        if (!$record || !pvc_seo_record_allowed($record)) {
            $action = array('kind' => 'excluded', 'priority' => 5, 'action' => 'Revisar el objetivo: su página no es elegible.', 'reason' => 'Está retirada, protegida, marcada como ficticia o excluida del índice. No se optimizará su difusión.');
        } elseif (!$fresh) {
            $action = array('kind' => 'measurement', 'priority' => 15, 'action' => 'Restablecer la medición de esta búsqueda.', 'reason' => !empty($sample['error']) ? $sample['error'] : 'No hay medición reciente para esta propiedad y URL. Configura Search Console y la sincronización.');
        } else { $action = pvc_growth_compare($sample['current'] ?? null, $sample['previous'] ?? null, $target['goal']); }
        $action['action'] = $target['query'] . ': ' . $action['action']; $action['post_id'] = $target['post_id'];
        $actions['target-' . $id] = $action;
    }
    if (!pvc_growth_targets()) { $actions['define-targets'] = array('priority' => 10, 'action' => 'Definir búsquedas objetivo para páginas informativas públicas.', 'reason' => 'Selecciona información general, acerca de, contacto o legal. Meta inicial: posición media de 3 o mejor.', 'post_id' => 0); }
    $new_count = 0;
    foreach ($actions as $id => &$action) {
        $fingerprint = hash('sha256', wp_json_encode($action));
        $old = $previous_plan['actions'][$id] ?? array();
        $action['fingerprint'] = $fingerprint;
        $action['state'] = ($old['fingerprint'] ?? '') === $fingerprint ? ($old['state'] ?? 'pending') : 'pending';
        if (($old['fingerprint'] ?? '') !== $fingerprint) { $new_count++; }
    } unset($action);
    uasort($actions, static fn($a, $b) => $a['priority'] <=> $b['priority']);
    $plan = array('time' => time(), 'actions' => $actions, 'new_count' => $new_count);
    update_option('pvc_growth_plan', $plan, false);
    return $plan;
}
// Reuse the actual audit cycle; projections remain independent of external services.
add_action('pvc_seo_audit_completed', 'pvc_growth_refresh_plan');
add_action('init', 'pvc_growth_schedule');
function pvc_growth_schedule(): void {
    if (!pvc_growth_settings()['sync']) { wp_clear_scheduled_hook('pvc_growth_sync'); return; }
    if (!wp_next_scheduled('pvc_growth_sync')) { wp_schedule_event(time() + 60, 'hourly', 'pvc_growth_sync'); }
}
register_deactivation_hook(PVC_DIR . '/pecadosvip-content.php', static function() { wp_clear_scheduled_hook('pvc_growth_sync'); });

require_once __DIR__ . '/seo-search-console.php';
require_once __DIR__ . '/seo-growth-admin.php';
