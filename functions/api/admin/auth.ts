import { json, err, options } from '../_lib/cors';
import { signJWT, tokenCookie } from '../_lib/jwt';

interface Env { JWT_SECRET: string; ADMIN_EMAIL: string; ADMIN_PASSWORD: string; }

export const onRequestOptions = () => options();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { email, password } = await request.json<{ email: string; password: string }>();
  if (!email || !password) return err('Missing credentials');

  const validEmail = email.toLowerCase().trim() === env.ADMIN_EMAIL.toLowerCase().trim();
  const validPassword = password === env.ADMIN_PASSWORD;

  if (!validEmail || !validPassword) return err('Invalid credentials', 401);

  const token = await signJWT({ sub: 'admin', email: env.ADMIN_EMAIL, role: 'admin' }, env.JWT_SECRET);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': tokenCookie(token),
    },
  });
};
