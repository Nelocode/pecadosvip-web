/**
 * Offline copy-key audit. This is a bounded source scanner, not a PHP interpreter:
 * literal lookups, the enumerated dynamic expressions below, and known collections
 * are supported. A new dynamic lookup fails until its domain is reviewed here.
 * Only keys and source locations leave this module; copy values are never reported.
 */
const locales = ['es', 'en', 'fr', 'it'];
const at = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);
const strings = (source) => [...source.matchAll(/(['"])([^'"\r\n]*)\1/g)].map((match) => match[2]);
const lineAt = (source, index) => source.slice(0, index).split('\n').length;

function functionBlock(source, name) {
  const start = source.search(new RegExp(`\\bfunction\\s+${name}\\s*\\(`));
  if (start < 0) return '';
  const tail = source.slice(start);
  const next = tail.slice(1).search(/\bfunction\s+[a-zA-Z_]\w*\s*\(/);
  return next < 0 ? tail : tail.slice(0, next + 1);
}

// Read the first argument without splitting the fallback expression's parentheses.
function firstArgument(source, start) {
  let quote = ''; let depth = 0;
  for (let index = start; index < source.length; index++) {
    const character = source[index];
    if (quote) {
      if (character === '\\') { index++; continue; }
      if (character === quote) quote = '';
      continue;
    }
    if (character === "'" || character === '"') { quote = character; continue; }
    if (character === '(' || character === '[') depth++;
    if (character === ')' && depth === 0 || character === ',' && depth === 0) return source.slice(start, index).trim();
    if (character === ')' || character === ']') depth--;
  }
  return '';
}

function copyCalls(source) {
  const result = [];
  for (const match of source.matchAll(/\bpvwp_(text|label|value)\s*\(/g)) {
    if (/function\s+$/.test(source.slice(Math.max(0, match.index - 20), match.index))) continue;
    const owners = [...source.slice(0, match.index).matchAll(/\bfunction\s+(\w+)\s*\(/g)];
    result.push({ kind: match[1], argument: firstArgument(source, match.index + match[0].length),
      owner: owners.at(-1)?.[1] || '', line: lineAt(source, match.index) });
  }
  return result;
}

export function auditEditableCopy({ copy, records = [], phpSources = {}, javascriptSources = {}, pluginSources = {} }) {
  const requirements = new Map(); const problems = []; const dynamicFamilies = new Map();
  const add = (key, location, kind = 'text') => {
    const previous = requirements.get(key) || { key, kind, uses: new Set() };
    if (kind === 'text') previous.kind = 'text';
    previous.uses.add(location); requirements.set(key, previous);
  };
  const locations = (needle, sources = phpSources) => Object.entries(sources).flatMap(([file, source]) => {
    const index = source.indexOf(needle);
    return index < 0 ? [] : [`${file}:${lineAt(source, index)}`];
  });
  const requireFamily = (prefix, keys, suffix = '', uses = locations(prefix)) => {
    const unique = [...new Set(keys)].sort();
    dynamicFamilies.set(prefix + (suffix ? `*${suffix}` : '*'), unique.length);
    for (const key of unique) for (const use of uses) add(`${prefix}${key}${suffix}`, use);
  };
  const keysAt = (path) => locales.flatMap((locale) => Object.keys(at(copy?.[locale], path) || {}));
  const allPhp = Object.values(phpSources).join('\n');
  const pluginText = Object.values(pluginSources).join('\n');
  const knownDynamic = {
    pvwp_group_label: ["'services.groups.' . $group . '.label'"],
    pvwp_profile_card: ["'filters.availability.' . ($data['availability'] ?? 'on-request')"],
    pvwp_profile: ["'profile.availability.' . ($data['availability'] ?? 'on-request')"],
    pvwp_nav_links: ['$key'],
    pvwp_legal_provider_label: ['$map[$key]'],
    pvwp_legal_document_text: ['$map[$document][$field]'],
    pvwp_text: ['$path'], pvwp_label: ['$path'],
  };
  let literalCalls = 0; let dynamicCalls = 0;
  for (const [file, source] of Object.entries(phpSources)) {
    for (const call of copyCalls(source)) {
      const literal = call.argument.match(/^(['"])([^'"\r\n]+)\1$/);
      const location = `${file}:${call.line}`;
      if (literal) { add(literal[2], location, call.kind === 'value' ? 'value' : 'text'); literalCalls++; continue; }
      const normalize = (value) => value.replace(/\s/g, '');
      if (!(knownDynamic[call.owner] || []).some((argument) => normalize(argument) === normalize(call.argument))) {
        problems.push({ key: '<unreviewed dynamic lookup>', locales: [], reason: 'enumeration required', uses: [location] });
      } else if (!['pvwp_text', 'pvwp_label'].includes(call.owner)) dynamicCalls++;
    }
  }

  // Include both schema values and every seed value, never just the Spanish keys.
  // Unknown values typed into a future database are outside this static audit.
  const availability = [...allPhp.matchAll(/'availability'\s*=>\s*array\(([^)]*)\)/g)].flatMap((match) => strings(match[1]));
  for (const match of functionBlock(pluginText, 'pvc_fields').matchAll(/'availability'\s*=>\s*array\([\s\S]*?'enum'\s*=>\s*array\(([^)]*)\)/g)) availability.push(...strings(match[1]));
  for (const record of records) if (record.type === 'profile') availability.push(record.data?.availability ?? 'on-request');
  for (const prefix of ['filters.availability', 'profile.availability']) {
    if (allPhp.includes(prefix)) requireFamily(`${prefix}.`, [...availability, ...keysAt(prefix)]);
  }
  if (allPhp.includes('services.groups.')) {
    const groups = records.filter((record) => record.type === 'service').map((record) => record.data?.group).filter(Boolean);
    requireFamily('services.groups.', [...keysAt('services.groups'), ...groups], '.label');
  }
  // These helpers dispatch through variables/maps rather than literal copy calls.
  for (const name of ['pvwp_nav_links', 'pvwp_legal_provider_label', 'pvwp_legal_document_text']) {
    for (const [file, source] of Object.entries(phpSources)) {
      const block = functionBlock(source, name);
      for (const key of strings(block).filter((value) => /^(?:navigation|legal\.provider|legal\.documents)\.[\w.-]+$/.test(value))) {
        add(key, `${file}:${lineAt(source, source.indexOf(key, source.indexOf(block)))}`);
      }
    }
  }
  const mapKeys = (name) => [...functionBlock(pluginText, name).matchAll(/'([\w-]+)'\s*=>/g)].map((match) => match[1]);
  const channels = mapKeys('pvc_contact_channels');
  if (allPhp.includes('contact.channels.')) requireFamily('contact.channels.', [...channels, ...keysAt('contact.channels')], '', locations('function pvwp_contact_label'));
  if (allPhp.includes('legal.provider.')) {
    requireFamily('legal.provider.', keysAt('legal.provider'));
    const providerFields = [...functionBlock(pluginText, 'pvc_legal_provider_fields').matchAll(/'([\w-]+)'\s*=>\s*array\(\s*'label'/g)].map((match) => match[1]);
    const providerMap = new Set([...functionBlock(allPhp, 'pvwp_legal_provider_label').matchAll(/'([\w-]+)'\s*=>\s*'legal\.provider\./g)].map((match) => match[1]));
    for (const field of providerFields) if (!providerMap.has(field)) problems.push({ key: `<unmapped provider field: ${field}>`, locales: locales.slice(), reason: 'enumeration required', uses: locations('function pvwp_legal_provider_label') });
  }
  if (allPhp.includes('legal.documents.')) {
    const documentPaths = strings(allPhp).filter((key) => /^legal\.documents\.[\w-]+\.(title|intro)$/.test(key));
    const documents = [...keysAt('legal.documents'), ...documentPaths.map((key) => key.split('.')[2])];
    for (const field of ['title', 'intro']) requireFamily('legal.documents.', documents, `.${field}`);
  }
  if (allPhp.includes('legal.cookies.categories')) {
    requireFamily('legal.cookies.categories.', [...mapKeys('pvc_legal_cookie_categories'), ...keysAt('legal.cookies.categories')], '', locations('legal.cookies.categories'));
  }
  // Lists accessed through foreach need their child fields, not only a parent key.
  for (const [prefix, fields] of [['trustSignals', ['code', 'title', 'detail']], ['services.faqs', ['question', 'answer']], ['security.items', ['']]]) {
    if (!allPhp.includes(`'${prefix}'`)) continue;
    for (const locale of locales) {
      if (!Array.isArray(at(copy?.[locale], prefix)) || at(copy?.[locale], prefix).length === 0) {
        problems.push({ key: prefix, locales: [locale], reason: 'expected non-empty list', uses: locations(`'${prefix}'`) });
      }
    }
    for (const field of fields) requireFamily(`${prefix}.`, keysAt(prefix), field ? `.${field}` : '', locations(`'${prefix}'`));
  }
  for (const use of locations("$copy['languageName']")) add('languageName', use);
  // PHP exports whole groups to the progressive enhancement script. Audit the
  // actual property reads too (plural results and play/pause were invisible before).
  for (const [file, source] of Object.entries(javascriptSources)) {
    for (const match of source.matchAll(/\b(hub|ui)(?:\.|\?\.)([A-Za-z_]\w*)/g)) {
      add(`${match[1] === 'hub' ? 'services.hub' : 'nativeUi'}.${match[2]}`, `${file}:${lineAt(source, match.index)}`);
    }
    if (/\b(?:hub|ui)\s*\[/.test(source)) problems.push({ key: '<unreviewed JS copy lookup>', locales: [], reason: 'enumeration required', uses: [file] });
  }
  const whitelist = pluginText.match(/\$public_groups\s*=\s*array\(([^)]*)\)/);
  const publicGroups = whitelist ? new Set(strings(whitelist[1])) : null;
  for (const { key, kind, uses } of requirements.values()) {
    if (publicGroups && !publicGroups.has(key.split('.')[0])) {
      problems.push({ key, locales: locales.slice(), reason: 'group filtered out by pvc_copy', uses: [...uses] });
      continue;
    }
    const missing = locales.filter((locale) => {
      const value = at(copy?.[locale], key);
      return kind === 'value' ? value === undefined || value === null : typeof value !== 'string' || value.trim() === '';
    });
    if (missing.length) problems.push({ key, locales: missing, reason: kind === 'value' ? 'missing value' : 'missing/non-text/blank text', uses: [...uses] });
  }
  const warnings = [];
  // This is a dispatch defect, not missing seed copy; report it without changing
  // contact policy or making the coverage check misdiagnose it as a missing key.
  if (channels.includes('report') && allPhp.includes("pvwp_contact_label('report')") && !/case\s+['"]report['"]/.test(functionBlock(allPhp, 'pvwp_contact_label'))) {
    warnings.push({ key: 'contact.channels.report', locales: locales.slice(), reason: 'helper returns raw channel name instead of the existing copy', uses: locations("pvwp_contact_label('report')") });
  }
  return { locales, literalCalls, dynamicCalls, paths: [...requirements.values()].map(({ key, kind, uses }) => ({ key, kind, uses: [...uses] })),
    dynamicFamilies: Object.fromEntries(dynamicFamilies), problems, warnings };
}
