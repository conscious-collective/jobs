import { json, err, options } from '../_lib/cors';
import { verifyPassword } from '../_lib/password';
import { signJWT, tokenCookie } from '../_lib/jwt';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestOptions = () => options();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { email, password } = await request.json<{ email: string; password: string }>();
  if (!email || !password) return err('Missing credentials');

  const user = await env.DB.prepare(
    'SELECT id, email, password_hash, role FROM users WHERE email = ?'
  ).bind(email.toLowerCase().trim()).first<{ id: string; email: string; password_hash: string; role: 'employer' | 'seeker' }>();

  if (!user) return err('Invalid email or password', 401);

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return err('Invalid email or password', 401);

  const token = await signJWT({ sub: user.id, email: user.email, role: user.role }, env.JWT_SECRET);
  return new Response(JSON.stringify({ ok: true, role: user.role }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': tokenCookie(token),
    },
  });
};
