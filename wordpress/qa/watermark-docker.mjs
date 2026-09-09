import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// A separate runner keeps the heavy FFmpeg jobs in the same runtime as Apache,
// rather than the auxiliary WP-CLI image. Requires docker.mjs test/up first.
const wordpress = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const compose = ['compose', '-p', 'pecadosvip-wordpress-qa', '-f', path.join(wordpress, 'docker-compose.yml')];
const output = path.join(wordpress, 'output', 'watermark-runtime-qa');
const docker = process.env.DOCKER_BIN || 'docker';
const checks = [];
await mkdir(output, { recursive: true });

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(docker, args, { cwd: wordpress, env: process.env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(stdout) : reject(new Error(`Docker exited ${code}: ${stderr}\n${stdout}`)));
  });
}

async function phase(name) {
  const stdout = await run([...compose, 'exec', '-T', '--user', '33:33', 'wordpress', 'php', '/tmp/pvc-watermark-qa.php', name]);
  const marker = stdout.split(/\r?\n/).find((line) => line.startsWith('PVC_WATERMARK_QA:'));
  assert.ok(marker, `Missing ${name} runtime evidence`);
  const result = JSON.parse(marker.slice('PVC_WATERMARK_QA:'.length));
  checks.push(result);
  await writeFile(path.join(output, `${name}.json`), JSON.stringify(result, null, 2));
  console.log(`Linux WordPress watermark QA: ${name} passed (${result.assertions} assertions).`);
  return result;
}

async function publicMedia(result) {
  const target = new URL(result.profileUrl);
  assert.equal(target.origin, 'http://127.0.0.1:8088', 'Only the disposable local QA site is allowed.');
  const page = await fetch(target, { signal: AbortSignal.timeout(30000) });
  assert.equal(page.status, 200);
  const html = await page.text();
  for (const original of result.originalUrls) assert.ok(!html.includes(original), 'Profile HTML leaked an original fixture URL.');
  for (const item of result.media) {
    const url = new URL(item.url);
    assert.equal(url.origin, target.origin);
    assert.ok(url.pathname.startsWith('/wp-content/uploads/pvc-watermarked/'));
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, `Marked ${item.kind} must be served by Apache.`);
    assert.match(response.headers.get('content-type') || '', item.kind === 'video' ? /^video\/mp4/ : /^image\//);
    assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'), item.sha256, 'HTTP bytes must match the verified derivative.');
    assert.ok(html.includes(item.url), `Profile HTML must use marked ${item.kind}.`);
  }
  checks.push({ phase: 'http', passed: true, mediaCount: result.media.length });
}

let failure;
try {
  await run([...compose, 'cp', path.join(wordpress, 'qa', 'watermark-runtime.php'), 'wordpress:/tmp/pvc-watermark-qa.php']);
  await phase('cleanup');
  const prepared = await phase('prepare');
  await publicMedia(prepared);
  for (const artifact of prepared.artifacts) {
    assert.match(artifact.name, /^[a-z-]+\.png$/);
    assert.ok(artifact.path.startsWith('/var/www/html/wp-content/uploads/'));
    await run([...compose, 'cp', `wordpress:${artifact.path}`, path.join(output, artifact.name)]);
  }
  await run([...compose, 'restart', 'wordpress', 'db']);
  await run([...compose, 'up', '-d', '--wait', '--wait-timeout', '180', 'wordpress']);
  const persisted = await phase('verify');
  assert.deepEqual(persisted.derivativeIds, prepared.derivativeIds, 'Restart must preserve the same derivative attachments.');
  await publicMedia(persisted);
} catch (error) {
  failure = error;
  checks.push({ phase: 'failure', passed: false, error: error.stack || String(error) });
} finally {
  try { await phase('cleanup'); } catch (error) { failure ||= error; checks.push({ phase: 'cleanup-failure', passed: false, error: String(error) }); }
  await writeFile(path.join(output, 'report.json'), JSON.stringify({ passed: !failure, environment: 'Linux Docker WordPress/PHP/MariaDB with real GD and FFmpeg', checks }, null, 2));
}
if (failure) throw failure;
