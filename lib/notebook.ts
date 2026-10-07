import { quotationResults, referenceResults, supportResults, type Claim, type RetrievalRun, type AnalysisRun } from './types';
import { object, string, integer, parseClaim } from './claims/validation';
export type Capture = { id: string; originalText: string; editedText: string; title: string; url: string; createdAt: string; note: string; revision: number; claims: Claim[]; retrievals: RetrievalRun[]; analyses: AnalysisRun[]; saved: boolean; extraction?: { model: string; promptVersion: string; telemetry?: unknown } };
export function safeURL(value: string) { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } }
export function capture(text = '', title = '', url = ''): Capture { return { id: crypto.randomUUID(), originalText: text, editedText: text, title, url: safeURL(url), createdAt: new Date().toISOString(), note: '', revision: 1, claims: [], retrievals: [], analyses: [], saved: false }; }
export function current(c: Capture, claim: Claim, run: { materialRevision: number; claimRevision: number }) { return c.revision === run.materialRevision && claim.revision === run.claimRevision; }
export function exportNotebook(captures: Capture[]) { return { format: 'tabayyun-extension', version: 1, exportedAt: new Date().toISOString(), captures: captures.filter(c => c.saved) }; }
// Validate every nested value, bound complexity, and discard unknown fields before persistence.
export function importNotebook(input: unknown): Capture[] {
  const root = object(input);
  if (root.format !== 'tabayyun-extension' || root.version !== 1 || !Array.isArray(root.captures) || root.captures.length > 200) throw new Error('Unsupported notebook format or size.');
  const ids = new Set<string>();
  function source(v: unknown) { const s=object(v); for(const key of ['id','title','author','sourceType','language','URL','reuseTerms']) string(s[key],4000,true); for(const key of ['edition','translator']) if(s[key]!==undefined)string(s[key],4000,true); }
  function passage(v: unknown) { const p=object(v); for(const key of ['id','sourceId','text','locator']) string(p[key],30000,true); if(p.surroundingContext!==undefined)string(p.surroundingContext,30000,true); texts(p.tags); }
  function texts(v: unknown) { if(!Array.isArray(v)||v.length>200)throw new Error('Invalid text list.'); v.forEach(x=>string(x,10000,true)); }
  function retrieval(v: unknown) { const r=object(v); for(const k of ['id','projectId','claimId','collectionVersion','searchedAt'])string(r[k],300); string(r.coverage,10000,true); integer(r.materialRevision,1);integer(r.claimRevision,1); if(!Array.isArray(r.passages)||r.passages.length>8||!Array.isArray(r.sourcesSearched)||r.sourcesSearched.length>200||!Array.isArray(r.queries)||r.queries.length>30)throw new Error('Invalid retrieval.'); r.sourcesSearched.forEach(source); r.passages.forEach(v=>{passage(v);const p=object(v);source(p.source);if(!['curated','test-fixture'].includes(String(p.provenance))||!['exact-reference','exact-quotation','keyword'].includes(String(p.method)))throw new Error('Invalid passage provenance.');}); r.queries.forEach(v=>{const q=object(v);string(q.query,10000,true);if(!['exact-reference','exact-quotation','keyword'].includes(String(q.method)))throw new Error('Invalid retrieval method.');}); }
  function json(value: unknown): unknown {
    const encoded = JSON.stringify(value);
    if (!encoded || encoded.length > 2000000) throw new Error('Record too large.');
    const walk = (v: unknown, depth: number): void => {
      if (depth > 20) throw new Error('Record too deeply nested.');
      if (typeof v === 'string' && v.length > 30000) throw new Error('Text too large.');
      if (Array.isArray(v)) { if (v.length > 200) throw new Error('Array too large.'); v.forEach(x => walk(x, depth + 1)); }
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (['__proto__','constructor','prototype'].includes(k)) throw new Error('Unsafe record key.'); walk(x, depth + 1); }
    }; walk(value, 0); return JSON.parse(encoded);
  }
  return root.captures.map(value => {
    const c = object(value); const id = string(c.id, 100); if (ids.has(id)) throw new Error('Duplicate capture ID.'); ids.add(id);
    const list = (v: unknown) => { if (!Array.isArray(v) || v.length > 200) throw new Error('Invalid record list.'); return v; };
    const claims = list(c.claims).map(v => { const o = object(v); return { ...parseClaim({ ...o, validationIssue: '' }), validationIssue: string(o.validationIssue, 500, true) }; });
    const retrievals = list(c.retrievals).map(v => { const r = json(v); retrieval(r); return r as RetrievalRun; });
    const analyses = list(c.analyses).map(v => { const a = object(json(v)); for(const key of ['id','projectId','claimId','materialId','collectionVersion','createdAt','model','promptVersion'])string(a[key],300); for(const key of ['explanation','personalNote','nextStep'])string(a[key],30000,true); integer(a.materialRevision,1); integer(a.claimRevision,1); if (a.status !== 'complete' || !Array.isArray(a.evidence) || a.evidence.length > 8 || !quotationResults.includes(a.quotation as AnalysisRun['quotation']) || !referenceResults.includes(a.reference as AnalysisRun['reference']) || !supportResults.includes(a.support as AnalysisRun['support'])) throw new Error('Invalid finding.'); texts(a.limitations);texts(a.unresolvedQuestions);parseClaim({ ...object(a.claimSnapshot), validationIssue: '' });retrieval(a.retrievalSnapshot);a.evidence.forEach(v=>{const e=object(v);string(e.passageId,100);string(e.excerpt,30000,true);source(e.citationSnapshot);passage(e.passageSnapshot);if(!['supporting','conflicting','contextual'].includes(String(e.relation)))throw new Error('Invalid evidence relation.');});return a as AnalysisRun; });
    return { id, originalText: string(c.originalText,1000000,true), editedText: string(c.editedText,30000,true), title: string(c.title,1000,true), url: safeURL(string(c.url,4000,true)), createdAt: string(c.createdAt,100), note: string(c.note,10000,true), revision: integer(c.revision,1), claims, retrievals, analyses, saved: true, ...(c.extraction ? { extraction: json(c.extraction) as Capture['extraction'] } : {}) };
  });
}
