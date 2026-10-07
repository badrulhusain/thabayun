import 'server-only';
import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { ClaimsError } from '../claims/validation';
// Anonymous bearer session: existing app has no user account system.
const buckets = new Map<string, { count: number; until: number }>();
export async function owner(expensive = true) {
  const jar = await cookies(); let id = jar.get('tabayyun-owner')?.value;
  if (!id || !/^[a-f0-9]{64}$/.test(id)) { id = randomBytes(32).toString('hex'); jar.set('tabayyun-owner', id, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 60 * 60 * 24 * 30 }); }
  if (expensive) { const now = Date.now(); for (const [key, b] of buckets) if (b.until < now) buckets.delete(key); const bucket = buckets.get(id) ?? { count: 0, until: now + 60000 }; bucket.count++; buckets.set(id, bucket); if (bucket.count > 10) throw new ClaimsError('Request limit reached. Retry in one minute.', 429, 'RATE_LIMITED'); if (buckets.size > 10000) throw new ClaimsError('Service busy.', 503); }
  return id;
}
