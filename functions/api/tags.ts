import { json, options } from './_lib/cors';

interface Env { DB: D1Database; }

export const onRequestOptions = () => options();

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    `SELECT tags FROM jobs WHERE status = 'active' AND tags IS NOT NULL AND tags != '[]'`
  ).all();

  const tagSet = new Set<string>();
  for (const row of results as any[]) {
    try {
      const parsed = JSON.parse(row.tags);
      if (Array.isArray(parsed)) parsed.forEach((t: string) => t && tagSet.add(t.trim()));
    } catch {}
  }

  return json(Array.from(tagSet).sort((a, b) => a.localeCompare(b)));
};
