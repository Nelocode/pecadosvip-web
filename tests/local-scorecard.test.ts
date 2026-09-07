import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  loadAndValidateLocalTechnicalScorecard,
  validateLocalTechnicalScorecard,
} from '../scripts/validate-local-scorecard.ts';

type MutableEvidence = {
  id: unknown;
  path: unknown;
  locator: unknown;
  [key: string]: unknown;
};

type MutableCriterion = {
  id: unknown;
  max_points: unknown;
  status: unknown;
  earned_points: unknown;
  target_95_increment: unknown;
  target_98_increment?: unknown;
  evidence: MutableEvidence[];
  [key: string]: unknown;
};

type MutableDimension = {
  id: unknown;
  max_points: unknown;
  [key: string]: unknown;
};

type MutableScorecard = {
  declared_score: unknown;
  target_score: unknown;
  prior_checkpoint: {
    score: unknown;
    scorecard_sha256: unknown;
    evidence: unknown;
    [key: string]: unknown;
  };
  separation: {
    strict_requirements: { verified: unknown; total: unknown; source: unknown };
    public_legal_release: unknown;
    multilingual_verdicts: {
      technical_multilingual: unknown;
      linguistic_publication: unknown;
      publication: unknown;
      [key: string]: unknown;
    };
    unscored_release_gates: Array<{
      id: unknown;
      status: unknown;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  dimensions: MutableDimension[];
  criteria: MutableCriterion[];
  [key: string]: unknown;
};

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scorecardPath = resolve(repositoryRoot, 'LOCAL_TECHNICAL_SCORECARD.json');
const source = JSON.parse(readFileSync(scorecardPath, 'utf8')) as MutableScorecard;

function cloneScorecard(): MutableScorecard {
  return structuredClone(source);
}

test('validates the immutable 87 baseline, preserved 95 checkpoint and exact local 98 projection', () => {
  const summary = loadAndValidateLocalTechnicalScorecard(scorecardPath);

  assert.equal(summary.baselineScore, 87);
  assert.equal(summary.priorCheckpointScore, 95);
  assert.equal(summary.declaredScore, 98);
  assert.equal(summary.targetScore, 98);
  assert.equal(summary.denominator, 100);
  assert.equal(summary.earnedCriteria, 31);
  assert.equal(summary.pendingCriteria, 2);
  assert.equal(summary.evidenceCount, 43);
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(summary.dimensions).map(([id, dimension]) => [
        id,
        [
          dimension.maximum,
          dimension.baseline,
          dimension.prior,
          dimension.declared,
          dimension.target,
        ],
      ]),
    ),
    {
      inventory_evidence: [15, 14, 15, 15, 15],
      architecture: [10, 9, 9, 9, 9],
      implementation_integration: [45, 38, 42, 45, 45],
      qa_corrections: [25, 22, 24, 24, 24],
      packaging_handoff: [5, 4, 5, 5, 5],
    },
  );
});

test('rejects unknown fields at every closed-schema level sampled', () => {
  const rootExtra = cloneScorecard();
  rootExtra.unexpected = true;
  assert.throws(
    () => validateLocalTechnicalScorecard(rootExtra, repositoryRoot),
    /unexpected keys: unexpected/,
  );

  const criterionExtra = cloneScorecard();
  criterionExtra.criteria[0].unexpected = true;
  assert.throws(
    () => validateLocalTechnicalScorecard(criterionExtra, repositoryRoot),
    /unexpected keys: unexpected/,
  );

  const checkpointExtra = cloneScorecard();
  checkpointExtra.prior_checkpoint.unexpected = true;
  assert.throws(
    () => validateLocalTechnicalScorecard(checkpointExtra, repositoryRoot),
    /unexpected keys: unexpected/,
  );

  const evidenceExtra = cloneScorecard();
  evidenceExtra.criteria[0].evidence[0].unexpected = true;
  assert.throws(
    () => validateLocalTechnicalScorecard(evidenceExtra, repositoryRoot),
    /unexpected keys: unexpected/,
  );
});

