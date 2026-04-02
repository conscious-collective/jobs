import { json, err, options } from '../_lib/cors';
import { getCookieToken, verifyJWT } from '../_lib/jwt';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestOptions = () => options();

// GET /api/jobs — list all active jobs
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    `SELECT j.id, j.title, j.company, j.location, j.remote, j.type, j.category, j.description, j.tags, j.skills, j.apply_url, j.created_at,
            u.company_name as employer_company
     FROM jobs j JOIN users u ON j.employer_id = u.id
     WHERE j.status = 'active'
     ORDER BY j.created_at DESC`
  ).all();

  const jobs = results.map((r: any) => ({ ...r, tags: JSON.parse(r.tags ?? '[]'), skills: JSON.parse(r.skills ?? '[]') }));
  return json(jobs);
};

// POST /api/jobs — employer creates a job
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload || payload.role !== 'employer') return err('Forbidden', 403);

  const body = await request.json<{
    title: string; company: string; location: string; remote: boolean;
    type: string; category: string; description: string; tags: string[]; skills: string[]; apply_url?: string;
  }>();

  const { title, company, location, remote, type, category, description, tags, skills, apply_url } = body;
  if (!title || !company || !type || !category) return err('Missing required fields');

  const validTypes = ['Full-time', 'Part-time', 'Contract', 'Internship'];
  const validCategories = ['Clean Energy', 'Climate Tech', 'ESG & Reporting', 'Environmental Science', 'Green Finance', 'Circular Economy'];
  if (!validTypes.includes(type)) return err('Invalid type');
  if (!validCategories.includes(category)) return err('Invalid category');

  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO jobs (id, employer_id, title, company, location, remote, type, category, description, tags, skills, apply_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, payload.sub, title, company, location ?? '', remote ? 1 : 0, type, category, description ?? '', JSON.stringify(tags ?? []), JSON.stringify(skills ?? []), apply_url ?? null).run();

  return json({ ok: true, id }, 201);
};
