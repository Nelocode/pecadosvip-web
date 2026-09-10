<?php
/**
 * Contact channels. The destinations are supplied by the operator and stay empty by
 * default; a channel is rendered as an active link only when its destination passes a
 * strict schema check and both the contact approval and the legal identification are
 * in place. Otherwise the theme renders a disabled control with a notice.
 */
if (!defined('ABSPATH')) { exit; }

function pvc_contact_channels(): array {
    return array(
        'whatsapp' => 'WhatsApp',
        'telegram' => 'Telegram',
        'phone' => 'Teléfono',
        'email' => 'Correo electrónico',
        'form' => 'Formulario HTTPS',
        'report' => 'Canal de reporte',
    );
}
function pvc_contact_defaults(): array {
    $channels = array();
    foreach (array_keys(pvc_contact_channels()) as $channel) { $channels[$channel] = array('url' => '', 'enabled' => false); }
    return array('approved' => false, 'approved_at_utc' => '', 'channels' => $channels);
}
function pvc_contact_settings(): array {
    $saved = (array) get_option('pvc_contact_settings', array());
    $settings = array_replace_recursive(pvc_contact_defaults(), $saved);
    $settings['channels'] = array_intersect_key((array) $settings['channels'], pvc_contact_channels()) + pvc_contact_defaults()['channels'];
    return $settings;
}
/** Branded hosts are pinned so an approved channel cannot point at an unrelated domain. */
function pvc_contact_branded_hosts(): array {
    return array('whatsapp' => array('wa.me', 'api.whatsapp.com'), 'telegram' => array('t.me', 'telegram.me'));
}
function pvc_contact_normalize(string $channel, $value): string {
    $candidate = trim((string) $value);
    if ($candidate === '') { return ''; }
    // The reporting channel accepts either an email address or an HTTPS form/page.
    if ($channel === 'report') {
        $mail = pvc_contact_normalize('email', $candidate);
        if ($mail !== '') { return $mail; }
    }
    if ($channel === 'phone') { return preg_match('/^tel:\+?[0-9][0-9(). -]{5,24}$/u', $candidate) ? $candidate : ''; }
    if ($channel === 'email') { return preg_match('/^mailto:[^\s@?]+@[^\s@?]+\.[^\s@?]+$/u', $candidate) ? $candidate : ''; }
    $parts = wp_parse_url($candidate);
    if (!is_array($parts) || ($parts['scheme'] ?? '') !== 'https' || isset($parts['user']) || isset($parts['pass']) || isset($parts['fragment'])) { return ''; }
    $host = strtolower((string) ($parts['host'] ?? ''));
    if ($host === '') { return ''; }
    $branded = pvc_contact_branded_hosts()[$channel] ?? null;
    if ($branded !== null && (!in_array($host, $branded, true) || in_array(($parts['path'] ?? ''), array('', '/'), true))) { return ''; }
    return $candidate;
}
/** Fail-closed gates: explicit approval plus a complete and approved legal identification. */
function pvc_contact_gate(): array {
    $settings = pvc_contact_settings();
    $approved = !empty($settings['approved']);
    $legal = function_exists('pvc_legal_ready') ? pvc_legal_ready() : false;
    return array('approved' => $approved, 'legal' => $legal, 'ok' => $approved && $legal);
}
function pvc_contact_resolved(): array {
    $settings = pvc_contact_settings(); $resolved = array();
    foreach (array_keys(pvc_contact_channels()) as $channel) {
        $row = (array) ($settings['channels'][$channel] ?? array());
        $url = pvc_contact_normalize($channel, $row['url'] ?? '');
        $resolved[$channel] = array('enabled' => !empty($row['enabled']), 'url' => $url, 'valid' => $url !== '');
    }
    return $resolved;
}
/**
 * Only these become links in the public template.
 *
 * The reporting channel does not depend on the LSSI intake: it reports content used
 * without permission, impersonation, minors, exploitation or data-protection breaches,
 * and it must stay reachable without adult content and before any age barrier. It still
 * requires the explicit approval, so an unreviewed destination is never published.
 */
