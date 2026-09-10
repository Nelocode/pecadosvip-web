<?php
/**
 * Public rendering of the contact buttons and the Spanish legal mechanics.
 *
 * Everything here is fail-closed: without an approved destination, a complete provider
 * identification and an approved intake, the template shows a notice instead of a link,
 * a form or invented legal text.
 */
if (!defined('ABSPATH')) { exit; }

/* ---------------------------------------------------------------- contact */

function pvwp_contact_label(string $channel): string {
    switch ($channel) {
        case 'whatsapp': return pvwp_text('contact.channels.whatsapp');
        case 'telegram': return pvwp_text('contact.channels.telegram');
        case 'phone': return pvwp_text('contact.channels.phone');
        case 'email': return pvwp_text('contact.channels.email');
        case 'form': return pvwp_text('contact.channels.form');
    }
    return $channel;
}
function pvwp_contact_active(): array {
    return function_exists('pvc_contact_active') ? pvc_contact_active() : array();
}
/** Renders the approved channels, or the disabled control while a gate is closed. */
function pvwp_contact_buttons(): void {
    $channels = pvwp_contact_active();
    if (!$channels) {
        echo '<aside class="pvn-notice pvn-contact-disabled" role="status"><h2>' . esc_html(pvwp_text('contact.disabledTitle')) . '</h2><p>' . esc_html(pvwp_text('contact.disabledBody')) . '</p><button class="pvn-button" type="button" disabled>' . esc_html(pvwp_text('contact.disabledButton')) . '</button></aside>';
        return;
    }
    echo '<div class="pvn-contact-buttons" role="group" aria-label="' . esc_attr(pvwp_text('contact.groupAria')) . '">';
    foreach ($channels as $channel => $row) {
        echo '<a class="pvn-button pvn-gold pvn-contact-' . esc_attr($channel) . '" href="' . esc_url($row['url']) . '">' . esc_html(pvwp_contact_label($channel)) . '</a>';
    }
    echo '</div><p class="pvn-muted pvn-contact-privacy">' . esc_html(pvwp_text('contact.privacyNote')) . '</p>';
}
function pvwp_contact_page(array $record): void { ?>
    <section class="pvn-section pvn-page-intro">
        <p class="pvn-eyebrow"><?php pvwp_label('contact.eyebrow'); ?></p>
        <h1><?php echo esc_html($record['title']); ?></h1>
        <p><?php echo esc_html(pvwp_text('contact.lead')); ?></p>
        <?php pvwp_rich($record); ?>
    </section>
    <section class="pvn-section pvn-contact-page" aria-labelledby="pvn-contact-channels">
        <h2 id="pvn-contact-channels"><?php pvwp_label('contact.title'); ?></h2>
        <?php pvwp_contact_buttons(); ?>
        <p class="pvn-muted"><?php pvwp_label('contact.responseNote'); ?></p>
    </section>
    <section class="pvn-section pvn-security" aria-labelledby="pvn-contact-safety">
        <h2 id="pvn-contact-safety"><?php pvwp_label('contact.safetyTitle'); ?></h2>
        <ul><?php foreach (array(pvwp_text('contact.safetyItem1'), pvwp_text('contact.safetyItem2'), pvwp_text('contact.safetyItem3')) as $item) { if ($item !== '') { echo '<li>' . esc_html($item) . '</li>'; } } ?></ul>
    </section>
    <?php pvwp_legal_report('contact'); ?>
<?php }

/* ------------------------------------------------------------------ legal */

