import { createHash, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { isAbsolute, parse, resolve } from 'node:path';

import { PersistentJsonProfileRepository } from '../content/persistent-repository.ts';
import { RepositoryError } from '../content/repository.ts';
import type {
  Actor,
  EditableProfilePatch,
  NewProfileInput,
} from '../content/repository.ts';
import { citySlugs } from '../content/types.ts';
import type {
  Availability,
  CitySlug,
  CmsRole,
  MediaAsset,
  Profile,
  PublicationStatus,
} from '../content/types.ts';
import type { ProfilePublicationReferences } from '../content/validation.ts';
import {
  LocalMediaStore,
  LocalMediaStoreError,
} from '../media/local-media-store.ts';
import type {
  LocalMediaRecord,
  SupportedMediaType,
} from '../media/local-media-store.ts';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1']);
const DEFAULT_JSON_LIMIT = 1024 * 1024;
const MEDIA_JSON_LIMIT = 17 * 1024 * 1024;
const MAX_WORKBENCH_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_WORKBENCH_VIDEO_BYTES = 12 * 1024 * 1024;
const tokenPattern = /^[A-Za-z0-9_-]{43,128}$/;
const actorIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const profileIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const availabilityValues = new Set<Availability>([
  'available',
  'limited',
  'unavailable',
  'on-request',
]);
const statusValues = new Set<PublicationStatus>([
  'draft',
  'hidden',
  'published',
  'archived',
]);

export type LocalWorkbenchOperator = {
  token: string;
  actorId: string;
  role: CmsRole;
};

export type LocalCmsWorkbenchOptions = {
  runtimeMode: 'development' | 'test';
  stateFilePath: string;
  mediaRoot: string;
  operators: readonly LocalWorkbenchOperator[];
  host?: '127.0.0.1' | '::1';
  port?: number;
  seedProfiles?: readonly Profile[];
  publicationReferences?: ProfilePublicationReferences;
  clock?: () => string;
};

export type LocalCmsWorkbenchHandle = {
  origin: string;
  stateFilePath: string;
  mediaRoot: string;
  close(): Promise<void>;
};

type AuthenticatedOperator = {
  tokenDigest: Buffer;
  actor: Actor;
};

class WorkbenchRequestError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'WorkbenchRequestError';
    this.status = status;
    this.code = code;
  }
}

function digestToken(token: string): Buffer {
  return createHash('sha256').update(token, 'utf8').digest();
}

function isStrongLocalToken(token: string): boolean {
  return tokenPattern.test(token) && new Set(token).size >= 16;
}

function normalizeLocalPath(path: string, label: string): string {
  if (!path.trim() || !isAbsolute(path)) {
    throw new WorkbenchRequestError(
      400,
      'INVALID_CONFIGURATION',
      `${label} must be an explicit absolute path.`,
    );
  }
  const normalized = resolve(path);
  if (normalized === parse(normalized).root) {
    throw new WorkbenchRequestError(
      400,
      'INVALID_CONFIGURATION',
      `${label} cannot be a filesystem root.`,
    );
  }
  return normalized;
}

function buildOperators(
  operators: readonly LocalWorkbenchOperator[],
): AuthenticatedOperator[] {
  if (operators.length < 1) {
    throw new WorkbenchRequestError(
      400,
      'INVALID_CONFIGURATION',
      'At least one local operator is required.',
    );
  }
  const digests = new Set<string>();
  return operators.map((operator) => {
    if (
      !isStrongLocalToken(operator.token) ||
      !actorIdPattern.test(operator.actorId) ||
      (operator.role !== 'admin' && operator.role !== 'editor')
    ) {
      throw new WorkbenchRequestError(
        400,
        'INVALID_CONFIGURATION',
        'Each operator requires a valid opaque token, actor ID and role.',
      );
    }
    const tokenDigest = digestToken(operator.token);
    const encodedDigest = tokenDigest.toString('hex');
    if (digests.has(encodedDigest)) {
      throw new WorkbenchRequestError(
        400,
        'INVALID_CONFIGURATION',
        'Local operator tokens must be unique.',
      );
    }
    digests.add(encodedDigest);
    return {
      tokenDigest,
      actor: { id: operator.actorId, role: operator.role },
    };
  });
}

function commonHeaders(contentType: string): Record<string, string> {
  return {
    'Cache-Control': 'no-store, max-age=0',
    'Content-Security-Policy':
      "default-src 'none'; base-uri 'none'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'",
    'Content-Type': contentType,
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  };
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  response.writeHead(status, commonHeaders('application/json; charset=utf-8'));
  response.end(`${JSON.stringify(body)}\n`);
}

function sendText(
  response: ServerResponse,
  status: number,
  contentType: string,
  body: string,
): void {
  response.writeHead(status, commonHeaders(contentType));
  response.end(body);
}

function sendBytes(
  response: ServerResponse,
  status: number,
  contentType: string,
  bytes: Uint8Array,
): void {
  response.writeHead(status, {
    ...commonHeaders(contentType),
    'Content-Disposition': 'inline',
    'Content-Length': String(bytes.byteLength),
  });
  response.end(bytes);
}

