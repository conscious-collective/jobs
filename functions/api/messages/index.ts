import { json, err, options } from '../_lib/cors';
import { getCookieToken, verifyJWT } from '../_lib/jwt';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestOptions = () => options();

// GET /api/messages?application_id=X — get messages for an application
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return err('Unauthenticated', 401);

  const url = new URL(request.url);
  const applicationId = url.searchParams.get('application_id');
  if (!applicationId) return err('Missing application_id');

  // Verify the caller is the seeker of the application or the employer of the job
  const app = await env.DB.prepare(
    `SELECT a.id, a.seeker_id, j.employer_id
     FROM applications a JOIN jobs j ON a.job_id = j.id
     WHERE a.id = ?`
  ).bind(applicationId).first<{ id: string; seeker_id: string; employer_id: string }>();

  if (!app) return err('Application not found', 404);
  if (payload.sub !== app.seeker_id && payload.sub !== app.employer_id) return err('Forbidden', 403);

  const { results } = await env.DB.prepare(
    `SELECT m.id, m.body, m.created_at, m.sender_id,
            u.email as sender_email, u.full_name as sender_name, u.role as sender_role
     FROM messages m JOIN users u ON m.sender_id = u.id
     WHERE m.application_id = ?
     ORDER BY m.created_at ASC`
  ).bind(applicationId).all();

  return json(results);
};

// POST /api/messages — send a message
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return err('Unauthenticated', 401);

  const { application_id, body: msgBody } = await request.json<{ application_id: string; body: string }>();
  if (!application_id) return err('Missing application_id');
  if (!msgBody?.trim()) return err('Message body is required');

  // Verify access
  const app = await env.DB.prepare(
    `SELECT a.id, a.seeker_id, j.employer_id
     FROM applications a JOIN jobs j ON a.job_id = j.id
     WHERE a.id = ?`
  ).bind(application_id).first<{ id: string; seeker_id: string; employer_id: string }>();

  if (!app) return err('Application not found', 404);
  if (payload.sub !== app.seeker_id && payload.sub !== app.employer_id) return err('Forbidden', 403);

  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO messages (id, application_id, sender_id, body) VALUES (?, ?, ?, ?)'
  ).bind(id, application_id, payload.sub, msgBody.trim()).run();

  return json({ ok: true, id }, 201);
};
