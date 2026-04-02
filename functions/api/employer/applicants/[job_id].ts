import { json, err, options } from '../../_lib/cors';
import { getCookieToken, verifyJWT } from '../../_lib/jwt';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestOptions = () => options();

// GET /api/employer/applicants/:job_id — all applicants for a specific job
export const onRequestGet: PagesFunction<Env> = async ({ request, params, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload || payload.role !== 'employer') return err('Forbidden', 403);

  const job = await env.DB.prepare(
    'SELECT id, title FROM jobs WHERE id = ? AND employer_id = ?'
  ).bind(params.job_id, payload.sub).first<{ id: string; title: string }>();
  if (!job) return err('Job not found', 404);

  const { results } = await env.DB.prepare(
    `SELECT a.id, a.cover_letter, a.linkedin_url, a.portfolio_url, a.status, a.created_at,
            u.email, u.bio
     FROM applications a
     JOIN users u ON a.seeker_id = u.id
     WHERE a.job_id = ?
     ORDER BY a.created_at DESC`
  ).bind(params.job_id).all();

  return json({ job, applicants: results });
};
