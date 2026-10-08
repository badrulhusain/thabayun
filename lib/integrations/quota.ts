import 'server-only';
import { createHash } from 'node:crypto';
import { connect, Quotas } from './database';
import { ClaimsError } from '../claims/validation';

// Shared atomic counters survive Vercel cold starts. Global budgets also bound
// paid requests when anonymous clients reset their cookies.
export async function consumeQuota(owner: string, now = Date.now()) {
  await connect();
  try {
    await Quotas.init();
    const policies = [
      { scope: createHash('sha256').update(owner).digest('hex'), window: 60000, limit: 10 },
      { scope: 'global', window: 60000, limit: 100 },
      { scope: 'global', window: 3600000, limit: 1000 },
    ];
    for (const policy of policies) {
      const start = Math.floor(now / policy.window) * policy.window;
      const filter = { _id: `${policy.scope}:${policy.window}:${start}` };
      const update = { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(start + policy.window + 60000) } };
      let counter;
      try { counter = await Quotas.findOneAndUpdate(filter, update, { upsert: true, returnDocument: 'after' }); }
      catch (error) {
        // Concurrent first requests may race to insert; increment the winner.
        if ((error as { code?: number }).code !== 11000) throw error;
        counter = await Quotas.findOneAndUpdate(filter, { $inc: { count: 1 } }, { returnDocument: 'after' });
      }
      if (!counter) throw new Error('Missing quota counter');
      if (counter.count > policy.limit) {
        const error = new ClaimsError('Request budget reached. Please retry later.', 429, 'RATE_LIMITED');
        error.retryAfter = String(Math.max(1, Math.ceil((start + policy.window - now) / 1000)));
        throw error;
      }
    }
  } catch (error) {
    if (error instanceof ClaimsError) throw error;
    throw new ClaimsError('Request protection is unavailable. Please retry later.', 503, 'QUOTA_UNAVAILABLE');
  }
}
