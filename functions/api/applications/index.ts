import { json, err, options } from '../_lib/cors';
import { getCookieToken, verifyJWT } from '../_lib/jwt';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestOptions = () => options();

// POST /api/applications — seeker submits application
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload || payload.role !== 'seeker') return err('Forbidden', 403);

  const body = await request.json<{
    job_id: string;
    full_name: string;
    phone: string;
    resume_url: string;
    cover_letter?: string;
    interest_statement?: string;
    linkedin_url?: string;
    portfolio_url?: string;
    answers?: Array<{ question_id: string; answer: string }>;
  }>();

  const { job_id, full_name, phone, resume_url, cover_letter, interest_statement, linkedin_url, portfolio_url, answers } = body;

  if (!job_id) return err('Missing job_id');
  if (!full_name?.trim()) return err('Full name is required');
  if (!phone?.trim()) return err('Phone number is required');
  if (!resume_url?.trim()) return err('Resume link is required');

  const job = await env.DB.prepare("SELECT id FROM jobs WHERE id = ? AND status = 'active'").bind(job_id).first();
  if (!job) return err('Job not found or closed', 404);

  const already = await env.DB.prepare(
    'SELECT id FROM applications WHERE job_id = ? AND seeker_id = ?'
  ).bind(job_id, payload.sub).first();
  if (already) return err('Already applied', 409);

  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO applications
       (id, job_id, seeker_id, full_name, phone, resume_url, cover_letter, interest_statement, linkedin_url, portfolio_url, answers)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, job_id, payload.sub,
    full_name.trim(), phone.trim(), resume_url.trim(),
    cover_letter ?? null, interest_statement ?? null,
    linkedin_url ?? null, portfolio_url ?? null,
    JSON.stringify(answers ?? [])
  ).run();

  // Save profile details so the seeker doesn't have to re-enter them next time
  await env.DB.prepare(
    `UPDATE users SET full_name = ?, phone = ?, resume_url = ? WHERE id = ?`
  ).bind(full_name.trim(), phone.trim(), resume_url.trim(), payload.sub).run();

  return json({ ok: true, id }, 201);
};
