import { NextRequest, NextResponse } from 'next/server';
import { setAlias, getFileIdByAlias, deleteAlias } from '@/lib/kv';

const VALID_ALIAS = /^[a-z0-9][a-z0-9-]{0,58}[a-z0-9]$|^[a-z0-9]{2}$/;
const VALID_FILE_ID = /^[a-zA-Z0-9_-]+$/;

// POST /api/admin/aliases  →  { slug, fileId }  →  crea o actualiza el alias
export async function POST(request: NextRequest) {
  let body: { slug?: string; fileId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const slug = body.slug?.trim().toLowerCase() ?? '';
  const fileId = body.fileId?.trim() ?? '';

  if (!VALID_ALIAS.test(slug)) {
    return NextResponse.json(
      { error: 'El alias solo puede contener letras minúsculas, números y guiones (mín. 2 caracteres)' },
      { status: 400 }
    );
  }

  if (!VALID_FILE_ID.test(fileId)) {
    return NextResponse.json({ error: 'ID de documento inválido' }, { status: 400 });
  }

  // Verificar que el alias no esté ya en uso por otro documento
  const existing = await getFileIdByAlias(slug);
  if (existing && existing !== fileId) {
    return NextResponse.json(
      { error: 'Ese alias ya está en uso por otro documento' },
      { status: 409 }
    );
  }

  await setAlias(slug, fileId);
  return NextResponse.json({ ok: true, slug, fileId });
}

// DELETE /api/admin/aliases  →  { slug }
export async function DELETE(request: NextRequest) {
  let body: { slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const slug = body.slug?.trim().toLowerCase() ?? '';

  if (!VALID_ALIAS.test(slug)) {
    return NextResponse.json({ error: 'Alias inválido' }, { status: 400 });
  }

  await deleteAlias(slug);
  return NextResponse.json({ ok: true });
}
