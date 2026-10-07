import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { Accounts } from '@/lib/auth/models';
import { currentAccount, createSession, endSession, SESSION_COOKIE } from '@/lib/auth/session';
import { credentials, hashPassword, verifyPassword } from '@/lib/auth/password';
import { connect } from '@/lib/integrations/database';
import { consumeQuota } from '@/lib/integrations/quota';
import { failure, jsonBody, assertSameOrigin } from '@/lib/claims/http';
import { ClaimsError, object } from '@/lib/claims/validation';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
    const account = await currentAccount();
    return Response.json({ user: account ? { username: account.username } : null });
  } catch (error) {
    if (error instanceof ClaimsError && error.status === 401) {
      (await cookies()).delete(SESSION_COOKIE);
      return Response.json({ user: null });
    }
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    const body = object(await jsonBody(request));
    if (body.action === 'logout') { await endSession(); return Response.json({ user: null }); }
    if (!['register', 'login'].includes(String(body.action))) throw new ClaimsError('Choose sign in or create account.');
    const input = credentials(body.username, body.password);
    // Shared global + username counters, enforced in development too. Do not trust client IP headers.
    await consumeQuota(`auth:${input.username}`);
    await connect(); await Accounts.init();
    let account;
    if (body.action === 'register') {
      const passwordHash = await hashPassword(input.password);
      try { account = await Accounts.create({ username: input.username, passwordHash, owner: randomBytes(32).toString('hex') }); }
      catch (error) {
        if ((error as { code?: number }).code === 11000) throw new ClaimsError('That username is unavailable. Choose another or sign in.', 409, 'USERNAME_UNAVAILABLE');
        throw error;
      }
    } else {
      account = await Accounts.findOne({ username: input.username });
      if (!await verifyPassword(input.password, account?.passwordHash)) throw new ClaimsError('Username or password is incorrect.', 401, 'INVALID_CREDENTIALS');
    }
    await createSession(String(account.owner));
    return Response.json({ user: { username: input.username } });
  } catch (error) { return failure(error); }
}
