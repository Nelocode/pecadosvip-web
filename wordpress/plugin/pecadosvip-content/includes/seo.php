<?php
/** SEO projections use published editorial records. They never rewrite the content. */
if (!defined('ABSPATH')) { exit; }

function pvc_seo_settings(): array {
    return array_merge(array('enabled' => false, 'site_url' => '', 'daily' => true), (array) get_option('pvc_seo_settings', array()));
}
function pvc_seo_conflict(): bool {
    return defined('WPSEO_VERSION') || defined('RANK_MATH_VERSION') || defined('AIOSEO_VERSION') || defined('SEOPRESS_VERSION');
}
function pvc_seo_blockers(): array {
    $settings = pvc_seo_settings(); $issues = array();
    if (empty($settings['enabled'])) { $issues[] = 'Indexación desactivada en SEO automático.'; }
    if (untrailingslashit($settings['site_url']) !== untrailingslashit(home_url())) { $issues[] = 'Confirma la URL definitiva de esta instalación.'; }
    if (wp_get_environment_type() !== 'production') { $issues[] = 'El entorno no es producción.'; }
    if ((string) get_option('blog_public') !== '1') { $issues[] = 'WordPress tiene desactivada la visibilidad para buscadores (Ajustes → Lectura).'; }
    $host = strtolower((string) wp_parse_url(home_url(), PHP_URL_HOST));
    if (wp_parse_url(home_url(), PHP_URL_SCHEME) !== 'https' || !str_contains($host, '.') || filter_var($host, FILTER_VALIDATE_IP) || preg_match('/(?:^|\.)(?:localhost|test|local|invalid|example)$|\.easypanel\.host$/', $host)) { $issues[] = 'Configura un dominio público definitivo con HTTPS.'; }
    if (!function_exists('pvwp_ready') || !pvwp_ready()) { $issues[] = 'El tema PecadosVip y su contenido deben estar disponibles.'; }
    if (pvc_seo_conflict()) { $issues[] = 'Otro plugin SEO está activo. Elige un solo gestor SEO antes de activar este módulo.'; }
    if (function_exists('pvp_guard_request')) { $issues[] = 'La protección pública está activa. El SEO no puede reabrir el sitio ni habilitar su indexación.'; }
    return $issues;
}
function pvc_seo_text(string $text, int $limit = 0): string {
    $text = trim(preg_replace('/\s+/u', ' ', html_entity_decode(wp_strip_all_tags(strip_shortcodes($text)), ENT_QUOTES | ENT_HTML5, 'UTF-8')) ?? '');
    // WordPress provides these Unicode-aware functions even without mbstring.
    if ($limit && mb_strlen($text) > $limit) { $text = rtrim(mb_substr($text, 0, $limit - 1)) . '…'; }
    return $text;
}
function pvc_seo_metadata(array $record): array {
    $id = (int) ($record['id'] ?? 0);
    $title = pvc_seo_text((string) get_post_meta($id, 'pv_seo_title', true));
    $description = pvc_seo_text((string) get_post_meta($id, 'pv_seo_description', true));
    return array(
        'title' => $title !== '' ? $title : pvc_seo_text(($record['title'] ?? '') . ' · ' . get_bloginfo('name')),
        'description' => $description !== '' ? $description : pvc_seo_text(($record['excerpt'] ?? '') ?: ($record['content'] ?? ''), 160),
    );
}
function pvc_seo_informational(array $record): bool {
    $post = get_post((int) ($record['id'] ?? 0));
    return $post && $post->post_type === 'pv_page' && in_array($record['data']['kind'] ?? '', array('information', 'about', 'contact', 'legal'), true);
}
function pvc_seo_record_allowed(array $record): bool {
    $id = (int) ($record['id'] ?? 0); $post = get_post($id);
    return $post && $post->post_status === 'publish' && $post->post_password === ''
        && pvc_seo_informational($record) && !empty($record['title'])
        && isset(pvc_locales()[$record['locale'] ?? ''])
        && empty($record['data']['synthetic']) && !get_post_meta($id, 'pv_seo_noindex', true);
}
function pvc_seo_indexable(array $context): bool {
    return !empty($context['owned']) && ($context['status'] ?? 0) === 200
        && empty($context['preview']) && empty($context['query'])
        && !isset($_GET['preview_id']) && !isset($_GET['preview'])
        && !pvc_seo_blockers() && pvc_seo_record_allowed($context['route']['record'] ?? array());
}
function pvc_seo_url(array $record, string $type): string {
    return untrailingslashit(home_url('/' . $record['locale'] . '/' . pvc_suffix(pvc_type($type), $record['key'], $record['data'])));
}
function pvc_seo_inventory(): array {
    $rows = array();
    foreach (array_keys(pvc_locales()) as $locale) {
        foreach (array('page', 'city', 'service', 'profile') as $type) {
            foreach (pvc_records($type, $locale) as $record) {
                $rows[] = array('record' => $record, 'type' => $type, 'url' => pvc_seo_url($record, $type), 'meta' => pvc_seo_metadata($record));
            }
        }
    }
    return $rows;
}
function pvc_seo_audit(): array {
    $inventory = pvc_seo_inventory(); $titles = array(); $descriptions = array(); $translations = array();
    foreach ($inventory as $row) {
        $r = $row['record']; $titles[$r['locale'] . ':' . $row['meta']['title']][] = $r['id'];
        if ($row['meta']['description'] !== '') { $descriptions[$r['locale'] . ':' . $row['meta']['description']][] = $r['id']; }
        $translations[$row['type'] . ':' . $r['key']][] = $r['locale'];
    }
    $report = array('time' => time(), 'revision' => pvc_revision(), 'total' => count($inventory), 'eligible' => 0, 'issues' => 0, 'rows' => array());
    foreach ($inventory as $row) {
        $r = $row['record']; $meta = $row['meta']; $issues = array();
        if (!pvc_seo_informational($r)) { $issues[] = 'Fuera del alcance informativo: sin optimización de difusión ni indexación desde este módulo.'; }
        if (!empty($r['data']['synthetic'])) { $issues[] = 'Contenido marcado como ficticio: excluido del índice.'; }
        if (get_post_meta($r['id'], 'pv_seo_noindex', true)) { $issues[] = 'Exclusión editorial del índice.'; }
        if ($meta['description'] === '') { $issues[] = 'Añade un extracto útil: falta la descripción.'; }
        if (mb_strlen($meta['title']) > 65) { $issues[] = 'Revisa el título largo; puede recortarse en resultados.'; }
        if (count($titles[$r['locale'] . ':' . $meta['title']]) > 1) { $issues[] = 'Título repetido en este idioma.'; }
        if ($meta['description'] !== '' && count($descriptions[$r['locale'] . ':' . $meta['description']]) > 1) { $issues[] = 'Descripción repetida en este idioma.'; }
        if (!empty($r['image']) && empty($r['image']['alt'])) { $issues[] = 'Revisa el texto alternativo de la imagen principal.'; }
        $missing = array_diff(array_keys(pvc_locales()), $translations[$row['type'] . ':' . $r['key']]);
        if ($missing) { $issues[] = 'Traducciones sin publicar: ' . implode(', ', $missing) . '.'; }
        if ($row['type'] === 'city' && empty($r['data']['coverage'])) { $issues[] = 'Añade cobertura real y contenido propio de esta ciudad.'; }
        $allowed = pvc_seo_record_allowed($r); if ($allowed) { $report['eligible']++; }
        $report['issues'] += count($issues);
        $report['rows'][] = array('id' => $r['id'], 'title' => $r['title'], 'locale' => $r['locale'], 'type' => $row['type'], 'url' => $row['url'], 'meta' => $meta, 'eligible' => $allowed, 'issues' => $issues);
    }
    update_option('pvc_seo_report', $report, false);
    do_action('pvc_seo_audit_completed');
    return $report;
}
add_action('pvc_seo_daily_audit', 'pvc_seo_audit');
function pvc_seo_schedule(): void {
    if (!pvc_seo_settings()['daily']) { wp_clear_scheduled_hook('pvc_seo_daily_audit'); return; }
    if (!wp_next_scheduled('pvc_seo_daily_audit')) { wp_schedule_event(time() + 300, 'daily', 'pvc_seo_daily_audit'); }
}
add_action('init', 'pvc_seo_schedule');
register_deactivation_hook(PVC_DIR . '/pecadosvip-content.php', static function() { wp_clear_scheduled_hook('pvc_seo_daily_audit'); });

