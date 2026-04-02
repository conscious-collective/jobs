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
    `SELECT u.id, u.email, u.role, u.company_name, u.created_at,
            COUNT(DISTINCT j.id) as job_count,
            COUNT(DISTINCT a.id) as application_count
     FROM users u
     LEFT JOIN jobs j ON j.employer_id = u.id
     LEFT JOIN applications a ON a.seeker_id = u.id
     GROUP BY u.id
     ORDER BY u.created_at DESC`
  ).all();

  return json(results);
};
