import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

const key = (fileId: string) => `pdf:enabled:${fileId}`;

/**
 * Por defecto un PDF está habilitado si no tiene clave en Redis.
 * Solo se deshabilita explícitamente guardando false.
 * Upstash puede devolver boolean false o string 'false' — se maneja ambos casos.
 */
export async function isPdfEnabled(fileId: string): Promise<boolean> {
  const val = await getRedis().get(key(fileId));
  // val puede ser null (no existe), boolean, o string según la versión del SDK
  if (val === null || val === undefined) return true;
  return val !== false && String(val) !== 'false';
}

export async function setPdfEnabled(fileId: string, enabled: boolean): Promise<void> {
  await getRedis().set(key(fileId), enabled);
}

export async function getEnabledMap(fileIds: string[]): Promise<Record<string, boolean>> {
  if (fileIds.length === 0) return {};
  const values = await getRedis().mget(...fileIds.map(key));
  const map: Record<string, boolean> = {};
  fileIds.forEach((id, i) => {
    const val = values[i];
    if (val === null || val === undefined) {
      map[id] = true; // default: visible
    } else {
      map[id] = val !== false && String(val) !== 'false';
    }
  });
  return map;
}

// ── Vercel Blob metadata ────────────────────────────────────────────────────

export interface BlobMeta {
  name: string;
  url: string;
  size: string;
  uploadedAt: string;
}

export async function registerBlob(id: string, meta: BlobMeta): Promise<void> {
  const r = getRedis();
  await Promise.all([
    r.set(`pdf:blob:${id}`, meta),
    r.rpush('pdf:blob:ids', id),
  ]);
}

export async function getBlobMeta(id: string): Promise<(BlobMeta & { id: string }) | null> {
  const meta = await getRedis().get<BlobMeta | null>(`pdf:blob:${id}`);
  if (!meta) return null;
  return { id, ...meta };
}

export async function getBlobUrl(id: string): Promise<string | null> {
  const meta = await getRedis().get<BlobMeta | null>(`pdf:blob:${id}`);
  return meta?.url ?? null;
}

export async function listBlobFiles(): Promise<Array<BlobMeta & { id: string }>> {
  const ids = await getRedis().lrange<string>('pdf:blob:ids', 0, -1);
  if (ids.length === 0) return [];
  const metas = await getRedis().mget<(BlobMeta | null)[]>(...ids.map((id) => `pdf:blob:${id}`));
  return ids
    .map((id, i) => {
      const m = metas[i];
      if (!m) return null;
      return { id, name: m.name, url: m.url, size: m.size, uploadedAt: m.uploadedAt };
    })
    .filter((x): x is BlobMeta & { id: string } => x !== null);
}

export async function deleteBlobMeta(id: string): Promise<void> {
  const r = getRedis();
  await Promise.all([
    r.del(`pdf:blob:${id}`),
    r.del(key(id)),
    r.lrem('pdf:blob:ids', 0, id),
  ]);
}

export async function updateBlobMeta(id: string, updates: Partial<BlobMeta>): Promise<void> {
  const meta = await getRedis().get<BlobMeta | null>(`pdf:blob:${id}`);
  if (!meta) throw new Error(`Blob ${id} no encontrado en Redis`);
  await getRedis().set(`pdf:blob:${id}`, { ...meta, ...updates });
}

// ── QR metadata ────────────────────────────────────────────────────────────

export interface QRMeta {
  title: string;
  subtitle: string;
  url: string;
  blobUrl: string;
  linkedPdfId: string | null;
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  dotsType: string;
  cornersType: string;
  logoUrl: string | null;
  createdAt: string;
}

export async function registerQR(id: string, meta: QRMeta): Promise<void> {
  const r = getRedis();
  await Promise.all([
    r.set(`qr:${id}`, meta),
    r.rpush('qr:ids', id),
  ]);
}

export async function getQRMeta(id: string): Promise<QRMeta | null> {
  return getRedis().get<QRMeta | null>(`qr:${id}`);
}

