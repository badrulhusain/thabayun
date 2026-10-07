/* eslint-disable @typescript-eslint/no-require-imports -- Deployment preflight, never prints secrets. */
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd(), false);
const errors = [];
for (const name of ['APP_URL', 'APP_OPERATOR_NAME', 'APP_SUPPORT_EMAIL', 'APP_POSTAL_ADDRESS', 'MONGODB_URI']) if (!process.env[name]?.trim()) errors.push(`${name} is required.`);
try {
  const url = new URL(process.env.APP_URL);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || ['localhost', '127.0.0.1'].includes(url.hostname)) errors.push('APP_URL must be a public HTTPS origin without a path.');
} catch { errors.push('APP_URL must be a valid public HTTPS origin.'); }
if (process.env.APP_SUPPORT_EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.APP_SUPPORT_EMAIL)) errors.push('APP_SUPPORT_EMAIL must be a valid contact email.');
if (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb+srv://')) errors.push('MONGODB_URI must use an Atlas mongodb+srv URI.');
const qfConfigured = !!(process.env.QF_CLIENT_ID || process.env.QF_CLIENT_SECRET);
if (qfConfigured && !(process.env.QF_CLIENT_ID && process.env.QF_CLIENT_SECRET)) errors.push('Set both QF_CLIENT_ID and QF_CLIENT_SECRET.');
if (qfConfigured && !['prelive', 'production'].includes(process.env.QF_ENV)) errors.push('Set QF_ENV explicitly to prelive or production.');
if (qfConfigured && process.env.VERCEL_ENV === 'production' && process.env.QF_ENV !== 'production') errors.push('Use approved production QF credentials and QF_ENV=production for the production deployment.');
if (errors.length) {
  console.error('Production configuration is incomplete:\n' + errors.map(error => `- ${error}`).join('\n'));
  process.exitCode = 1;
} else console.log('Production environment checks passed. Provider access and resource approvals still require live verification.');
