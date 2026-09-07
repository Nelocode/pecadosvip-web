<?php
/** Native WordPress presentation. Content belongs to the separate content plugin. */
if (!defined('ABSPATH')) { exit; }
require_once __DIR__ . '/inc/router.php';
require_once __DIR__ . '/inc/render.php';

function pvwp_setup(): void {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('custom-logo', array('height' => 160, 'width' => 560, 'flex-width' => true, 'flex-height' => true));
    add_theme_support('html5', array('search-form', 'gallery', 'caption', 'style', 'script'));
    add_theme_support('responsive-embeds');
    add_theme_support('align-wide');
    add_theme_support('editor-styles');
    add_editor_style('assets/native.css');
    register_nav_menus(array('primary_es' => 'Navegación · Español', 'primary_en' => 'Navigation · English', 'primary_fr' => 'Navigation · Français', 'primary_it' => 'Navigazione · Italiano'));
}
add_action('after_setup_theme', 'pvwp_setup');

function pvwp_ready(): bool {
    return function_exists('pvc_records') && function_exists('pvc_copy') && count(pvc_copy('es')) > 0;
}
function pvwp_url(string $suffix = '', ?string $locale = null, array $query = array()): string {
    $locale = $locale ?? (pvwp_context()['locale'] ?? 'es');
    $url = home_url('/' . $locale . ($suffix !== '' ? '/' . ltrim($suffix, '/') : ''));
    return $query ? add_query_arg($query, $url) : $url;
}
function pvwp_record_path(string $type, array $record): string {
    if ($type === 'profile') { return 'perfiles/' . $record['key']; }
    if ($type === 'service') { return 'servicios/' . $record['key']; }
    $custom = trim((string) ($record['data']['route'] ?? ''), '/');
    if ($custom !== '') { return $custom; }
    if ($type === 'page' && ($record['data']['kind'] ?? '') === 'legal') { return 'legal/' . $record['key']; }
    return $record['key'];
}

