import { NextRequest, NextResponse } from 'next/server';
import { del, put } from '@vercel/blob';
import { randomUUID } from 'crypto';
import {
  getBlobUrl,
  deleteBlobMeta,
  registerBlob,
  getAliasByFileId,
  deleteAlias,
  transferAlias,
  ensureAlias,
  rebaseQRsAfterReplace,
} from '@/lib/kv';
import { deletePdfFromDrive } from '@/lib/googleDrive';
import { toSlug } from '@/lib/utils';

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
    // Limpiar alias antes de borrar el archivo
    const aliasSlug = await getAliasByFileId(fileId);
    if (aliasSlug) await deleteAlias(aliasSlug);

    if (fileId.startsWith('vb')) {
      const blobUrl = await getBlobUrl(fileId);
      if (blobUrl) await del(blobUrl);
      await deleteBlobMeta(fileId);
    } else {
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
    // Siempre crear un nuevo archivo Blob con ID nuevo.
    // El alias se transfiere del ID viejo al nuevo, por lo que la URL
    // /a/{slug} sigue funcionando apuntando al contenido actualizado.
    const newId = `vb${randomUUID().replace(/-/g, '')}`;

    const { url: newBlobUrl } = await put(`pdfs/${safeName}`, buffer, {
      access: 'private',
      addRandomSuffix: true,
    });

    await registerBlob(newId, {
      name: safeName,
      url: newBlobUrl,
      size: String(buffer.length),
      uploadedAt: now,
    });

    // Transferir alias del ID viejo al nuevo (o crear uno si no tenía)
    await transferAlias(fileId, newId);
    // Si el fileId viejo no tenía alias, auto-asignar uno al nuevo ID
    const alias = await ensureAlias(toSlug(safeName), newId);

    // Actualizar QRs vinculados al ID anterior
    const baseUrl = request.headers.get('origin') ?? request.nextUrl.origin;
    const updatedQRs = await rebaseQRsAfterReplace(fileId, newId, alias, baseUrl);

    // Borrar archivo anterior
    if (fileId.startsWith('vb')) {
      const oldBlobUrl = await getBlobUrl(fileId);
      if (oldBlobUrl) await del(oldBlobUrl).catch(() => {});
      await deleteBlobMeta(fileId);
    } else {
      // Para Drive: eliminar (no crítico si falla)
      await deletePdfFromDrive(fileId).catch(() => {});
    }

    return NextResponse.json({
      id: newId,
      name: safeName,
      size: String(buffer.length),
      modifiedTime: now,
      alias,
      updatedQRs, // [{ id, newUrl }] para que el cliente actualice su estado
    });
  } catch (error) {
    console.error('[PUT /api/admin/pdfs/:id] Error:', error);
    return NextResponse.json({ error: 'Error al reemplazar el documento' }, { status: 500 });
  }
}
