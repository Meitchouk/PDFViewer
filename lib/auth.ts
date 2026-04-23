import { SignJWT, jwtVerify } from 'jose';

export const COOKIE_NAME = 'admin_token';
const EXPIRY = '8h';

function getSecret() {
  return new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!);
}

export async function createToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}
