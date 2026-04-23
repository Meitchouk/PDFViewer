import { NextRequest, NextResponse } from 'next/server';
import { isPdfEnabled, setPdfEnabled } from '@/lib/kv';

const VALID_FILE_ID = /^[a-zA-Z0-9_-]+$/;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;

  if (!VALID_FILE_ID.test(fileId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  try {
    const current = await isPdfEnabled(fileId);
    await setPdfEnabled(fileId, !current);
    return NextResponse.json({ enabled: !current });
  } catch (error) {
    console.error('[toggle] Error:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}
