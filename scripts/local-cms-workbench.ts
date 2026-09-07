import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

import { startLocalCmsWorkbench } from '../lib/workbench/local-cms-workbench.ts';
import type { LocalWorkbenchOperator } from '../lib/workbench/local-cms-workbench.ts';

function optionalPort(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PECADOSVIP_LOCAL_CMS_PORT must be an integer from 1 to 65535.');
  }
  return port;
}

const operators: LocalWorkbenchOperator[] = [];
if (process.env.PECADOSVIP_LOCAL_CMS_ADMIN_TOKEN) {
  operators.push({
    token: process.env.PECADOSVIP_LOCAL_CMS_ADMIN_TOKEN,
    actorId: 'local-admin',
    role: 'admin',
  });
}
if (process.env.PECADOSVIP_LOCAL_CMS_EDITOR_TOKEN) {
  operators.push({
    token: process.env.PECADOSVIP_LOCAL_CMS_EDITOR_TOKEN,
    actorId: 'local-editor',
    role: 'editor',
  });
}
if (operators.length === 0) {
  throw new Error(
    'Set PECADOSVIP_LOCAL_CMS_ADMIN_TOKEN or PECADOSVIP_LOCAL_CMS_EDITOR_TOKEN to a random base64url token carrying at least 256 bits (43-128 characters).',
  );
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
const workbench = await startLocalCmsWorkbench({
  runtimeMode: 'development',
  stateFilePath: resolve(dataRoot, 'profiles.json'),
  mediaRoot: resolve(dataRoot, 'media'),
  operators,
  host: '127.0.0.1',
  port: optionalPort(process.env.PECADOSVIP_LOCAL_CMS_PORT),
});

process.stdout.write(
  `CMS local iniciado en ${workbench.origin}\n` +
    'Los tokens no se imprimen ni se guardan en el repositorio.\n',
);

let closing = false;
async function close(): Promise<void> {
  if (closing) return;
  closing = true;
  await workbench.close();
}

process.once('SIGINT', () => {
  void close().then(() => process.exit(0));
});
process.once('SIGTERM', () => {
  void close().then(() => process.exit(0));
});
