import { json, err, options } from '../../_lib/cors';
import { getCookieToken, verifyJWT } from '../../_lib/jwt';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestOptions = () => options();

// GET /api/employer/jobs/:id — fetch a single job (employer view, any status)
export const onRequestGet: PagesFunction<Env> = async ({ request, params, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload || payload.role !== 'employer') return err('Forbidden', 403);

  const job = await env.DB.prepare(
    `SELECT id, title, company, location, remote, type, category, description,
            tags, skills, questions, salary, apply_url, status
     FROM jobs WHERE id = ? AND employer_id = ?`
  ).bind(params.id, payload.sub).first<any>();
  if (!job) return err('Not found', 404);

  return json({
    ...job,
    tags: JSON.parse(job.tags ?? '[]'),
    skills: JSON.parse(job.skills ?? '[]'),
    questions: JSON.parse(job.questions ?? '[]'),
  });
};

// PUT /api/employer/jobs/:id — update a job posting
export const onRequestPut: PagesFunction<Env> = async ({ request, params, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload || payload.role !== 'employer') return err('Forbidden', 403);

  const job = await env.DB.prepare(
    'SELECT id FROM jobs WHERE id = ? AND employer_id = ?'
  ).bind(params.id, payload.sub).first();
  if (!job) return err('Job not found', 404);

  const body = await request.json<{
    title: string; company: string; location: string; remote: boolean;
    type: string; category: string; description: string; tags: string[]; skills: string[];
    salary?: string; apply_url?: string;
    questions?: Array<{ id: string; question: string; required: boolean }>;
  }>();

  const { title, company, location, remote, type, category, description, tags, skills, salary, apply_url, questions } = body;
  if (!title || !company || !type || !category) return err('Missing required fields');

  const validTypes = ['Full-time', 'Part-time', 'Contract', 'Internship'];
  const validCategories = ['Clean Energy', 'Climate Tech', 'ESG & Reporting', 'Environmental Science', 'Green Finance', 'Circular Economy'];
  if (!validTypes.includes(type)) return err('Invalid type');
  if (!validCategories.includes(category)) return err('Invalid category');

  await env.DB.prepare(
    `UPDATE jobs SET
       title = ?, company = ?, location = ?, remote = ?, type = ?, category = ?,
       description = ?, tags = ?, skills = ?, questions = ?, salary = ?, apply_url = ?
     WHERE id = ?`
  ).bind(
    title, company, location ?? '', remote ? 1 : 0,
    type, category, description ?? '',
    JSON.stringify(tags ?? []),
    JSON.stringify(skills ?? []),
    JSON.stringify((questions ?? []).filter((q: any) => q.question?.trim())),
    salary ?? null, apply_url ?? null,
    params.id
  ).run();

  return json({ ok: true, id: params.id });
};

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
