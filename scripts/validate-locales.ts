import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { validateCatalogs } from '../lib/i18n/catalog.ts';
import {
  SOURCE_LOCALE,
  SUPPORTED_LOCALES,
} from '../lib/i18n/locales.ts';
import { buildLocalizedPublicMetadata } from '../lib/seo.ts';

const repositoryRoot = resolve(import.meta.dirname, '..');

function fail(message: string): never {
  throw new Error(`Locale validation failed: ${message}`);
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(repositoryRoot, path), 'utf8'));
}

const issues = validateCatalogs();
if (issues.length > 0) {
  fail(JSON.stringify(issues.slice(0, 10)));
}

const inventory = readJson('compliance/multilingual/route-inventory.json') as {
  source_locale?: string;
  required_locales?: string[];
  route_strategy?: string;
  routes?: Array<{ path?: string; locales?: Record<string, { status?: string }> }>;
};
if (inventory.source_locale !== SOURCE_LOCALE) fail('unexpected source locale');
if (JSON.stringify(inventory.required_locales) !== JSON.stringify(SUPPORTED_LOCALES)) {
  fail('required locales must be exactly es,en,fr,it');
}
if (inventory.route_strategy !== 'locale-prefix') fail('locale prefix strategy is required');
if (!inventory.routes?.length) fail('route inventory is empty');
for (const route of inventory.routes) {
  for (const locale of SUPPORTED_LOCALES) {
    if (route.locales?.[locale]?.status !== 'required') {
      fail(`${route.path ?? '<unknown>'} is not required for ${locale}`);
    }
  }
}

const requiredRuntimeFiles = [
  'app/[locale]/layout.tsx',
  'app/[locale]/page.tsx',
  'app/[locale]/madrid/page.tsx',
  'app/[locale]/barcelona/page.tsx',
  'app/[locale]/perfiles/page.tsx',
  'app/[locale]/perfiles/[slug]/page.tsx',
  'app/[locale]/contacto/page.tsx',
  'app/[locale]/legal/[document]/page.tsx',
  'app/components/LanguageSelector.tsx',
  'app/(legacy)/layout.tsx',
];
for (const path of requiredRuntimeFiles) {
  if (!existsSync(resolve(repositoryRoot, path))) fail(`missing runtime file: ${path}`);
}

const layoutSource = readFileSync(
  resolve(repositoryRoot, 'app/[locale]/layout.tsx'),
  'utf8',
);
if (!layoutSource.includes('<html lang={locale}>')) fail('dynamic html lang is missing');
if (!layoutSource.includes('localeOrNotFound')) fail('invalid locale fail-closed gate is missing');

const selectorSource = readFileSync(
  resolve(repositoryRoot, 'app/components/LanguageSelector.tsx'),
  'utf8',
);
for (const contract of ['hrefLang={optionLocale}', 'lang={optionLocale}', "aria-current={optionLocale === locale ? 'page' : undefined}"]) {
  if (!selectorSource.includes(contract)) fail(`language selector contract missing: ${contract}`);
}

const metadata = buildLocalizedPublicMetadata(
  {
    locale: 'fr',
    semanticPath: '/madrid',
    title: 'Madrid',
    description: 'Madrid',
  },
  {
    origin: 'https://www.pecadosvip.com',
    indexingEnabled: true,
    structuredDataEnabled: true,
  },
  true,
);
const languages = metadata.alternates && 'languages' in metadata.alternates
  ? metadata.alternates.languages
  : undefined;
if (
  metadata.alternates?.canonical !== 'https://www.pecadosvip.com/fr/madrid' ||
  !languages ||
  Object.keys(languages).sort().join(',') !== 'en,es,fr,it,x-default' ||
  languages['x-default'] !== 'https://www.pecadosvip.com/es/madrid'
) {
  fail('localized canonical/hreflang contract is incomplete');
}

const audit = readJson('compliance/multilingual/audit.json') as {
  summary?: { findings_total?: number; critical?: number; major?: number };
  verdicts?: {
    technical_multilingual?: string;
    linguistic_publication?: string;
    publication?: string;
  };
};
if (
  audit.summary?.findings_total !== 0 ||
  audit.summary?.critical !== 0 ||
  audit.summary?.major !== 0
) {
  fail('deterministic multilingual audit contains findings');
}
if (
  audit.verdicts?.technical_multilingual !== 'NO DETERMINABLE' ||
  audit.verdicts?.linguistic_publication !== 'PENDIENTE DE REVISIÓN HUMANA' ||
  audit.verdicts?.publication !== 'NO DETERMINABLE POR FALTA DE EVIDENCIA'
) {
  fail('multilingual verdicts are not conservative');
}

process.stdout.write(
  `${JSON.stringify({
    status: 'PASS_WITH_LIMITS',
    locales: SUPPORTED_LOCALES,
    catalogIssues: issues.length,
    routeTemplates: inventory.routes.length,
    linguisticReview: audit.verdicts.linguistic_publication,
    publication: audit.verdicts.publication,
  })}\n`,
);