test('rejects duplicate criterion IDs, evidence IDs and evidence references', () => {
  const duplicateCriterion = cloneScorecard();
  duplicateCriterion.criteria[1].id = duplicateCriterion.criteria[0].id;
  assert.throws(
    () => validateLocalTechnicalScorecard(duplicateCriterion, repositoryRoot),
    /duplicate criterion ID/,
  );

  const duplicateEvidenceId = cloneScorecard();
  duplicateEvidenceId.criteria[1].evidence[0].id =
    duplicateEvidenceId.criteria[0].evidence[0].id;
  assert.throws(
    () => validateLocalTechnicalScorecard(duplicateEvidenceId, repositoryRoot),
    /duplicate evidence ID/,
  );

  const duplicateEvidenceReference = cloneScorecard();
  duplicateEvidenceReference.criteria[1].evidence[0].path =
    duplicateEvidenceReference.criteria[0].evidence[0].path;
  duplicateEvidenceReference.criteria[1].evidence[0].locator =
    duplicateEvidenceReference.criteria[0].evidence[0].locator;
  assert.throws(
    () => validateLocalTechnicalScorecard(duplicateEvidenceReference, repositoryRoot),
    /duplicate evidence reference/,
  );
});

test('rejects dimension and criterion sums that do not equal the fixed rubric', () => {
  const dimensionMaximum = cloneScorecard();
  dimensionMaximum.dimensions[0].max_points = 16;
  assert.throws(
    () => validateLocalTechnicalScorecard(dimensionMaximum, repositoryRoot),
    /must equal 15/,
  );

  const criterionMaximum = cloneScorecard();
  const resizedCriterion = criterionMaximum.criteria.find(
    (criterion) => criterion.id === 'INV-004',
  )!;
  resizedCriterion.max_points = 2;
  resizedCriterion.earned_points = 2;
  assert.throws(
    () => validateLocalTechnicalScorecard(criterionMaximum, repositoryRoot),
    /inventory_evidence criteria sum to 16, expected 15/,
  );

  const targetProjection = cloneScorecard();
  targetProjection.criteria.find((criterion) => criterion.id === 'INV-004')!
    .target_95_increment = false;
  assert.throws(
    () => validateLocalTechnicalScorecard(targetProjection, repositoryRoot),
    /target_95_earned_points: declares 15, calculated 14/,
  );

  const target98Projection = cloneScorecard();
  target98Projection.criteria.find((criterion) => criterion.id === 'IMP-015')!
    .target_98_increment = false;
  assert.throws(
    () => validateLocalTechnicalScorecard(target98Projection, repositoryRoot),
    /target_98_increment: must equal: IMP-015, IMP-016, IMP-017/,
  );
});

test('rejects non-atomic, inconsistent and unknown criterion states', () => {
  const partialPoints = cloneScorecard();
  partialPoints.criteria.find((criterion) => criterion.id === 'IMP-007')!
    .earned_points = 0.5;
  assert.throws(
    () => validateLocalTechnicalScorecard(partialPoints, repositoryRoot),
    /expected a safe integer/,
  );

  const pendingWithPoints = cloneScorecard();
  pendingWithPoints.criteria.find((criterion) => criterion.id === 'ARC-004')!
    .earned_points = 1;
  assert.throws(
    () => validateLocalTechnicalScorecard(pendingWithPoints, repositoryRoot),
    /PENDING must receive zero points/,
  );

  const unknownState = cloneScorecard();
  unknownState.criteria[0].status = 'PARTIAL';
  assert.throws(
    () => validateLocalTechnicalScorecard(unknownState, repositoryRoot),
    /must be EARNED or PENDING/,
  );

  const overlappingMilestones = cloneScorecard();
  overlappingMilestones.criteria.find((criterion) => criterion.id === 'IMP-015')!
    .target_95_increment = true;
  assert.throws(
    () => validateLocalTechnicalScorecard(overlappingMilestones, repositoryRoot),
    /cannot belong to both the 95 checkpoint and 98 increment/,
  );
});