// Register with WordPress' paginated XML sitemap system. Drafts, password-protected,
// synthetic and excluded records never enter this provider, including after withdrawal.
add_action('wp_sitemaps_init', static function() {
    if (pvc_seo_blockers()) { return; }
    $provider = new class extends WP_Sitemaps_Provider {
        public function __construct() { $this->name = 'pecadosvip'; $this->object_type = 'pecadosvip'; }
        private function rows(): array { return array_values(array_filter(pvc_seo_inventory(), static fn($row) => pvc_seo_record_allowed($row['record']))); }
        public function get_url_list($page_num, $object_subtype = '') {
            if (pvc_seo_blockers()) { return array(); }
            $size = wp_sitemaps_get_max_urls($this->object_type);
            return array_map(static function($row) {
                $post = get_post($row['record']['id']);
                $entry = array('loc' => $row['url']);
                $modified = get_post_modified_time(DATE_W3C, true, $post);
                if ($modified) { $entry['lastmod'] = $modified; }
                return $entry;
            }, array_slice($this->rows(), max(0, (int) $page_num - 1) * $size, $size));
        }
        public function get_max_num_pages($object_subtype = '') {
            return pvc_seo_blockers() ? 0 : (int) ceil(count($this->rows()) / wp_sitemaps_get_max_urls($this->object_type));
        }
    };
    wp_register_sitemap_provider('pecadosvip', $provider);
});

require_once __DIR__ . '/seo-admin.php';
require_once __DIR__ . '/seo-growth.php';
