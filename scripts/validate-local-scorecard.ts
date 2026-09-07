import {
  lstatSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import {
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';

const expectedDimensionMaximums = new Map([
  ['inventory_evidence', 15],
  ['architecture', 10],
  ['implementation_integration', 45],
  ['qa_corrections', 25],
  ['packaging_handoff', 5],
] as const);

const expectedDimensionPrefixes = new Map([
  ['inventory_evidence', 'INV'],
  ['architecture', 'ARC'],
  ['implementation_integration', 'IMP'],
  ['qa_corrections', 'QA'],
  ['packaging_handoff', 'HAN'],
] as const);

const expectedNonMeasurements = [
  'CLIENT_OR_UAT_ACCEPTANCE',
  'DEPLOYMENT_OR_INDEXING_AUTHORIZATION',
  'LEGAL_COMPLIANCE_OR_CERTIFICATION',
  'PRODUCTION_READINESS',
] as const;

const priorCheckpointScore = 95;
const priorCheckpointScorecardSha256 =
  '6B217074A89FC1C55BBAEAD819336D6D746B1C02E7F6039D450DC7D0DD9BA012';
const expectedMultilingualLocales = ['es', 'en', 'fr', 'it'] as const;
const expectedMultilingualVerdicts = {
  technical_multilingual: 'NO DETERMINABLE',
  linguistic_publication: 'PENDIENTE DE REVISIÓN HUMANA',
  publication: 'NO DETERMINABLE POR FALTA DE EVIDENCIA',
} as const;
const expected98EvidencePaths = new Map([
  ['IMP-015', ['lib/i18n/locales.ts', 'tests/i18n-contract.test.ts']],
  [
    'IMP-016',
    [
      'compliance/multilingual/audit.json',
      'compliance/multilingual/audit-report.md',
    ],
  ],
  ['IMP-017', ['lib/seo.ts', 'tests/i18n-contract.test.ts']],
] as const);

const rootKeys = [
  'schema',
  'version',
  'asset',
  'scope',
  'status',
  'denominator',
  'baseline_score',
  'declared_score',
  'target_score',
  'calculation_rule',
  'prior_checkpoint',
  'separation',
  'dimensions',
  'criteria',
] as const;

const separationKeys = [
  'strict_requirements',
  'public_legal_release',
  'release_source',
  'multilingual_verdicts',
  'unscored_release_gates',
  'does_not_measure',
] as const;

const priorCheckpointKeys = ['score', 'scorecard_sha256', 'evidence'] as const;

const multilingualVerdictKeys = [
  'source_locale',
  'required_locales',
  'technical_multilingual',
  'linguistic_publication',
  'publication',
  'source',
] as const;

const unscoredReleaseGateKeys = [
  'id',
  'title',
  'status',
  'evidence',
  'acceptance',
  'limit',
] as const;

const strictRequirementKeys = ['verified', 'total', 'source'] as const;

const dimensionKeys = [
  'id',
  'title',
  'max_points',
  'baseline_earned_points',
  'declared_earned_points',
  'target_95_earned_points',
  'target_98_earned_points',
] as const;

const criterionKeys = [
  'id',
  'dimension',
  'title',
  'max_points',
  'baseline_earned_points',
  'status',
  'earned_points',
  'target_95_increment',
  'target_98_increment',
  'evidence',
  'acceptance',
  'limit',
] as const;

const evidenceKeys = ['id', 'path', 'locator'] as const;

type JsonRecord = Record<string, unknown>;

type DimensionTotals = {
  maximum: number;
  baseline: number;
  prior: number;
  declared: number;
  target: number;
};

export type LocalScorecardSummary = {
  baselineScore: number;
  priorCheckpointScore: number;
  declaredScore: number;
  targetScore: number;
  denominator: number;
  earnedCriteria: number;
  pendingCriteria: number;
  evidenceCount: number;
  dimensions: Record<
    string,
    {
      maximum: number;
      baseline: number;
      prior: number;
      declared: number;
      target: number;
    }
  >;
};

function fail(location: string, message: string): never {
  throw new Error(`${location}: ${message}`);
}

function requireRecord(value: unknown, location: string): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(location, 'expected a JSON object');
  }
  return value as JsonRecord;
}