function authenticate(
  request: IncomingMessage,
  operators: readonly AuthenticatedOperator[],
): Actor {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    throw new WorkbenchRequestError(
      401,
      'AUTHENTICATION_REQUIRED',
      'A local operator token is required.',
    );
  }
  const candidate = authorization.slice('Bearer '.length);
  if (!isStrongLocalToken(candidate)) {
    throw new WorkbenchRequestError(
      401,
      'AUTHENTICATION_REQUIRED',
      'A local operator token is required.',
    );
  }
  const candidateDigest = digestToken(candidate);
  for (const operator of operators) {
    if (
      candidateDigest.length === operator.tokenDigest.length &&
      timingSafeEqual(candidateDigest, operator.tokenDigest)
    ) {
      return structuredClone(operator.actor);
    }
  }
  throw new WorkbenchRequestError(
    401,
    'AUTHENTICATION_REQUIRED',
    'A local operator token is required.',
  );
}

function enforceSameOrigin(request: IncomingMessage, origin: string): void {
  if (request.headers.origin !== origin) {
    throw new WorkbenchRequestError(
      403,
      'ORIGIN_REJECTED',
      'State-changing requests require the exact local workbench origin.',
    );
  }
  const fetchSite = request.headers['sec-fetch-site'];
  if (
    typeof fetchSite === 'string' &&
    fetchSite !== 'same-origin' &&
    fetchSite !== 'none'
  ) {
    throw new WorkbenchRequestError(
      403,
      'ORIGIN_REJECTED',
      'Cross-site requests are not accepted.',
    );
  }
}

async function readJson(
  request: IncomingMessage,
  byteLimit = DEFAULT_JSON_LIMIT,
): Promise<Record<string, unknown>> {
  const contentType = request.headers['content-type']?.split(';')[0]?.trim();
  if (contentType !== 'application/json') {
    throw new WorkbenchRequestError(
      415,
      'UNSUPPORTED_CONTENT_TYPE',
      'Requests must use application/json.',
    );
  }
  const declaredLength = Number(request.headers['content-length'] ?? 0);
  if (
    !Number.isSafeInteger(declaredLength) ||
    declaredLength < 0 ||
    declaredLength > byteLimit
  ) {
    throw new WorkbenchRequestError(
      413,
      'REQUEST_TOO_LARGE',
      'The request body exceeds the local workbench limit.',
    );
  }
  const chunks: Buffer[] = [];
  let byteLength = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += buffer.byteLength;
    if (byteLength > byteLimit) {
      throw new WorkbenchRequestError(
        413,
        'REQUEST_TOO_LARGE',
        'The request body exceeds the local workbench limit.',
      );
    }
    chunks.push(buffer);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new WorkbenchRequestError(
      400,
      'INVALID_JSON',
      'The request body is not valid JSON.',
    );
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new WorkbenchRequestError(
      400,
      'INVALID_INPUT',
      'The request body must be a JSON object.',
    );
  }
  return parsed as Record<string, unknown>;
}

function assertAllowedKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): void {
  const allowedSet = new Set(allowed);
  if (Object.keys(value).some((key) => !allowedSet.has(key))) {
    throw new WorkbenchRequestError(
      400,
      'INVALID_INPUT',
      'The request contains unsupported fields.',
    );
  }
}

function requiredString(
  value: unknown,
  label: string,
  maxLength = 512,
): string {
  if (typeof value !== 'string') {
    throw new WorkbenchRequestError(400, 'INVALID_INPUT', `${label} is required.`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new WorkbenchRequestError(
      400,
      'INVALID_INPUT',
      `${label} is invalid.`,
    );
  }
  return normalized;
}

function expectedRevision(value: unknown): number {
  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new WorkbenchRequestError(
      400,
      'INVALID_INPUT',
      'expectedRevision must be a positive integer.',
    );
  }
  return Number(value);
}

function stringArray(
  value: unknown,
  label: string,
  maxItems = 32,
): string[] {
  if (
    !Array.isArray(value) ||
    value.length > maxItems ||
    value.some(
      (entry) =>
        typeof entry !== 'string' ||
        !entry.trim() ||
        entry.trim().length > 128,
    )
  ) {
    throw new WorkbenchRequestError(400, 'INVALID_INPUT', `${label} is invalid.`);
  }
  return value.map((entry) => entry.trim());
}

function cityArray(value: unknown): CitySlug[] {
  const values = stringArray(value, 'citySlugs', citySlugs.length);
  if (
    values.length < 1 ||
    values.some((entry) => !citySlugs.includes(entry as CitySlug))
  ) {
    throw new WorkbenchRequestError(
      400,
      'INVALID_INPUT',
      'citySlugs must contain known service cities.',
    );
  }
  return [...new Set(values)] as CitySlug[];
}

function nullableAdultAge(value: unknown): number | null {
  if (value === null) return null;
  if (!Number.isInteger(value) || Number(value) < 18 || Number(value) > 120) {
    throw new WorkbenchRequestError(
      400,
      'INVALID_INPUT',
      'age must be null or an adult age.',
    );
  }
  return Number(value);
}

function parseCreateInput(body: Record<string, unknown>): NewProfileInput {
  assertAllowedKeys(body, [
    'id',
    'slug',
    'displayName',
    'age',
    'biography',
    'languages',
    'serviceIds',
    'citySlugs',
  ]);
  const id = requiredString(body.id, 'id', 128);
  const slug = requiredString(body.slug, 'slug', 128);
  if (!profileIdPattern.test(id) || !slugPattern.test(slug)) {
    throw new WorkbenchRequestError(
      400,
      'INVALID_INPUT',
      'Profile ID or slug is not URL-safe.',
    );
  }
  return {
    id,
    slug,
    displayName: requiredString(body.displayName, 'displayName', 120),
    age: nullableAdultAge(body.age),
    biography: requiredString(body.biography, 'biography', 4000),
    measurements: {},
    languages: stringArray(body.languages, 'languages', 16),
    serviceIds: stringArray(body.serviceIds, 'serviceIds', 32),
    media: [],
    citySlugs: cityArray(body.citySlugs),
  };
}

