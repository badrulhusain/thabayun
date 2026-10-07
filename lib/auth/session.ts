import 'server-only';
import { cookies } from 'next/headers';
import { createHash, randomBytes } from 'node:crypto';
import { connect } from '../integrations/database';
import { ClaimsError } from '../claims/validation';
import { Accounts, Sessions } from './models';

export const SESSION_COOKIE = 'tabayyun-session';
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export async function currentAccount() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  if (!/^[a-f0-9]{64}$/.test(token)) throw new ClaimsError('Your session expired. Sign in again.', 401, 'AUTH_REQUIRED');
  await connect();
  const session = await Sessions.findOne({ tokenHash: tokenHash(token), expiresAt: { $gt: new Date() } }).lean();
  if (!session) throw new ClaimsError('Your session expired. Sign in again.', 401, 'AUTH_REQUIRED');
  const account = await Accounts.findOne({ owner: session.owner }).select('owner username').lean();
  if (!account) throw new ClaimsError('Sign in again to continue.', 401, 'AUTH_REQUIRED');
  return { owner: String(account.owner), username: String(account.username) };
}
export async function requireAccount() {
  const account = await currentAccount();
  if (!account) throw new ClaimsError('Sign in to save evidence, notes and briefs to your research account.', 401, 'AUTH_REQUIRED');
  return account;
}
export async function createSession(owner: string) {
  const jar = await cookies(), token = randomBytes(32).toString('hex');
  await Sessions.init();
  await Sessions.create({ owner, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 7 * 86400000) });
  const previous = jar.get(SESSION_COOKIE)?.value;
  if (previous) await Sessions.deleteOne({ tokenHash: tokenHash(previous) });
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 7 * 86400 });
  // Guest ownership never becomes an account credential.
  jar.delete('tabayyun-owner');
}
export async function endSession() {
  const jar = await cookies(), token = jar.get(SESSION_COOKIE)?.value;
  if (token) { await connect(); await Sessions.deleteOne({ tokenHash: tokenHash(token) }); }
  jar.delete(SESSION_COOKIE);
  jar.delete('tabayyun-owner');
}
