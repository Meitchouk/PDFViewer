import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';
import { registerQR, type QRMeta } from '@/lib/kv';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const metaRaw = formData.get('meta') as string | null;

  if (!file || !metaRaw) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  }

  let parsed: Omit<QRMeta, 'blobUrl' | 'createdAt'>;
  try {
    parsed = JSON.parse(metaRaw);
  } catch {
    return NextResponse.json({ error: 'Meta JSON inválido' }, { status: 400 });
  }

  // Validar que viene una imagen PNG
  if (file.type !== 'image/png') {
    return NextResponse.json({ error: 'Solo se aceptan imágenes PNG' }, { status: 400 });
  }

  const id = `qr${randomUUID().replace(/-/g, '')}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const { url: blobUrl } = await put(`qrs/${id}.png`, buffer, {
      access: 'private',
      addRandomSuffix: false,
    });

    const meta: QRMeta = {
      ...parsed,
      blobUrl,
      createdAt: new Date().toISOString(),
    };

    await registerQR(id, meta);

    return NextResponse.json({ id, ...meta }, { status: 201 });
  } catch (error) {
    console.error('[/api/admin/qr] Error:', error);
    return NextResponse.json({ error: 'Error al guardar el QR' }, { status: 500 });
  }
}
