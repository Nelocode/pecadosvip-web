import esCatalog from '../../compliance/multilingual/catalogs/es.json' with { type: 'json' };
import enCatalog from '../../compliance/multilingual/catalogs/en.json' with { type: 'json' };
import frCatalog from '../../compliance/multilingual/catalogs/fr.json' with { type: 'json' };
import itCatalog from '../../compliance/multilingual/catalogs/it.json' with { type: 'json' };

import {
  requireLocale,
  SOURCE_LOCALE,
  SUPPORTED_LOCALES,
  type Locale,
} from './locales.ts';

export type MessageCatalog = typeof esCatalog;

const catalogs: Readonly<Record<Locale, MessageCatalog>> = {
  es: esCatalog,
  en: enCatalog,
  fr: frCatalog,
  it: itCatalog,
};

export function getCatalog(locale: Locale): MessageCatalog {
  return catalogs[locale];
}

export function getCatalogForParam(locale: string): MessageCatalog {
  return getCatalog(requireLocale(locale));
}

export function interpolate(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  const rendered = template.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/gu, (_, key: string) => {
    if (!(key in values)) {
      throw new Error(`Missing interpolation value: ${key}`);
    }

    return String(values[key]);
  });

  if (/\{[A-Za-z][A-Za-z0-9]*\}/u.test(rendered)) {
    throw new Error(`Unresolved placeholder in message: ${template}`);
  }

  return rendered;
}

export function formatPluralMessage(
  template: string,
  variable: string,
  value: number,
  locale: Locale,
): string {
  const escapedVariable = variable.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const pattern = new RegExp(
    `^\\{${escapedVariable},\\s*plural,\\s*one\\s*\\{([^{}]*)\\}\\s*other\\s*\\{([^{}]*)\\}\\}$`,
    'u',
  );
  const match = template.match(pattern);
  if (!match) {
    throw new Error(`Unsupported plural message: ${template}`);
  }

  const category = new Intl.PluralRules(locale).select(value);
  const selected = category === 'one' ? match[1] : match[2];
  return selected.replaceAll('#', new Intl.NumberFormat(locale).format(value));
}

type Leaf = { path: string; value: string | number | boolean | null };

function flattenLeaves(value: unknown, prefix = ''): Leaf[] {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return [{ path: prefix, value }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      flattenLeaves(item, `${prefix}[${index}]`),
    );
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, item]) => flattenLeaves(item, prefix ? `${prefix}.${key}` : key),
    );
  }

  throw new Error(`Unsupported catalog value at ${prefix || '<root>'}`);
}

function placeholderSet(value: string): string[] {
  return [...value.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/gu)]
    .map((match) => match[1])
    .sort();
}

export type CatalogValidationIssue = {
  locale: Locale;
  path: string;
  code:
    | 'KEY_PARITY'
    | 'EMPTY_MESSAGE'
    | 'MOJIBAKE'
    | 'PLACEHOLDER_PARITY';
  message: string;
};

export function validateCatalogs(): CatalogValidationIssue[] {
  const sourceLeaves = flattenLeaves(catalogs[SOURCE_LOCALE]);
  const sourceByPath = new Map(sourceLeaves.map((leaf) => [leaf.path, leaf.value]));
  const issues: CatalogValidationIssue[] = [];

  for (const locale of SUPPORTED_LOCALES) {
    const leaves = flattenLeaves(catalogs[locale]);
    const byPath = new Map(leaves.map((leaf) => [leaf.path, leaf.value]));
    const allPaths = new Set([...sourceByPath.keys(), ...byPath.keys()]);

    for (const path of allPaths) {
      if (!sourceByPath.has(path) || !byPath.has(path)) {
        issues.push({
          locale,
          path,
          code: 'KEY_PARITY',
          message: 'Catalog leaf is missing or extra compared with the source locale.',
        });
        continue;
      }

      const sourceValue = sourceByPath.get(path);
      const value = byPath.get(path);
      if (typeof value === 'string') {
        if (!value.trim()) {
          issues.push({
            locale,
            path,
            code: 'EMPTY_MESSAGE',
            message: 'Message must not be empty.',
          });
        }
        if (/�|Ã[\u0080-\u00ff]|Â[\u00a0 ]|â[€™“”]/u.test(value)) {
          issues.push({
            locale,
            path,
            code: 'MOJIBAKE',
            message: 'Message contains a likely encoding artifact.',
          });
        }
      }

      if (typeof sourceValue === 'string' && typeof value === 'string') {
        if (
          JSON.stringify(placeholderSet(sourceValue)) !==
          JSON.stringify(placeholderSet(value))
        ) {
          issues.push({
            locale,
            path,
            code: 'PLACEHOLDER_PARITY',
            message: 'Message placeholders differ from the source locale.',
          });
        }
      }
    }
  }

  return issues;
}
