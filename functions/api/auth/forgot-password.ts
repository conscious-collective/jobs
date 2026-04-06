import { json, err, options } from '../_lib/cors';

interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
}

export const onRequestOptions = () => options();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { email } = await request.json<{ email: string }>();
  if (!email) return err('Email is required');

  const user = await env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email.toLowerCase().trim()).first<{ id: string }>();

  // Always return success to avoid user enumeration
  if (!user) return json({ ok: true });

  // Generate a secure random token
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  // Expires in 1 hour
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  // Delete any existing tokens for this user, then insert new one
  await env.DB.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').bind(user.id).run();
  await env.DB.prepare(
    'INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(token, user.id, expiresAt).run();

  const resetUrl = `${new URL(request.url).origin}/reset-password?token=${token}`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'C22 Jobs <hello@c22.space>',
      to: email,
      subject: 'Reset your C22 Jobs password',
      html: `
        <p>You requested a password reset for your C22 Jobs account.</p>
        <p>Click the link below to set a new password. This link expires in 1 hour.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    }),
  });

  return json({ ok: true });
};