function parseUpdatePatch(
  body: Record<string, unknown>,
): { expectedRevision: number; patch: EditableProfilePatch } {
  assertAllowedKeys(body, [
    'expectedRevision',
    'displayName',
    'age',
    'biography',
    'languages',
    'serviceIds',
    'citySlugs',
  ]);
  const patch: EditableProfilePatch = {};
  if ('displayName' in body) {
    patch.displayName = requiredString(body.displayName, 'displayName', 120);
  }
  if ('age' in body) patch.age = nullableAdultAge(body.age);
  if ('biography' in body) {
    patch.biography = requiredString(body.biography, 'biography', 4000);
  }
  if ('languages' in body) {
    patch.languages = stringArray(body.languages, 'languages', 16);
  }
  if ('serviceIds' in body) {
    patch.serviceIds = stringArray(body.serviceIds, 'serviceIds', 32);
  }
  if ('citySlugs' in body) patch.citySlugs = cityArray(body.citySlugs);
  if (Object.keys(patch).length < 1) {
    throw new WorkbenchRequestError(
      400,
      'INVALID_INPUT',
      'At least one editable field is required.',
    );
  }
  return { expectedRevision: expectedRevision(body.expectedRevision), patch };
}

function mutationRequestId(request: IncomingMessage): string {
  const requestId = request.headers['idempotency-key'];
  if (typeof requestId !== 'string' || !requestIdPattern.test(requestId)) {
    throw new WorkbenchRequestError(
      400,
      'IDEMPOTENCY_KEY_REQUIRED',
      'State-changing requests require an opaque Idempotency-Key header.',
    );
  }
  return requestId;
}

