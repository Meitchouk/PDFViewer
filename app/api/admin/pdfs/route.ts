import { NextResponse } from 'next/server';
import { listPdfsFromDrive } from '@/lib/googleDrive';
import { getEnabledMap } from '@/lib/kv';

export async function GET() {
  try {
    const files = await listPdfsFromDrive();
    const enabledMap = await getEnabledMap(files.map((f) => f.id));
    const result = files.map((f) => ({ ...f, enabled: enabledMap[f.id] }));
    return NextResponse.json(result);
  } catch (error) {
    console.error('[/api/admin/pdfs] Error:', error);
    return NextResponse.json({ error: 'Error al obtener los PDFs' }, { status: 500 });
  }
}
