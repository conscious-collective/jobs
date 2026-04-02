import { json, err, options } from '../_lib/cors';
import { getCookieToken, verifyJWT } from '../_lib/jwt';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestOptions = () => options();

// POST /api/applications — seeker submits application
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload || payload.role !== 'seeker') return err('Forbidden', 403);

  const { job_id, cover_letter, linkedin_url, portfolio_url } =
    await request.json<{ job_id: string; cover_letter?: string; linkedin_url?: string; portfolio_url?: string }>();

  if (!job_id) return err('Missing job_id');

  const job = await env.DB.prepare("SELECT id FROM jobs WHERE id = ? AND status = 'active'").bind(job_id).first();
  if (!job) return err('Job not found or closed', 404);

  const already = await env.DB.prepare(
    'SELECT id FROM applications WHERE job_id = ? AND seeker_id = ?'
  ).bind(job_id, payload.sub).first();
  if (already) return err('Already applied', 409);

  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO applications (id, job_id, seeker_id, cover_letter, linkedin_url, portfolio_url) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, job_id, payload.sub, cover_letter ?? null, linkedin_url ?? null, portfolio_url ?? null).run();

  return json({ ok: true, id }, 201);
};