test('rejects missing, escaping and non-normalized evidence paths', () => {
  const missing = cloneScorecard();
  missing.criteria[0].evidence[0].path = 'missing-evidence.json';
  assert.throws(
    () => validateLocalTechnicalScorecard(missing, repositoryRoot),
    /evidence path does not exist/,
  );

  const escaping = cloneScorecard();
  escaping.criteria[0].evidence[0].path = '../package.json';
  assert.throws(
    () => validateLocalTechnicalScorecard(escaping, repositoryRoot),
    /normalized repository-relative file path/,
  );

  const backslashes = cloneScorecard();
  backslashes.criteria[0].evidence[0].path = 'tests\\release-gates.test.ts';
  assert.throws(
    () => validateLocalTechnicalScorecard(backslashes, repositoryRoot),
    /normalized repository-relative file path/,
  );

  const reboundTargetEvidence = cloneScorecard();
  const localeCriterion = reboundTargetEvidence.criteria.find(
    (criterion) => criterion.id === 'IMP-015',
  )!;
  localeCriterion.evidence[0].path = 'lib/seo.ts';
  localeCriterion.evidence[0].locator = 'unrelated existing evidence';
  assert.throws(
    () => validateLocalTechnicalScorecard(reboundTargetEvidence, repositoryRoot),
    /must equal: lib\/i18n\/locales.ts, tests\/i18n-contract.test.ts/,
  );
});

test('calculates 98 and preserves checkpoint 95, 2/20, NO-GO and conservative multilingual verdicts', () => {
  const dishonestScore = cloneScorecard();
  dishonestScore.declared_score = 97;
  assert.throws(
    () => validateLocalTechnicalScorecard(dishonestScore, repositoryRoot),
    /declared_score: declares 97, calculated 98/,
  );

  const priorScore = cloneScorecard();
  priorScore.prior_checkpoint.score = 94;
  assert.throws(
    () => validateLocalTechnicalScorecard(priorScore, repositoryRoot),
    /must preserve the prior checkpoint score 95/,
  );

  const priorHash = cloneScorecard();
  priorHash.prior_checkpoint.scorecard_sha256 = '0'.repeat(64);
  assert.throws(
    () => validateLocalTechnicalScorecard(priorHash, repositoryRoot),
    /must preserve 6B217074A89FC1C55BBAEAD819336D6D746B1C02E7F6039D450DC7D0DD9BA012/,
  );

  const strictAcceptance = cloneScorecard();
  strictAcceptance.separation.strict_requirements.verified = 3;
  assert.throws(
    () => validateLocalTechnicalScorecard(strictAcceptance, repositoryRoot),
    /must preserve strict verification as 2\/20/,
  );

  const publicRelease = cloneScorecard();
  publicRelease.separation.public_legal_release = 'GO';
  assert.throws(
    () => validateLocalTechnicalScorecard(publicRelease, repositoryRoot),
    /must remain NO-GO/,
  );

  const inflatedTechnicalVerdict = cloneScorecard();
  inflatedTechnicalVerdict.separation.multilingual_verdicts.technical_multilingual =
    'CONFORME';
  assert.throws(
    () => validateLocalTechnicalScorecard(inflatedTechnicalVerdict, repositoryRoot),
    /must remain NO DETERMINABLE/,
  );

  const linguisticApproval = cloneScorecard();
  linguisticApproval.separation.multilingual_verdicts.linguistic_publication =
    'APROBADA';
  assert.throws(
    () => validateLocalTechnicalScorecard(linguisticApproval, repositoryRoot),
    /must remain PENDIENTE DE REVISIÓN HUMANA/,
  );

  const publicationApproval = cloneScorecard();
  publicationApproval.separation.multilingual_verdicts.publication =
    'APTO PARA PUBLICACIÓN';
  assert.throws(
    () => validateLocalTechnicalScorecard(publicationApproval, repositoryRoot),
    /must remain NO DETERMINABLE POR FALTA DE EVIDENCIA/,
  );

  const productionGate = cloneScorecard();
  productionGate.separation.unscored_release_gates[0].status = 'EARNED';
  assert.throws(
    () => validateLocalTechnicalScorecard(productionGate, repositoryRoot),
    /IMP-011 must remain present and PENDING/,
  );
});
