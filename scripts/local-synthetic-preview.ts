import { spawn } from 'node:child_process';

if (process.env.NODE_ENV === 'production') {
  throw new Error('The synthetic preview launcher is disabled in production.');
}
const packageManagerEntrypoint = process.env.npm_execpath;
if (!packageManagerEntrypoint) {
  throw new Error('Run this launcher through the package manager script.');
}

const child = spawn(
  process.execPath,
  [packageManagerEntrypoint, 'run', 'dev'],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PECADOSVIP_LOCAL_SYNTHETIC_PREVIEW: '1',
      VITE_PECADOSVIP_LOCAL_SYNTHETIC_PREVIEW: '1',
    },
    stdio: 'inherit',
  },
);

child.once('error', (error) => {
  process.stderr.write(`No se pudo iniciar el preview local: ${error.message}\n`);
  process.exitCode = 1;
});
child.once('exit', (code, signal) => {
  if (signal) {
    process.stderr.write(`El preview local terminó por señal ${signal}.\n`);
    process.exitCode = 1;
  } else {
    process.exitCode = code ?? 1;
  }
});