export async function listQRs(): Promise<Array<QRMeta & { id: string }>> {
  const ids = await getRedis().lrange<string>('qr:ids', 0, -1);
  if (ids.length === 0) return [];
  const metas = await getRedis().mget<(QRMeta | null)[]>(...ids.map((id) => `qr:${id}`));
  return ids
    .map((id, i) => {
      const m = metas[i];
      if (!m) return null;
      return { id, ...m };
    })
    .filter((x): x is QRMeta & { id: string } => x !== null);
}

export async function deleteQR(id: string): Promise<void> {
  const r = getRedis();
  await Promise.all([
    r.del(`qr:${id}`),
    r.lrem('qr:ids', 0, id),
  ]);
}

// ── Alias (slug) ────────────────────────────────────────────────────────────
// alias:{slug} → fileId
// pdf:alias:{fileId} → slug  (lookup inverso)

export async function setAlias(slug: string, fileId: string): Promise<void> {
  const r = getRedis();
  // Si el fileId ya tenía un alias anterior, borrarlo
  const oldSlug = await r.get<string>(`pdf:alias:${fileId}`);
  const ops: Promise<unknown>[] = [
    r.set(`alias:${slug}`, fileId),
    r.set(`pdf:alias:${fileId}`, slug),
  ];
  if (oldSlug && oldSlug !== slug) {
    ops.push(r.del(`alias:${oldSlug}`));
  }
  await Promise.all(ops);
}

/**
 * Asigna alias solo si:
 * - El fileId aún no tiene alias, Y
 * - El slug no está ocupado por otro documento.
 * Si hay colisión de slug, añade sufijo numérico hasta encontrar uno libre.
 * Devuelve el slug asignado.
 */
export async function ensureAlias(slug: string, fileId: string): Promise<string> {
  const r = getRedis();

  // Si ya tiene alias, no hacer nada
  const existing = await r.get<string>(`pdf:alias:${fileId}`);
  if (existing) return existing;

  // Buscar slug disponible
  let candidate = slug;
  let suffix = 2;
  while (true) {
    const owner = await r.get<string>(`alias:${candidate}`);
    if (!owner || owner === fileId) break;
    candidate = `${slug}-${suffix++}`;
    if (candidate.length > 60) {
      candidate = `${slug.slice(0, 57)}-${suffix++}`;
    }
  }

  await Promise.all([
    r.set(`alias:${candidate}`, fileId),
    r.set(`pdf:alias:${fileId}`, candidate),
  ]);
  return candidate;
}

export async function getFileIdByAlias(slug: string): Promise<string | null> {
  return getRedis().get<string>(`alias:${slug}`);
}

export async function getAliasByFileId(fileId: string): Promise<string | null> {
  return getRedis().get<string>(`pdf:alias:${fileId}`);
}

export async function deleteAlias(slug: string): Promise<void> {
  const r = getRedis();
  const fileId = await r.get<string>(`alias:${slug}`);
  const ops: Promise<unknown>[] = [r.del(`alias:${slug}`)];
  if (fileId) ops.push(r.del(`pdf:alias:${fileId}`));
  await Promise.all(ops);
}

export async function getAliasMap(fileIds: string[]): Promise<Record<string, string>> {
  if (fileIds.length === 0) return {};
  const values = await getRedis().mget<(string | null)[]>(
    ...fileIds.map((id) => `pdf:alias:${id}`)
  );
  const map: Record<string, string> = {};
  fileIds.forEach((id, i) => {
    if (values[i]) map[id] = values[i] as string;
  });
  return map;
}

/**
 * Transfiere el alias de un fileId antiguo a uno nuevo.
 * Útil cuando se reemplaza un archivo y el ID cambia.
 * No hace nada si el ID antiguo no tenía alias.
 */
export async function transferAlias(oldFileId: string, newFileId: string): Promise<void> {
  const r = getRedis();
  const slug = await r.get<string>(`pdf:alias:${oldFileId}`);
  if (!slug) return;
  await Promise.all([
    r.set(`alias:${slug}`, newFileId),
    r.set(`pdf:alias:${newFileId}`, slug),
    r.del(`pdf:alias:${oldFileId}`),
  ]);
}

