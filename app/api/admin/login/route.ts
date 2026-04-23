import { NextRequest, NextResponse } from 'next/server';
import { createToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  let body: { username?: string; password?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de petición inválido' }, { status: 400 });
  }

  const { username, password } = body;

  if (
    !username ||
    !password ||
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    // Misma respuesta para usuario incorrecto y contraseña incorrecta (evita enumeration)
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  const token = await createToken();
  const response = NextResponse.json({ ok: true });

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 8, // 8 horas
    path: '/',
  });

  return response;
}
