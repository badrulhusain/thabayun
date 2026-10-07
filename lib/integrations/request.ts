import 'server-only';
export class ProviderError extends Error { constructor(public outcome: 'no_match' | 'unavailable' | 'error', public attempts: number, public httpStatus?: number) { super(outcome); } }
export async function requestJson(url: string, init: RequestInit = {}): Promise<{ data: unknown; attempts: number }> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(url, { ...init, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (response.status === 404) throw new ProviderError('no_match', attempt);
      if (response.status === 429 || response.status >= 500) {
        const wait = Number(response.headers.get('retry-after') ?? '0.25') * 1000;
        if (attempt === 1 && Number.isFinite(wait) && wait <= 1000) { await new Promise(r => setTimeout(r, Math.max(250, wait))); continue; }
        throw new ProviderError('unavailable', attempt);
      }
      if (!response.ok) throw new ProviderError('error', attempt, response.status);
      const reader = response.body?.getReader(); if (!reader) throw new ProviderError('error', attempt);
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 1000000) { await reader.cancel(); throw new ProviderError('error', attempt); } chunks.push(value); }
      return { data: JSON.parse(Buffer.concat(chunks).toString('utf8')), attempts: attempt };
    } catch (error) { if (error instanceof ProviderError) throw error; if (attempt === 2) throw new ProviderError('unavailable', attempt); }
  }
  throw new ProviderError('unavailable', 2);
}
