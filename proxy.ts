import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Inline para evitar alias @/ en edge runtime
const COOKIE_NAME = 'admin_token';

function getSecret() {
  return new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas que no requieren autenticación
  if (pathname === '/admin/login' || pathname === '/api/admin/login') {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  try {
    await jwtVerify(token, getSecret());
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/((?!login).*)'],
};
