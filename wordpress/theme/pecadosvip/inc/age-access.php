<?php
/**
 * Server-side adult access gate.
 *
 * Fail-closed by design: content is not served unless a trusted adapter confirms a
 * valid adult session through the `pvwp_age_verified_session` filter. This module never
 * reads a cookie, a query parameter, a User-Agent or a self-declaration as proof, and
 * never receives identity documents, photographs or dates of birth.
 *
 * Design follows the staged proposal in
 * `output/legal-ue-20260910/proposal/age-access.php` and the operational requirements
 * in `output/legal-ue-20260910/REQUISITOS-OPERATIVOS.md`: legal documents and the
 * reporting channel stay reachable without adult content, and no graphic byte is
 * delivered to an unauthorised visitor.
 *
 * Disabled by default. Enable only after the verifier contract, the origin-media
 * protection and the approved legal documents are in place. This module does not
 * replace a verifier, does not protect the static file server and does not protect
 * cached copies outside this origin.
 */
if (!defined('ABSPATH')) { exit; }

function pvwp_age_enabled(): bool {
    if (!function_exists('pvc_legal_settings')) { return false; }
    $settings = pvc_legal_settings();
    return !empty($settings['age_gate']['enabled']);
}
/** Only an adapter that validated a proof and its session may supply this result. */
function pvwp_age_authorized(): bool {
    try {
        $proof = apply_filters('pvwp_age_verified_session', null);
        return is_array($proof)
            && ($proof['verified'] ?? null) === true
            && (int) ($proof['threshold'] ?? 0) === 18
            && is_int($proof['expires_at'] ?? null)
            && $proof['expires_at'] > time()
            && $proof['expires_at'] <= time() + 43200;
    } catch (Throwable $error) {
        // Never log identity, proofs or session values. A verifier failure denies access.
        return false;
    }
}
function pvwp_age_open_documents(): array {
    return array('aviso-legal', 'privacidad', 'cookies', 'terminos-del-servicio');
}
/** Legal documents and their translations stay reachable without proving age. */
function pvwp_age_route_is_open(array $context): bool {
    if (empty($context['owned'])) { return true; }
    $record = $context['route']['record'] ?? array();
    return ($context['route']['kind'] ?? '') === 'page'
        && in_array((string) ($record['key'] ?? ''), pvwp_age_open_documents(), true);
}
function pvwp_age_headers(): void {
    if (!defined('DONOTCACHEPAGE')) { define('DONOTCACHEPAGE', true); }
    nocache_headers();
    if (headers_sent()) { return; }
    header('Cache-Control: private, no-store, max-age=0', true);
    header('X-Robots-Tag: noindex, nofollow, noarchive', true);
    header('Referrer-Policy: no-referrer', true);
    header('X-Content-Type-Options: nosniff', true);
}
function pvwp_age_document_link(string $locale, string $key, string $label): string {
    return '<a href="' . esc_url(home_url('/' . $locale . '/legal/' . $key)) . '">' . esc_html($label) . '</a>';
}
/**
 * Neutral shell. Deliberately avoids wp_head, wp_footer, templates, shortcodes, queued
 * third parties and every graphic resource.
 */
function pvwp_age_shell(string $locale): string {
    $labels = array(
        pvwp_legal_document_text('aviso-legal', 'title') ?: 'aviso-legal',
        pvwp_legal_document_text('privacidad', 'title') ?: 'privacidad',
        pvwp_legal_document_text('cookies', 'title') ?: 'cookies',
        pvwp_legal_document_text('terminos-del-servicio', 'title') ?: 'terminos-del-servicio',
    );
    ob_start(); ?>
<!doctype html>
<html lang="<?php echo esc_attr($locale); ?>">
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="referrer" content="no-referrer">
<title><?php echo esc_html(pvwp_text('legal.age.title')); ?> · <?php bloginfo('name'); ?></title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#120e15;color:#faf7f2;font:18px/1.65 system-ui,sans-serif;min-height:100vh;padding:clamp(20px,5vw,64px)}
main{max-width:760px;margin:auto;border:1px solid #897250;border-radius:18px;padding:clamp(24px,5vw,48px)}
.brand{color:#ead4aa;letter-spacing:.12em}h1{font-size:clamp(1.7rem,4vw,2.4rem);line-height:1.25}a{color:#f5dba8;text-underline-offset:4px}
a:focus-visible{outline:3px solid white;outline-offset:5px}.exit{display:inline-block;padding:12px 26px;border:1px solid #ead4aa;border-radius:6px;margin:12px 0}
nav{display:flex;flex-wrap:wrap;gap:14px;margin-top:24px}small{display:block;font-size:.9rem;color:#cbbfa8}
</style>
</head>
<body>
<main id="main-content">
<p class="brand"><?php bloginfo('name'); ?> · 18+</p>
<h1><?php pvwp_label('legal.age.title'); ?></h1>
<p><?php pvwp_label('legal.age.shellBody'); ?></p>
<p role="status"><?php pvwp_label('legal.age.unavailable'); ?></p>
<small><?php pvwp_label('legal.age.privacy'); ?></small>
<p><a class="exit" href="about:blank" rel="noreferrer"><?php pvwp_label('legal.age.exit'); ?></a></p>
<?php pvwp_legal_report('shell'); ?>
<nav aria-label="<?php echo esc_attr(pvwp_text('legal.age.legal')); ?>">
<?php foreach (pvwp_age_open_documents() as $index => $document) { echo pvwp_age_document_link($locale, $document, (string) $labels[$index]); } ?>
</nav>
</main>
</body>
</html>
<?php return (string) ob_get_clean();
}
function pvwp_age_protect_frontend(): void {
    if (!pvwp_age_enabled()) { return; }
    if (is_admin() || wp_doing_ajax() || wp_doing_cron() || (defined('REST_REQUEST') && REST_REQUEST)) { return; }
    $context = pvwp_context();
    if (empty($context['owned'])) { return; }
    // Cache policy applies to every response, including authorised ones.
    pvwp_age_headers();
    if (pvwp_age_authorized() || pvwp_age_route_is_open($context)) { return; }
    status_header(403);
    if (!headers_sent()) {
        header('Content-Type: text/html; charset=UTF-8', true);
        header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; media-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'", true);
    }
    if ((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'HEAD') { echo pvwp_age_shell((string) ($context['locale'] ?? 'es')); }
    exit;
}
add_action('template_redirect', 'pvwp_age_protect_frontend', -100);
/** Authenticated editorial operations keep working; anonymous REST reads do not. */
function pvwp_age_protect_rest($result, $server, $request) {
    if (!pvwp_age_enabled() || current_user_can('edit_posts') || pvwp_age_authorized()) { return $result; }
    pvwp_age_headers();
    return new WP_Error('pvwp_age_required', 'Adult access verification required.', array('status' => 403));
}
add_filter('rest_pre_dispatch', 'pvwp_age_protect_rest', -100, 3);
