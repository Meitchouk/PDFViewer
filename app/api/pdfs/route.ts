import { NextResponse } from 'next/server';
import { listPdfsFromDrive } from '@/lib/googleDrive';
import { getEnabledMap } from '@/lib/kv';

// Cachear la respuesta 5 minutos en Vercel (evita llamadas a Drive en cada request)
export const revalidate = 300;

export async function GET() {
  try {
    const files = await listPdfsFromDrive();
    const enabledMap = await getEnabledMap(files.map((f) => f.id));
    const enabled = files.filter((f) => enabledMap[f.id]);
    return NextResponse.json(enabled);
  } catch (error) {
    console.error('[/api/pdfs] Error:', error);
    return NextResponse.json({ error: 'Error al obtener los PDFs' }, { status: 500 });
  }
}
