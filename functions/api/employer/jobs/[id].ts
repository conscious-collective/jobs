import { json, err, options } from '../../_lib/cors';
import { getCookieToken, verifyJWT } from '../../_lib/jwt';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestOptions = () => options();

// PATCH /api/employer/jobs/:id — save applicant filter preference for a job
export const onRequestPatch: PagesFunction<Env> = async ({ request, params, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload || payload.role !== 'employer') return err('Forbidden', 403);

  const job = await env.DB.prepare(
    'SELECT id FROM jobs WHERE id = ? AND employer_id = ?'
  ).bind(params.id, payload.sub).first();
  if (!job) return err('Job not found', 404);

  const { saved_applicant_filter } = await request.json<{ saved_applicant_filter: string }>();
  if (typeof saved_applicant_filter !== 'string') return err('Invalid payload');

  await env.DB.prepare(
    'UPDATE jobs SET saved_applicant_filter = ? WHERE id = ?'
  ).bind(saved_applicant_filter, params.id).run();

  return json({ ok: true });
};
