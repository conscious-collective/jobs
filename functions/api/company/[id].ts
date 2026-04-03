import { json, err, options } from '../_lib/cors';

interface Env { DB: D1Database; }

export const onRequestOptions = () => options();

// GET /api/company/:id — public employer profile + active jobs
export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const [employer, jobsResult] = await Promise.all([
    env.DB.prepare(
      `SELECT id, company_name, company_logo, company_description, company_website, company_size, company_hq
       FROM users WHERE id = ? AND role = 'employer'`
    ).bind(params.id).first<any>(),
    env.DB.prepare(
      `SELECT id, title, company, location, remote, type, category, salary, tags, skills, created_at
       FROM jobs WHERE employer_id = ? AND status = 'active'
       ORDER BY created_at DESC`
    ).bind(params.id).all(),
  ]);

  if (!employer) return err('Company not found', 404);

  const jobs = (jobsResult.results ?? []).map((j: any) => ({
    ...j,
    tags: JSON.parse(j.tags ?? '[]'),
    skills: JSON.parse(j.skills ?? '[]'),
  }));

  return json({ ...employer, jobs });
};
