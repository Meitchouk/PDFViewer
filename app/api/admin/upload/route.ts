import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';
import { registerBlob } from '@/lib/kv';

// Máximo 50 MB por archivo
const MAX_SIZE = 50 * 1024 * 1024;

export const maxDuration = 60;

export async function POST(request: NextRequest) {
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

  // Sanear el nombre del archivo
  const safeName = file.name
    .replace(/[^a-zA-Z0-9._\- ]/g, '_')
    .replace(/\.pdf$/i, '') + '.pdf';

  // ID único con prefijo 'vb' (vercel blob) para distinguirlo de IDs de Drive
  const id = `vb${randomUUID().replace(/-/g, '')}`;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { url } = await put(`pdfs/${safeName}`, buffer, {
      access: 'private',
      addRandomSuffix: true,
    });

    const uploadedAt = new Date().toISOString();
    await registerBlob(id, {
      name: safeName,
      url,
      size: String(buffer.length),
      uploadedAt,
    });

    return NextResponse.json(
      { id, name: safeName, size: String(buffer.length), modifiedTime: uploadedAt },
      { status: 201 }
    );
  } catch (error) {
    console.error('[/api/admin/upload] Error:', error);
    return NextResponse.json({ error: 'Error al subir el archivo' }, { status: 500 });
  }
}

