import { json, err, options } from '../_lib/cors';
import { getCookieToken, verifyJWT } from '../_lib/jwt';

interface Env { DB: D1Database; JWT_SECRET: string; RESEND_API_KEY: string; }

export const onRequestOptions = () => options();

// GET /api/messages?application_id=X — get messages for an application (marks them as read)
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return err('Unauthenticated', 401);

  const url = new URL(request.url);
  const applicationId = url.searchParams.get('application_id');
  if (!applicationId) return err('Missing application_id');

  const app = await env.DB.prepare(
    `SELECT a.id, a.seeker_id, j.employer_id
     FROM applications a JOIN jobs j ON a.job_id = j.id
     WHERE a.id = ?`
  ).bind(applicationId).first<{ id: string; seeker_id: string; employer_id: string }>();

  if (!app) return err('Application not found', 404);
  if (payload.sub !== app.seeker_id && payload.sub !== app.employer_id) return err('Forbidden', 403);

  // Mark messages from the other party as read
  await env.DB.prepare(
    `UPDATE messages SET read_at = datetime('now')
     WHERE application_id = ? AND sender_id != ? AND read_at IS NULL`
  ).bind(applicationId, payload.sub).run();

  const { results } = await env.DB.prepare(
    `SELECT m.id, m.body, m.created_at, m.read_at, m.sender_id,
            u.email as sender_email, u.full_name as sender_name, u.role as sender_role
     FROM messages m JOIN users u ON m.sender_id = u.id
     WHERE m.application_id = ?
     ORDER BY m.created_at ASC`
  ).bind(applicationId).all();

  return json(results);
};

// POST /api/messages — send a message and email the recipient
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return err('Unauthenticated', 401);

  const { application_id, body: msgBody } = await request.json<{ application_id: string; body: string }>();
  if (!application_id) return err('Missing application_id');
  if (!msgBody?.trim()) return err('Message body is required');

  const app = await env.DB.prepare(
    `SELECT a.id, a.seeker_id, j.employer_id, j.title as job_title, j.company,
            su.email as seeker_email, su.full_name as seeker_name,
            eu.email as employer_email, eu.full_name as employer_name, eu.company_name
     FROM applications a
     JOIN jobs j ON a.job_id = j.id
     JOIN users su ON a.seeker_id = su.id
     JOIN users eu ON j.employer_id = eu.id
     WHERE a.id = ?`
  ).bind(application_id).first<{
    id: string; seeker_id: string; employer_id: string;
    job_title: string; company: string;
    seeker_email: string; seeker_name: string;
    employer_email: string; employer_name: string; company_name: string;
  }>();

  if (!app) return err('Application not found', 404);
  if (payload.sub !== app.seeker_id && payload.sub !== app.employer_id) return err('Forbidden', 403);

  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO messages (id, application_id, sender_id, body) VALUES (?, ?, ?, ?)'
  ).bind(id, application_id, payload.sub, msgBody.trim()).run();

  // Email the recipient
  const isSeeker = payload.sub === app.seeker_id;
  const recipientEmail = isSeeker ? app.employer_email : app.seeker_email;
  const recipientName = isSeeker ? (app.employer_name || app.company_name || app.company) : (app.seeker_name || app.seeker_email);
  const senderName = isSeeker ? (app.seeker_name || app.seeker_email) : (app.employer_name || app.company_name || app.company);
  const origin = new URL(request.url).origin;
  const threadUrl = `${origin}/inbox?application_id=${application_id}`;

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'C22 Jobs <hello@c22.space>',
        to: recipientEmail,
        subject: `New message from ${senderName} — ${app.job_title} at ${app.company}`,
        html: `
          <p>Hi ${recipientName},</p>
          <p>You have a new message from <strong>${senderName}</strong> regarding the <strong>${app.job_title}</strong> position at <strong>${app.company}</strong>.</p>
          <blockquote style="border-left:3px solid #00e5ff;padding:8px 16px;margin:16px 0;color:#555;">${msgBody.trim().replace(/\n/g, '<br>')}</blockquote>
          <p><a href="${threadUrl}" style="color:#00e5ff;">View conversation →</a></p>
          <p style="color:#888;font-size:12px;">C22 Jobs · <a href="https://jobs.c22.foundation" style="color:#888;">jobs.c22.foundation</a></p>
        `,
      }),
    });
    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('Resend error:', emailRes.status, errText);
    }
  } catch (e) {
    console.error('Resend fetch failed:', e);
  }

  return json({ ok: true, id }, 201);
};
