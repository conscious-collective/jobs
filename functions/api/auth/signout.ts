import { json, options } from '../_lib/cors';
import { clearCookie } from '../_lib/jwt';

export const onRequestOptions = () => options();

export const onRequestPost: PagesFunction = () => {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearCookie(),
    },
  });
};
