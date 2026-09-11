<?php
/**
 * Per-profile geographic restriction, at whatever level the model asks for.
 *
 * A profile declares a list of places it must not be shown from. The list mixes levels freely:
 * a two-letter country (`CO`), an ISO 3166-2 subdivision carrying its country prefix (`ES-MD`)
 * or a city name (`Madrid`). Two letters are always read as a country, because a bare
 * subdivision code is ambiguous with one: `MD` is Moldova, while Madrid is written `ES-MD`.
 * Operators add whatever a model requests, one per line.
 *
 * The origin cannot know where a visitor is, so each level is read from a header the edge adds.
 * Cloudflare is the intended source, but nothing is read until the operator configures it,
 * because production is served by Apache directly today and no such header arrives.
 *
 * Two properties are deliberate.
 *
 * - Nothing is enforced until a source is configured. An unconditional fail-closed rule on a
 *   site with no geo headers would hide every restricted profile from every visitor overnight.
 * - Once a source is configured, anything that cannot be evaluated fails closed. That includes
 *   a level with no configured header: publishing a model in the region she asked to be
 *   excluded from is worse than hiding her from everywhere, so the restriction withholds the
 *   profile and the administration reports the misconfiguration loudly.
 *
 * Editors, wp-admin, WP-CLI and cron always see every profile, so the restriction can never
 * lock the owner out of their own content.
 *
 * The filtering happens in `pvc_records()`, the single source that the profile listing, the
 * route index resolving every detail page, the canonical link, the REST catalogue and the
 * informational records all read, so a restricted profile leaves the listing and its detail
 * route answers 404 without touching a single template.
 */
if (!defined('ABSPATH')) { exit; }

/** Levels a profile can declare, and the name each one carries in the administration. */
function pvc_geo_levels(): array {
    return array('country' => 'país', 'subdivision' => 'provincia o región', 'city' => 'ciudad');
}

/** Header names the operator configured, per level. Empty means the level is not read. */
function pvc_geo_configured(): array {
    $configured = defined('PVC_GEO_HEADERS') ? (array) PVC_GEO_HEADERS : (array) get_option('pvc_geo_headers', array());
    // A single-header configuration from an earlier release still counts as the country level.
    $legacy = defined('PVC_GEO_HEADER') ? (string) PVC_GEO_HEADER : (string) get_option('pvc_geo_header', '');
    if (trim($legacy) !== '' && trim((string) ($configured['country'] ?? '')) === '') { $configured['country'] = $legacy; }
    if (function_exists('apply_filters')) { $configured = (array) apply_filters('pvc_geo_headers', $configured); }
    $headers = array();
    foreach (array_keys(pvc_geo_levels()) as $level) {
        $name = strtoupper(trim((string) ($configured[$level] ?? '')));
        $headers[$level] = preg_match('/^[A-Z0-9](?:[A-Z0-9-]{0,62}[A-Z0-9])?$/', $name) === 1 ? $name : '';
    }
    return $headers;
}

/** Whether any level is read at all. */
function pvc_geo_enabled(): bool { return array_filter(pvc_geo_configured()) !== array(); }

/** Case and accent insensitive form, so `Málaga` and `malaga` are the same place. */
function pvc_geo_fold(string $value): string {
    $value = trim($value);
    if (function_exists('remove_accents')) { $value = remove_accents($value); }
    elseif (function_exists('iconv')) { $value = (string) @iconv('UTF-8', 'ASCII//TRANSLIT', $value); }
    return strtolower(preg_replace('/\s+/u', ' ', $value) ?? $value);
}

/** Value the edge reported for one level, or null when it cannot be established. */
function pvc_geo_value(string $level): ?string {
    $header = pvc_geo_configured()[$level] ?? '';
    if ($header === '') { return null; }
    $raw = $_SERVER['HTTP_' . str_replace('-', '_', $header)] ?? '';
    $value = trim(is_string($raw) ? $raw : '');
    if ($value === '') { return null; }
    if ($level === 'city') { return pvc_geo_fold($value); }
    $value = strtoupper($value);
    // Cloudflare answers XX when it cannot place the visitor and T1 for Tor; neither is a place.
    if (str_contains($value, 'XX') || $value === 'T1') { return null; }
    return $value;
}

