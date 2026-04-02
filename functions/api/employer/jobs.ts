import { json, err, options } from '../_lib/cors';
import { getCookieToken, verifyJWT } from '../_lib/jwt';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestOptions = () => options();

// GET /api/employer/jobs — employer's posted jobs with applicant counts
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload || payload.role !== 'employer') return err('Forbidden', 403);

  const { results } = await env.DB.prepare(
    `SELECT j.id, j.title, j.company, j.location, j.type, j.category, j.status, j.created_at,
            COUNT(a.id) as applicant_count
     FROM jobs j
     LEFT JOIN applications a ON a.job_id = j.id
     WHERE j.employer_id = ?
     GROUP BY j.id
     ORDER BY j.created_at DESC`
  ).bind(payload.sub).all();

  return json(results);
};