/** Resolve published WordPress records for this request, never an exported snapshot. */
function pvwp_context(): array {
    static $context = null;
    if ($context !== null) { return $context; }
    if (is_admin() || wp_doing_ajax() || wp_doing_cron() || (defined('REST_REQUEST') && REST_REQUEST) || (defined('XMLRPC_REQUEST') && XMLRPC_REQUEST)) { return $context = array('owned' => false); }
    $uri = isset($_SERVER['REQUEST_URI']) && is_string($_SERVER['REQUEST_URI']) ? wp_unslash($_SERVER['REQUEST_URI']) : '/';
    $routes = array();
    if (pvwp_ready()) {
        foreach (array('es', 'en', 'fr', 'it') as $locale) {
            $copy = pvc_copy($locale); $cities = pvc_records('city', $locale); $services = pvc_records('service', $locale);
            $allowed = array('city' => array_column($cities, 'key'), 'availability' => array('available', 'limited', 'on-request', 'unavailable'));
            foreach (array('' => 'home', '/perfiles' => 'profiles', '/servicios' => 'services') as $suffix => $kind) {
                $page = pvc_record('page', $locale, $kind === 'home' ? 'home' : ($kind === 'profiles' ? 'perfiles' : 'servicios'));
                if (!$page) { continue; }
                $routes['/' . $locale . $suffix] = array('kind' => $kind, 'record' => $page, 'title' => $page['title'], 'description' => wp_strip_all_tags($page['excerpt'] ?? ''), 'allowed' => $kind === 'services' ? array('category' => array_values(array_unique(array_filter(array_map(static fn($s) => $s['data']['group'] ?? '', $services))))) : $allowed);
            }
            foreach (array('profile', 'service', 'city', 'page') as $type) {
                foreach (pvc_records($type, $locale) as $record) {
                    if ($type === 'page' && in_array($record['key'], array('home', 'perfiles', 'servicios'), true)) { continue; }
                    $path = pvwp_record_path($type, $record);
                    if (!preg_match('#^[a-z0-9][a-z0-9_/-]*$#D', $path) || strpos($path, '..') !== false || in_array($path, array('perfiles', 'servicios'), true)) { continue; }
                    $record_allowed = array();
                    if ($type === 'profile') {
                        $photos = array();
                        foreach (($record['gallery'] ?? array()) as $i => $photo) { $photos[] = (string) $i; $photos[] = $i === 0 ? 'cover' : 'gallery-' . str_pad((string) $i, 2, '0', STR_PAD_LEFT); }
                        if (!$photos && !empty($record['image'])) { $photos = array('0', 'cover'); }
                        $record_allowed['foto'] = $photos;
                    }
                    $routes['/' . $locale . '/' . $path] = array('kind' => $type, 'title' => $record['title'], 'description' => wp_strip_all_tags($record['excerpt'] ?? ''), 'record' => $record, 'allowed' => $record_allowed);
                }
            }
        }
    }
    $context = pvwp_resolve_request($uri, (string) wp_parse_url(home_url('/'), PHP_URL_PATH), array('ready' => pvwp_ready(), 'routes' => $routes));
    if (!empty($context['owned']) && function_exists('pvc_preview_record') && isset($_GET['preview_id'], $_GET['_wpnonce'])) {
        $locale = $context['locale'] ?? 'es'; $id = absint($_GET['preview_id']); $post = get_post($id);
        $type = $post ? preg_replace('/^pv_/', '', $post->post_type) : '';
        if ($post && in_array($type, array('profile', 'service', 'city', 'page'), true) && current_user_can('edit_post', $id)) {
            $key = (string) get_post_meta($id, 'pv_key', true);
            $record = pvc_preview_record($locale, $type, $key);
            $preview_path = rtrim((string) wp_parse_url(pvc_route($post), PHP_URL_PATH), '/');
            $request_path = rtrim((string) wp_parse_url($uri, PHP_URL_PATH), '/');
            if ($preview_path !== $request_path) { $record = null; }
            if (is_array($record)) {
                $kind = $type === 'page' && in_array($record['key'], array('home', 'perfiles', 'servicios'), true) ? array('home' => 'home', 'perfiles' => 'profiles', 'servicios' => 'services')[$record['key']] : $type;
                $context = array_merge($context, array('status' => 200, 'preview' => true, 'route' => array('kind' => $kind, 'record' => $record, 'title' => $record['title'], 'description' => wp_strip_all_tags($record['excerpt'] ?? '')), 'query' => array()));
            }
        }
    }
    return $context;
}
function pvwp_handle_404($preempt, $query) {
    $c = pvwp_context(); if (empty($c['owned'])) { return $preempt; }
    $query->is_404 = ($c['status'] ?? 404) === 404; $query->is_home = false; status_header($c['status'] ?? 404); return true;
}
add_filter('pre_handle_404', 'pvwp_handle_404', 10, 2);
function pvwp_template_redirect(): void {
    $c = pvwp_context(); if (empty($c['owned'])) { return; }
    remove_action('template_redirect', 'redirect_canonical'); remove_action('template_redirect', 'wp_old_slug_redirect'); remove_action('wp_head', 'rel_canonical');
    if (!headers_sent()) { header('X-Robots-Tag: noindex, nofollow, noarchive', true); header('X-Content-Type-Options: nosniff', true); header('X-PecadosVip-Content-Revision: ' . (function_exists('pvc_revision') ? (string) pvc_revision() : 'uninstalled'), true); }
    if (!defined('DONOTCACHEPAGE')) { define('DONOTCACHEPAGE', true); } nocache_headers();
    if (isset($c['redirect'])) { wp_safe_redirect(home_url($c['redirect']), $c['status'], 'PecadosVip'); exit; } status_header($c['status'] ?? 404);
}
add_action('template_redirect', 'pvwp_template_redirect', 0);
add_filter('template_include', static function ($template) { return !empty(pvwp_context()['owned']) ? get_template_directory() . '/index.php' : $template; }, 99);
add_filter('pre_get_document_title', static function ($title) { $c = pvwp_context(); return !empty($c['owned']) ? (($c['route']['title'] ?? pvwp_error_copy($c['locale'] ?? 'es')['notFound']) . ' · ' . get_bloginfo('name')) : $title; }, 20);
add_filter('wp_robots', static function ($robots) { if (!empty(pvwp_context()['owned'])) { unset($robots['index'], $robots['follow']); $robots['noindex'] = true; $robots['nofollow'] = true; $robots['noarchive'] = true; } return $robots; });
function pvwp_assets(): void {
    $base = get_template_directory_uri();
    foreach (array('style.css', 'assets/frontend.css', 'assets/native.css') as $i => $asset) { $file = get_template_directory() . '/' . $asset; if (is_file($file)) { wp_enqueue_style('pecadosvip-' . $i, $base . '/' . $asset, array(), (string) filemtime($file)); } }
    if (empty(pvwp_context()['owned']) || !pvwp_ready()) { return; }
    $script = '/assets/frontend.js';
    wp_enqueue_script('pecadosvip-native', $base . $script, array(), (string) filemtime(get_template_directory() . $script), array('in_footer' => true, 'strategy' => 'defer'));
    wp_add_inline_script('pecadosvip-native', 'window.PecadosVipWP=' . wp_json_encode(array('locale' => pvwp_context()['locale'], 'copy' => array('hub' => pvwp_value('services.hub', array()), 'ui' => pvwp_value('nativeUi', array()))), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) . ';', 'before');
}
add_action('wp_enqueue_scripts', 'pvwp_assets');
add_action('wp_head', static function () {
    $c = pvwp_context(); if (empty($c['owned']) || ($c['status'] ?? 0) !== 200) { return; }
    echo '<meta name="description" content="' . esc_attr($c['route']['description'] ?? '') . '">' . "\n";
    $site = function_exists('pvc_site') ? pvc_site($c['locale']) : array();
    $icon = $site['icon'] ?? ($site['logo'] ?? null);
    if (!has_site_icon() && !empty($icon['url'])) { echo '<link rel="icon" href="' . esc_url($icon['url']) . '">' . "\n"; }
    foreach (array('es', 'en', 'fr', 'it') as $locale) { $href = pvwp_language_url($locale); if ($href !== null) { echo '<link rel="alternate" hreflang="' . esc_attr($locale) . '" href="' . esc_url($href) . '">' . "\n"; } }
});
function pvwp_error_copy(string $locale): array {
    $copy = array(
        'es' => array('notFound' => 'Página no encontrada', 'unavailable' => 'Configuración pendiente', 'message' => 'Esta página no está disponible.', 'build' => 'Activa PecadosVip Contenido e importa el contenido inicial desde su menú de administración.', 'back' => 'Volver al inicio', 'skip' => 'Saltar al contenido principal'),
        'en' => array('notFound' => 'Page not found', 'unavailable' => 'Setup required', 'message' => 'This page is unavailable.', 'build' => 'Activate PecadosVip Content and import the initial content from its administration menu.', 'back' => 'Back to home', 'skip' => 'Skip to main content'),
        'fr' => array('notFound' => 'Page introuvable', 'unavailable' => 'Configuration requise', 'message' => 'Cette page est indisponible.', 'build' => 'Activez PecadosVip Content et importez le contenu initial depuis son menu d’administration.', 'back' => 'Retour à l’accueil', 'skip' => 'Aller au contenu principal'),
        'it' => array('notFound' => 'Pagina non trovata', 'unavailable' => 'Configurazione richiesta', 'message' => 'Questa pagina non è disponibile.', 'build' => 'Attiva PecadosVip Content e importa i contenuti iniziali dal suo menu di amministrazione.', 'back' => 'Torna alla home', 'skip' => 'Vai al contenuto principale'),
    ); return $copy[$locale] ?? $copy['es'];
}