/** Country code from the configured header, or null when it cannot be established. */
function pvc_geo_country(): ?string {
    $value = pvc_geo_value('country');
    return $value !== null && preg_match('/^[A-Z]{2}$/', $value) === 1 ? $value : null;
}

/** Subdivision part of the reported region, upper case and without the country prefix. */
function pvc_geo_subdivision(): ?string {
    $value = pvc_geo_value('subdivision');
    if ($value === null) { return null; }
    $parts = explode('-', $value);
    $code = (string) end($parts);
    return preg_match('/^[A-Z0-9]{1,3}$/', $code) === 1 ? $code : null;
}

/** City name as reported, folded for comparison. */
function pvc_geo_city(): ?string { return pvc_geo_value('city'); }

/** The people who run the site always see every profile. */
function pvc_geo_exempt(): bool {
    if (defined('WP_CLI') && WP_CLI) { return true; }
    if (defined('DOING_CRON') && DOING_CRON) { return true; }
    if (function_exists('is_admin') && is_admin()) { return true; }
    return function_exists('current_user_can') && current_user_can('edit_posts');
}

/** Every place a record declares, normalised, in the order the operator wrote them. */
function pvc_geo_selectors(array $record): array {
    $declared = $record['data']['blockedRegions'] ?? array();
    if (is_string($declared)) { $declared = preg_split('/[\r\n,]+/', $declared) ?: array(); }
    $selectors = array();
    foreach ((array) $declared as $entry) {
        $value = strtoupper(trim((string) $entry));
        if ($value === '' || str_contains($value, 'XX') || $value === 'T1') { continue; }
        if (preg_match('/^[A-Z]{2}$/', $value) === 1 || preg_match('/^[A-Z]{2}-[A-Z0-9]{1,3}$/', $value) === 1) { $selectors[] = $value; continue; }
        $folded = pvc_geo_fold((string) $entry);
        if ($folded !== '') { $selectors[] = $folded; }
    }
    // A single country stored by an earlier release keeps working.
    $legacy = strtoupper(trim((string) ($record['data']['blockedCountry'] ?? '')));
    if (preg_match('/^[A-Z]{2}$/', $legacy) === 1 && $legacy !== 'XX' && !in_array($legacy, $selectors, true)) { $selectors[] = $legacy; }
    return $selectors;
}

/** Level a selector is expressed at: country, subdivision or city. */
function pvc_geo_level(string $selector): string {
    if (preg_match('/^[A-Z]{2}$/', $selector) === 1) { return 'country'; }
    if (preg_match('/^[A-Z]{2}-[A-Z0-9]{1,3}$/', $selector) === 1) { return 'subdivision'; }
    return 'city';
}

/**
 * Whether one selector keeps this visitor out.
 *
 * A selector whose level has no usable value fails closed, so a place that cannot be ruled out
 * counts as a match instead of a pass.
 */
function pvc_geo_matches(string $selector): bool {
    $level = pvc_geo_level($selector);
    if ($level === 'country') { $value = pvc_geo_country(); return $value === null || $value === $selector; }
    if ($level === 'subdivision') {
        $value = pvc_geo_subdivision();
        if ($value === null) { return true; }
        $parts = explode('-', $selector);
        if ($value !== (string) end($parts)) { return false; }
        $reported = pvc_geo_country();
        return $reported === null || $reported === $parts[0];
    }
    $value = pvc_geo_city();
    return $value === null || $value === pvc_geo_fold($selector);
}

