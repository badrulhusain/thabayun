'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function Account() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string } | null>(), [mode, setMode] = useState('login');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { void fetch('/api/auth', { cache: 'no-store' }).then(async r => {
    const d = await r.json(); if (!r.ok) throw new Error(d.error?.message ?? 'Unable to check your session.'); setUser(d.user);
  }).catch(e => { setError(e.message); setUser(null); }); }, []);
  async function submit(body: Record<string, unknown>) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error?.message ?? 'Account request failed.');
      setUser(data.user);
      if (data.user) router.push('/research');
    } catch (e) { setError(e instanceof Error ? e.message : 'Please retry.'); }
    finally { setBusy(false); }
  }
  return <section className="legal-page"><p className="eyebrow">YOUR RESEARCH</p><h1>{user ? `Welcome, ${user.username}` : mode === 'register' ? 'Create your account' : 'Sign in to Tabayyun'}</h1>
    <p>Keep your collected evidence, notes and cited briefs in your account and reopen them on another device.</p>
    {error && <p className="error" role="alert">{error}</p>}
    {user === undefined ? <p role="status">Checking your session…</p> : user ? <div className="actions"><Link href="/research">Open research workspace →</Link><button disabled={busy} onClick={() => void submit({ action: 'logout' })}>Sign out</button></div> : <>
      <form className="panel" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void submit({ action: mode, username: f.get('username'), password: f.get('password') }); }}>
        <label>Username<input name="username" autoComplete="username" required minLength={3} maxLength={40} pattern="[a-zA-Z0-9_-]+" disabled={busy} /></label>
        <p>3–40 letters, numbers, underscores or hyphens. Usernames are not email addresses.</p>
        <label>Password<input key={mode} name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={12} maxLength={128} disabled={busy} /></label>
        {mode === 'register' && <p>Use at least 12 characters and save your password. Password recovery is not available in this prototype.</p>}
        <button disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}</button>
        <button type="button" className="secondary" disabled={busy} onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); }}>{mode === 'register' ? 'Already have an account? Sign in' : 'New here? Create account'}</button>
      </form>
      <p>Sign in before retrieving passages you want to collect. Older guest inquiries stay on this device; retrieve their evidence again after signing in.</p>
    </>}
    <p>Recent inquiries are browser-local and remain on a shared device after sign-out. Use <Link href="/data">Manage my data</Link> to erase local work when needed.</p>
  </section>;
}