function pvc_contact_active(): array {
    $gate = pvc_contact_gate(); $active = array();
    foreach (pvc_contact_resolved() as $channel => $row) {
        if (!$row['enabled'] || !$row['valid']) { continue; }
        if ($channel === 'report') { if ($gate['approved']) { $active[$channel] = $row; } continue; }
        if ($gate['ok']) { $active[$channel] = $row; }
    }
    return $active;
}
/** Everything that still blocks the buttons, for the admin screen. */
function pvc_contact_blockers(): array {
    $gate = pvc_contact_gate(); $resolved = pvc_contact_resolved(); $blockers = array();
    if (!$gate['approved']) { $blockers[] = 'La aprobación de los canales de contacto no está marcada.'; }
    if (!$gate['legal']) { $blockers[] = 'La identificación del prestador no está completa y aprobada (LSSI art. 10). El canal de reporte queda exento de este requisito.'; }
    foreach ($resolved as $channel => $row) {
        if (empty($row['url'])) { $blockers[] = 'Falta un destino válido para ' . pvc_contact_channels()[$channel] . '.'; }
    }
    return $blockers;
}
function pvc_contact_sanitize($input): array {
    $input = is_array($input) ? $input : array();
    $settings = array('approved' => !empty($input['approved']), 'approved_at_utc' => '', 'channels' => array());
    foreach (array_keys(pvc_contact_channels()) as $channel) {
        // An invalid destination is stored empty instead of silently accepted.
        $settings['channels'][$channel] = array('url' => pvc_contact_normalize($channel, $input['channels'][$channel]['url'] ?? ''), 'enabled' => !empty($input['channels'][$channel]['enabled']));
    }
    $settings['approved_at_utc'] = $settings['approved'] ? gmdate('c') : '';
    return $settings;
}

add_action('admin_post_pvc_save_contact', function() {
    if (!current_user_can('manage_options')) { wp_die('No tienes permisos para editar estos ajustes.', '', array('response' => 403)); }
    check_admin_referer('pvc_contact', 'pvc_contact_nonce');
    update_option('pvc_contact_settings', pvc_contact_sanitize(wp_unslash($_POST['pvc_contact'] ?? array())), false);
    wp_safe_redirect(add_query_arg(array('page' => 'pecadosvip-contact', 'saved' => 1), admin_url('admin.php'))); exit;
});

function pvc_contact_admin(): void {
    if (!current_user_can('manage_options')) { return; }
    $settings = pvc_contact_settings(); $blockers = pvc_contact_blockers(); $active = pvc_contact_active();
    $examples = array('whatsapp' => 'https://wa.me/34600000000', 'telegram' => 'https://t.me/usuario', 'phone' => 'tel:+34600000000', 'email' => 'mailto:contacto@dominio.example', 'form' => 'https://dominio.example/contacto');
    echo '<div class="wrap pvc-admin"><h1>Botones de contacto</h1>';
    echo '<p>Un canal solo se convierte en un botón activo cuando tiene un destino válido, la aprobación está marcada y la identificación del prestador está completa y aprobada. Mientras falte algo, la web muestra el control desactivado con un aviso y no abre ningún canal.</p>';
    if (isset($_GET['saved'])) { echo '<div class="notice notice-success inline"><p>Ajustes guardados.</p></div>'; }
    echo '<p><strong>Estado:</strong> ' . ($active ? 'activos: ' . esc_html(implode(', ', array_map(static fn($c) => pvc_contact_channels()[$c], array_keys($active)))) : 'ningún canal activo') . '.</p>';
    if ($blockers) { echo '<div class="notice notice-warning"><p><strong>Pendiente (' . count($blockers) . '):</strong></p><ul><li>' . implode('</li><li>', array_map('esc_html', $blockers)) . '</li></ul></div>'; }
    echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '"><input type="hidden" name="action" value="pvc_save_contact">';
    wp_nonce_field('pvc_contact', 'pvc_contact_nonce');
    echo '<table class="form-table" role="presentation"><tbody>';
    foreach (pvc_contact_channels() as $channel => $label) {
        $row = (array) $settings['channels'][$channel];
        $stored = (string) $row['url']; $valid = $stored === '' ? true : pvc_contact_normalize($channel, $stored) !== '';
        echo '<tr><th scope="row"><label for="pvc-contact-' . esc_attr($channel) . '">' . esc_html($label) . '</label></th><td>';
        echo '<label><input type="checkbox" name="pvc_contact[channels][' . esc_attr($channel) . '][enabled]" value="1" ' . checked(!empty($row['enabled']), true, false) . '> Activar este canal</label><br>';
        echo '<input type="text" class="large-text" id="pvc-contact-' . esc_attr($channel) . '" name="pvc_contact[channels][' . esc_attr($channel) . '][url]" value="' . esc_attr($stored) . '" placeholder="' . esc_attr($examples[$channel]) . '">';
        if (!$valid) { echo '<p class="description" style="color:#b32d2e">El destino no cumple el formato esperado y se guardará vacío. Ejemplo válido: ' . esc_html($examples[$channel]) . '</p>'; }
        else { echo '<p class="description">Formato admitido: ' . esc_html($examples[$channel]) . '. Déjalo vacío para mantener el canal desactivado.</p>'; }
        echo '</td></tr>';
    }
    echo '<tr><th scope="row">Aprobación</th><td><label><input type="checkbox" name="pvc_contact[approved]" value="1" ' . checked(!empty($settings['approved']), true, false) . '> Apruebo estos destinos de contacto.</label><p class="description">Aprobación registrada: ' . esc_html($settings['approved_at_utc'] !== '' ? $settings['approved_at_utc'] : 'sin aprobar') . '.</p></td></tr>';
    echo '</tbody></table>';
    submit_button('Guardar canales de contacto');
    echo '</form></div>';
}
