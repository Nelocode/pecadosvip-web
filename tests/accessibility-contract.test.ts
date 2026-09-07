import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const appDirectory = new URL('../app/', import.meta.url);

function readAppFile(path: string): string {
  return readFileSync(new URL(path, appDirectory), 'utf8');
}

function listTsxFiles(directory: URL): URL[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) return listTsxFiles(url);
    return entry.name.endsWith('.tsx') ? [url] : [];
  });
}

function hexLuminance(hex: string): number {
  const channels = hex
    .replace('#', '')
    .match(/.{2}/g)
    ?.map((value) => Number.parseInt(value, 16) / 255);
  assert.ok(channels && channels.length === 3, `Invalid hex color: ${hex}`);

  const linear = channels.map((channel) =>
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground: string, background: string): number {
  const first = hexLuminance(foreground);
  const second = hexLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function cssHexProperty(source: string, property: string): string {
  const match = source.match(new RegExp(`${property}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(match, `Missing CSS property ${property}`);
  return match[1];
}

test('document language and keyboard bypass target stay explicit', () => {
  const layout = readAppFile('(legacy)/layout.tsx');
  const localizedLayout = readAppFile('[locale]/layout.tsx');
  const localizedNotFound = readAppFile('[locale]/not-found.tsx');

  assert.match(layout, /<html lang="es">/);
  assert.match(layout, /className="skip-link" href="#main-content"/);
  assert.match(localizedLayout, /<html lang=\{locale\}>/);
  assert.match(localizedLayout, /className="skip-link" href="#main-content"/);
  assert.match(
    localizedNotFound,
    /<main className="release-holding" id="main-content" tabIndex=\{-1\}>/,
  );
  assert.match(localizedNotFound, /<h1>\{messages\.title\}<\/h1>/);
  assert.match(localizedNotFound, /href=\{localizedPath\(locale\)\}/);

  for (const file of listTsxFiles(appDirectory)) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /autoFocus/);
    assert.doesNotMatch(source, /tabIndex=\{(?:[1-9]|-[2-9])\d*\}/);
  }
});

test('site header and footer remain outside the main landmark', () => {
  const routes = [
    '(legacy)/contacto/page.tsx',
    '(legacy)/perfiles/page.tsx',
    '(legacy)/perfiles/[slug]/page.tsx',
    '(legacy)/legal/[document]/page.tsx',
    'components/CityLanding.tsx',
  ];

  for (const route of routes) {
    const source = readAppFile(route);
    const header = source.indexOf('<PublicHeader');
    const main = source.indexOf('<main id="main-content" tabIndex={-1}>');
    const mainEnd = source.lastIndexOf('</main>');
    const footer = source.lastIndexOf('<PublicFooter');

    assert.ok(header >= 0, `${route} has a site header`);
    assert.ok(main > header, `${route} places main after the site header`);
    assert.ok(mainEnd > main, `${route} closes the main landmark`);
    assert.ok(footer > mainEnd, `${route} places the site footer after main`);
  }

  const syntheticHome = readAppFile('(legacy)/preview-local-sintetico/page.tsx');
  const syntheticHeader = syntheticHome.indexOf('<header ');
  const syntheticMain = syntheticHome.indexOf('<main id="main-content" tabIndex={-1}>');
  const syntheticMainEnd = syntheticHome.lastIndexOf('</main>');
  const syntheticFooter = syntheticHome.lastIndexOf('<footer ');

  assert.ok(syntheticHeader >= 0, 'shared synthetic home has a site header');
  assert.ok(syntheticMain > syntheticHeader, 'shared synthetic home places main after header');
  assert.ok(syntheticMainEnd > syntheticMain, 'shared synthetic home closes the main landmark');
  assert.ok(syntheticFooter > syntheticMainEnd, 'shared synthetic home places footer after main');
});

test('navigation and profile cards expose current location and unique link purpose', () => {
  const header = readAppFile('components/PublicHeader.tsx');
  const card = readAppFile('components/ProfileCard.tsx');

  assert.match(header, /<header className="public-header">/);
  assert.match(header, /aria-label=\{messages\.primaryAria\}/);
  assert.match(header, /aria-current=\{current \? 'page' : undefined\}/);
  assert.match(card, /aria-labelledby=\{headingId\}/);
  assert.match(card, /messages\.card\.viewProfileAria/);
  assert.match(card, /<span className="visually-hidden">\{messages\.card\.statusPrefix\}/);
});

test('catalog filters are grouped, instructed and explicitly labelled', () => {
  const profiles = readAppFile('(legacy)/perfiles/page.tsx');

  assert.match(profiles, /<fieldset>/);
  assert.match(profiles, /<legend>Filtros del catálogo<\/legend>/);
  assert.match(profiles, /id="profile-filter-help"/);
  assert.match(profiles, /htmlFor="profile-city"/);
  assert.match(profiles, /htmlFor="profile-availability"/);
  assert.match(profiles, /htmlFor="profile-min-age"/);
  assert.match(profiles, /htmlFor="profile-max-age"/);
  assert.equal((profiles.match(/aria-describedby="profile-filter-help"/g) ?? []).length, 2);
  assert.equal((profiles.match(/min="18"/g) ?? []).length, 2);
  assert.equal((profiles.match(/max="99"/g) ?? []).length, 2);
  assert.match(profiles, /result\.total === 1 \? 'perfil' : 'perfiles'/);
  assert.match(profiles, /No hay perfiles para estos filtros\./);
  assert.doesNotMatch(profiles, /className="catalog-results" aria-live=/);
});

test('contact choices are a named list and unavailable entries are plain status text', () => {
  const contact = readAppFile('components/ContactOptions.tsx');

  assert.match(contact, /aria-labelledby="contact-options-title"/);
  assert.match(contact, /<ul className="public-channel-grid">/);
  assert.match(contact, /<li key=\{option\.key\}>/);
  assert.match(contact, /<span className="visually-hidden">: \{messages\.unavailableSuffix\}<\/span>/);
  assert.doesNotMatch(contact, /aria-disabled=/);
  assert.match(contact, /acceptCharset="UTF-8"/);
  assert.match(contact, /method="post"/);
  assert.match(contact, /htmlFor="contact-name"/);
  assert.match(contact, /htmlFor="contact-reply"/);
  assert.match(contact, /name="replyTo"[\s\S]*type="email"/);
  assert.match(contact, /htmlFor="contact-city"/);
  assert.match(contact, /htmlFor="contact-message"/);
  assert.match(contact, /aria-describedby="contact-privacy-note"/);
});

test('profile media supports videos and mobile image variants without cropping faces by default', () => {
  const media = readAppFile('components/PublicProfileMedia.tsx');
  const card = readAppFile('components/ProfileCard.tsx');

  assert.match(media, /media\.kind === 'video'/);
  assert.match(media, /<video/);
  assert.match(media, /media="\(max-width: 780px\)"/);
  assert.match(media, /srcSet=\{media\.mobileUrl\}/);
  assert.match(media, /objectPosition: 'center top'/);
  assert.match(card, /preserveFullImage = true/);
});

test('city sections, disclosure controls and profile data have accessible names', () => {
  const city = readAppFile('components/CityLanding.tsx');
  const profile = readAppFile('(legacy)/perfiles/[slug]/page.tsx');

  for (const id of [
    'service-title',
    'areas-title',
    'process-title',
    'discretion-title',
    'faq-title',
    'city-contact-title',
  ]) {
    assert.match(city, new RegExp(`aria-labelledby="${id}"`));
    assert.match(city, new RegExp(`id="${id}"`));
  }
  assert.match(city, /<details key=\{faq\.question\}/);
  assert.match(city, /<summary>/);
  assert.match(profile, /aria-label=\{`Galería de \$\{profile\.displayName\}`\}/);
  assert.match(profile, /heightCm: \{ label: 'Altura', unit: 'cm' \}/);
  assert.match(profile, /weightKg: \{ label: 'Peso', unit: 'kg' \}/);
});

test('focus, target-size, reduced-motion and core contrast contracts remain present', () => {
  const publicCss = readAppFile('public-site.css');
  const themeCss = readAppFile('theme.css');
  const responsiveCss = readAppFile('theme-responsive.css');

  assert.match(publicCss, /:where\(a, button, input, select, textarea, summary\):focus-visible/);
  assert.match(publicCss, /outline: 3px solid var\(--public-focus\) !important/);
  assert.match(publicCss, /\.public-footer nav a \{[\s\S]*?min-height: 32px/);
  assert.match(publicCss, /\.public-section-heading-inline > a \{[\s\S]*?min-height: 44px/);
  assert.match(publicCss, /\.public-channel-grid > li > a,[\s\S]*?min-height: 60px/);
  assert.match(themeCss, /\.primary-cta \{[\s\S]*?min-height: 48px/);

  for (const source of [publicCss, responsiveCss]) {
    assert.match(source, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(source, /animation-duration: 0\.01ms !important/);
    assert.match(source, /animation-iteration-count: 1 !important/);
    assert.match(source, /transition-duration: 0\.01ms !important/);
  }

  const publicBackground = cssHexProperty(publicCss, '--public-bg');
  assert.ok(contrastRatio(cssHexProperty(publicCss, '--public-muted'), publicBackground) >= 4.5);
  assert.ok(contrastRatio(cssHexProperty(publicCss, '--public-gold'), publicBackground) >= 4.5);

  const ink = cssHexProperty(themeCss, '--ink');
  assert.ok(contrastRatio(cssHexProperty(themeCss, '--muted'), ink) >= 4.5);
  assert.ok(contrastRatio(cssHexProperty(themeCss, '--wine-text'), ink) >= 4.5);
  assert.match(themeCss, /\.hero-kicker \{[\s\S]*?color: var\(--muted\)/);
  assert.match(themeCss, /\.age-ribbon \{[\s\S]*?color: var\(--muted\)/);
});

test('forced-colors keeps focus, boundaries and controls perceivable', () => {
  const publicCss = readAppFile('public-site.css');
  const forcedColorsStart = publicCss.indexOf('@media (forced-colors: active) {');
  const forcedColorsEnd = publicCss.indexOf('.release-holding {', forcedColorsStart);

  assert.ok(forcedColorsStart >= 0, 'Missing forced-colors adaptation.');
  assert.ok(forcedColorsEnd > forcedColorsStart, 'Forced-colors block is incomplete.');
  const forcedColors = publicCss.slice(forcedColorsStart, forcedColorsEnd);
  assert.match(forcedColors, /outline-color: Highlight !important/);
  assert.match(forcedColors, /\.profile-card,/);
  assert.match(forcedColors, /\.public-empty-state,/);
  assert.match(forcedColors, /border-color: CanvasText/);
  assert.match(forcedColors, /border: 2px solid ButtonText/);
  assert.match(forcedColors, /forced-color-adjust: auto/);
});
