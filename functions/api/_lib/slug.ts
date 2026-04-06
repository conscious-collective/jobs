const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

function toSlugPart(s: string, maxLen = 50): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLen)
    .replace(/-$/, '');
}

export function generateSlug(title: string, company: string, createdAt: string): string {
  const d = new Date(createdAt);
  const datePart = `${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
  return `${toSlugPart(title, 50)}-${toSlugPart(company, 20)}-${datePart}`;
}

export async function uniqueSlug(
  base: string,
  db: D1Database,
  excludeId?: string,
): Promise<string> {
  const row = await db.prepare(
    excludeId
      ? 'SELECT id FROM jobs WHERE slug = ? AND id != ? LIMIT 1'
      : 'SELECT id FROM jobs WHERE slug = ? LIMIT 1'
  ).bind(...(excludeId ? [base, excludeId] : [base])).first();

  if (!row) return base;
  // Append a 6-char random suffix to break the collision
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}
