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
    `SELECT j.id, j.title, j.company, j.location, j.remote, j.type, j.category, j.status, j.skills, j.apply_url, j.created_at,
            u.email as employer_email,
            COUNT(a.id) as applicant_count
     FROM jobs j
     JOIN users u ON j.employer_id = u.id
     LEFT JOIN applications a ON a.job_id = j.id
     GROUP BY j.id
     ORDER BY j.created_at DESC`
  ).all();

  return json(results);
};
