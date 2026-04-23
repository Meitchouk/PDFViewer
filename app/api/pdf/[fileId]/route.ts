import { NextRequest, NextResponse } from 'next/server';
import { getPdfStream } from '@/lib/googleDrive';
import { isPdfEnabled, getBlobUrl } from '@/lib/kv';

// Permitir hasta 60s para streamear PDFs grandes (Vercel Hobby soporta hasta 60s)
export const maxDuration = 60;

const VALID_FILE_ID = /^[a-zA-Z0-9_-]+$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;

  if (!VALID_FILE_ID.test(fileId)) {
    return new NextResponse('ID inválido', { status: 400 });
  }

  const enabled = await isPdfEnabled(fileId);
  if (!enabled) {
    return new NextResponse('No encontrado', { status: 404 });
  }

  // Verificar si es un archivo de Vercel Blob (IDs con prefijo 'vb')
  if (fileId.startsWith('vb')) {
    const blobUrl = await getBlobUrl(fileId);
    if (!blobUrl) {
      return new NextResponse('No encontrado', { status: 404 });
    }
    try {
      const res = await fetch(blobUrl, {
        headers: {
          Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
        },
      });
      if (!res.ok) return new NextResponse('No encontrado', { status: 404 });
      return new NextResponse(res.body, {
        headers: {
          'Content-Type': 'application/pdf',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } catch {
      return new NextResponse('Error al obtener el PDF', { status: 500 });
    }
  }

  // Drive file
  try {
    const { stream, name } = await getPdfStream(fileId);

    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk: Buffer) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err: Error) => controller.error(err));
      },
    });

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(name)}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[/api/pdf/:id] Error:', error);
    return new NextResponse('Error al obtener el PDF', { status: 500 });
  }
}

