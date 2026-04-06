import { json, err, options } from '../../_lib/cors';
import { getCookieToken, verifyJWT } from '../../_lib/jwt';
import { generateSlug, uniqueSlug } from '../../_lib/slug';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestOptions = () => options();

// POST /api/admin/jobs/backfill-slugs — generate slugs for all jobs that lack one
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload || payload.role !== 'admin') return err('Forbidden', 403);

  const { results } = await env.DB.prepare(
    `SELECT id, title, company, created_at FROM jobs WHERE slug IS NULL OR slug = ''`
  ).all<{ id: string; title: string; company: string; created_at: string }>();

  let updated = 0;
  for (const job of results) {
    const base = generateSlug(job.title, job.company, job.created_at);
    const slug = await uniqueSlug(base, env.DB);
    await env.DB.prepare('UPDATE jobs SET slug = ? WHERE id = ?').bind(slug, job.id).run();
    updated++;
  }

  return json({ ok: true, updated });
};
