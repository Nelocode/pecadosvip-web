<?php
/**
 * The contact button is the visible end of the whole contact intake. A visitor sees either a
 * real link or a disabled control, and which one appears is decided by gates that live in the
 * plugin, so this suite renders the template with the gates in both positions: what is
 * asserted is the screen the visitor gets, not only the data behind it.
 */
define('ABSPATH', __DIR__);
$checks = 0;
function check($ok, $m) { ++$GLOBALS['checks']; if (!$ok) { throw new \RuntimeException($m); } }

// The template only needs these to render; anything else it defines is used elsewhere.
function add_action($hook, $callback = null, $priority = 10) {}
function add_filter($hook, $callback = null, $priority = 10, $args = 1) {}
function esc_html($value) { return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function esc_attr($value) { return esc_html($value); }
function esc_url($value) { return esc_html($value); }

$GLOBALS['pvqa_copy'] = array(
    'contact.disabledTitle' => 'Canales desactivados',
    'contact.disabledBody' => 'Pendiente de aprobación.',
    'contact.disabledButton' => 'No disponible',
    'contact.groupAria' => 'Canales de contacto',
    'contact.privacyNote' => 'No compartas datos sin un canal aprobado.',
    'contact.channels.whatsapp' => 'WhatsApp',
    'contact.channels.telegram' => 'Telegram',
    'contact.channels.phone' => 'Llamar',
    'contact.channels.email' => 'Escribir un correo',
    'contact.channels.form' => 'Formulario de contacto',
    'contact.channels.report' => 'Reportar contenido',
);
function pvwp_text(string $path, array $vars = array()): string {
    $value = $GLOBALS['pvqa_copy'][$path] ?? null;
    return is_scalar($value) ? (string) $value : '';
}
/** Stands in for the plugin gate: the template asks this for the channels it may publish. */
$GLOBALS['pvqa_active'] = array();
function pvc_contact_active(): array { return $GLOBALS['pvqa_active']; }

require __DIR__ . '/../theme/pecadosvip/inc/contact-legal.php';

function render_buttons(): string { ob_start(); pvwp_contact_buttons(); return (string) ob_get_clean(); }

/* 1. A closed gate shows a disabled control, never a link. */
$html = render_buttons();
check(str_contains($html, 'pvn-contact-disabled'), 'A closed gate renders the disabled control');
check(str_contains($html, 'Canales desactivados'), 'The closed control carries the notice title');
check(str_contains($html, 'disabled'), 'The closed control cannot be activated');
check(!str_contains($html, 'pvn-contact-buttons'), 'A closed gate renders no button group');
check(!str_contains($html, '<a '), 'A closed gate renders no link at all');
check(!str_contains($html, 'href'), 'A closed gate exposes no destination');

/* 2. An approved channel becomes a real link with its translated label. */
$GLOBALS['pvqa_active'] = array(
    'whatsapp' => array('enabled' => true, 'url' => 'https://wa.me/34600111222', 'valid' => true),
    'report' => array('enabled' => true, 'url' => 'mailto:abuse@pecadosvip.com', 'valid' => true),
);
$html = render_buttons();
check(str_contains($html, 'pvn-contact-buttons'), 'An approved channel renders the button group');
check(str_contains($html, 'role="group" aria-label="Canales de contacto"'), 'The group is announced for assistive technology');
check(str_contains($html, '<a class="pvn-button pvn-gold pvn-contact-whatsapp" href="https://wa.me/34600111222">WhatsApp</a>'), 'WhatsApp renders as a link with its label');
check(str_contains($html, '<a class="pvn-button pvn-gold pvn-contact-report" href="mailto:abuse@pecadosvip.com">Reportar contenido</a>'), 'The reporting channel renders its translated label, not its slug');
check(!str_contains($html, '>report<'), 'The raw channel slug is never the visible label');
check(str_contains($html, 'pvn-contact-privacy'), 'The privacy note accompanies the buttons');
check(!str_contains($html, 'pvn-contact-disabled'), 'An open gate shows no disabled control');

/* 3. Every channel the plugin offers has an editable label, read from the plugin itself so a
      channel added there cannot quietly render its slug on the site. */
$plugin = (string) file_get_contents(__DIR__ . '/../plugin/pecadosvip-content/includes/contact.php');
preg_match('/function pvc_contact_channels\(\): array \{\s*return array\((.*?)\);/s', $plugin, $match);
preg_match_all("/'([a-z-]+)' =>/", $match[1] ?? '', $found);
$channels = $found[1] ?? array();
check(count($channels) >= 5, 'The channel list is readable from the plugin');
check(in_array('report', $channels, true), 'The reporting channel is part of the list');
foreach ($channels as $channel) {
    check(pvwp_contact_label($channel) === $GLOBALS['pvqa_copy']['contact.channels.' . $channel], 'The label of ' . $channel . ' comes from the editable copy');
}

/* 4. The destination is escaped before it reaches the attribute. */
$GLOBALS['pvqa_active'] = array('whatsapp' => array('enabled' => true, 'url' => 'https://wa.me/34"onmouseover="x', 'valid' => true));
check(!str_contains(render_buttons(), '"onmouseover="x'), 'A quote in the destination cannot leave the attribute');

echo json_encode(array('ok' => true, 'assertions' => $checks), JSON_PRETTY_PRINT) . PHP_EOL;
