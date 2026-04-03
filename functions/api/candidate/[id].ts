import { json, err, options } from '../_lib/cors';

interface Env { DB: D1Database; }

export const onRequestOptions = () => options();

// GET /api/candidate/:id — public seeker profile (no PII like email/phone)
export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const user = await env.DB.prepare(
    `SELECT id, full_name, avatar, bio, location, years_experience,
            skills, linkedin_url, portfolio_url, open_to_work
     FROM users WHERE id = ? AND role = 'seeker'`
  ).bind(params.id).first<any>();

  if (!user) return err('Candidate not found', 404);

  return json({
    ...user,
    skills: JSON.parse(user.skills ?? '[]'),
    open_to_work: Boolean(user.open_to_work),
  });
};