function requireClosedKeys(
  value: JsonRecord,
  allowed: readonly string[],
  location: string,
  optional: readonly string[] = [],
): void {
  const allowedSet = new Set(allowed);
  const optionalSet = new Set(optional);
  const unexpected = Object.keys(value).filter((key) => !allowedSet.has(key));
  const missing = allowed.filter(
    (key) => !optionalSet.has(key) && !(key in value),
  );
  if (unexpected.length > 0) {
    fail(location, `unexpected keys: ${unexpected.sort().join(', ')}`);
  }
  if (missing.length > 0) {
    fail(location, `missing keys: ${missing.join(', ')}`);
  }
}

function requireString(value: unknown, location: string): string {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0) {
    fail(location, 'expected a non-empty trimmed string');
  }
  return value;
}

function requireBoolean(value: unknown, location: string): boolean {
  if (typeof value !== 'boolean') {
    fail(location, 'expected a boolean');
  }
  return value;
}

function requireInteger(value: unknown, location: string): number {
  if (!Number.isSafeInteger(value)) {
    fail(location, 'expected a safe integer');
  }
  return value as number;
}

function requireNonNegativeInteger(value: unknown, location: string): number {
  const integer = requireInteger(value, location);
  if (integer < 0) fail(location, 'expected a non-negative integer');
  return integer;
}

function requirePositiveInteger(value: unknown, location: string): number {
  const integer = requireInteger(value, location);
  if (integer < 1) fail(location, 'expected a positive integer');
  return integer;
}

function requireArray(value: unknown, location: string): unknown[] {
  if (!Array.isArray(value)) fail(location, 'expected an array');
  return value;
}

function isPathInside(parent: string, candidate: string): boolean {
  const difference = relative(parent, candidate);
  return (
    difference !== '' &&
    difference !== '..' &&
    !difference.startsWith(`..${sep}`) &&
    !isAbsolute(difference)
  );
}

function requireExistingRepositoryFile(
  repositoryRoot: string,
  path: unknown,
  location: string,
): string {
  const normalized = requireString(path, location);
  if (
    isAbsolute(normalized) ||
    normalized.includes('\\') ||
    normalized.startsWith('/') ||
    normalized.split('/').some((segment) => segment === '..' || segment === '')
  ) {
    fail(location, 'expected a normalized repository-relative file path');
  }

  const root = resolve(repositoryRoot);
  const candidate = resolve(root, ...normalized.split('/'));
  if (!isPathInside(root, candidate)) {
    fail(location, 'path escapes the repository root');
  }

  let entry;
  try {
    entry = lstatSync(candidate);
  } catch {
    fail(location, `evidence path does not exist: ${normalized}`);
  }
  if (!entry.isFile() || entry.isSymbolicLink()) {
    fail(location, `evidence path is not a regular non-symlink file: ${normalized}`);
  }

  const realRoot = realpathSync(root);
  const realCandidate = realpathSync(candidate);
  if (!isPathInside(realRoot, realCandidate)) {
    fail(location, `evidence path resolves outside the repository: ${normalized}`);
  }
  return normalized;
}

function requireExactStringSet(
  value: unknown,
  expected: readonly string[],
  location: string,
): void {
  const entries = requireArray(value, location).map((entry, index) =>
    requireString(entry, `${location}[${index}]`),
  );
  if (new Set(entries).size !== entries.length) {
    fail(location, 'contains duplicate entries');
  }
  const actualSorted = [...entries].sort();
  const expectedSorted = [...expected].sort();
  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) {
    fail(location, `must equal: ${expectedSorted.join(', ')}`);
  }
}