function pvwp_legal_settings(): array {
    return function_exists('pvc_legal_settings') ? pvc_legal_settings() : array();
}
function pvwp_legal_ready(): bool {
    return function_exists('pvc_legal_ready') && pvc_legal_ready();
}
function pvwp_legal_provider_label(string $key): string {
    $map = array(
        'name' => 'legal.provider.name', 'tax_id' => 'legal.provider.taxId', 'address' => 'legal.provider.address',
        'email' => 'legal.provider.email', 'trade_name' => 'legal.provider.tradeName', 'phone' => 'legal.provider.phone',
        'registry' => 'legal.provider.registry', 'domain_owner' => 'legal.provider.domainOwner', 'approver' => 'legal.provider.approver',
    );
    return isset($map[$key]) ? pvwp_text($map[$key]) : $key;
}
function pvwp_legal_document_text(string $document, string $field): string {
    $map = array(
        'aviso-legal' => array('title' => 'legal.documents.aviso-legal.title', 'intro' => 'legal.documents.aviso-legal.intro'),
        'privacidad' => array('title' => 'legal.documents.privacidad.title', 'intro' => 'legal.documents.privacidad.intro'),
        'cookies' => array('title' => 'legal.documents.cookies.title', 'intro' => 'legal.documents.cookies.intro'),
        'terminos-del-servicio' => array('title' => 'legal.documents.terminos-del-servicio.title', 'intro' => 'legal.documents.terminos-del-servicio.intro'),
    );
    if (!isset($map[$document][$field])) { return ''; }
    return pvwp_text($map[$document][$field]);
}
/** LSSI art. 10 identification. Rendered only for a complete and approved intake. */
function pvwp_legal_identification(): void {
    if (!pvwp_legal_ready()) { return; }
    $provider = (array) (pvwp_legal_settings()['provider'] ?? array());
    $rows = array();
    foreach (array('name', 'trade_name', 'tax_id', 'address', 'email', 'phone', 'registry', 'domain_owner', 'approver') as $key) {
        $value = trim((string) ($provider[$key] ?? ''));
        if ($value !== '') { $rows[$key] = $value; }
    }
    if (!$rows) { return; }
    echo '<section class="pvn-legal-identification" aria-labelledby="pvn-legal-provider"><h2 id="pvn-legal-provider">' . esc_html(pvwp_text('legal.identificationTitle')) . '</h2><p>' . esc_html(pvwp_text('legal.identificationBody')) . '</p><dl>';
    foreach ($rows as $key => $value) { echo '<dt>' . esc_html(pvwp_legal_provider_label($key)) . '</dt><dd>' . esc_html($value) . '</dd>'; }
    echo '</dl></section>';
}
function pvwp_legal_metadata(): void {
    $settings = pvwp_legal_settings();
    $date = substr((string) ($settings['approved_at_utc'] ?? ''), 0, 10);
    echo '<p class="pvn-legal-meta">' . esc_html(pvwp_text('legal.versionLabel', array('version' => (string) ($settings['document_version'] ?? '1')))) . ' · ' . esc_html(pvwp_text('legal.updatedLabel', array('date' => $date !== '' ? $date : '—'))) . '</p>';
}
/** Privacy is published in layers: an editable summary, the full document and the rights. */
function pvwp_legal_layers(array $record): void { ?>
    <section class="pvn-legal-layers" aria-labelledby="pvn-legal-layers-title">
        <h2 id="pvn-legal-layers-title"><?php pvwp_label('legal.layersTitle'); ?></h2>
        <p><?php pvwp_label('legal.layersIntro'); ?></p>
        <details open><summary><?php pvwp_label('legal.layersSummary'); ?></summary><p><?php echo esc_html(trim((string) ($record['excerpt'] ?? '')) !== '' ? $record['excerpt'] : pvwp_text('legal.layersPending')); ?></p></details>
        <details><summary><?php pvwp_label('legal.layersDetail'); ?></summary><?php if (trim((string) ($record['content'] ?? '')) !== '') { pvwp_rich($record); } else { echo '<p>' . esc_html(pvwp_text('legal.layersPending')) . '</p>'; } ?></details>
        <details><summary><?php pvwp_label('legal.layersRights'); ?></summary><p><?php pvwp_label('legal.layersRightsBody'); ?></p></details>
    </section>
<?php }
function pvwp_legal_cookies(): void {
    $settings = pvwp_legal_settings();
    $inventory = (array) ($settings['cookies']['inventory'] ?? array());
    $analytics = (array) ($settings['cookies']['analytics'] ?? array());
    $ready = pvwp_legal_ready();
    $columns = array(pvwp_text('legal.cookies.column1'), pvwp_text('legal.cookies.column2'), pvwp_text('legal.cookies.column3'), pvwp_text('legal.cookies.column4'), pvwp_text('legal.cookies.column5'));
    $categories = (array) pvwp_value('legal.cookies.categories', array());
    ?>
    <section class="pvn-legal-cookies" aria-labelledby="pvn-legal-cookies-title">
        <h2 id="pvn-legal-cookies-title"><?php pvwp_label('legal.cookies.title'); ?></h2>
        <p><?php pvwp_label('legal.cookies.intro'); ?></p>
        <?php if (!$ready) { ?>
            <p class="pvn-muted"><?php pvwp_label('legal.cookies.inventoryPending'); ?></p>
        <?php } elseif (pvc_legal_non_essential() && array_filter($columns)) { ?>
            <h3><?php pvwp_label('legal.cookies.inventoryTitle'); ?></h3>
            <table class="pvn-cookie-table"><caption class="screen-reader-text"><?php pvwp_label('legal.cookies.inventoryTitle'); ?></caption><thead><tr><?php foreach ($columns as $column) { echo '<th scope="col">' . esc_html((string) $column) . '</th>'; } ?></tr></thead><tbody>
            <?php foreach ($inventory as $row) { ?>
                <tr><td><?php echo esc_html((string) ($row['name'] ?? '')); ?></td><td><?php echo esc_html((string) ($row['provider'] ?? '')); ?></td><td><?php echo esc_html((string) ($row['purpose'] ?? '')); ?></td><td><?php echo esc_html((string) ($row['duration'] ?? '')); ?></td><td><?php echo esc_html((string) ($categories[$row['category'] ?? 'essential'] ?? $row['category'] ?? '')); ?></td></tr>
            <?php } ?>
            </tbody></table>
        <?php } else { ?>
            <p><?php pvwp_label('legal.cookies.none'); ?></p>
        <?php } ?>
        <h3><?php pvwp_label('legal.cookies.analyticsTitle'); ?></h3>
        <?php if (empty($analytics['enabled'])) { ?>
            <p><?php pvwp_label('legal.cookies.analyticsNone'); ?></p>
        <?php } else { ?>
            <p><?php echo esc_html(pvwp_text('legal.cookies.analyticsInfo', array('provider' => (string) $analytics['provider'], 'retention' => (string) $analytics['retention'], 'region' => (string) $analytics['region']))); ?></p>
        <?php } ?>
        <p><button class="pvn-button" type="button" data-pvn-cookie-revoke><?php pvwp_label('legal.cookies.revoke'); ?></button> <span data-pvn-cookie-status role="status" aria-live="polite" data-message-revoked="<?php echo esc_attr(pvwp_text('legal.cookies.revoked')); ?>" data-message-review="<?php echo esc_attr(pvwp_text('legal.cookies.reviewNeeded')); ?>"></span></p>
    </section>
    <?php
}
function pvwp_legal_document(array $record): void {
    $document = (string) $record['key'];
    $title = pvwp_legal_document_text($document, 'title') ?: (string) $record['title'];
    $intro = pvwp_legal_document_text($document, 'intro');
    $ready = pvwp_legal_ready();
    $missing = function_exists('pvc_legal_missing') ? pvc_legal_missing() : array();
    ?>
    <article class="pvn-section pvn-editorial-page pvn-legal">
        <p class="pvn-eyebrow"><?php pvwp_label('legal.eyebrow'); ?></p>
        <h1><?php echo esc_html($title); ?></h1>
        <?php if ($intro !== '') { echo '<p class="pvn-lead">' . esc_html($intro) . '</p>'; } ?>
        <?php pvwp_legal_metadata(); ?>
        <?php if (!$ready) { ?>
            <aside class="pvn-notice pvn-legal-pending" role="status">
                <h2><?php pvwp_label('legal.pendingTitle'); ?></h2>
                <p><?php pvwp_label('legal.pendingBody'); ?></p>
                <?php if ($missing && current_user_can('edit_posts')) { ?>
                    <p><?php pvwp_label('legal.pendingMissing', array('count' => count($missing))); ?></p>
                    <ul><?php foreach ($missing as $item) { echo '<li>' . esc_html((string) $item) . '</li>'; } ?></ul>
                <?php } ?>
            </aside>
        <?php } ?>
        <?php if ($document === 'privacidad') { pvwp_legal_layers($record); } else { pvwp_rich($record); } ?>
        <?php if ($document === 'cookies') { pvwp_legal_cookies(); } ?>
        <?php if ($document === 'aviso-legal') { pvwp_legal_identification(); } ?>
    </article>
    <?php
}

