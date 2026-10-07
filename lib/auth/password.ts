import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { ClaimsError } from '../claims/validation';

export function credentials(username: unknown, password: unknown) {
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_-]{3,40}$/.test(username.trim())) {
    throw new ClaimsError('Use a username of 3–40 letters, numbers, underscores or hyphens.');
  }
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    throw new ClaimsError('Use a password between 12 and 128 characters.');
  }
  return { username: username.trim().toLowerCase(), password };
}

function derive(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key));
  });
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt-v1:${salt}:${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, stored?: string) {
  // Do the same expensive calculation for unknown users to reduce timing leaks.
  const [version, salt, hash] = (stored ?? '').split(':');
  const valid = version === 'scrypt-v1' && /^[a-f0-9]{32}$/.test(salt ?? '') && /^[a-f0-9]{128}$/.test(hash ?? '');
  const actual = await derive(password, valid ? salt : '0'.repeat(32));
  return timingSafeEqual(actual, valid ? Buffer.from(hash, 'hex') : Buffer.alloc(64)) && valid;
}