function routeProfileId(pathname: string, suffix: string): string | undefined {
  const match = pathname.match(
    new RegExp(`^/api/profiles/([^/]+)/${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
  );
  if (!match) return undefined;
  let id: string;
  try {
    id = decodeURIComponent(match[1]);
  } catch {
    throw new WorkbenchRequestError(400, 'INVALID_INPUT', 'Invalid profile path.');
  }
  if (!profileIdPattern.test(id)) {
    throw new WorkbenchRequestError(400, 'INVALID_INPUT', 'Invalid profile path.');
  }
  return id;
}

function statusForError(error: unknown): {
  status: number;
  code: string;
  message: string;
} {
  if (error instanceof WorkbenchRequestError) {
    return { status: error.status, code: error.code, message: error.message };
  }
  if (error instanceof RepositoryError) {
    const status =
      error.code === 'FORBIDDEN'
        ? 403
        : error.code === 'NOT_FOUND'
          ? 404
          : error.code === 'REVISION_CONFLICT' ||
              error.code === 'DUPLICATE_REQUEST' ||
              error.code === 'DUPLICATE_ID' ||
              error.code === 'DUPLICATE_SLUG' ||
              error.code === 'INVALID_STATE' ||
              error.code === 'PERSISTENCE_BUSY'
            ? 409
            : error.code === 'PERSISTENCE_CORRUPT' ||
                error.code === 'PERSISTENCE_UNAVAILABLE'
              ? 500
              : 400;
    return { status, code: error.code, message: error.message };
  }
  if (error instanceof LocalMediaStoreError) {
    const status =
      error.code === 'MEDIA_NOT_FOUND'
        ? 404
        : error.code === 'MEDIA_ARCHIVED' ||
            error.code === 'DUPLICATE_REQUEST'
          ? 409
          : error.code === 'CAPACITY_EXCEEDED'
            ? 507
          : error.code === 'INTEGRITY_FAILURE'
            ? 500
            : error.code === 'MEDIA_TOO_LARGE'
              ? 413
              : 400;
    return { status, code: error.code, message: error.message };
  }
  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'The local workbench request could not be completed.',
  };
}

function projectProfileRecord(profile: Profile, actor: Actor) {
  if (actor.role === 'admin') return structuredClone(profile);
  const editorProfile = structuredClone(profile);
  Reflect.deleteProperty(editorProfile, 'verificationEvidenceReference');
  editorProfile.approval = { state: profile.approval.state };
  editorProfile.media = editorProfile.media.map((media) => {
    Reflect.deleteProperty(media, 'rightsEvidence');
    return media;
  });
  return editorProfile;
}

function projectMediaRecord(record: LocalMediaRecord, actor: Actor) {
  const { auditEvents, ...safeRecord } = record;
  if (actor.role === 'editor') {
    const editorRecord = structuredClone(safeRecord);
    Reflect.deleteProperty(editorRecord, 'rightsEvidenceReference');
    Reflect.deleteProperty(editorRecord, 'sha256');
    Reflect.deleteProperty(editorRecord, 'storageKey');
    if (editorRecord.processing) {
      Reflect.deleteProperty(editorRecord.processing, 'sourceSha256');
      editorRecord.processing.variants = editorRecord.processing.variants.map(
        (variant) => {
          const projected = structuredClone(variant);
          Reflect.deleteProperty(projected, 'sha256');
          Reflect.deleteProperty(projected, 'storageKey');
          return projected;
        },
      );
    }
    return {
      ...editorRecord,
      auditEventCount: auditEvents.length,
    };
  }
  return {
    ...safeRecord,
    auditEventCount: auditEvents.length,
  };
}

const workbenchHtml = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>PecadosVip · CMS local</title>
  <style>
    :root{color-scheme:dark;background:#080706;color:#f5eee3;font:16px/1.5 system-ui,sans-serif}
    body{max-width:74rem;margin:auto;padding:1.5rem}h1,h2{color:#d8a657}button,input,textarea,select{font:inherit;padding:.6rem;border:1px solid #9b6a2f;background:#111;color:inherit}button{cursor:pointer}form,.panel{display:grid;gap:.7rem;padding:1rem;margin:1rem 0;border:1px solid #49341f}label{display:grid;gap:.25rem}.row{display:flex;gap:.5rem;flex-wrap:wrap}.status{min-height:1.5rem}.warning{border-left:.3rem solid #d8a657;padding:.8rem;background:#171109}ul{padding-left:1.2rem}code{overflow-wrap:anywhere}
  </style>
  <script src="/workbench.js" defer></script>
</head>
<body>
  <a href="#main">Saltar al contenido</a>
  <main id="main">
    <h1>CMS local PecadosVip</h1>
    <p class="warning">Solo desarrollo local. No autentica contra un proveedor real, no publica y no debe recibir datos sin autorización y evidencia.</p>
    <section class="panel" aria-labelledby="session-title">
      <h2 id="session-title">Sesión local</h2>
      <label>Token del operador <input id="token" type="password" autocomplete="off"></label>
      <div class="row"><button id="connect" type="button">Conectar</button><button id="refresh" type="button">Actualizar</button></div>
      <p id="status" class="status" role="status" aria-live="polite"></p>
    </section>
    <section aria-labelledby="create-title">
      <h2 id="create-title">Crear borrador</h2>
      <form id="create-form">
        <label>ID opaco <input name="id" required></label>
        <label>Slug <input name="slug" required></label>
        <label>Nombre visible <input name="displayName" required></label>
        <label>Edad adulta <input name="age" type="number" min="18" max="120" required></label>
        <label>Biografía <textarea name="biography" required></textarea></label>
        <label>Ciudad <select name="citySlugs"><option>madrid</option><option>barcelona</option><option>girona</option><option>tarragona</option><option>toledo</option><option>guadalajara</option><option>segovia</option></select></label>
        <button type="submit">Crear borrador</button>
      </form>
    </section>
    <section aria-labelledby="profiles-title"><h2 id="profiles-title">Perfiles</h2><ul id="profiles"></ul></section>
    <section aria-labelledby="media-title">
      <h2 id="media-title">Medios locales</h2>
      <form id="media-form">
        <label>Imagen (máximo 5 MiB) o MP4 (máximo 12 MiB) <input name="file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4" required></label>
        <label>Texto alternativo <input name="alt" required maxlength="240"></label>
        <label>Referencia de derechos <input name="rightsEvidenceReference" required></label>
        <button type="submit">Guardar medio</button>
      </form>
      <ul id="media"></ul>
    </section>
    <section aria-labelledby="audit-title"><h2 id="audit-title">Bitácora</h2><button id="audit" type="button">Cargar bitácora (admin)</button><ul id="events"></ul></section>
  </main>
</body>
</html>
`;

const workbenchJavaScript = String.raw`'use strict';
const byId = (id) => document.getElementById(id);
let token = '';
let actorRole = '';
const status = (message) => { byId('status').textContent = message; };
async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', 'Bearer ' + token);
  if (options.body) headers.set('Content-Type', 'application/json');
  if (options.method === 'POST') headers.set('Idempotency-Key', 'ui-' + crypto.randomUUID());
  const response = await fetch(path, { ...options, headers });
  const body = await response.json();
  if (!response.ok) throw new Error(body.code + ': ' + body.message);
  return body;
}
function button(label, action) {
  const control = document.createElement('button');
  control.type = 'button';
  control.textContent = label;
  control.addEventListener('click', async () => {
    try { await action(); await refresh(); } catch (error) { status(String(error)); }
  });
  return control;
}
async function refresh() {
  const archiveQuery = actorRole === 'admin' ? '?includeArchived=1' : '';
  const result = await api('/api/profiles' + archiveQuery);
  const list = byId('profiles'); list.replaceChildren();
  for (const profile of result.profiles) {
    const item = document.createElement('li');
    const description = document.createElement('p');
    description.textContent = profile.displayName + ' · ' + profile.status + ' · ' + profile.availability + ' · revisión ' + profile.revision;
    item.append(description);
    item.append(button('Editar nombre', async () => {
      const displayName = prompt('Nombre visible', profile.displayName);
      if (displayName) await api('/api/profiles/' + encodeURIComponent(profile.id) + '/update', {method:'POST',body:JSON.stringify({expectedRevision:profile.revision,displayName})});
    }));
    item.append(button('Duplicar', async () => {
      const id = prompt('Nuevo ID opaco'); const slug = prompt('Nuevo slug');
      if (id && slug) await api('/api/profiles/' + encodeURIComponent(profile.id) + '/duplicate', {method:'POST',body:JSON.stringify({expectedRevision:profile.revision,id,slug})});
    }));
    if (actorRole === 'admin') item.append(button(profile.status === 'archived' ? 'Restaurar' : 'Archivar', async () => {
      await api('/api/profiles/' + encodeURIComponent(profile.id) + '/status', {method:'POST',body:JSON.stringify({expectedRevision:profile.revision,status:profile.status === 'archived'?'draft':'archived'})});
    }));
    item.append(button('Cambiar disponibilidad', async () => {
      const availability = prompt('available | limited | unavailable | on-request', profile.availability);
      if (availability) await api('/api/profiles/' + encodeURIComponent(profile.id) + '/availability', {method:'POST',body:JSON.stringify({expectedRevision:profile.revision,availability})});
    }));
    item.append(button('Ordenar medios', async () => {
      const current = profile.media.map((entry) => entry.id).join(',');
      const ordered = prompt('IDs separados por coma', current);
      if (ordered !== null) await api('/api/profiles/' + encodeURIComponent(profile.id) + '/reorder-media', {method:'POST',body:JSON.stringify({expectedRevision:profile.revision,orderedMediaIds:ordered.split(',').map((entry)=>entry.trim()).filter(Boolean)})});
    }));
    if (profile.media.length > 0) item.append(button('Desvincular medio', async () => {
      const mediaId = prompt('ID del medio a desvincular', profile.media[0].id);
      if (mediaId) await api('/api/profiles/' + encodeURIComponent(profile.id) + '/detach-media', {method:'POST',body:JSON.stringify({expectedRevision:profile.revision,mediaId})});
    }));
    list.append(item);
  }
  const mediaResult = await api('/api/media' + archiveQuery);
  const mediaList = byId('media'); mediaList.replaceChildren();
  for (const record of mediaResult.media) {
    const item = document.createElement('li'); item.textContent = record.id + ' · ' + record.kind + ' · ' + record.contentType + ' · ' + record.status + (record.processing ? ' · ' + record.processing.pipeline : '');
    if (record.status !== 'archived') item.append(button('Adjuntar a perfil', async () => {
      const profileId = prompt('ID del perfil'); const expectedRevision = Number(prompt('Revisión esperada'));
      if (profileId && Number.isInteger(expectedRevision)) await api('/api/profiles/' + encodeURIComponent(profileId) + '/attach-media', {method:'POST',body:JSON.stringify({expectedRevision,mediaId:record.id})});
    }));
    if (actorRole === 'admin' && record.status !== 'archived') item.append(button('Archivar medio', () => api('/api/media/' + encodeURIComponent(record.id) + '/archive', {method:'POST',body:'{}'})));
    if (actorRole === 'admin' && record.status === 'archived') item.append(button('Restaurar medio', () => api('/api/media/' + encodeURIComponent(record.id) + '/restore', {method:'POST',body:'{}'})));
    mediaList.append(item);
  }
  status('Datos locales actualizados.');
}
byId('connect').addEventListener('click', async () => {
  token = byId('token').value;
  try { const session = await api('/api/session'); actorRole = session.actor.role; byId('audit').disabled = actorRole !== 'admin'; status('Conectado como ' + session.actor.id + ' (' + actorRole + ').'); await refresh(); } catch (error) { actorRole = ''; status(String(error)); }
});
byId('refresh').addEventListener('click', () => refresh().catch((error) => status(String(error))));
byId('create-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
  const body = {id:data.get('id'),slug:data.get('slug'),displayName:data.get('displayName'),age:Number(data.get('age')),biography:data.get('biography'),languages:['es'],serviceIds:[],citySlugs:[data.get('citySlugs')]};
  try { await api('/api/profiles', {method:'POST',body:JSON.stringify(body)}); form.reset(); await refresh(); } catch (error) { status(String(error)); }
});
byId('media-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const file = data.get('file');
  if (!(file instanceof File)) return;
  const image = ['image/jpeg','image/png','image/webp'].includes(file.type);
  const video = file.type === 'video/mp4';
  if ((!image && !video) || (image && file.size > 5 * 1024 * 1024) || (video && file.size > 12 * 1024 * 1024)) { status('La consola local acepta JPEG, PNG o WebP de hasta 5 MiB y MP4 no fragmentado de hasta 12 MiB.'); return; }
  const bytes = new Uint8Array(await file.arrayBuffer()); let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  const body = {bytesBase64:btoa(binary),contentType:file.type,alt:data.get('alt'),rightsEvidenceReference:data.get('rightsEvidenceReference')};
  try { await api('/api/media', {method:'POST',body:JSON.stringify(body)}); form.reset(); await refresh(); } catch (error) { status(String(error)); }
});
byId('audit').addEventListener('click', async () => {
  try { const result = await api('/api/audit'); const list = byId('events'); list.replaceChildren(); for (const entry of result.events) { const item=document.createElement('li'); item.textContent=entry.id+' · '+entry.action+' · '+entry.entityId+' · '+entry.occurredAt; list.append(item); } status('Bitácora cargada.'); } catch (error) { status(String(error)); }
});
`;

function requireAdmin(actor: Actor): void {
  if (actor.role !== 'admin') {
    throw new WorkbenchRequestError(
      403,
      'FORBIDDEN',
      'This local operation requires the admin role.',
    );
  }
}

export async function startLocalCmsWorkbench(
  options: LocalCmsWorkbenchOptions,
): Promise<LocalCmsWorkbenchHandle> {
  if (
    (options.runtimeMode !== 'development' && options.runtimeMode !== 'test') ||
    process.env.NODE_ENV === 'production'
  ) {
    throw new WorkbenchRequestError(
      403,
      'PRODUCTION_DISABLED',
      'The local CMS workbench cannot run in production.',
    );
  }
  const host = options.host ?? '127.0.0.1';
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new WorkbenchRequestError(
      403,
      'NON_LOOPBACK_DISABLED',
      'The local CMS workbench only binds to loopback.',
    );
  }
  const port = options.port ?? 0;
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new WorkbenchRequestError(
      400,
      'INVALID_CONFIGURATION',
      'The local port is invalid.',
    );
  }
  const stateFilePath = normalizeLocalPath(options.stateFilePath, 'stateFilePath');
  const mediaRoot = normalizeLocalPath(options.mediaRoot, 'mediaRoot');
  const operators = buildOperators(options.operators);
  const repository = new PersistentJsonProfileRepository({
    filePath: stateFilePath,
    runtimeMode: options.runtimeMode,
    seedProfiles: options.seedProfiles,
    publicationReferences: options.publicationReferences,
    clock: options.clock,
  });
  const mediaStore = new LocalMediaStore(mediaRoot, options.clock);
  await mediaStore.initialize();

  let origin = '';
  const server: Server = createServer(async (request, response) => {
    try {
      if (!request.url || !request.method) {
        throw new WorkbenchRequestError(400, 'INVALID_REQUEST', 'Invalid request.');
      }
      const url = new URL(request.url, origin || `http://${host}`);
      if (request.method === 'GET' && url.pathname === '/') {
        sendText(response, 200, 'text/html; charset=utf-8', workbenchHtml);
        return;
      }
      if (request.method === 'GET' && url.pathname === '/workbench.js') {
        sendText(
          response,
          200,
          'text/javascript; charset=utf-8',
          workbenchJavaScript,
        );
        return;
      }
      if (request.method === 'GET' && url.pathname === '/favicon.ico') {
        sendText(response, 204, 'image/x-icon', '');
        return;
      }
      if (request.method === 'GET' && url.pathname === '/health') {
        sendJson(response, 200, {
          status: 'local-only',
          production: false,
          persistence: 'configured',
        });
        return;
      }
      const localMediaMatch = url.pathname.match(
        /^\/__local-media\/([0-9a-f-]+)\/(desktop|mobile|original)$/i,
      );
      if (request.method === 'GET' && localMediaMatch) {
        authenticate(request, operators);
        const payload = await mediaStore.readVariant(
          localMediaMatch[1],
          localMediaMatch[2].toLowerCase() as
            | 'desktop'
            | 'mobile'
            | 'original',
        );
        sendBytes(response, 200, payload.variant.contentType, payload.bytes);
        return;
      }
      if (!url.pathname.startsWith('/api/')) {
        throw new WorkbenchRequestError(404, 'NOT_FOUND', 'Route not found.');
      }

      const actor = authenticate(request, operators);
      if (request.method === 'GET' && url.pathname === '/api/session') {
        sendJson(response, 200, { actor });
        return;
      }
      if (request.method === 'GET' && url.pathname === '/api/profiles') {
        const includeArchived = url.searchParams.get('includeArchived') === '1';
        if (includeArchived) requireAdmin(actor);
        sendJson(response, 200, {
          profiles: repository
            .listProfiles(actor, includeArchived)
            .map((profile) => projectProfileRecord(profile, actor)),
        });
        return;
      }
      if (request.method === 'GET' && url.pathname === '/api/audit') {
        requireAdmin(actor);
        const media = await mediaStore.list(true);
        sendJson(response, 200, {
          events: repository.listAuditEvents(actor),
          mediaEvents: media.flatMap((record) =>
            record.auditEvents.map((event) => ({
              ...event,
              entityType: 'media',
              entityId: record.id,
            })),
          ),
        });
        return;
      }
      if (request.method === 'GET' && url.pathname === '/api/media') {
        const includeArchived = url.searchParams.get('includeArchived') === '1';
        if (includeArchived) requireAdmin(actor);
        sendJson(response, 200, {
          media: (await mediaStore.list(includeArchived)).map((record) =>
            projectMediaRecord(record, actor),
          ),
        });
        return;
      }

      if (request.method !== 'POST') {
        throw new WorkbenchRequestError(
          405,
          'METHOD_NOT_ALLOWED',
          'Method not allowed.',
        );
      }
      enforceSameOrigin(request, origin);
      const operationRequestId = mutationRequestId(request);

      if (url.pathname === '/api/profiles') {
        const input = parseCreateInput(await readJson(request));
        const profile = repository.createProfile(input, {
          actor,
          requestId: operationRequestId,
        });
        sendJson(response, 201, { profile: projectProfileRecord(profile, actor) });
        return;
      }

      const updateId = routeProfileId(url.pathname, 'update');
      if (updateId) {
        const { expectedRevision: revision, patch } = parseUpdatePatch(
          await readJson(request),
        );
        const profile = repository.updateProfile(updateId, patch, {
          actor,
          requestId: operationRequestId,
          expectedRevision: revision,
        });
        sendJson(response, 200, { profile: projectProfileRecord(profile, actor) });
        return;
      }

      const duplicateId = routeProfileId(url.pathname, 'duplicate');
      if (duplicateId) {
        const body = await readJson(request);
        assertAllowedKeys(body, ['expectedRevision', 'id', 'slug']);
        const id = requiredString(body.id, 'id', 128);
        const slug = requiredString(body.slug, 'slug', 128);
        if (!profileIdPattern.test(id) || !slugPattern.test(slug)) {
          throw new WorkbenchRequestError(
            400,
            'INVALID_INPUT',
            'Profile ID or slug is not URL-safe.',
          );
        }
        const profile = repository.duplicateProfile(
          duplicateId,
          { id, slug },
          {
            actor,
            requestId: operationRequestId,
            expectedRevision: expectedRevision(body.expectedRevision),
          },
        );
        sendJson(response, 201, { profile: projectProfileRecord(profile, actor) });
        return;
      }

      const statusId = routeProfileId(url.pathname, 'status');
      if (statusId) {
        const body = await readJson(request);
        assertAllowedKeys(body, ['expectedRevision', 'status']);
        if (!statusValues.has(body.status as PublicationStatus)) {
          throw new WorkbenchRequestError(400, 'INVALID_INPUT', 'Invalid status.');
        }
        const profile = repository.setStatus(
          statusId,
          body.status as PublicationStatus,
          {
            actor,
            requestId: operationRequestId,
            expectedRevision: expectedRevision(body.expectedRevision),
          },
        );
        sendJson(response, 200, { profile: projectProfileRecord(profile, actor) });
        return;
      }

      const availabilityId = routeProfileId(url.pathname, 'availability');
      if (availabilityId) {
        const body = await readJson(request);
        assertAllowedKeys(body, ['expectedRevision', 'availability']);
        if (!availabilityValues.has(body.availability as Availability)) {
          throw new WorkbenchRequestError(
            400,
            'INVALID_INPUT',
            'Invalid availability.',
          );
        }
        const profile = repository.setAvailability(
          availabilityId,
          body.availability as Availability,
          {
            actor,
            requestId: operationRequestId,
            expectedRevision: expectedRevision(body.expectedRevision),
          },
        );
        sendJson(response, 200, { profile: projectProfileRecord(profile, actor) });
        return;
      }

      const reorderId = routeProfileId(url.pathname, 'reorder-media');
      if (reorderId) {
        const body = await readJson(request);
        assertAllowedKeys(body, ['expectedRevision', 'orderedMediaIds']);
        const profile = repository.reorderMedia(
          reorderId,
          stringArray(body.orderedMediaIds, 'orderedMediaIds', 128),
          {
            actor,
            requestId: operationRequestId,
            expectedRevision: expectedRevision(body.expectedRevision),
          },
        );
        sendJson(response, 200, { profile: projectProfileRecord(profile, actor) });
        return;
      }

      const attachMediaId = routeProfileId(url.pathname, 'attach-media');
      if (attachMediaId) {
        const body = await readJson(request);
        assertAllowedKeys(body, ['expectedRevision', 'mediaId']);
        const mediaId = requiredString(body.mediaId, 'mediaId', 64);
        const media = await mediaStore.get(mediaId);
        const current = repository.getProfile(attachMediaId, actor);
        if (current.media.some((entry) => entry.id === media.id)) {
          throw new WorkbenchRequestError(
            409,
            'MEDIA_ALREADY_ATTACHED',
            'The media record is already attached to this profile.',
          );
        }
        const asset: MediaAsset = {
          id: media.id,
          kind: media.kind,
          desktopUrl: `/__local-media/${media.id}/${
            media.kind === 'image' ? 'desktop' : 'original'
          }`,
          mobileUrl:
            media.kind === 'image'
              ? `/__local-media/${media.id}/mobile`
              : undefined,
          alt: media.alt,
          order: current.media.length,
          rightsConfirmed: false,
          rightsEvidence: media.rightsEvidenceReference,
        };
        const profile = repository.updateProfile(
          attachMediaId,
          { media: [...current.media, asset] },
          {
            actor,
            requestId: operationRequestId,
            expectedRevision: expectedRevision(body.expectedRevision),
          },
        );
        sendJson(response, 200, { profile: projectProfileRecord(profile, actor) });
        return;
      }

      const detachMediaId = routeProfileId(url.pathname, 'detach-media');
      if (detachMediaId) {
        const body = await readJson(request);
        assertAllowedKeys(body, ['expectedRevision', 'mediaId']);
        const mediaId = requiredString(body.mediaId, 'mediaId', 64);
        const current = repository.getProfile(detachMediaId, actor);
        if (!current.media.some((entry) => entry.id === mediaId)) {
          throw new WorkbenchRequestError(
            404,
            'MEDIA_NOT_ATTACHED',
            'The media record is not attached to this profile.',
          );
        }
        const profile = repository.updateProfile(
          detachMediaId,
          {
            media: current.media
              .filter((entry) => entry.id !== mediaId)
              .map((entry, order) => ({ ...entry, order })),
          },
          {
            actor,
            requestId: operationRequestId,
            expectedRevision: expectedRevision(body.expectedRevision),
          },
        );
        sendJson(response, 200, { profile: projectProfileRecord(profile, actor) });
        return;
      }

      const evidenceId = routeProfileId(url.pathname, 'evidence');
      if (evidenceId) {
        const body = await readJson(request);
        assertAllowedKeys(body, [
          'expectedRevision',
          'adultAgeConfirmed',
          'publicationConsentConfirmed',
          'rightsConfirmed',
          'sourceReference',
        ]);
        if (
          typeof body.adultAgeConfirmed !== 'boolean' ||
          typeof body.publicationConsentConfirmed !== 'boolean' ||
          typeof body.rightsConfirmed !== 'boolean'
        ) {
          throw new WorkbenchRequestError(
            400,
            'INVALID_INPUT',
            'Evidence flags must be booleans.',
          );
        }
        const profile = repository.recordEvidence(
          evidenceId,
          {
            adultAgeConfirmed: body.adultAgeConfirmed,
            publicationConsentConfirmed: body.publicationConsentConfirmed,
            rightsConfirmed: body.rightsConfirmed,
            sourceReference: requiredString(
              body.sourceReference,
              'sourceReference',
              512,
            ),
          },
          {
            actor,
            requestId: operationRequestId,
            expectedRevision: expectedRevision(body.expectedRevision),
          },
        );
        sendJson(response, 200, { profile: projectProfileRecord(profile, actor) });
        return;
      }

      const approvalId = routeProfileId(url.pathname, 'approve');
      if (approvalId) {
        const body = await readJson(request);
        assertAllowedKeys(body, [
          'expectedRevision',
          'sourceReference',
        ]);
        const profile = repository.approveProfile(
          approvalId,
          requiredString(body.sourceReference, 'sourceReference', 512),
          {
            actor,
            requestId: operationRequestId,
            expectedRevision: expectedRevision(body.expectedRevision),
          },
        );
        sendJson(response, 200, { profile: projectProfileRecord(profile, actor) });
        return;
      }

      if (url.pathname === '/api/media') {
        const body = await readJson(request, MEDIA_JSON_LIMIT);
        assertAllowedKeys(body, [
          'bytesBase64',
          'contentType',
          'alt',
          'rightsEvidenceReference',
        ]);
        const encoded = requiredString(
          body.bytesBase64,
          'bytesBase64',
          MEDIA_JSON_LIMIT,
        );
        if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
          throw new WorkbenchRequestError(
            400,
            'INVALID_INPUT',
            'bytesBase64 is invalid.',
          );
        }
        const contentType = requiredString(
          body.contentType,
          'contentType',
          64,
        );
        if (
          contentType !== 'image/jpeg' &&
          contentType !== 'image/png' &&
          contentType !== 'image/webp' &&
          contentType !== 'video/mp4'
        ) {
          throw new WorkbenchRequestError(
            415,
            'UNSUPPORTED_CONTENT_TYPE',
            'The browser workbench accepts JPEG, PNG, WebP or bounded MP4 only.',
          );
        }
        const bytes = Buffer.from(encoded, 'base64');
        const maximumBytes =
          contentType === 'video/mp4'
            ? MAX_WORKBENCH_VIDEO_BYTES
            : MAX_WORKBENCH_IMAGE_BYTES;
        if (bytes.byteLength > maximumBytes) {
          throw new WorkbenchRequestError(
            413,
            'REQUEST_TOO_LARGE',
            'The decoded media exceeds its local workbench limit.',
          );
        }
        const record = await mediaStore.store({
          bytes,
          contentType: contentType as SupportedMediaType,
          alt: requiredString(body.alt, 'alt', 240),
          rightsEvidenceReference: requiredString(
            body.rightsEvidenceReference,
            'rightsEvidenceReference',
            256,
          ),
        }, {
          actorId: actor.id,
          requestId: operationRequestId,
        });
        sendJson(response, 201, { media: projectMediaRecord(record, actor) });
        return;
      }

      const mediaArchiveMatch = url.pathname.match(
        /^\/api\/media\/([0-9a-f-]+)\/archive$/i,
      );
      if (mediaArchiveMatch) {
        requireAdmin(actor);
        const body = await readJson(request);
        assertAllowedKeys(body, []);
        const attached = repository
          .listProfiles(actor, true)
          .some((profile) =>
            profile.media.some((media) => media.id === mediaArchiveMatch[1]),
          );
        if (attached) {
          throw new WorkbenchRequestError(
            409,
            'MEDIA_STILL_ATTACHED',
            'Detach the media record from every profile before archiving it.',
          );
        }
        const record = await mediaStore.archive(mediaArchiveMatch[1], {
          actorId: actor.id,
          requestId: operationRequestId,
        });
        sendJson(response, 200, { media: projectMediaRecord(record, actor) });
        return;
      }

      const mediaRestoreMatch = url.pathname.match(
        /^\/api\/media\/([0-9a-f-]+)\/restore$/i,
      );
      if (mediaRestoreMatch) {
        requireAdmin(actor);
        const body = await readJson(request);
        assertAllowedKeys(body, []);
        const record = await mediaStore.restore(mediaRestoreMatch[1], {
          actorId: actor.id,
          requestId: operationRequestId,
        });
        sendJson(response, 200, { media: projectMediaRecord(record, actor) });
        return;
      }

      throw new WorkbenchRequestError(404, 'NOT_FOUND', 'Route not found.');
    } catch (error) {
      const failure = statusForError(error);
      sendJson(response, failure.status, {
        code: failure.code,
        message: failure.message,
      });
    }
  });
  server.on('clientError', (_error, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
  });

  await new Promise<void>((resolveReady, rejectReady) => {
    const onError = (error: Error): void => rejectReady(error);
    server.once('error', onError);
    server.listen(port, host, () => {
      server.off('error', onError);
      resolveReady();
    });
  });
  const address = server.address() as AddressInfo;
  const hostForUrl = host === '::1' ? '[::1]' : host;
  origin = `http://${hostForUrl}:${address.port}`;

  let closePromise: Promise<void> | undefined;
  return {
    origin,
    stateFilePath,
    mediaRoot,
    close: () => {
      if (closePromise) return closePromise;
      closePromise = new Promise<void>((resolveClosed, rejectClosed) => {
        const forceClose = setTimeout(() => server.closeAllConnections(), 2_000);
        forceClose.unref();
        server.close((error) => {
          clearTimeout(forceClose);
          if (error) rejectClosed(error);
          else resolveClosed();
        });
        server.closeIdleConnections();
      });
      return closePromise;
    },
  };
}