/* --------------------------------------------------- reporting and cookies */

/**
 * Reporting channel. It communicates content used without permission, impersonation,
 * minors, exploitation or data-protection issues, and it must stay reachable without
 * adult content and before any age barrier.
 *
 * With `$onlyWhenActive` the block is omitted instead of announcing that the channel is
 * still pending, so the public footer only shows a real, attended destination.
 */
function pvwp_legal_report(string $variant = 'section', bool $onlyWhenActive = false): void {
    $active = pvwp_contact_active();
    $report = $active['report'] ?? null;
    if ($onlyWhenActive && !$report) { return; }
    $heading = $variant === 'shell' ? 'h2' : 'h3';
    $title_id = 'pvn-report-title-' . $variant;
    echo '<section class="pvn-legal-report" aria-labelledby="' . esc_attr($title_id) . '"><' . $heading . ' id="' . esc_attr($title_id) . '">' . esc_html(pvwp_text('legal.report.title')) . '</' . $heading . '>';
    echo '<p>' . esc_html(pvwp_text('legal.report.body')) . '</p>';
    if ($report) { echo '<p><a class="pvn-button" href="' . esc_url($report['url']) . '">' . esc_html(pvwp_contact_label('report')) . '</a></p>'; }
    else { echo '<p class="pvn-muted">' . esc_html(pvwp_text('legal.report.pending')) . '</p>'; }
    echo '<p class="pvn-muted">' . esc_html(pvwp_text('legal.report.notice')) . '</p></section>';
}

