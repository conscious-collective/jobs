interface Env { UPLOADS: R2Bucket; }

// GET /api/uploads/:key — serve a file from R2
export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const key = params.key as string;
  const object = await env.UPLOADS.get(key);

  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType ?? 'application/octet-stream');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('ETag', object.httpEtag);

  return new Response(object.body, { headers });
};