/** Whether this record must be withheld from the current visitor. */
function pvc_geo_blocked(array $record): bool {
    $selectors = pvc_geo_selectors($record);
    if ($selectors === array() || !pvc_geo_enabled()) { return false; }
    foreach ($selectors as $selector) { if (pvc_geo_matches($selector)) { return true; } }
    return false;
}

/** Withholds restricted profiles from every public projection. */
function pvc_geo_visible(array $records, string $type = 'profile'): array {
    if (pvc_type($type) !== 'pv_profile' || pvc_geo_exempt()) { return $records; }
    $visible = array();
    foreach ($records as $record) { if (!pvc_geo_blocked($record)) { $visible[] = $record; } }
    return $visible;
}
add_filter('pvc_records', 'pvc_geo_visible', 10, 2);

/* ------------------------------------------------------------------- admin */

/** How many profiles declare a place at each level, so the screen can report the gaps. */
function pvc_geo_declared_levels(): array {
    static $counts = null;
    if ($counts !== null) { return $counts; }
    $counts = array('country' => 0, 'subdivision' => 0, 'city' => 0);
    $ids = get_posts(array('post_type' => 'pv_profile', 'post_status' => array('publish', 'draft', 'pending', 'future', 'private'), 'posts_per_page' => -1, 'fields' => 'ids', 'suppress_filters' => false));
    foreach ($ids as $id) {
        $levels = array();
        foreach (pvc_geo_selectors(array('data' => (array) get_post_meta($id, 'pv_data', true))) as $selector) { $levels[pvc_geo_level($selector)] = true; }
        foreach (array_keys($levels) as $level) { $counts[$level]++; }
    }
    return $counts;
}

/** Levels some profile relies on while no header reads them: the restriction cannot be honoured. */
function pvc_geo_unreadable_levels(): array {
    $configured = pvc_geo_configured(); $missing = array();
    foreach (pvc_geo_declared_levels() as $level => $declared) {
        if ($declared > 0 && ($configured[$level] ?? '') === '') { $missing[$level] = $declared; }
    }
    return $missing;
}

add_action('admin_menu', function () {
    add_submenu_page('pecadosvip-content', 'Bloqueo geográfico', 'Bloqueo geográfico', 'manage_options', 'pecadosvip-geo', 'pvc_geo_admin');
});

/** Warns where it cannot be missed: a declared place that no configured header can rule out. */
add_action('admin_notices', function () {
    if (!function_exists('current_user_can') || !current_user_can('manage_options')) { return; }
    $levels = pvc_geo_declared_levels();
    if (array_sum($levels) === 0) { return; }
    $names = pvc_geo_levels();
    $link = '<a href="' . esc_url(admin_url('admin.php?page=pecadosvip-geo')) . '">PecadosVip → Bloqueo geográfico</a>';
    $unreadable = pvc_geo_unreadable_levels();
    if ($unreadable !== array()) {
        $parts = array();
        foreach ($unreadable as $level => $declared) { $parts[] = $declared . ' perfil(es) piden ' . $names[$level]; }
        echo '<div class="notice notice-error"><p><strong>Hay restricciones geográficas que no se pueden evaluar.</strong> '
            . esc_html(implode(', ', $parts)) . ', pero ese nivel no tiene cabecera configurada, así que esos perfiles se están ocultando a todo el mundo. Configúralo en ' . $link . '.</p></div>';
        return;
    }
    if (!pvc_geo_enabled()) {
        echo '<div class="notice notice-warning"><p><strong>Bloqueo geográfico sin aplicar.</strong> '
            . esc_html((string) array_sum($levels)) . ' perfil(es) declaran lugares, pero no hay ninguna cabecera configurada, así que se muestran a todo el mundo. Configúralo en ' . $link . '.</p></div>';
    }
});

