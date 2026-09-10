<?php
/**
 * Plugin Name: PecadosVIP Public Protection
 * Description: Neutral public holding screen during legal and age-verification preparation.
 * Version: 1.0.0
 *
 * Must-use plugin. No visitor-controlled bypass and no claim of legal compliance.
 * Origin media denial is enforced separately in Apache, including for editors.
 */
if (!defined('ABSPATH')) { exit; }
function pvp_guard_language(string $uri): string {
    $path = parse_url($uri, PHP_URL_PATH);
    if (!is_string($path)) { return 'es'; }
    return preg_match('#(?:^|/)(es|en|fr|it)(?:/|$)#', $path, $match) ? $match[1] : 'es';
}
function pvp_guard_copy(string $locale): array {
    $copy = array(
        'es' => array('title'=>'Sitio temporalmente no disponible','message'=>'El acceso público al contenido está cerrado mientras completamos su revisión y las medidas de protección.','exit'=>'Salir','age'=>'Contenido restringido a personas adultas.','lang'=>'Idioma'),
        'en' => array('title'=>'Website temporarily unavailable','message'=>'Public access to the content is closed while we complete its review and protective measures.','exit'=>'Leave','age'=>'Content restricted to adults.','lang'=>'Language'),
        'fr' => array('title'=>'Site temporairement indisponible','message'=>'L’accès public au contenu est fermé pendant la vérification et la mise en place des mesures de protection.','exit'=>'Quitter','age'=>'Contenu réservé aux adultes.','lang'=>'Langue'),
        'it' => array('title'=>'Sito temporaneamente non disponibile','message'=>'L’accesso pubblico ai contenuti è chiuso mentre completiamo la revisione e le misure di protezione.','exit'=>'Esci','age'=>'Contenuti riservati agli adulti.','lang'=>'Lingua')
    );
    return $copy[$locale] ?? $copy['es'];
}
function pvp_guard_html(string $locale): string {
    if (!in_array($locale, array('es','en','fr','it'), true)) { $locale='es'; }
    $copy=pvp_guard_copy($locale);
    ob_start(); ?>
<!doctype html>
<html lang="<?php echo esc_attr($locale); ?>"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer">
<title><?php echo esc_html($copy['title']); ?> · PecadosVIP</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#120e15;color:#faf7f2;font:18px/1.65 system-ui,sans-serif;padding:clamp(20px,5vw,64px)}main{max-width:760px;margin:auto;border:1px solid #897250;border-radius:18px;padding:clamp(24px,5vw,48px)}.brand{color:#ead4aa;letter-spacing:.12em}h1{font-size:clamp(1.65rem,4vw,2.4rem);line-height:1.25;overflow-wrap:anywhere}a{color:#f5dba8;text-underline-offset:4px}a:focus-visible{outline:3px solid white;outline-offset:5px}.exit{display:inline-block;padding:12px 26px;border:1px solid #ead4aa;border-radius:6px;margin:12px 0}nav{display:flex;flex-wrap:wrap;gap:18px;margin-top:24px}
</style></head><body><main id="main-content"><p class="brand">PECADOSVIP · 18+</p>
<h1><?php echo esc_html($copy['title']); ?></h1><p><?php echo esc_html($copy['message']); ?></p>
<p><?php echo esc_html($copy['age']); ?></p><a class="exit" href="about:blank" rel="noreferrer"><?php echo esc_html($copy['exit']); ?></a>
<nav aria-label="<?php echo esc_attr($copy['lang']); ?>"><?php foreach (array('es'=>'Español','en'=>'English','fr'=>'Français','it'=>'Italiano') as $lang=>$label) {
    echo '<a href="' . esc_url(home_url('/'.$lang)) . '"' . ($lang===$locale ? ' aria-current="page"' : '') . ' lang="' . $lang . '">' . esc_html($label) . '</a>';
} ?></nav></main></body></html>
<?php return (string) ob_get_clean();
}
function pvp_guard_is_editor(): bool {
    return function_exists('current_user_can') && current_user_can('edit_posts');
}
function pvp_guard_headers(): void {
    if (!defined('DONOTCACHEPAGE')) { define('DONOTCACHEPAGE', true); }
    nocache_headers();
    if (!headers_sent()) {
        header('Cache-Control: private, no-store, max-age=0', true);
        header('X-PecadosVIP-Protection: closed-v1', true);
        header('X-Robots-Tag: noindex, nofollow, noarchive', true);
        header('Referrer-Policy: no-referrer', true);
        header('X-Content-Type-Options: nosniff', true);
    }
}
function pvp_guard_request(): void {
    if ((defined('WP_CLI') && WP_CLI) || (defined('DOING_CRON') && DOING_CRON)) { return; }
    pvp_guard_headers();
    // Keep real editorial sessions and the core authentication screen functional.
    // This does NOT grant public visitors access or assert that any identity is adult.
    if (pvp_guard_is_editor() || ($GLOBALS['pagenow'] ?? '') === 'wp-login.php') { return; }
    // Normal wp-admin requests retain WordPress's own auth redirect; never exempt public AJAX or admin-post handlers.
    if (is_admin() && !wp_doing_ajax() && !in_array($GLOBALS['pagenow'] ?? '', array('admin-post.php','admin-ajax.php'), true)) { return; }
    status_header(503);
    if (!headers_sent()) {
        header('Content-Type: text/html; charset=UTF-8', true);
        header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; media-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'", true);
    }
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'HEAD') {
        echo pvp_guard_html(pvp_guard_language((string) ($_SERVER['REQUEST_URI'] ?? '/')));
    }
    exit;
}
// add_action('init', 'pvp_guard_request', -PHP_INT_MAX);
function pvp_guard_rest($response, $server, $request) {
    if (pvp_guard_is_editor()) { return $response; }
    pvp_guard_headers();
    return new WP_Error('pvp_public_closed', 'Public access temporarily unavailable.', array('status'=>503));
}
// add_filter('rest_pre_dispatch', 'pvp_guard_rest', -PHP_INT_MAX, 3);
add_action('admin_menu', function () {
    add_management_page('Protección pública', 'Protección pública', 'manage_options', 'pvp-public-protection', function () {
        if (!current_user_can('manage_options')) { return; }
        echo '<div class="wrap"><h1>Protección pública</h1><p>El cierre público de WordPress está activo. No equivale a verificación de edad ni a cumplimiento jurídico completo.</p><p>La protección de medios se configura en Apache y debe comprobarse desde el exterior. Los archivos originales se conservan; sus URL directas y las miniaturas administrativas quedan bloqueadas durante la contención.</p><p>Pendientes: datos del titular, textos legales reales, revisión de actividad y publicidad, consentimiento y derechos de imagen, proveedores y verificación de edad. La reapertura requiere una versión revisada y autorización del titular; no hay un interruptor que omita estos controles.</p></div>';
    });
});
