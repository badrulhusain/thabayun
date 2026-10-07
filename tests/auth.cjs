/* eslint-disable @typescript-eslint/no-require-imports -- Synthetic account/session database boundary, real password hashing. */
require('./search.cjs');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const originalLoad = Module._load;
const cookies = new Map(), options = new Map(), accounts = [], sessions = [];
let databaseUnavailable = false, quotaCalls = 0;
const db = { connect: async () => { if (databaseUnavailable) throw new Error('SYNTHETIC unavailable database'); }, Resources: { find: () => ({ select: () => ({ lean: async () => [] }) }) } };
const query = row => ({ select() { return this; }, lean: async () => row, then(resolve, reject) { return Promise.resolve(row).then(resolve, reject); } });
const Accounts = {
  init: async () => {},
  findOne: filter => query(accounts.find(a => Object.entries(filter).every(([k,v]) => a[k] === v)) ?? null),
  create: async row => { if (accounts.some(a => a.username === row.username)) throw Object.assign(new Error('duplicate'), { code: 11000 }); accounts.push(row); return row; },
};
const Sessions = {
  init: async () => {}, create: async row => { sessions.push(row); },
  findOne: filter => query(sessions.find(s => s.tokenHash === filter.tokenHash && s.expiresAt > filter.expiresAt.$gt) ?? null),
  deleteOne: async filter => { const index = sessions.findIndex(s => s.tokenHash === filter.tokenHash); if (index >= 0) sessions.splice(index,1); },
};
const jar = { get: name => cookies.has(name) ? { value: cookies.get(name) } : undefined, set: (name,value,opts) => { cookies.set(name,value); options.set(name,opts); }, delete: name => cookies.delete(name) };
Module._load = function(name, parent, ...args) {
  if (name === 'server-only') return {};
  if (name === 'next/headers') return { cookies: async () => jar };
  if (name === '@/lib/auth/models' || name === './models' && parent.filename.includes('/lib/auth/')) return { Accounts, Sessions };
  if (name === '@/lib/integrations/database' || name === '../integrations/database') return db;
  if (name === '@/lib/integrations/quota' || name === './quota') return { consumeQuota: async () => { quotaCalls++; await db.connect(); } };
  if (name === '@/lib/research/models') return { ResearchProjects: { find: filter => ({ sort: () => ({ lean: async () => [{ id: 'fixture-project', owner: filter.owner }] }) }) } };
  if (name === '@/lib/research/service') return { workspace: async owner => ({ owner }), mutate: async owner => ({ owner }) };
  if (name.startsWith('@/')) name = path.join(process.cwd(), name.slice(2));
  return originalLoad.call(this, name, parent, ...args);
};
const auth = require('../app/api/auth/route.ts');
const research = require('../app/api/research/route.ts');
const { currentAccount, tokenHash } = require('../lib/auth/session.ts');
const { owner } = require('../lib/integrations/owner.ts');
const { credentials, hashPassword, verifyPassword } = require('../lib/auth/password.ts');
Module._load = originalLoad;
const post = (action, username = 'researcher', password = 'synthetic-password-123') => auth.POST(new Request('https://app.test/api/auth', { method: 'POST', headers: { origin: 'https://app.test', 'content-type': 'application/json' }, body: JSON.stringify({ action, username, password }) }));
async function main() {
  process.env.NODE_ENV = 'production'; process.env.TABAYYUN_RESEARCH_SINGLE_USER = 'true';
  assert.throws(() => credentials({ $ne: '' }, 'synthetic-password-123'));
  assert.throws(() => credentials('person', 'short'));
  assert.equal(credentials('Researcher', 'synthetic-password-123').username, 'researcher');
  const a = await hashPassword('synthetic-password-123'), b = await hashPassword('synthetic-password-123');
  assert.notEqual(a,b); assert.equal(await verifyPassword('synthetic-password-123',a), true);
  assert.equal(await verifyPassword('wrong-password-123',a), false); assert.equal(await verifyPassword('synthetic-password-123'), false);
  let response = await research.GET(new Request('https://app.test/api/research'));
  assert.equal(response.status,401, 'dev opt-in cannot bypass production authentication');
  const guest = 'f'.repeat(64); cookies.set('tabayyun-owner',guest);
  response = await post('register'); assert.equal(response.status,200);
  const accountOwner = accounts[0].owner, firstToken = cookies.get('tabayyun-session');
  assert.notEqual(accountOwner,guest, 'guest bearer token must never become an account credential');
  assert.equal(cookies.has('tabayyun-owner'),false);
  assert.equal(sessions[0].tokenHash, tokenHash(firstToken)); assert.notEqual(sessions[0].tokenHash, firstToken);
  assert.equal(options.get('tabayyun-session').httpOnly,true); assert.equal(options.get('tabayyun-session').secure,true); assert.equal(options.get('tabayyun-session').sameSite,'strict');
  assert.equal((await currentAccount()).owner,accountOwner); assert.equal(await owner(false),accountOwner);
  response = await research.GET(new Request('https://app.test/api/research')); assert.equal(response.status,200);
  assert.equal((await response.json()).projects[0].owner,accountOwner);
  response = await post('register'); assert.equal(response.status,409);
  response = await post('logout'); assert.equal(response.status,200); assert.equal(sessions.length,0); assert.equal(await currentAccount(),null);
  cookies.set('tabayyun-session',firstToken); await assert.rejects(currentAccount(), e => e.status === 401);
  await auth.GET(new Request('https://app.test/api/auth')); assert.equal(cookies.has('tabayyun-session'),false);
  response = await post('login','researcher','wrong-password-123'); assert.equal(response.status,401);
  response = await post('login','Researcher'); assert.equal(response.status,200); assert.equal((await currentAccount()).owner,accountOwner);
  assert.notEqual(cookies.get('tabayyun-session'),firstToken);
  sessions[0].expiresAt = new Date(0); await assert.rejects(currentAccount(), e => e.status === 401);
  await auth.GET(new Request('https://app.test/api/auth'));
  response = await post('register','another-user'); assert.equal(response.status,200); assert.notEqual(await owner(false),accountOwner);
  response = await research.GET(new Request('https://app.test/api/research')); assert.notEqual((await response.json()).projects[0].owner,accountOwner);
  response = await auth.POST(new Request('https://app.test/api/auth', { method: 'POST', headers: { origin: 'https://evil.test' }, body: JSON.stringify({ action: 'logout' }) })); assert.equal(response.status,403);
  databaseUnavailable = true; response = await post('login'); assert.notEqual(response.status,200); assert.ok(!(await response.text()).includes('SYNTHETIC unavailable'));
  assert.ok(quotaCalls >= 5);
  console.log('Account/session fixtures passed: real scrypt, validation, registration/login, token hashing/rotation/expiry/revocation, production research gating, stable account owner and isolation, CSRF and fail-closed database. No live Atlas calls.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
