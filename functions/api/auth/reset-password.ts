import { json, err, options } from '../_lib/cors';
import { hashPassword } from '../_lib/password';

interface Env { DB: D1Database; }

export const onRequestOptions = () => options();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { token, password } = await request.json<{ token: string; password: string }>();
  if (!token || !password) return err('Missing token or password');
  if (password.length < 8) return err('Password must be at least 8 characters');

  const row = await env.DB.prepare(
    'SELECT user_id, expires_at FROM password_reset_tokens WHERE token = ?'
  ).bind(token).first<{ user_id: string; expires_at: string }>();

  if (!row) return err('Invalid or expired reset link', 400);
  if (new Date(row.expires_at) < new Date()) {
    await env.DB.prepare('DELETE FROM password_reset_tokens WHERE token = ?').bind(token).run();
    return err('Reset link has expired. Please request a new one.', 400);
  }

  const newHash = await hashPassword(password);

  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(newHash, row.user_id),
    env.DB.prepare('DELETE FROM password_reset_tokens WHERE token = ?').bind(token),
  ]);

  return json({ ok: true });
};