function loadRepositoryJsonEvidence(
  repositoryRoot: string,
  path: unknown,
  location: string,
): { path: string; value: JsonRecord } {
  const normalized = requireExistingRepositoryFile(
    repositoryRoot,
    path,
    location,
  );
  const absolute = resolve(repositoryRoot, ...normalized.split('/'));
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(absolute, 'utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(location, `unable to parse JSON evidence: ${message}`);
  }
  return { path: normalized, value: requireRecord(parsed, location) };
}

function emptyDimensionTotals(): DimensionTotals {
  return { maximum: 0, baseline: 0, prior: 0, declared: 0, target: 0 };
}

export function validateLocalTechnicalScorecard(
  value: unknown,
  repositoryRoot: string,
): LocalScorecardSummary {
  const root = requireRecord(value, '$');
  requireClosedKeys(root, rootKeys, '$');

  if (root.schema !== 'pecadosvip.local-technical-scorecard') {
    fail('$.schema', 'unsupported scorecard schema');
  }
  if (root.version !== 2) fail('$.version', 'unsupported schema version');
  if (root.asset !== 'pecadosvip-web-delivery') {
    fail('$.asset', 'unexpected audited asset');
  }
  if (root.scope !== 'LOCAL_TECHNICAL_EXECUTION_ONLY') {
    fail('$.scope', 'must remain local technical execution only');
  }

  const denominator = requirePositiveInteger(root.denominator, '$.denominator');
  const baselineScore = requireNonNegativeInteger(
    root.baseline_score,
    '$.baseline_score',
  );
  const declaredScore = requireNonNegativeInteger(
    root.declared_score,
    '$.declared_score',
  );
  const targetScore = requireNonNegativeInteger(root.target_score, '$.target_score');
  if (denominator !== 100) fail('$.denominator', 'must equal 100');
  if (baselineScore !== 87) fail('$.baseline_score', 'must preserve the 87 baseline');
  if (targetScore !== 98) fail('$.target_score', 'must equal the local target 98');
  if (declaredScore < priorCheckpointScore || declaredScore > targetScore) {
    fail(
      '$.declared_score',
      'must remain between the preserved 95 checkpoint and local target 98',
    );
  }

  const calculationRule = requireString(root.calculation_rule, '$.calculation_rule');
  for (const requiredTerm of [
    'EARNED',
    'PENDING',
    'max_points',
    '87-point',
    '95-point',
    '98 target',
  ]) {
    if (!calculationRule.includes(requiredTerm)) {
      fail('$.calculation_rule', `must explain ${requiredTerm}`);
    }
  }

  const priorCheckpoint = requireRecord(
    root.prior_checkpoint,
    '$.prior_checkpoint',
  );
  requireClosedKeys(priorCheckpoint, priorCheckpointKeys, '$.prior_checkpoint');
  if (priorCheckpoint.score !== priorCheckpointScore) {
    fail('$.prior_checkpoint.score', 'must preserve the prior checkpoint score 95');
  }
  if (priorCheckpoint.scorecard_sha256 !== priorCheckpointScorecardSha256) {
    fail(
      '$.prior_checkpoint.scorecard_sha256',
      `must preserve ${priorCheckpointScorecardSha256}`,
    );
  }
  if (
    priorCheckpoint.evidence !==
    'evidence/95-local-technical-checkpoint/evidence-manifest.json'
  ) {
    fail(
      '$.prior_checkpoint.evidence',
      'must reference the immutable 95 checkpoint manifest',
    );
  }
  const priorManifest = loadRepositoryJsonEvidence(
    repositoryRoot,
    priorCheckpoint.evidence,
    '$.prior_checkpoint.evidence',
  ).value;
  const priorManifestScorecard = requireRecord(
    priorManifest.scorecard,
    '$.prior_checkpoint.evidence.scorecard',
  );
  if (
    priorManifestScorecard.sha256 !== priorCheckpointScorecardSha256 ||
    priorManifestScorecard.declaredScore !== priorCheckpointScore ||
    priorManifestScorecard.strictRequirementsVerified !== 2 ||
    priorManifestScorecard.strictRequirementsTotal !== 20 ||
    priorManifestScorecard.publicLegalRelease !== 'NO-GO'
  ) {
    fail(
      '$.prior_checkpoint.evidence',
      'manifest must bind score 95, the historical scorecard SHA-256, 2/20 and NO-GO',
    );
  }

  const separation = requireRecord(root.separation, '$.separation');
  requireClosedKeys(separation, separationKeys, '$.separation');
  const strictRequirements = requireRecord(
    separation.strict_requirements,
    '$.separation.strict_requirements',
  );
  requireClosedKeys(
    strictRequirements,
    strictRequirementKeys,
    '$.separation.strict_requirements',
  );
  if (
    strictRequirements.verified !== 2 ||
    strictRequirements.total !== 20 ||
    strictRequirements.source !== 'REQUIREMENTS_TRACEABILITY.csv'
  ) {
    fail(
      '$.separation.strict_requirements',
      'must preserve strict verification as 2/20 with its traceability source',
    );
  }
  requireExistingRepositoryFile(
    repositoryRoot,
    strictRequirements.source,
    '$.separation.strict_requirements.source',
  );
  if (separation.public_legal_release !== 'NO-GO') {
    fail('$.separation.public_legal_release', 'must remain NO-GO');
  }
  if (separation.release_source !== 'RELEASE_CHECKLIST.md') {
    fail('$.separation.release_source', 'must reference RELEASE_CHECKLIST.md');
  }
  requireExistingRepositoryFile(
    repositoryRoot,
    separation.release_source,
    '$.separation.release_source',
  );

  const multilingualVerdicts = requireRecord(
    separation.multilingual_verdicts,
    '$.separation.multilingual_verdicts',
  );
  requireClosedKeys(
    multilingualVerdicts,
    multilingualVerdictKeys,
    '$.separation.multilingual_verdicts',
  );
  if (multilingualVerdicts.source_locale !== 'es') {
    fail(
      '$.separation.multilingual_verdicts.source_locale',
      'must preserve es as the source locale',
    );
  }
  requireExactStringSet(
    multilingualVerdicts.required_locales,
    expectedMultilingualLocales,
    '$.separation.multilingual_verdicts.required_locales',
  );
  for (const [field, expected] of Object.entries(expectedMultilingualVerdicts)) {
    if (multilingualVerdicts[field] !== expected) {
      fail(
        `$.separation.multilingual_verdicts.${field}`,
        `must remain ${expected}`,
      );
    }
  }
  if (multilingualVerdicts.source !== 'compliance/multilingual/audit.json') {
    fail(
      '$.separation.multilingual_verdicts.source',
      'must reference compliance/multilingual/audit.json',
    );
  }
  const multilingualAudit = loadRepositoryJsonEvidence(
    repositoryRoot,
    multilingualVerdicts.source,
    '$.separation.multilingual_verdicts.source',
  ).value;
  const auditScope = requireRecord(
    multilingualAudit.scope,
    '$.separation.multilingual_verdicts.source.scope',
  );
  const auditExecution = requireRecord(
    multilingualAudit.execution,
    '$.separation.multilingual_verdicts.source.execution',
  );
  const auditVerdicts = requireRecord(
    multilingualAudit.verdicts,
    '$.separation.multilingual_verdicts.source.verdicts',
  );
  if (
    auditExecution.status !== 'complete' ||
    auditExecution.mode !== 'repository-catalog-regression' ||
    auditScope.decision_scope !== 'translation-package'
  ) {
    fail(
      '$.separation.multilingual_verdicts.source',
      'audit must be a complete repository-catalog-regression limited to the translation-package',
    );
  }
  if (auditScope.source_locale !== 'es') {
    fail(
      '$.separation.multilingual_verdicts.source.scope.source_locale',
      'audit source locale must be es',
    );
  }
  requireExactStringSet(
    auditScope.required_locales,
    expectedMultilingualLocales,
    '$.separation.multilingual_verdicts.source.scope.required_locales',
  );
  for (const [field, expected] of Object.entries(expectedMultilingualVerdicts)) {
    if (auditVerdicts[field] !== expected) {
      fail(
        `$.separation.multilingual_verdicts.source.verdicts.${field}`,
        `audit verdict must remain ${expected}`,
      );
    }
  }
  const auditSummary = requireRecord(
    multilingualAudit.summary,
    '$.separation.multilingual_verdicts.source.summary',
  );
  if (auditSummary.critical !== 0 || auditSummary.major !== 0) {
    fail(
      '$.separation.multilingual_verdicts.source.summary',
      'catalog evidence for the 98 increment must have zero critical and major findings',
    );
  }
  const auditControlResults = requireArray(
    multilingualAudit.control_results,
    '$.separation.multilingual_verdicts.source.control_results',
  ).map((value, index) =>
    requireRecord(
      value,
      `$.separation.multilingual_verdicts.source.control_results[${index}]`,
    ),
  );
  if (auditControlResults.some((result) => result.status === 'fail')) {
    fail(
      '$.separation.multilingual_verdicts.source.control_results',
      'catalog evidence for the 98 increment must have zero failed controls',
    );
  }
  if (
    !auditControlResults.some(
      (result) =>
        result.control_id === 'L10N-HUMAN-REVIEW-001' &&
        result.status === 'not-tested',
    )
  ) {
    fail(
      '$.separation.multilingual_verdicts.source.control_results',
      'human linguistic review must remain explicitly not-tested',
    );
  }

  const unscoredReleaseGates = requireArray(
    separation.unscored_release_gates,
    '$.separation.unscored_release_gates',
  );
  if (unscoredReleaseGates.length !== 1) {
    fail(
      '$.separation.unscored_release_gates',
      'must contain exactly the preserved IMP-011 gate',
    );
  }
  const unscoredGate = requireRecord(
    unscoredReleaseGates[0],
    '$.separation.unscored_release_gates[0]',
  );
  requireClosedKeys(
    unscoredGate,
    unscoredReleaseGateKeys,
    '$.separation.unscored_release_gates[0]',
  );
  if (unscoredGate.id !== 'IMP-011' || unscoredGate.status !== 'PENDING') {
    fail(
      '$.separation.unscored_release_gates[0]',
      'IMP-011 must remain present and PENDING',
    );
  }
  requireString(
    unscoredGate.title,
    '$.separation.unscored_release_gates[0].title',
  );
  requireString(
    unscoredGate.acceptance,
    '$.separation.unscored_release_gates[0].acceptance',
  );
  requireString(
    unscoredGate.limit,
    '$.separation.unscored_release_gates[0].limit',
  );
  const unscoredGateEvidence = requireArray(
    unscoredGate.evidence,
    '$.separation.unscored_release_gates[0].evidence',
  );
  if (unscoredGateEvidence.length !== 1) {
    fail(
      '$.separation.unscored_release_gates[0].evidence',
      'must contain exactly the existing release-gate evidence',
    );
  }
  const unscoredEvidence = requireRecord(
    unscoredGateEvidence[0],
    '$.separation.unscored_release_gates[0].evidence[0]',
  );
  requireClosedKeys(
    unscoredEvidence,
    evidenceKeys,
    '$.separation.unscored_release_gates[0].evidence[0]',
  );
  if (
    unscoredEvidence.id !== 'EV-IMP-011-EXTERNAL-GATES' ||
    unscoredEvidence.path !== 'RELEASE_CHECKLIST.md'
  ) {
    fail(
      '$.separation.unscored_release_gates[0].evidence[0]',
      'must preserve the IMP-011 release-checklist evidence',
    );
  }
  requireExistingRepositoryFile(
    repositoryRoot,
    unscoredEvidence.path,
    '$.separation.unscored_release_gates[0].evidence[0].path',
  );
  requireString(
    unscoredEvidence.locator,
    '$.separation.unscored_release_gates[0].evidence[0].locator',
  );
  requireExactStringSet(
    separation.does_not_measure,
    expectedNonMeasurements,
    '$.separation.does_not_measure',
  );

  const dimensions = requireArray(root.dimensions, '$.dimensions');
  if (dimensions.length !== expectedDimensionMaximums.size) {
    fail('$.dimensions', `must contain ${expectedDimensionMaximums.size} dimensions`);
  }

  const declaredDimensions = new Map<string, JsonRecord>();
  for (const [index, rawDimension] of dimensions.entries()) {
    const location = `$.dimensions[${index}]`;
    const dimension = requireRecord(rawDimension, location);
    requireClosedKeys(dimension, dimensionKeys, location);
    const id = requireString(dimension.id, `${location}.id`);
    if (!expectedDimensionMaximums.has(id as never)) {
      fail(`${location}.id`, `unknown dimension: ${id}`);
    }
    if (declaredDimensions.has(id)) fail(`${location}.id`, `duplicate dimension: ${id}`);
    requireString(dimension.title, `${location}.title`);
    const expectedMaximum = expectedDimensionMaximums.get(id as never);
    const maximum = requirePositiveInteger(
      dimension.max_points,
      `${location}.max_points`,
    );
    if (maximum !== expectedMaximum) {
      fail(`${location}.max_points`, `must equal ${expectedMaximum}`);
    }
    for (const field of [
      'baseline_earned_points',
      'declared_earned_points',
      'target_95_earned_points',
      'target_98_earned_points',
    ] as const) {
      const points = requireNonNegativeInteger(dimension[field], `${location}.${field}`);
      if (points > maximum) fail(`${location}.${field}`, 'cannot exceed max_points');
    }
    declaredDimensions.set(id, dimension);
  }

  const computedDimensions = new Map<string, DimensionTotals>();
  for (const id of expectedDimensionMaximums.keys()) {
    computedDimensions.set(id, emptyDimensionTotals());
  }

  const criterionIds = new Set<string>();
  const target98CriterionIds = new Set<string>();
  const evidenceIds = new Set<string>();
  const evidenceReferences = new Set<string>();
  let earnedCriteria = 0;
  let pendingCriteria = 0;

  const criteria = requireArray(root.criteria, '$.criteria');
  if (criteria.length === 0) fail('$.criteria', 'must not be empty');
  for (const [index, rawCriterion] of criteria.entries()) {
    const location = `$.criteria[${index}]`;
    const criterion = requireRecord(rawCriterion, location);
    requireClosedKeys(
      criterion,
      criterionKeys,
      location,
      ['target_98_increment'],
    );
    const id = requireString(criterion.id, `${location}.id`);
    if (!/^(?:INV|ARC|IMP|QA|HAN)-[0-9]{3}$/.test(id)) {
      fail(`${location}.id`, 'invalid criterion ID');
    }
    if (criterionIds.has(id)) fail(`${location}.id`, `duplicate criterion ID: ${id}`);
    if (id === 'IMP-011') {
      fail(
        `${location}.id`,
        'IMP-011 must remain an unscored PENDING release gate',
      );
    }
    criterionIds.add(id);

    const dimensionId = requireString(criterion.dimension, `${location}.dimension`);
    const totals = computedDimensions.get(dimensionId);
    if (!totals) fail(`${location}.dimension`, `unknown dimension: ${dimensionId}`);
    const expectedPrefix = expectedDimensionPrefixes.get(dimensionId as never);
    if (!id.startsWith(`${expectedPrefix}-`)) {
      fail(`${location}.id`, `must use the ${expectedPrefix} prefix`);
    }
    requireString(criterion.title, `${location}.title`);
    requireString(criterion.acceptance, `${location}.acceptance`);
    requireString(criterion.limit, `${location}.limit`);

    const maximum = requirePositiveInteger(
      criterion.max_points,
      `${location}.max_points`,
    );
    const baseline = requireNonNegativeInteger(
      criterion.baseline_earned_points,
      `${location}.baseline_earned_points`,
    );
    const earned = requireNonNegativeInteger(
      criterion.earned_points,
      `${location}.earned_points`,
    );
    if (![0, maximum].includes(baseline)) {
      fail(`${location}.baseline_earned_points`, 'atomic baseline must be zero or max_points');
    }
    if (![0, maximum].includes(earned)) {
      fail(`${location}.earned_points`, 'atomic earned points must be zero or max_points');
    }
    if (earned < baseline) {
      fail(`${location}.earned_points`, 'cannot regress below the immutable baseline');
    }

    const status = requireString(criterion.status, `${location}.status`);
    if (status !== 'EARNED' && status !== 'PENDING') {
      fail(`${location}.status`, 'must be EARNED or PENDING');
    }
    if (status === 'EARNED' && earned !== maximum) {
      fail(`${location}.earned_points`, 'EARNED must receive all max_points');
    }
    if (status === 'PENDING' && earned !== 0) {
      fail(`${location}.earned_points`, 'PENDING must receive zero points');
    }
    if (status === 'EARNED') earnedCriteria += 1;
    else pendingCriteria += 1;

    const target95Increment = requireBoolean(
      criterion.target_95_increment,
      `${location}.target_95_increment`,
    );
    const target98Increment =
      criterion.target_98_increment === undefined
        ? false
        : requireBoolean(
            criterion.target_98_increment,
            `${location}.target_98_increment`,
          );
    if (target95Increment && target98Increment) {
      fail(
        location,
        'a criterion cannot belong to both the 95 checkpoint and 98 increment',
      );
    }
    if ((target95Increment || target98Increment) && baseline !== 0) {
      fail(
        location,
        'a target increment must be absent from the immutable baseline',
      );
    }
    if (target98Increment) target98CriterionIds.add(id);

    totals.maximum += maximum;
    totals.baseline += baseline;
    totals.declared += earned;
    totals.prior += target95Increment ? maximum : baseline;
    totals.target +=
      target95Increment || target98Increment ? maximum : baseline;

    const evidence = requireArray(criterion.evidence, `${location}.evidence`);
    if (evidence.length === 0) fail(`${location}.evidence`, 'must not be empty');
    const criterionEvidencePaths: string[] = [];
    for (const [evidenceIndex, rawEvidence] of evidence.entries()) {
      const evidenceLocation = `${location}.evidence[${evidenceIndex}]`;
      const item = requireRecord(rawEvidence, evidenceLocation);
      requireClosedKeys(item, evidenceKeys, evidenceLocation);
      const evidenceId = requireString(item.id, `${evidenceLocation}.id`);
      if (!/^EV-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(evidenceId)) {
        fail(`${evidenceLocation}.id`, 'invalid evidence ID');
      }
      if (evidenceIds.has(evidenceId)) {
        fail(`${evidenceLocation}.id`, `duplicate evidence ID: ${evidenceId}`);
      }
      evidenceIds.add(evidenceId);
      const evidencePath = requireExistingRepositoryFile(
        repositoryRoot,
        item.path,
        `${evidenceLocation}.path`,
      );
      criterionEvidencePaths.push(evidencePath);
      const locator = requireString(item.locator, `${evidenceLocation}.locator`);
      const evidenceReference = `${evidencePath}#${locator}`.toLowerCase();
      if (evidenceReferences.has(evidenceReference)) {
        fail(evidenceLocation, `duplicate evidence reference: ${evidenceReference}`);
      }
      evidenceReferences.add(evidenceReference);
    }
    if (target98Increment) {
      const expectedEvidencePaths = expected98EvidencePaths.get(id as never);
      if (!expectedEvidencePaths) {
        fail(`${location}.id`, 'unexpected criterion in the 98 increment');
      }
      requireExactStringSet(
        criterionEvidencePaths,
        expectedEvidencePaths,
        `${location}.evidence.path`,
      );
    }
  }

  requireExactStringSet(
    [...target98CriterionIds],
    ['IMP-015', 'IMP-016', 'IMP-017'],
    '$.criteria.target_98_increment',
  );

  let computedMaximum = 0;
  let computedBaseline = 0;
  let computedPrior = 0;
  let computedDeclared = 0;
  let computedTarget = 0;
  const summaryDimensions: LocalScorecardSummary['dimensions'] = {};
  for (const [id, expectedMaximum] of expectedDimensionMaximums.entries()) {
    const computed = computedDimensions.get(id);
    const declared = declaredDimensions.get(id);
    if (!computed || !declared) fail('$.dimensions', `missing dimension: ${id}`);
    if (computed.maximum !== expectedMaximum) {
      fail(`$.criteria`, `${id} criteria sum to ${computed.maximum}, expected ${expectedMaximum}`);
    }
    const expectedFields = [
      ['baseline_earned_points', computed.baseline],
      ['declared_earned_points', computed.declared],
      ['target_95_earned_points', computed.prior],
      ['target_98_earned_points', computed.target],
    ] as const;
    for (const [field, expected] of expectedFields) {
      if (declared[field] !== expected) {
        fail(`$.dimensions.${id}.${field}`, `declares ${String(declared[field])}, calculated ${expected}`);
      }
    }
    computedMaximum += computed.maximum;
    computedBaseline += computed.baseline;
    computedPrior += computed.prior;
    computedDeclared += computed.declared;
    computedTarget += computed.target;
    summaryDimensions[id] = { ...computed };
  }

  if (computedMaximum !== denominator) {
    fail('$.denominator', `declares ${denominator}, calculated ${computedMaximum}`);
  }
  if (computedBaseline !== baselineScore) {
    fail('$.baseline_score', `declares ${baselineScore}, calculated ${computedBaseline}`);
  }
  if (computedPrior !== priorCheckpointScore) {
    fail(
      '$.prior_checkpoint.score',
      `declares ${priorCheckpointScore}, calculated ${computedPrior}`,
    );
  }
  if (computedDeclared !== declaredScore) {
    fail('$.declared_score', `declares ${declaredScore}, calculated ${computedDeclared}`);
  }
  if (computedTarget !== targetScore) {
    fail('$.target_score', `declares ${targetScore}, calculated ${computedTarget}`);
  }

  const status = requireString(root.status, '$.status');
  const expectedStatus =
    declaredScore === targetScore ? 'LOCAL_TARGET_EARNED' : 'LOCAL_TARGET_PENDING';
  if (status !== expectedStatus) {
    fail('$.status', `must be ${expectedStatus} for the calculated score`);
  }

  return {
    baselineScore,
    priorCheckpointScore,
    declaredScore,
    targetScore,
    denominator,
    earnedCriteria,
    pendingCriteria,
    evidenceCount: evidenceIds.size,
    dimensions: summaryDimensions,
  };
}

export function loadAndValidateLocalTechnicalScorecard(
  scorecardPath: string,
): LocalScorecardSummary {
  const absolutePath = resolve(scorecardPath);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read scorecard JSON: ${message}`);
  }
  return validateLocalTechnicalScorecard(parsed, dirname(absolutePath));
}

function isMainModule(): boolean {
  const invokedPath = process.argv[1];
  if (!invokedPath) return false;
  const left = resolve(invokedPath);
  const right = resolve(fileURLToPath(import.meta.url));
  return process.platform === 'win32'
    ? left.toLowerCase() === right.toLowerCase()
    : left === right;
}

if (isMainModule()) {
  try {
    const scorecardPath = process.argv[2] ?? 'LOCAL_TECHNICAL_SCORECARD.json';
    const summary = loadAndValidateLocalTechnicalScorecard(scorecardPath);
    process.stdout.write(`${JSON.stringify({ ok: true, ...summary }, null, 2)}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
