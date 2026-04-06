import { json, err, options } from '../_lib/cors';
import { getCookieToken, verifyJWT } from '../_lib/jwt';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestOptions = () => options();

// GET /api/inbox — list all conversations for the logged-in user
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return err('Unauthenticated', 401);

  const { results } = await env.DB.prepare(
    `SELECT
       a.id AS application_id,
       j.title AS job_title,
       j.company,
       a.seeker_id,
       j.employer_id,
       su.full_name AS seeker_name,
       su.email AS seeker_email,
       eu.full_name AS employer_name,
       eu.email AS employer_email,
       eu.company_name,
       (SELECT body FROM messages WHERE application_id = a.id ORDER BY created_at DESC LIMIT 1) AS last_message,
       (SELECT created_at FROM messages WHERE application_id = a.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
       (SELECT sender_id FROM messages WHERE application_id = a.id ORDER BY created_at DESC LIMIT 1) AS last_sender_id,
       (SELECT COUNT(*) FROM messages WHERE application_id = a.id AND sender_id != ? AND read_at IS NULL) AS unread_count
     FROM applications a
     JOIN jobs j ON a.job_id = j.id
     JOIN users su ON a.seeker_id = su.id
     JOIN users eu ON j.employer_id = eu.id
     WHERE (a.seeker_id = ? OR j.employer_id = ?)
       AND EXISTS (SELECT 1 FROM messages WHERE application_id = a.id)
     ORDER BY last_message_at DESC`
  ).bind(payload.sub, payload.sub, payload.sub).all();

  return json(results);
};