function pvc_geo_admin(): void {
    if (!current_user_can('manage_options')) { return; }
    $names = pvc_geo_levels();
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['pvc_geo_headers']) && check_admin_referer('pvc_geo_save')) {
        $incoming = (array) wp_unslash($_POST['pvc_geo_headers']);
        $clean = array();
        foreach (array_keys($names) as $level) { $clean[$level] = sanitize_text_field((string) ($incoming[$level] ?? '')); }
        update_option('pvc_geo_headers', $clean, false);
        echo '<div class="notice notice-success"><p>Guardado.</p></div>';
    }
    $stored = defined('PVC_GEO_HEADERS') ? (array) PVC_GEO_HEADERS : (array) get_option('pvc_geo_headers', array());
    $configured = pvc_geo_configured();
    $declared = pvc_geo_declared_levels();
    $hints = array('country' => 'CF-IPCountry', 'subdivision' => 'CF-Region-Code', 'city' => 'CF-IPCity');
    echo '<div class="wrap"><h1>Bloqueo geográfico</h1>';
    echo '<p>Cada modelo puede pedir que no se la muestre desde ciertos lugares. Se escribe uno por línea: un país con dos letras (<code>CO</code>), una provincia o región con el prefijo de su país (<code>ES-MD</code>) o una ciudad (<code>Madrid</code>).</p>';
    echo '<p>Dos letras se leen siempre como país, nunca como provincia: <code>MD</code> es Moldavia, y Madrid se escribe <code>ES-MD</code>.</p>';
    echo '<p>El origen no puede saber de dónde llega un visitante: cada nivel se lee de una cabecera que añade el proxy situado delante. Este sitio se sirve hoy con Apache directo, sin proxy que añada esas cabeceras.</p>';
    echo '<form method="post">' . wp_nonce_field('pvc_geo_save', '_wpnonce', true, false);
    echo '<table class="form-table"><tbody>';
    foreach ($names as $level => $name) {
        echo '<tr><th scope="row"><label for="pvc-geo-' . esc_attr($level) . '">Cabecera de ' . esc_html($name) . '</label></th><td>'
            . '<input name="pvc_geo_headers[' . esc_attr($level) . ']" id="pvc-geo-' . esc_attr($level) . '" type="text" class="regular-text" value="' . esc_attr((string) ($stored[$level] ?? '')) . '" placeholder="' . esc_attr($hints[$level]) . '">'
            . '<p class="description">Déjalo vacío para no leer ese nivel. Con Cloudflare delante, activa las cabeceras de ubicación del visitante y usa estos nombres.</p></td></tr>';
    }
    echo '</tbody></table>';
    submit_button('Guardar');
    echo '</form><h2>Estado</h2><ul>';
    if (!pvc_geo_enabled()) {
        echo '<li><strong>El bloqueo no se aplica.</strong> Los perfiles que declaren lugares se muestran a todo el mundo.</li>';
    } else {
        foreach ($configured as $level => $header) {
            if ($header === '') { echo '<li>Nivel <strong>' . esc_html($names[$level]) . '</strong>: sin cabecera configurada.</li>'; continue; }
            $value = pvc_geo_value($level);
            echo '<li>Nivel <strong>' . esc_html($names[$level]) . '</strong> leyendo <code>' . esc_html($header) . '</code>: '
                . ($value === null ? 'en esta petición no llegó ningún valor, así que este nivel se aplica ocultando.' : 'valor detectado <code>' . esc_html($value) . '</code>.') . '</li>';
        }
    }
    foreach ($declared as $level => $count) { echo '<li>Perfiles que piden <strong>' . esc_html($names[$level]) . '</strong>: ' . esc_html((string) $count) . '.</li>'; }
    foreach (pvc_geo_unreadable_levels() as $level => $count) {
        echo '<li><strong>Sin evaluar:</strong> ' . esc_html((string) $count) . ' perfil(es) piden ' . esc_html($names[$level]) . ' y ese nivel no tiene cabecera, así que se ocultan a todo el mundo.</li>';
    }
    echo '<li>Editores, administración, WP-CLI y cron ven siempre todos los perfiles.</li></ul></div>';
}
