import { json, err, options } from '../_lib/cors';
import { getCookieToken, verifyJWT } from '../_lib/jwt';

interface Env { DB: D1Database; JWT_SECRET: string; }

export const onRequestOptions = () => options();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const token = getCookieToken(request);
  if (!token) return err('Unauthenticated', 401);
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload || payload.role !== 'admin') return err('Forbidden', 403);

  const [totalUsers, employers, seekers, totalJobs, activeJobs, totalApps, pendingApps] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) as n FROM users').first<{ n: number }>(),
    env.DB.prepare("SELECT COUNT(*) as n FROM users WHERE role = 'employer'").first<{ n: number }>(),
    env.DB.prepare("SELECT COUNT(*) as n FROM users WHERE role = 'seeker'").first<{ n: number }>(),
    env.DB.prepare('SELECT COUNT(*) as n FROM jobs').first<{ n: number }>(),
    env.DB.prepare("SELECT COUNT(*) as n FROM jobs WHERE status = 'active'").first<{ n: number }>(),
    env.DB.prepare('SELECT COUNT(*) as n FROM applications').first<{ n: number }>(),
    env.DB.prepare("SELECT COUNT(*) as n FROM applications WHERE status = 'pending'").first<{ n: number }>(),
  ]);

  return json({
    users: { total: totalUsers?.n ?? 0, employers: employers?.n ?? 0, seekers: seekers?.n ?? 0 },
    jobs: { total: totalJobs?.n ?? 0, active: activeJobs?.n ?? 0 },
    applications: { total: totalApps?.n ?? 0, pending: pendingApps?.n ?? 0 },
  });
};
