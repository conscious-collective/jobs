import { json, err, options } from './_lib/cors';
import { getCookieToken, verifyJWT } from './_lib/jwt';

interface Env { UPLOADS: R2Bucket; JWT_SECRET: string; }

export const onRequestOptions = () => options();

// POST /api/upload — upload an image to R2 (any authenticated user)
// Accepts multipart/form-data with a `file` field
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return err('Unauthenticated', 401);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return err('Expected multipart/form-data');
  }

  const file = formData.get('file') as File | null;
  if (!file || typeof file === 'string') return err('No file provided');

  const allowedTypes: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  };

  const ext = allowedTypes[file.type];
  if (!ext) return err('Invalid file type. Accepted: JPG, PNG, WebP, GIF, SVG, PDF, DOC, DOCX.');

  const maxBytes = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxBytes) return err('File too large. Maximum size is 5 MB.');

  const key = `${crypto.randomUUID()}.${ext}`;
  const buffer = await file.arrayBuffer();

  await env.UPLOADS.put(key, buffer, {
    httpMetadata: { contentType: file.type },
  });

  return json({ url: `/api/uploads/${key}` });
};
