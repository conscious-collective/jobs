import { json, err, options } from '../_lib/cors';
import { hashPassword } from '../_lib/password';
import { signJWT, tokenCookie } from '../_lib/jwt';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestOptions = () => options();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<{
    email: string; password: string; role: 'employer' | 'seeker';
    company_name?: string; company_website?: string; bio?: string;
  }>();

  const { email, password, role, company_name, company_website, bio } = body;
  if (!email || !password || !role) return err('Missing required fields');
  if (!['employer', 'seeker'].includes(role)) return err('Invalid role');
  if (password.length < 8) return err('Password must be at least 8 characters');

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return err('Email already registered', 409);

  const id = crypto.randomUUID();
  const password_hash = await hashPassword(password);

  await env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, role, company_name, company_website, bio) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, email.toLowerCase().trim(), password_hash, role, company_name ?? null, company_website ?? null, bio ?? null).run();

  const token = await signJWT({ sub: id, email, role }, env.JWT_SECRET);
  return new Response(JSON.stringify({ ok: true, role }), {
    status: 201,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': tokenCookie(token),
    },
  });
};
