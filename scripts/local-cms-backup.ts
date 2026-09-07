import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

import {
  createLocalBackup,
  restoreLocalBackup,
} from '../lib/operations/local-backup.ts';

function requiredPath(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`${name} must contain an explicit local path.`);
  }
  return resolve(value);
}

const action = process.argv[2];
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

if (action === 'create') {
  const backupDirectory = requiredPath('PECADOSVIP_LOCAL_CMS_BACKUP_DIR');
  const manifest = await createLocalBackup({
    runtimeMode: 'development',
    cmsStateFile: resolve(dataRoot, 'profiles.json'),
    mediaRoot: resolve(dataRoot, 'media'),
    backupDirectory,
  });
  process.stdout.write(
    `${JSON.stringify({
      result: 'backup-created',
      backupDirectory,
      schema: manifest.schema,
      version: manifest.version,
      fileCount: manifest.fileCount,
      totalBytes: manifest.totalBytes,
      createdAt: manifest.createdAt,
    })}\n`,
  );
} else if (action === 'restore') {
  const backupDirectory = requiredPath('PECADOSVIP_LOCAL_CMS_BACKUP_DIR');
  const destinationRoot = requiredPath('PECADOSVIP_LOCAL_CMS_RESTORE_ROOT');
  const restored = await restoreLocalBackup({
    runtimeMode: 'development',
    backupDirectory,
    destinationRoot,
    overwrite: process.env.PECADOSVIP_LOCAL_CMS_RESTORE_OVERWRITE === '1',
  });
  process.stdout.write(
    `${JSON.stringify({
      result: 'backup-restored',
      destinationRoot: restored.destinationRoot,
      cmsStateFile: restored.cmsStateFile,
      mediaRoot: restored.mediaRoot,
      fileCount: restored.manifest.fileCount,
      totalBytes: restored.manifest.totalBytes,
    })}\n`,
  );
} else {
  throw new Error('Use the action "create" or "restore".');
}
