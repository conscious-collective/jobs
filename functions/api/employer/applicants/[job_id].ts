import { json, err, options } from '../../_lib/cors';
import { getCookieToken, verifyJWT } from '../../_lib/jwt';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestOptions = () => options();

// GET /api/employer/applicants/:job_id — all applicants for a specific job
export const onRequestGet: PagesFunction<Env> = async ({ request, params, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload || payload.role !== 'employer') return err('Forbidden', 403);

  const job = await env.DB.prepare(
    'SELECT id, title, questions, saved_applicant_filter FROM jobs WHERE id = ? AND employer_id = ?'
  ).bind(params.job_id, payload.sub).first<{ id: string; title: string; questions: string; saved_applicant_filter: string | null }>();
  if (!job) return err('Job not found', 404);

  const { results } = await env.DB.prepare(
    `SELECT a.id, a.full_name, a.phone, a.resume_url, a.cover_letter, a.interest_statement,
            a.linkedin_url, a.portfolio_url, a.answers, a.status, a.created_at,
            u.email, u.avatar, u.bio, u.location, u.years_experience,
            u.linkedin_url as profile_linkedin, u.portfolio_url as profile_portfolio,
            u.skills as profile_skills, u.open_to_work
     FROM applications a
     JOIN users u ON a.seeker_id = u.id
     WHERE a.job_id = ?
     ORDER BY a.created_at DESC`
  ).bind(params.job_id).all();

  const applicants = results.map((r: any) => ({
    ...r,
    answers: JSON.parse(r.answers ?? '[]'),
    profile_skills: JSON.parse(r.profile_skills ?? '[]'),
    open_to_work: Boolean(r.open_to_work),
  }));

  return json({
    job: {
      ...job,
      questions: JSON.parse(job.questions ?? '[]'),
      saved_applicant_filter: job.saved_applicant_filter
        ? JSON.parse(job.saved_applicant_filter)
        : null,
    },
    applicants,
  });
};
