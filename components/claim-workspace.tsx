"use client";
import { useEffect, useRef, useState } from "react";
import { repository } from "@/lib/repository";
import { excerptIssue, outdated } from "@/lib/claims/validation";
import { compare } from '@/lib/claims/comparison';
import { analysisKey, extractionKey, reusableFinding } from "@/lib/claims/reuse";
import { claimTypes, type AnalysisRun, type Claim, type Material, type RetrievalRun } from "@/lib/types";
function retryDelay(header: string | null) { return header ? (/^\d+(\.\d+)?$/.test(header) ? Number(header) * 1000 : Date.parse(header) - Date.now()) : NaN; }

export function ClaimWorkspace({ material }: { material: Material }) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [retrievals, setRetrievals] = useState<RetrievalRun[]>([]);
  const [history, setHistory] = useState<AnalysisRun[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [focused, setFocused] = useState("");
  const [editing, setEditing] = useState<Claim>();
  const [pending, setPending] = useState<AnalysisRun[]>([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [excluded, setExcluded] = useState<string[]>([]);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const currentMaterial = useRef(material);
  useEffect(() => { currentMaterial.current = material; }, [material]);
  const revision = material.revision ?? 1;

  useEffect(() => {
    let active = true;
    Promise.all([repository.claims(material.projectId), repository.retrievals(material.projectId), repository.analyses(material.projectId)])
      .then(([c, r, a]) => { if (active) { setClaims(c.filter(c => c.materialId === material.id)); setRetrievals(r.filter(r => c.some(c => c.id === r.claimId && c.materialId === material.id))); setHistory(a.filter(a => a.materialId === material.id)); setLoaded(true); } })
      .catch(e => { if (active) setError(String(e)); });
    return () => { active = false; controller.current?.abort(); };
  }, [material.id, material.projectId, loadAttempt]);
  function cancel() { generation.current++; controller.current?.abort(); setBusy(""); setMessage("Canceled. Completed claims and findings are preserved."); }
  async function operation(name: string, action: (signal: AbortSignal, token: number) => Promise<void>) {
    const token = ++generation.current, abort = new AbortController(); controller.current = abort;
    setBusy(name); setError(""); setMessage("");
    try { await action(abort.signal, token); }
    catch (e) { if (token === generation.current) setError(String(e)); }
    finally { if (token === generation.current) setBusy(""); }
  }
  async function post(path: string, body: unknown, signal: AbortSignal) {
    const response = await fetch(`/api/claims/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
    const data = await response.json();
    if (!response.ok) {
      const header = response.headers.get("Retry-After");
      const delay = retryDelay(header);
      throw new Error((data.error?.message ?? "Request failed. Retry.") + (Number.isFinite(delay) && delay > 0 ? ` Try again in ${Math.ceil(delay / 1000)} seconds.` : ""));
    }
    return data;
  }
  async function configuration(signal: AbortSignal) {
    const response = await fetch("/api/claims/config", { signal, cache: "no-store" });
    if (!response.ok) throw new Error("Could not load Groq model configuration. Retry.");
    return await response.json() as { extractionModel: string; analysisModel: string; extractionPrompt: string; analysisPrompt: string };
  }
  async function analyze(force = false) {
    if (!focusedClaim || !retrieval) return;
    await operation("Analyzing claim", async (signal, token) => {
      const config = await configuration(signal);
      const selectedRetrieval = { ...retrieval, passages: retrieval.passages.filter(p => !excluded.includes(p.id)) };
      const key = await analysisKey(focusedClaim, selectedRetrieval, config.analysisModel, config.analysisPrompt);
      const saved = retrieval.collectionVersion === 'approved-providers-v1' ? undefined : (await repository.analyses(material.projectId)).find(run => reusableFinding(run, key, focusedClaim, config.analysisModel));
      if (!fresh(token, focusedClaim)) return;
      if (saved && !force) { setMessage("Reusing the saved finding: claim, evidence, model, and prompt are unchanged. No model request was sent."); document.getElementById(`finding-${saved.id}`)?.scrollIntoView({ block: "nearest" }); return; }
      const data = await post("analyze", { claim: focusedClaim, passageIds: selectedRetrieval.passages.map(p => p.id) }, signal);
      if (!fresh(token, focusedClaim)) return;
      const cacheKey = await analysisKey(focusedClaim, data.analysis.retrievalSnapshot, data.analysis.model, data.analysis.promptVersion);
      if (!fresh(token, focusedClaim)) return;
      setPending(prev => [...prev, { ...data.analysis, cacheKey }]); setMessage("AI analysis ready for review. Save the finding to keep it.");
    });
  }
  function fresh(token: number, claim?: Claim) {
    return token === generation.current && (currentMaterial.current.revision ?? 1) === revision && (!claim || claim.materialRevision === revision);
  }
  const focusedClaim = claims.find(c => c.id === focused);
  const retrieval = focusedClaim ? [...retrievals].reverse().find(r => r.claimId === focusedClaim.id && !outdated(r, focusedClaim, revision)) : undefined;
  function manual() {
    const excerpt = material.editedText.slice(0, Math.min(10000, material.editedText.length));
    setEditing({ id: crypto.randomUUID(), projectId: material.projectId, materialId: material.id, materialRevision: revision, revision: 1,
      excerpt, start: 0, end: excerpt.length, statement: "", type: claimTypes[4], quotation: "", speaker: "", reference: "", validationIssue: "", coverageNote: "Coverage is limited to ten historical English Quran translation excerpts." });
  }
  return <section aria-label="Claim analysis" className="claim-workspace">
    <h3>Claims and evidence analysis</h3>
    <p>Review claims before investigating. Automated extraction and AI analysis require a configured model. Manual claims and retrieval work without one.</p>
    {!loaded && !error && <p role="status">Loading saved claims…</p>}
    {!loaded && error && <button className="secondary" onClick={() => { setError(""); setLoadAttempt(prev => prev + 1); }}>Retry loading claims</button>}
    {error && <p role="alert" className="error">{error} Retry the same action when ready.</p>}
    <p role="status" aria-live="polite">{busy ? `${busy}…` : message}</p>
    <div className="actions">
      <button disabled={!!busy || !loaded || material.editedText.length > 30000} onClick={() => void operation("Extracting claims", async (signal, token) => {
        const config = await configuration(signal);
        const key = await extractionKey(material, config.extractionModel, config.extractionPrompt);
        const saved = await repository.extraction(material.projectId, material.id);
        if (!fresh(token)) return;
        if (saved?.cacheKey === key && saved.model === config.extractionModel && saved.promptVersion === config.extractionPrompt) { setMessage("Reusing saved extraction and your claim corrections. No model request was sent."); return; }
        const data = await post("extract", { text: material.editedText, projectId: material.projectId, materialId: material.id, materialRevision: revision }, signal);
        if (!fresh(token)) return;
        const actualKey = await extractionKey(material, data.model, data.promptVersion);
        if (!fresh(token)) return;
        await repository.saveExtraction(data.claims, { id: "", projectId: material.projectId, materialId: material.id, materialRevision: revision, cacheKey: actualKey, model: data.model, promptVersion: data.promptVersion, telemetry: data.telemetry, claimIds: data.claims.map((c: Claim) => c.id), createdAt: new Date().toISOString() }); if (!fresh(token)) return;
        setClaims(previous => [...previous, ...data.claims]); setMessage(`${data.claims.length} claims extracted. Review and correct them before retrieval.`);
      })}>Extract claims</button>
      <button className="secondary" disabled={!!busy || !loaded} onClick={manual}>Add claim manually</button>
      {!!busy && <button className="secondary" onClick={cancel}>Cancel claim operation</button>}
    </div>
    {material.editedText.length > 30000 && <p>Automated extraction is limited to 30,000 characters per material. Manual claim creation remains available.</p>}
    {!claims.length && loaded && <p>No claims yet. Extract claims or add one manually.</p>}
    <div className="claim-columns">
      <div aria-label="Claim list">
        {claims.map(c => <article className="claim-card" key={c.id}>
          <label className="check"><input type="checkbox" checked={selected.includes(c.id)} disabled={!!busy || !!c.validationIssue || c.materialRevision !== revision} onChange={e => setSelected(prev => e.target.checked ? [...prev, c.id].slice(0, 5) : prev.filter(id => id !== c.id))} />Investigate: {c.statement}</label>
          <small>{c.type} · Revision {c.revision}</small>
          {c.validationIssue && <p role="alert">{c.validationIssue}</p>}
          {c.materialRevision !== revision && <p>Potentially outdated: material changed. Edit and confirm the claim.</p>}
          <div className="actions"><button className="secondary" onClick={() => { setFocused(c.id); setExcluded([]); }}>Inspect claim</button>
            <button className="secondary" disabled={!!busy} onClick={() => setEditing(c)}>Edit claim</button>
            <button className="secondary" disabled={!!busy} onClick={() => void operation("Removing claim", async () => { await repository.removeClaim(c.id); setClaims(prev => prev.filter(p => p.id !== c.id)); setSelected(prev => prev.filter(id => id !== c.id)); setMessage("Claim removed. Saved findings remain in history."); })}>Remove claim</button></div>
        </article>)}
        <button disabled={!!busy || !selected.length} onClick={() => void operation("Retrieving selected claims", async (signal, token) => {
          let success = 0; const failures: string[] = [];
          for (const id of selected.slice(0, 5)) {
            const claim = claims.find(c => c.id === id); if (!claim || !fresh(token, claim)) continue;
            try { const data = await post("retrieve", { claim, material }, signal); if (!fresh(token, claim)) return;
              await repository.saveRetrieval(data.retrieval); if (!fresh(token, claim)) return;
              setRetrievals(prev => [...prev, data.retrieval]); setFocused(id); setExcluded([]); success++;
            } catch (e) { if (signal.aborted) return; failures.push(`${claim.statement}: ${String(e)}`); }
          }
          if (!fresh(token)) return;
          setMessage(`Retrieved ${success} of ${selected.length} claims. Completed work is preserved.`); setError(failures.join("\n"));
        })}>Retrieve selected claims (up to 5)</button>
      </div>
      <div aria-label="Claim detail and evidence">
        {focusedClaim ? <>
          <h4>Selected claim</h4><p dir="auto">{focusedClaim.statement}</p>
          <small>Material excerpt · characters {focusedClaim.start}–{focusedClaim.end}</small><blockquote dir="auto">{focusedClaim.excerpt}</blockquote>
          <p>Explicit quotation: {focusedClaim.quotation || "Not supplied"}<br />Attributed speaker: {focusedClaim.speaker || "Not supplied"}<br />Reference: {focusedClaim.reference || "Not supplied"}</p>
          <p>{focusedClaim.coverageNote}</p>
          {!retrieval && <p>Select this claim and retrieve evidence before analysis.</p>}
          {retrieval && <>
            <h4>Sources searched</h4><p>{retrieval.coverage}</p><small>{retrieval.collectionVersion} · {new Date(retrieval.searchedAt).toLocaleString()}</small>
            <p>Wording comparison: {compare(focusedClaim, retrieval).quotation}. Reference: {compare(focusedClaim, retrieval).reference}. Wording differences may reflect different translations. Exact wording does not establish hadith authenticity.</p>
            {retrieval.attempts?.map((a, i) => <p key={i} role="status">{a.provider}: {a.outcome.replaceAll('_', ' ')}. {a.limitations.join(' ')}</p>)}
            <details><summary>Retrieval queries and methods</summary><ul>{retrieval.queries.map((q, i) => <li key={i}>{q.method}: {q.query}</li>)}</ul></details>
            <h4>Exact-reference matches</h4>
            {!retrieval.passages.some(p => p.method === "exact-reference") && <p>No exact reference retrieved. Use surah:ayah or an official collection:hadithNumber reference. Check resource approval and provider status above.</p>}
            <h4>Retrieved evidence</h4>
            {!retrieval.passages.length && <p>No relevant evidence retrieved. This does not establish that the claim is false.</p>}
            {[...retrieval.passages].sort((a, b) => Number(b.method === "exact-reference") - Number(a.method === "exact-reference")).map(p => <article className="claim-card" key={p.id}>
              <label className="check"><input type="checkbox" checked={!excluded.includes(p.id)} disabled={!!busy} onChange={e => setExcluded(prev => e.target.checked ? prev.filter(id => id !== p.id) : [...prev, p.id])} />Include evidence: {p.id}</label>
              <small>{p.method} · {p.provenance === 'live' ? 'Retrieved approved source text' : 'Local demonstration source'}</small><blockquote className="passage" dir="auto">{p.text}</blockquote>
              {p.grades?.map((g, i) => <p key={i}>Grade attributed to {g.authority}: {g.grade}</p>)}
              {p.limitations?.map((l, i) => <p key={i}>{l}</p>)}
              <p>{p.source.title} · {p.source.author} · Translator: {p.source.translator} · {p.source.edition}</p><small>{p.locator}</small>
              <details><summary>Surrounding context</summary><p dir="auto">{p.surroundingContext ?? "Not available locally. Consult the original source."}</p></details>
              <a href={p.source.URL} target="_blank" rel="noopener noreferrer">Original source</a>
            </article>)}
            <div className="actions"><button disabled={!!busy || focusedClaim.materialRevision !== revision || !!focusedClaim.validationIssue} onClick={() => void analyze()}>Run evidence-based analysis</button>
              <button className="secondary" disabled={!!busy || focusedClaim.materialRevision !== revision || !!focusedClaim.validationIssue} onClick={() => void analyze(true)}>Run fresh analysis</button></div>
          </>}
        </> : <p>Inspect a claim to see its excerpt, references, and evidence together.</p>}
      </div>
    </div>
    {editing && <ClaimEditor key={`${editing.id}:${editing.revision}`} claim={editing} material={material} cancel={() => setEditing(undefined)} save={async next => {
      await repository.saveClaims([next]); generation.current++; controller.current?.abort(); setBusy("");
      setClaims(prev => [...prev.filter(c => c.id !== next.id), next]); setPending(prev => prev.filter(r => r.claimId !== next.id)); setEditing(undefined); setFocused(next.id); setMessage("Claim saved. Previous analyses remain in history and may be outdated.");
    }} />}
    {pending.map(run => <Finding key={run.id} run={run} stale={outdated(run, claims.find(c => c.id === run.claimId), revision)} save={async note => {
      await repository.saveAnalysis({ ...run, personalNote: note }); setHistory(prev => [{ ...run, personalNote: note }, ...prev]); setPending(prev => prev.filter(r => r.id !== run.id));
    }} dismiss={() => setPending(prev => prev.filter(r => r.id !== run.id))} />)}
    <h4>Saved analysis history</h4>
    {!history.length && <p>No saved findings yet. Each rerun creates a separate finding.</p>}
    {history.map(run => <Finding key={run.id} run={run} saved stale={outdated(run, claims.find(c => c.id === run.claimId), revision)} save={async note => {
      await repository.saveAnalysisNote(run.id, note); setHistory(prev => prev.map(r => r.id === run.id ? { ...r, personalNote: note } : r));
    }} />)}
  </section>;
}

function ClaimEditor({ claim, material, save, cancel }: { claim: Claim; material: Material; save: (c: Claim) => Promise<void>; cancel: () => void }) {
  const [draft, setDraft] = useState(claim), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  return <form className="panel" aria-label="Edit individual claim" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const start = draft.start, end = start + draft.excerpt.length;
      const issue = excerptIssue(material.editedText, draft.excerpt, start, end); if (issue) throw new Error(issue);
      if (draft.quotation && !draft.excerpt.includes(draft.quotation)) throw new Error("Explicit quotation must occur verbatim in the material excerpt.");
      await save({ ...draft, end, materialRevision: material.revision ?? 1, revision: claim.statement ? claim.revision + 1 : 1, validationIssue: "" });
    } catch (e) { setError(String(e)); } finally { setBusy(false); }
  }}>
    <h4>Review individual claim</h4>{error && <p role="alert">{error}</p>}
    <label>Standalone claim statement<textarea dir="auto" required maxLength={2000} value={draft.statement} onChange={e => setDraft({ ...draft, statement: e.target.value })} /></label>
    <label>Exact material excerpt<textarea dir="auto" required maxLength={10000} value={draft.excerpt} onChange={e => { const excerpt = e.target.value, index = material.editedText.indexOf(excerpt); setDraft({ ...draft, excerpt, start: index >= 0 ? index : draft.start }); }} /></label>
    <label>Excerpt start offset (UTF-16)<input type="number" min={0} max={material.editedText.length} value={draft.start} onChange={e => setDraft({ ...draft, start: Number(e.target.value) })} /></label>
    <label>Claim type<select value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value as Claim["type"] })}>{claimTypes.map(t => <option key={t}>{t}</option>)}</select></label>
    <label>Explicit quotation<input dir="auto" maxLength={4000} value={draft.quotation} onChange={e => setDraft({ ...draft, quotation: e.target.value })} /></label>
    <label>Attributed speaker<input maxLength={300} value={draft.speaker} onChange={e => setDraft({ ...draft, speaker: e.target.value })} /></label>
    <label>Cited reference<input maxLength={300} value={draft.reference} onChange={e => setDraft({ ...draft, reference: e.target.value })} /></label>
    <p>Confirm qualifications, negation, and whose view is being reported. Reference lookup uses stored passage IDs or exact locators.</p>
    <div className="actions"><button disabled={busy}>Save claim</button><button disabled={busy} type="button" className="secondary" onClick={cancel}>Cancel claim edit</button></div>
  </form>;
}

function Finding({ run, stale, saved, save, dismiss }: { run: AnalysisRun; stale: boolean; saved?: boolean; save: (note: string) => Promise<void>; dismiss?: () => void }) {
  const [note, setNote] = useState(run.personalNote), [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  return <article className="panel" id={`finding-${run.id}`} aria-label={saved ? "Saved finding" : "Finding preview"}>
    <h4>{saved ? "Saved finding" : "Unsaved finding"} · {run.claimSnapshot.statement}</h4>
    <details><summary>Claim and material excerpt analyzed</summary><p>{run.claimSnapshot.type} · Attributed speaker: {run.claimSnapshot.speaker || "Not supplied"} · Cited reference: {run.claimSnapshot.reference || "Not supplied"}</p><blockquote dir="auto">{run.claimSnapshot.excerpt}</blockquote><p dir="auto">Explicit quotation: {run.claimSnapshot.quotation || "Not supplied"}</p></details>
    {stale && <p>Potentially outdated: claim removed or edited, or material changed.</p>}
    <dl><dt>Quotation</dt><dd>{run.quotation}</dd><dt>Reference</dt><dd>{run.reference}</dd><dt>Contextual support</dt><dd>{run.support}</dd></dl>
    <h4>AI analysis</h4><p>{run.explanation}</p>
    {run.evidence.map((e, i) => <div key={i} className="excerpt"><small>Source text · {e.relation} · {e.passageId}</small><blockquote dir="auto">{e.excerpt}</blockquote>
      <p>{e.citationSnapshot.title} · {e.citationSnapshot.author} · {e.citationSnapshot.sourceType} · {e.citationSnapshot.translator} · {e.citationSnapshot.edition}</p><small>{e.passageSnapshot.locator}</small><br />
      <a href={e.citationSnapshot.URL} target="_blank" rel="noopener noreferrer">Original evidence source</a>
      <details><summary>Saved surrounding context</summary><p dir="auto">{e.passageSnapshot.surroundingContext ?? "Not available locally."}</p></details>
    </div>)}
    <details><summary>Limitations, unresolved questions, and provenance</summary>
      <ul>{run.limitations.map((l, i) => <li key={i}>{l}</li>)}</ul><ul>{run.unresolvedQuestions.map((q, i) => <li key={i}>{q}</li>)}</ul>
      <p>Model: {run.model} · Prompt: {run.promptVersion} · Collection: {run.collectionVersion} · Claim revision: {run.claimRevision} · Material revision: {run.materialRevision} · {new Date(run.createdAt).toLocaleString()}</p>
      <p>Sources searched: {run.retrievalSnapshot.sourcesSearched.map(s => s.title).join(", ")}</p>
      {run.telemetry && <p>Provider: Groq · Completion: {run.telemetry.status} · Latency: {run.telemetry.latencyMs} ms · Attempts: {run.telemetry.attempts} · Tokens: {run.telemetry.usage ? `${run.telemetry.usage.inputTokens} input / ${run.telemetry.usage.outputTokens} output / ${run.telemetry.usage.totalTokens} total` : "Not reported"}</p>}
      <ul>{run.retrievalSnapshot.queries.map((q, i) => <li key={i}>{q.method}: {q.query}</li>)}</ul>
    </details><p>Next research step: {run.nextStep}</p>
    <label>Finding personal note<textarea maxLength={10000} value={note} onChange={e => setNote(e.target.value)} /></label>
    {error && <p role="alert">{error}</p>}<p role="status">{message}</p>
    <div className="actions"><button disabled={busy || (!saved && stale)} onClick={async () => { setBusy(true); setError(""); try { await save(note); setMessage("Finding note saved."); } catch (e) { setError(String(e)); } finally { setBusy(false); } }}>{saved ? "Save finding note" : "Save finding"}</button>
      {dismiss && <button className="secondary" onClick={dismiss}>Discard unsaved finding</button>}</div>
  </article>;
}
