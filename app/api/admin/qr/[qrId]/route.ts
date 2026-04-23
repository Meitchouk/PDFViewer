import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { getQRMeta, deleteQR } from '@/lib/kv';

const VALID_QR_ID = /^qr[a-zA-Z0-9]+$/;

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ qrId: string }> }
) {
  const { qrId } = await params;

  if (!VALID_QR_ID.test(qrId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const meta = await getQRMeta(qrId);
  if (!meta) {
    return NextResponse.json({ error: 'QR no encontrado' }, { status: 404 });
  }

  try {
    // Eliminar imagen del blob y registro de Redis
    await Promise.all([
      del(meta.blobUrl),
      deleteQR(qrId),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[DELETE /api/admin/qr/:id] Error:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
