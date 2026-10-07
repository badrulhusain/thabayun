'use client';
import { useState } from 'react';
import { eraseLocalResearch } from '@/lib/repository';

export default function DataControls() {
  const [confirmed, setConfirmed] = useState(false);
  const [local, setLocal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function remove() {
    if (!confirmed || busy) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || 'Deletion failed. Please retry.');
      setMessage('Server records for this session were deleted.');
      if (local) {
        try { await eraseLocalResearch(); }
        catch { throw new Error('Server records were deleted, but local deletion failed. Retry or clear site storage in your browser.'); }
        setMessage('Server records for this session and local research were deleted.');
      }
      setConfirmed(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Deletion failed. Please retry.'); }
    finally { setBusy(false); }
  }
  return <section>
    <p><label><input type="checkbox" checked={local} disabled={busy} onChange={event => setLocal(event.target.checked)} /> Also erase all research saved in this browser.</label></p>
    <p><label><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} /> I understand that deleting these records cannot be undone.</label></p>
    <button type="button" disabled={!confirmed || busy} onClick={remove}>{busy ? 'Deleting…' : 'Delete my data'}</button>
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}
