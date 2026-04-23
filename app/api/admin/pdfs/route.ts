import { NextResponse } from 'next/server';
import { listPdfsFromDrive } from '@/lib/googleDrive';
import { getEnabledMap, getAliasMap, ensureAlias } from '@/lib/kv';
import { toSlug } from '@/lib/utils';

export async function GET() {
  try {
    const files = await listPdfsFromDrive();
    const ids = files.map((f) => f.id);
    const [enabledMap, aliasMap] = await Promise.all([
      getEnabledMap(ids),
      getAliasMap(ids),
    ]);

    // Auto-asignar alias a los archivos Drive que aún no lo tengan
    await Promise.all(
      files
        .filter((f) => !aliasMap[f.id])
        .map(async (f) => {
          const slug = await ensureAlias(toSlug(f.name), f.id);
          aliasMap[f.id] = slug;
        })
    );

    const result = files.map((f) => ({
      ...f,
      enabled: enabledMap[f.id],
      alias: aliasMap[f.id],
    }));
    return NextResponse.json(result);
  } catch (error) {
    console.error('[/api/admin/pdfs] Error:', error);
    return NextResponse.json({ error: 'Error al obtener los PDFs' }, { status: 500 });
  }
}
