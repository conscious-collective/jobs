interface JWTPayload {
  sub: string;      // user id
  email: string;
  role: 'employer' | 'seeker' | 'admin';
  exp: number;
}

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function str2buf(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signJWT(payload: Omit<JWTPayload, 'exp'>, secret: string): Promise<string> {
  const header = b64url(str2buf(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64url(str2buf(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
  })));
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, str2buf(`${header}.${body}`));
  return `${header}.${body}.${b64url(sig)}`;
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const key = await getKey(secret);
    const sigBuf = Uint8Array.from(atob(sig.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBuf, str2buf(`${header}.${body}`));
    if (!valid) return null;
    const payload: JWTPayload = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getCookieToken(request: Request): string | null {
  const cookie = request.headers.get('Cookie') ?? '';
  const match = cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? match[1] : null;
}

export function tokenCookie(token: string): string {
  return `token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`;
}

export function clearCookie(): string {
  return `token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
