import assert from 'node:assert/strict';
import { auditEditableCopy } from '../verify-copy-coverage.mjs';

// Synthetic, neutral fixtures. No WordPress installation, real records, build,
// network, translation provider or mutation of dist/ is needed for these tests.
const localeNames = ['es', 'en', 'fr', 'it'];
const availability = { available: 'A', limited: 'L', 'on-request': 'R', unavailable: 'U' };
const template = {
  languageName: 'Language', navigation: { home: 'Home', contact: 'Contact' },
  filters: { availability }, profile: { availability, title: 'Title' },
  services: { groups: { first: { label: 'First' }, second: { label: 'Second' } }, faqs: [{ question: 'Question', answer: 'Answer' }], hub: { resultSingular: 'One', resultPlural: 'Many' } },
  contact: { channels: { email: 'Email', report: 'Report' } },
  legal: { provider: { name: 'Name', taxId: 'ID' }, documents: { cookies: { title: 'Title', intro: 'Intro' } }, cookies: { categories: { essential: 'Essential', analytics: 'Analytics' } } },
  trustSignals: [{ code: 'A', title: 'Title', detail: 'Detail' }], security: { items: ['One'] }, nativeUi: { play: 'Play', pause: 'Pause' },
};
const fixture = () => ({
  copy: Object.fromEntries(localeNames.map((locale) => [locale, structuredClone(template)])),
  records: [{ type: 'service', data: { group: 'first' } }, { type: 'profile', data: { availability: 'available' } }],
  phpSources: {
    'theme/functions.php': "<?php $allowed = array('availability' => array('available', 'limited', 'on-request', 'unavailable'));",
    'theme/render.php': `<?php
function pvwp_value(string $path) { return ''; }
function pvwp_text(string $path) { return pvwp_value($path); }
function pvwp_label(string $path) { echo pvwp_text($path); }
function pvwp_group_label(string $group) { return pvwp_text('services.groups.' . $group . '.label'); }
function pvwp_profile_card($data) { pvwp_label('filters.availability.' . ($data['availability'] ?? 'on-request')); }
function pvwp_profile($data) { pvwp_label('profile.availability.' . ($data['availability'] ?? 'on-request')); pvwp_text ("profile.title"); }
function pvwp_nav_links() { $links = array(array('', 'navigation.home'), array('contact', 'navigation.contact')); pvwp_text($key); }
function pvwp_header() { $copy = pvc_copy($locale); echo $copy['languageName']; }
function pvwp_lists() { pvwp_value('trustSignals', array()); pvwp_value('services.faqs', array()); pvwp_value('security.items', array()); }
`,
    'theme/contact-legal.php': `<?php
function pvwp_contact_label($channel) { switch ($channel) { case 'email': return pvwp_text('contact.channels.email'); } return $channel; }
function pvwp_legal_provider_label($key) { $map = array('name' => 'legal.provider.name', 'tax_id' => 'legal.provider.taxId'); return pvwp_text($map[$key]); }
function pvwp_legal_document_text($document, $field) { $map = array('cookies' => array('title' => 'legal.documents.cookies.title', 'intro' => 'legal.documents.cookies.intro')); return pvwp_text($map[$document][$field]); }
function pvwp_cookie_notice() { pvwp_value('legal.cookies.categories'); }
function pvwp_legal_report() { pvwp_contact_label('report'); }
`,
  },
  javascriptSources: { 'theme/frontend.js': 'result.textContent = count === 1 ? hub.resultSingular : hub.resultPlural; toggle.textContent = playing ? ui.pause : ui?.play;' },
  pluginSources: {
    main: "<?php function pvc_fields() { return array('availability' => array('label' => 'Availability', 'type' => 'string', 'enum' => array('available', 'limited', 'on-request', 'unavailable'))); }",
    contact: "<?php function pvc_contact_channels() { return array('email' => 'Email', 'report' => 'Report'); }",
    legal: "<?php function pvc_legal_cookie_categories() { return array('essential' => 'Essential', 'analytics' => 'Analytics'); } function pvc_legal_provider_fields() { return array('name' => array('label' => 'Name'), 'tax_id' => array('label' => 'ID')); }",
  },
});
let checks = 0;
const test = (name, callback) => { callback(); checks++; console.log(`PASS ${name}`); };
const missing = (input, key, locale) => assert.ok(auditEditableCopy(input).problems.some((problem) => problem.key === key && problem.locales.includes(locale)), `${locale}:${key} was not detected`);
const remove = (copy, key) => { const parts = key.split('.'); const leaf = parts.pop(); delete parts.reduce((value, part) => value[part], copy)[leaf]; };