/**
 * Cookie notice. It is never fictional: it only appears when the inventory really
 * contains a non-essential cookie and the legal intake is approved. No non-essential
 * resource is loaded from this file.
 */
function pvwp_cookie_notice(): void {
    if (!function_exists('pvc_legal_cookie_consent_required') || !pvc_legal_cookie_consent_required()) { return; }
    $settings = pvwp_legal_settings();
    $categories = (array) pvwp_value('legal.cookies.categories', array());
    $used = array();
    foreach ((array) pvc_legal_non_essential() as $row) { $used[(string) ($row['category'] ?? '')] = true; }
    $selectable = array_intersect_key($categories, $used);
    $policy_version = (string) ($settings['cookies']['policy_version'] ?? '1');
    ?>
    <section class="pvn-cookie-banner" role="dialog" aria-modal="false" aria-labelledby="pvn-cookie-title" data-pvn-cookie-banner data-policy-version="<?php echo esc_attr($policy_version); ?>" data-storage-key="pvn-cookie-consent" hidden>
        <h2 id="pvn-cookie-title"><?php pvwp_label('legal.cookies.title'); ?></h2>
        <p><?php pvwp_label('legal.cookies.intro'); ?></p>
        <div class="pvn-cookie-categories" data-pvn-cookie-categories hidden>
            <label><input type="checkbox" value="essential" checked disabled> <?php echo esc_html((string) ($categories['essential'] ?? 'essential')); ?></label>
            <?php foreach ($selectable as $key => $label) { ?>
                <label><input type="checkbox" value="<?php echo esc_attr((string) $key); ?>" data-pvn-cookie-category> <?php echo esc_html((string) $label); ?></label>
            <?php } ?>
        </div>
        <div class="pvn-cookie-actions">
            <button class="pvn-button pvn-gold" type="button" data-pvn-cookie-accept><?php pvwp_label('legal.cookies.accept'); ?></button>
            <button class="pvn-button" type="button" data-pvn-cookie-reject><?php pvwp_label('legal.cookies.reject'); ?></button>
            <button class="pvn-button" type="button" data-pvn-cookie-configure><?php pvwp_label('legal.cookies.configure'); ?></button>
            <button class="pvn-button pvn-gold" type="button" data-pvn-cookie-save hidden><?php pvwp_label('legal.cookies.save'); ?></button>
        </div>
        <p class="pvn-muted" data-pvn-cookie-status role="status" aria-live="polite" data-message-revoked="<?php echo esc_attr(pvwp_text('legal.cookies.revoked')); ?>" data-message-review="<?php echo esc_attr(pvwp_text('legal.cookies.reviewNeeded')); ?>"></p>
    </section>
    <?php
}
function pvwp_legal_gate(): void {
    pvwp_cookie_notice();
}
