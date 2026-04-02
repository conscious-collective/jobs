import { json, err, options } from '../../_lib/cors';
import { getCookieToken, verifyJWT } from '../../_lib/jwt';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestOptions = () => options();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload || payload.role !== 'admin') return err('Forbidden', 403);

  const { results } = await env.DB.prepare(
    `SELECT a.id, a.status, a.created_at,
            j.id as job_id, j.title as job_title, j.company,
            u.email as seeker_email,
            a.cover_letter, a.linkedin_url, a.portfolio_url
     FROM applications a
     JOIN jobs j ON a.job_id = j.id
     JOIN users u ON a.seeker_id = u.id
     ORDER BY a.created_at DESC`
  ).all();

  return json(results);
};