test('complete synthetic copy covers all four locales and maps', () => {
  const result = auditEditableCopy(fixture());
  assert.deepEqual(result.problems, []);
  assert.equal(result.dynamicCalls, 6);
  assert.ok(result.paths.every((path) => path.uses.length > 0));
});
for (const locale of localeNames) {
  test(`availability missing only in ${locale}`, () => {
    const input = fixture(); delete input.copy[locale].filters.availability.limited;
    const issue = auditEditableCopy(input).problems.find((problem) => problem.key === 'filters.availability.limited');
    assert.deepEqual(issue.locales, [locale]); assert.ok(issue.uses[0].includes('render.php:'));
  });
}
for (const key of ['profile.availability.unavailable', 'services.groups.second.label', 'navigation.contact', 'contact.channels.report', 'legal.provider.taxId', 'legal.documents.cookies.intro', 'legal.cookies.categories.analytics', 'trustSignals.0.detail', 'services.faqs.0.answer', 'security.items.0', 'languageName', 'services.hub.resultPlural', 'nativeUi.pause', 'nativeUi.play', 'profile.title']) {
  test(`missing indirect/literal key ${key}`, () => {
    const input = fixture(); remove(input.copy.fr, key); missing(input, key, 'fr');
  });
}
test('availability enum detects a key absent in every locale', () => {
  const input = fixture(); for (const locale of localeNames) delete input.copy[locale].filters.availability.unavailable;
  assert.deepEqual(auditEditableCopy(input).problems.find((problem) => problem.key === 'filters.availability.unavailable').locales, localeNames);
});
test('seed record group detects a label absent in every locale', () => {
  const input = fixture(); input.records.push({ type: 'service', data: { group: 'third' } });
  assert.deepEqual(auditEditableCopy(input).problems.find((problem) => problem.key === 'services.groups.third.label').locales, localeNames);
});
test('a plugin enum addition is checked without a router or seed value', () => {
  const input = fixture(); input.pluginSources.main = input.pluginSources.main.replace("'unavailable'", "'unavailable', 'new-status'");
  missing(input, 'filters.availability.new-status', 'es'); missing(input, 'profile.availability.new-status', 'it');
});
test('a provider schema addition requires a reviewed copy mapping', () => {
  const input = fixture(); input.pluginSources.legal = input.pluginSources.legal.replace("'tax_id' => array", "'new_field' => array");
  assert.ok(auditEditableCopy(input).problems.some((problem) => problem.key === '<unmapped provider field: new_field>'));
});
test('a copy group hidden by the plugin whitelist cannot pass', () => {
  const input = fixture(); input.pluginSources.main += " $public_groups = array('navigation');";
  assert.ok(auditEditableCopy(input).problems.some((problem) => problem.key === 'contact.channels.report' && problem.reason === 'group filtered out by pvc_copy'));
});
test('a branch added only in Italian is checked in all locales', () => {
  const input = fixture(); input.copy.it.services.groups.third = { label: 'Third' };
  assert.deepEqual(auditEditableCopy(input).problems.find((problem) => problem.key === 'services.groups.third.label').locales, ['es', 'en', 'fr']);
});
test('contact schema detects a channel absent in every locale', () => {
  const input = fixture(); for (const locale of localeNames) delete input.copy[locale].contact.channels.report;
  missing(input, 'contact.channels.report', 'es');
});
test('blank and non-string labels cannot silently pass', () => {
  const input = fixture(); input.copy.es.legal.provider.name = '  '; input.copy.en.legal.provider.name = {};
  assert.deepEqual(auditEditableCopy(input).problems.find((problem) => problem.key === 'legal.provider.name').locales, ['es', 'en']);
});
test('an empty list is detected even when all locales lost it', () => {
  const input = fixture(); for (const locale of localeNames) input.copy[locale].services.faqs = [];
  missing(input, 'services.faqs', 'fr');
});
test('a new dynamic PHP expression requires review', () => {
  const input = fixture(); input.phpSources['theme/new.php'] = "<?php function pvwp_new() { pvwp_text('new.' . $key); }";
  assert.ok(auditEditableCopy(input).problems.some((problem) => problem.key === '<unreviewed dynamic lookup>' && problem.uses[0] === 'theme/new.php:1'));
});
test('a new JS bracket lookup requires review', () => {
  const input = fixture(); input.javascriptSources['theme/new.js'] = 'node.textContent = ui[key];';
  assert.ok(auditEditableCopy(input).problems.some((problem) => problem.key === '<unreviewed JS copy lookup>'));
});
test('unmapped report dispatch is a warning, not missing seed copy', () => {
  const result = auditEditableCopy(fixture()); assert.deepEqual(result.problems, []);
  assert.deepEqual(result.warnings.map((warning) => warning.key), ['contact.channels.report']);
});
console.log(JSON.stringify({ result: 'PASS', tests: checks, locales: localeNames, network: false, runtimeWordPress: false }));
