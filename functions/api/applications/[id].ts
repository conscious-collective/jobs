import { json, err, options } from '../_lib/cors';
import { getCookieToken, verifyJWT } from '../_lib/jwt';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestOptions = () => options();

// PATCH /api/applications/:id — employer updates applicant status
export const onRequestPatch: PagesFunction<Env> = async ({ request, params, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload || payload.role !== 'employer') return err('Forbidden', 403);

  const { status } = await request.json<{ status: string }>();
  const validStatuses = ['pending', 'reviewed', 'accepted', 'rejected'];
  if (!validStatuses.includes(status)) return err('Invalid status');

  const app = await env.DB.prepare(
    `SELECT a.id FROM applications a
     JOIN jobs j ON a.job_id = j.id
     WHERE a.id = ? AND j.employer_id = ?`
  ).bind(params.id, payload.sub).first();

  if (!app) return err('Not found or not your applicant', 404);

  await env.DB.prepare('UPDATE applications SET status = ? WHERE id = ?').bind(status, params.id).run();
  return json({ ok: true });
};
