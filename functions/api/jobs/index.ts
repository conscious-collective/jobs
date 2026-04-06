import { json, err, options } from '../_lib/cors';
import { getCookieToken, verifyJWT } from '../_lib/jwt';
import { generateSlug, uniqueSlug } from '../_lib/slug';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestOptions = () => options();

// GET /api/jobs — list all active jobs
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    `SELECT j.id, j.slug, j.title, j.company, j.location, j.remote, j.type, j.category, j.description, j.tags, j.skills, j.salary, j.apply_url, j.created_at,
            u.company_name as employer_company
     FROM jobs j JOIN users u ON j.employer_id = u.id
     WHERE j.status = 'active'
     ORDER BY j.created_at DESC`
  ).all();

  const jobs = results.map((r: any) => ({
    ...r,
    tags: JSON.parse(r.tags ?? '[]'),
    skills: JSON.parse(r.skills ?? '[]'),
  }));
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

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const baseSlug = generateSlug(title, company, createdAt);
  const slug = await uniqueSlug(baseSlug, env.DB);

  await env.DB.prepare(
    `INSERT INTO jobs
       (id, employer_id, title, company, location, remote, type, category, description, tags, skills, questions, salary, apply_url, slug, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, payload.sub, title, company, location ?? '', remote ? 1 : 0,
    type, category, description ?? '',
    JSON.stringify(tags ?? []),
    JSON.stringify(skills ?? []),
    JSON.stringify((questions ?? []).filter(q => q.question?.trim())),
    salary ?? null, apply_url ?? null,
    slug, createdAt
  ).run();

  return json({ ok: true, id, slug }, 201);
};
