declare const BACKEND_ORIGIN: string;
export const backend = BACKEND_ORIGIN;
export async function request<T>(path: string, body: unknown, signal: AbortSignal, requestId: string): Promise<T> {
  const abort = new AbortController(); let timedOut = false;
  const cancel = () => abort.abort(); signal.addEventListener('abort',cancel,{once:true}); if(signal.aborted)cancel();
  const timer = setTimeout(() => { timedOut=true; abort.abort(); },55000);
  try {
    const r = await fetch(`${backend}/api/claims/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId }, body: JSON.stringify(body), signal: abort.signal });
    const data = await r.json();
    if (!r.ok) throw new Error(r.status === 429 ? `Rate limit reached. Retry later${r.headers.get('Retry-After') ? ` (${r.headers.get('Retry-After')} seconds)` : ''}.` : r.status === 503 ? 'AI service unavailable. Manual claims and retrieval remain available.' : data.error?.message ?? `Request failed (${r.status}).`);
    return data;
  } catch (e) { if (timedOut) throw new Error('Request timed out. Retry explicitly.'); if (e instanceof TypeError) throw new Error('Backend unreachable. Check connection and backend configuration.'); throw e; }
  finally { clearTimeout(timer); signal.removeEventListener('abort',cancel); }
}
