/* eslint-disable @typescript-eslint/no-require-imports -- Maintenance-script connection helper. */
const https = require('node:https');

function dnsOverHttps(name, type) {
  return new Promise((resolve, reject) => {
    const request = https.get(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, { timeout: 8000 }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        try {
          const payload = JSON.parse(body);
          if (payload.Status !== 0 || !Array.isArray(payload.Answer)) throw new Error(`DNS-over-HTTPS returned status ${payload.Status}`);
          resolve(payload.Answer.map(answer => String(answer.data)));
        } catch (error) { reject(error); }
      });
    });
    request.on('timeout', () => request.destroy(new Error('DNS-over-HTTPS timed out')));
    request.on('error', reject);
  });
}

async function directUri(srvUri) {
  const parsed = new URL(srvUri);
  const srv = await dnsOverHttps(`_mongodb._tcp.${parsed.hostname}`, 'SRV');
  const hosts = srv.map(record => record.trim().split(/\s+/).at(-1)?.replace(/\.$/, '')).filter(Boolean);
  if (!hosts.length) throw new Error('Atlas SRV lookup returned no hosts');
  const txt = await dnsOverHttps(parsed.hostname, 'TXT');
  const txtOptions = txt.join('').replace(/^|$/g, '').replace(/\s*/g, '');
  const options = new URLSearchParams(txtOptions);
  for (const [key, value] of parsed.searchParams) options.set(key, value);
  options.set('tls', 'true');
  const credentials = parsed.username ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ''}@` : '';
  return `mongodb://${credentials}${hosts.join(',')}${parsed.pathname}?${options}`;
}

async function connectAtlas(mongoose, uri, options) {
  try { return await mongoose.connect(uri, options); }
  catch (error) {
    if (!/querySrv|EBADRESP|ENOTFOUND|EAI_AGAIN/.test(error instanceof Error ? error.message : String(error))) throw error;
    await mongoose.disconnect();
    return mongoose.connect(await directUri(uri), options);
  }
}

module.exports = { connectAtlas };
