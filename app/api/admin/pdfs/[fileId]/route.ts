import { NextRequest, NextResponse } from 'next/server';
import { del, put } from '@vercel/blob';
import { getBlobUrl, getBlobMeta, deleteBlobMeta, updateBlobMeta } from '@/lib/kv';
import { deletePdfFromDrive, replacePdfOnDrive } from '@/lib/googleDrive';

const VALID_FILE_ID = /^[a-zA-Z0-9_-]+$/;
const MAX_SIZE = 50 * 1024 * 1024;

export const maxDuration = 60;

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;

  if (!VALID_FILE_ID.test(fileId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Formato de petición inválido' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Solo se permiten archivos PDF' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'El archivo supera el límite de 50 MB' }, { status: 400 });
  }

  const safeName = file.name
    .replace(/[^a-zA-Z0-9._\- ]/g, '_')
    .replace(/\.pdf$/i, '') + '.pdf';

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const now = new Date().toISOString();

  try {
    if (fileId.startsWith('vb')) {
      // Vercel Blob: subir nuevo archivo, actualizar Redis, borrar el anterior
      const meta = await getBlobMeta(fileId);
      const oldBlobUrl = meta?.url ?? null;

      const { url: newBlobUrl } = await put(`pdfs/${safeName}`, buffer, {
        access: 'private',
        addRandomSuffix: true,
      });

      await updateBlobMeta(fileId, {
        name: safeName,
        url: newBlobUrl,
        size: String(buffer.length),
        uploadedAt: now,
      });

      if (oldBlobUrl) {
        await del(oldBlobUrl).catch(() => { /* ignorar si ya no existe */ });
      }

      return NextResponse.json({
        id: fileId,
        name: safeName,
        size: String(buffer.length),
        modifiedTime: now,
      });
    } else {
      // Google Drive: reemplazar contenido manteniendo el mismo fileId
      const result = await replacePdfOnDrive(fileId, buffer, safeName);
      return NextResponse.json({ id: fileId, ...result });
    }
  } catch (error) {
    console.error('[PUT /api/admin/pdfs/:id] Error:', error);
    return NextResponse.json({ error: 'Error al reemplazar el documento' }, { status: 500 });
  }
}
