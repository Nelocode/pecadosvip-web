import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const wordpress = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const command = process.argv[2] || 'up';
const subdirectory = process.argv.includes('--subdirectory');
const project = `pecadosvip-wordpress-qa${subdirectory ? '-subdirectory' : ''}`;
const port = subdirectory ? '8089' : '8088';
const environment = { ...process.env, WP_QA_PORT: port, WP_QA_PATH: subdirectory ? '/demo' : '' };
const compose = ['compose', '-p', project, '-f', path.join(wordpress, 'docker-compose.yml')];
if (subdirectory) compose.push('-f', path.join(wordpress, 'qa', 'docker-compose.subdirectory.yml'));

let docker = process.env.DOCKER_BIN || 'docker';
if (process.platform === 'win32' && !process.env.DOCKER_BIN) {
  const desktopDocker = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Docker', 'Docker', 'resources', 'bin', 'docker.exe');
  try { await access(desktopDocker); docker = desktopDocker; } catch { /* Fall back to PATH. */ }
}

function run(parameters, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(docker, parameters, { cwd: wordpress, env: environment, windowsHide: true, stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
    let output = '';
    if (options.capture) {
      child.stdout.on('data', (data) => { output += data; });
      child.stderr.on('data', (data) => { output += data; });
    }
    child.on('error', (error) => reject(new Error(error.code === 'ENOENT'
      ? 'Docker no está instalado o no está en PATH. Instala/abre Docker Desktop con contenedores Linux y vuelve a ejecutar este comando.'
      : error.message)));
    child.on('close', (code) => code === 0 ? resolve(output) : reject(new Error(`Docker terminó con código ${code}.${options.capture ? ` ${output.trim()}` : ''}`)));
  });
}

async function prepareSecrets() {
  const secretDirectory = path.join(wordpress, 'output', 'docker-secrets');
  await mkdir(secretDirectory, { recursive: true });
  for (const name of ['db-password.txt', 'db-root-password.txt', 'admin-password.txt']) {
    try {
      await writeFile(path.join(secretDirectory, name), randomBytes(32).toString('base64url'), { flag: 'wx', mode: 0o600 });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
}

try {
  if (!['up', 'test', 'status', 'down'].includes(command)) throw new Error('Uso: node wordpress/qa/docker.mjs up|test|status|down [--subdirectory]');
  await run(['info', '--format', '{{.ServerVersion}}'], { capture: true });
  await run(['compose', 'version', '--short'], { capture: true });
  if (command === 'up' || command === 'test') {
    await access(path.join(wordpress, 'dist', 'pecadosvip', 'content', 'seed.json'));
    await access(path.join(wordpress, 'dist', 'pecadosvip-content', 'pecadosvip-content.php'));
    await prepareSecrets();
    await run([...compose, 'config', '--quiet']);
    await run([...compose, 'up', '-d', '--wait', '--wait-timeout', '180', 'wordpress']);
    await run([...compose, 'run', '--rm', 'cli', 'wp', 'eval-file', '/qa/bootstrap.php', '--skip-wordpress']);
    await run([...compose, 'run', '--rm', 'cli', 'wp', 'eval-file', '/qa/install.php']);
    console.log(`WordPress local: http://127.0.0.1:${port}${subdirectory ? '/demo' : ''}/es`);
  }
  if (command === 'test') {
    await run([...compose, 'run', '--rm', '-e', 'PVWP_THEME_DIR=/var/www/html/wp-content/themes/pecadosvip', '--entrypoint', 'php', 'cli', '/theme-tests/router-test.php']);
    await run([...compose, 'run', '--rm', 'cli', 'wp', 'eval-file', '/qa/cleanup.php']);
    try {
      const runtimeOutput = await run([...compose, 'run', '--rm', 'cli', 'wp', 'eval-file', '/qa/runtime-check.php'], { capture: true });
      const fixtureLine = runtimeOutput.split(/\r?\n/).find((line) => line.startsWith('PVWP_QA_FIXTURE:'));
      if (!fixtureLine) throw new Error('WordPress no devolvió las fixtures de contenido editable.');
      console.log(runtimeOutput.split(/\r?\n/).filter((line) => !line.startsWith('PVWP_QA_FIXTURE:')).join('\n').trim());
      const fixture = JSON.parse(fixtureLine.slice('PVWP_QA_FIXTURE:'.length));
      const { runHttpSmoke } = await import('./http-smoke.mjs');
      await runHttpSmoke(`http://127.0.0.1:${port}${subdirectory ? '/demo' : ''}`, fixture);
    } finally {
      await run([...compose, 'run', '--rm', 'cli', 'wp', 'eval-file', '/qa/cleanup.php']);
    }
  }
  if (command === 'status') await run([...compose, 'ps']);
  if (command === 'down') await run([...compose, 'down']);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
