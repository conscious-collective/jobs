import { json, err, options } from '../../_lib/cors';
import { getCookieToken, verifyJWT } from '../../_lib/jwt';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestOptions = () => options();

async function guard(request: Request, env: Env) {
  const token = getCookieToken(request);
  if (!token) return null;
  const payload = await verifyJWT(token, env.JWT_SECRET);
  return payload?.role === 'admin' ? payload : null;
}

// PATCH — update job status
export const onRequestPatch: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!await guard(request, env)) return err('Forbidden', 403);

  const { status } = await request.json<{ status: string }>();
  const valid = ['active', 'closed', 'draft', 'suspended'];
  if (!valid.includes(status)) return err('Invalid status');

  await env.DB.prepare('UPDATE jobs SET status = ? WHERE id = ?').bind(status, params.id).run();
  return json({ ok: true });
};

// DELETE — remove job and its applications
export const onRequestDelete: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!await guard(request, env)) return err('Forbidden', 403);

  await env.DB.prepare('DELETE FROM jobs WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
};
