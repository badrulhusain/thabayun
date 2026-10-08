'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
type Status = { database: string; modelConfigured: boolean; ocrConfigured: boolean; quranConfigured: boolean; quranEnvironment: string; sunnahConfigured: boolean; ummahConfigured: boolean; approvedResources: { provider: string; count: number }[] };
export function ServiceStatus() {
  const [status, setStatus] = useState<Status>(), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true); setError('');
    try { const response = await fetch('/api/status', { cache: 'no-store' }); if (!response.ok) throw new Error('Service status is unavailable. Please retry.'); setStatus(await response.json()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to check services.'); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    let active = true;
    void fetch('/api/status', { cache: 'no-store' }).then(async r => { if (!r.ok) throw new Error('Service status is unavailable. Please retry.'); return r.json(); }).then(d => { if (active) setStatus(d); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);
  const count = (provider: string) => status?.approvedResources.find(r => r.provider === provider)?.count ?? 0;
  return <section className="panel" aria-label="Service availability"><h2>Service availability</h2>
    <p>Check which features this deployment can support. “Configured” means credentials are present; a successful source request is still needed to confirm access.</p>
    {error && <p className="error" role="alert">{error}</p>}
    {!status && !error && <p role="status">Checking services…</p>}
    {status && <><dl>
      <dt>Research storage and accounts</dt><dd>{status.database === 'connected' ? 'Connected' : status.database === 'not_configured' ? 'Not configured — the operator must connect MongoDB Atlas.' : 'Unavailable — check the database connection and network access.'}</dd>
      <dt>AI extraction, analysis and briefs</dt><dd>{status.modelConfigured ? 'Configured' : 'Not configured — manual claim creation remains available.'}</dd>
      <dt>Screenshot OCR</dt><dd>{status.ocrConfigured ? 'Configured (Arabic / English)' : 'Not configured — paste your text instead.'}</dd>
      <dt>Quran Foundation</dt><dd>{status.quranConfigured ? `Configured · ${status.quranEnvironment} · ${count('quran-foundation')} approved resources` : 'Credentials not configured'}{status.quranEnvironment === 'prelive' && ' · Testing is limited to surahs 1 and 2.'}</dd>
      <dt>Sunnah.com</dt><dd>{status.sunnahConfigured ? `Configured · ${count('sunnah')} approved resources` : 'API key not configured'}</dd>
      <dt>UmmahAPI</dt><dd>{`${count('ummah')} approved resources · anonymous access enabled${status.ummahConfigured ? ' · higher-limit key configured' : ''}`}</dd>
      <dt>Turath</dt><dd>Public API access; each request reports its actual result · {count('turath')} approved resources</dd>
      <dt>OpenITI</dt><dd>{count('openiti')} approved resources · imported pending texts remain authenticated previews</dd>
    </dl>
    {status.database === 'connected' && !status.approvedResources.length && <p className="error">No resources have been approved. Retrieval cannot return source evidence until the operator imports reviewed resource records.</p>}
    <p>Live retrieval accepts an explicit reference such as 2:255 or bukhari:1. Unreferenced Quran and hadith wording can use bounded quotation search when a compatible resource is approved; this is not a full-corpus search or an independent authenticity ruling.</p>
    <p><Link href="/account">Sign in</Link> before collecting evidence into <Link href="/research">research projects</Link>.</p></>}
    <button className="secondary" disabled={busy} onClick={() => void refresh()}>{busy ? 'Checking…' : 'Refresh service status'}</button>
  </section>;
}
