/* eslint-disable @typescript-eslint/no-require-imports -- Read-only live API smoke test; never prints credentials or tokens. */
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd(), true);

async function main() {
  const id = process.env.QF_CLIENT_ID?.trim();
  const secret = process.env.QF_CLIENT_SECRET?.trim();
  const environment = process.env.QF_ENV?.trim() || 'prelive';
  for (const [name, value] of [['QF_CLIENT_ID', id], ['QF_CLIENT_SECRET', secret]]) {
    if (!value) { console.error(`${name} is missing. Quran Foundation requires both a client ID and client secret.`); process.exitCode = 1; }
  }
  if (process.exitCode) return;
  if (!['prelive', 'production'].includes(environment)) throw new Error('Set QF_ENV to prelive or production.');
  const production = environment === 'production';
  const reference = process.argv[2] || '1:1';
  if (!/^(?:[1-9]|[1-9]\d|10\d|11[0-4]):(?:[1-9]|[1-9]\d|[12]\d\d)$/.test(reference)) throw new Error('Verse reference must be numeric surah:ayah.');
  console.log(`Testing Quran Foundation ${environment}: authentication and verse ${reference} (read-only).`);
  const response = await fetch(`https://${production ? '' : 'prelive-'}oauth2.quran.foundation/oauth2/token`, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&scope=content',
  });
  console.log(`Authentication HTTP status: ${response.status}`);
  if (!response.ok) throw new Error('Authentication failed. Check the credential pair, environment, and approved Content API scope.');
  const token = await response.json();
  if (typeof token.access_token !== 'string' || !token.access_token) throw new Error('Authentication response did not contain an access token.');
  const verseResponse = await fetch(`https://apis${production ? '' : '-prelive'}.quran.foundation/content/api/v4/verses/by_key/${reference}?fields=text_uthmani`, {
    redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'x-client-id': id, 'x-auth-token': token.access_token },
  });
  console.log(`Verse lookup HTTP status: ${verseResponse.status}`);
  if (!verseResponse.ok) throw new Error('Verse lookup failed. Check Content API access for this environment.');
  const data = await verseResponse.json();
  if (data.verse?.verse_key !== reference || typeof data.verse.text_uthmani !== 'string' || !data.verse.text_uthmani.trim()) throw new Error('Verse response did not match the requested reference.');
  console.log(`PASS: credentials authenticated and verse ${reference} returned valid Arabic text.`);
  console.log('This test does not write MongoDB records or approve resources.');
}
main().catch(error => {
  // Never print provider response bodies, fetch objects, or error stacks.
  const safe = ['Set QF_ENV', 'Authentication failed.', 'Authentication response', 'Verse lookup failed.', 'Verse response', 'Verse reference'];
  console.error(safe.some(prefix => error.message?.startsWith(prefix)) ? error.message : 'Request failed or timed out. Check network access and retry.');
  process.exitCode = 1;
});
