import { isAbsolute, resolve } from 'node:path';
import { tmpdir } from 'node:os';

import { exportLocalPublicationCandidate } from '../lib/publication/local-publication-candidate.ts';

function requiredAbsolutePath(name: string): string {
  const value = process.env[name];
  if (!value?.trim() || !isAbsolute(value)) {
    throw new Error(`${name} must contain an explicit absolute local path.`);
  }
  return resolve(value);
}

const defaultDataRoot = process.env.LOCALAPPDATA?.trim()
  ? resolve(process.env.LOCALAPPDATA, 'PecadosVip', 'cms-dev')
  : resolve(tmpdir(), 'pecadosvip-cms-dev');
const dataRoot = resolve(
  process.env.PECADOSVIP_LOCAL_CMS_DATA_DIR ?? defaultDataRoot,
);
if (/(?:^|[\\/])(?:OneDrive|Dropbox|Google Drive)(?:[\\/]|$)/i.test(dataRoot)) {
  throw new Error(
    'PECADOSVIP_LOCAL_CMS_DATA_DIR cannot use a consumer cloud-synced directory.',
  );
}

const referencesFilePath = requiredAbsolutePath(
  'PECADOSVIP_PUBLICATION_CANDIDATE_REFERENCES_FILE',
);
const outputDirectory = requiredAbsolutePath(
  'PECADOSVIP_PUBLICATION_CANDIDATE_OUTPUT_DIR',
);
const exported = await exportLocalPublicationCandidate({
  runtimeMode: 'development',
  stateFilePath: resolve(dataRoot, 'profiles.json'),
  referencesFilePath,
  outputDirectory,
});

process.stdout.write(
  `${JSON.stringify({
    result: 'publication-candidate-created',
    outputDirectory: exported.outputDirectory,
    schema: exported.manifest.schema,
    version: exported.manifest.version,
    purpose: exported.manifest.purpose,
    productionActivation: exported.manifest.productionActivation,
    fileCount: exported.manifest.fileCount,
    totalBytes: exported.manifest.totalBytes,
    contentSha256: exported.manifest.files[0].sha256,
  })}\n`,
);
