import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { getBlobUrl, deleteBlobMeta } from '@/lib/kv';
import { deletePdfFromDrive } from '@/lib/googleDrive';

const VALID_FILE_ID = /^[a-zA-Z0-9_-]+$/;

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;

  if (!VALID_FILE_ID.test(fileId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  try {
    if (fileId.startsWith('vb')) {
      // Vercel Blob: eliminar archivo y metadata en Redis
      const blobUrl = await getBlobUrl(fileId);
      if (blobUrl) {
        await del(blobUrl);
      }
      await deleteBlobMeta(fileId);
    } else {
      // Google Drive: eliminar el archivo permanentemente
      await deletePdfFromDrive(fileId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[DELETE /api/admin/pdfs/:id] Error:', error);
    return NextResponse.json({ error: 'Error al eliminar el documento' }, { status: 500 });
  }
}
