import { json, err, options } from '../../_lib/cors';

interface Env { DB: D1Database; }

export const onRequestOptions = () => options();

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const slug = params.slug as string;
  const job = await env.DB.prepare(
    `SELECT j.id, j.employer_id, j.title, j.company, j.location, j.remote, j.type, j.category, j.description,
            j.tags, j.skills, j.questions, j.salary, j.apply_url, j.created_at, j.slug,
            u.company_name, u.company_website, u.company_logo, u.company_description
     FROM jobs j JOIN users u ON j.employer_id = u.id
     WHERE j.slug = ? AND j.status = 'active'`
  ).bind(slug).first<any>();

  if (!job) return err('Not found', 404);
  return json({
    ...job,
    tags: JSON.parse(job.tags ?? '[]'),
    skills: JSON.parse(job.skills ?? '[]'),
    questions: JSON.parse(job.questions ?? '[]'),
  });
};
