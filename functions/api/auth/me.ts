import { json, err, options } from '../_lib/cors';
import { getCookieToken, verifyJWT } from '../_lib/jwt';

interface Env { JWT_SECRET: string; }

export const onRequestOptions = () => options();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return err('Unauthenticated', 401);
  return json({ id: payload.sub, email: payload.email, role: payload.role });
};
