import { json, err, options } from '../_lib/cors';
import { getCookieToken, verifyJWT } from '../_lib/jwt';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestOptions = () => options();

// GET /api/profile — full profile for the current user
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return err('Unauthenticated', 401);

  const user = await env.DB.prepare(
    `SELECT id, email, role,
            full_name, phone, avatar, bio, location,
            resume_url, years_experience, linkedin_url, portfolio_url, skills, open_to_work,
            company_name, company_website, company_logo, company_description, company_size, company_hq,
            saved_job_filters
     FROM users WHERE id = ?`
  ).bind(payload.sub).first<any>();

  if (!user) return err('User not found', 404);

  return json({
    ...user,
    skills: JSON.parse(user.skills ?? '[]'),
    open_to_work: Boolean(user.open_to_work),
  });
};

// PATCH /api/profile — update any subset of profile fields
// Arrays (skills) should be sent as actual JSON arrays in the body.
// Send null or "" to clear a field. Fields absent from the body are untouched.
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return err('Unauthenticated', 401);

  const body = await request.json<Record<string, unknown>>();

  const stringFields = [
    'full_name','phone','avatar','bio','location',
    'resume_url','years_experience','linkedin_url','portfolio_url',
    'company_name','company_website','company_logo','company_description','company_size','company_hq',
    'saved_job_filters',
  ];

  const setClauses: string[] = [];
  const bindings: unknown[] = [];

  for (const col of stringFields) {
    if (col in body) {
      setClauses.push(`${col} = ?`);
      const v = body[col];
      bindings.push(v === '' || v === null || v === undefined ? null : String(v));
    }
  }

  if ('skills' in body) {
    setClauses.push('skills = ?');
    const s = body.skills;
    bindings.push(Array.isArray(s) ? JSON.stringify(s) : '[]');
  }

  if ('open_to_work' in body) {
    setClauses.push('open_to_work = ?');
    bindings.push(body.open_to_work ? 1 : 0);
  }

  if (setClauses.length === 0) return json({ ok: true });

  bindings.push(payload.sub);
  await env.DB.prepare(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`
  ).bind(...bindings).run();

  return json({ ok: true });
};
