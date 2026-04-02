import { json, err, options } from '../_lib/cors';
import { getCookieToken, verifyJWT } from '../_lib/jwt';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestOptions = () => options();

// GET /api/seeker/applications — seeker's submitted applications
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload || payload.role !== 'seeker') return err('Forbidden', 403);

  const { results } = await env.DB.prepare(
    `SELECT a.id, a.status, a.created_at,
            j.id as job_id, j.title, j.company, j.location, j.type, j.category
     FROM applications a
     JOIN jobs j ON a.job_id = j.id
     WHERE a.seeker_id = ?
     ORDER BY a.created_at DESC`
  ).bind(payload.sub).all();

  return json(results);
};
