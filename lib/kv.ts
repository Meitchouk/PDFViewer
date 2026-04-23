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

