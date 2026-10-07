export class ResearchRequestError extends Error {
  constructor(message: string, public code: string) { super(message); }
}
export async function researchRequest(body?: unknown, projectId?: string) {
  const response = await fetch(`/api/research${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
  const data = await response.json(); if (!response.ok) throw new ResearchRequestError(data.error?.message ?? 'Research request failed.', data.error?.code ?? 'REQUEST_FAILED'); return data;
}
