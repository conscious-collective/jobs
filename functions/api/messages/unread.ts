import { json, err, options } from '../_lib/cors';
import { getCookieToken, verifyJWT } from '../_lib/jwt';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestOptions = () => options();

// GET /api/messages/unread — total unread message count for the logged-in user
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return err('Unauthenticated', 401);

  const row = await env.DB.prepare(
    `SELECT COUNT(*) as count
     FROM messages m
     JOIN applications a ON m.application_id = a.id
     JOIN jobs j ON a.job_id = j.id
     WHERE (a.seeker_id = ? OR j.employer_id = ?)
       AND m.sender_id != ?
       AND m.read_at IS NULL`
  ).bind(payload.sub, payload.sub, payload.sub).first<{ count: number }>();

  return json({ count: row?.count ?? 0 });
};
