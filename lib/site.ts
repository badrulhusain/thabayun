import 'server-only';

export function siteOrigin() {
  const value = process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid APP_URL');
  return url.origin;
}
export const operator = process.env.APP_OPERATOR_NAME || 'Tabayyun AI operator';
export const supportEmail = process.env.APP_SUPPORT_EMAIL || '';
export const postalAddress = process.env.APP_POSTAL_ADDRESS || '';
