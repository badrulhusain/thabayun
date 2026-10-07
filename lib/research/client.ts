export async function researchRequest(body?: unknown, projectId?: string) {
  const response = await fetch(`/api/research${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
  const data = await response.json(); if (!response.ok) throw new Error(data.error?.message ?? 'Research request failed.'); return data;
}
