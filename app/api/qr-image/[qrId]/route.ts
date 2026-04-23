import { NextRequest, NextResponse } from 'next/server';
import { getQRMeta } from '@/lib/kv';

const VALID_QR_ID = /^qr[a-zA-Z0-9]+$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ qrId: string }> }
) {
  const { qrId } = await params;

  if (!VALID_QR_ID.test(qrId)) {
    return new NextResponse('ID inválido', { status: 400 });
  }

  const meta = await getQRMeta(qrId);
  if (!meta) {
    return new NextResponse('No encontrado', { status: 404 });
  }

  const isDownload = request.nextUrl.searchParams.get('download') === '1';

  try {
    const res = await fetch(meta.blobUrl, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    });
    if (!res.ok) return new NextResponse('No encontrado', { status: 404 });

    const disposition = isDownload
      ? `attachment; filename="${encodeURIComponent(meta.title || qrId)}.png"`
      : 'inline';

    return new NextResponse(res.body, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': disposition,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return new NextResponse('Error al obtener la imagen', { status: 500 });
  }
}
