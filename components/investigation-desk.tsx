"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { repository } from "@/lib/repository";
import { parseReference } from '@/lib/integrations/contracts';
import { claimTypes, type Material } from "@/lib/types";
import { ClaimWorkspace } from "./claim-workspace";

const samples = [
  { label: 'Quran · 1:1', text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', reference: '1:1' },
  { label: 'Quran · 2:255', text: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ', reference: '2:255' },
  { label: 'Hadith · Bukhari 1', text: 'Actions are judged by intentions.', reference: 'bukhari:1' },
];
export function InvestigationDesk() {
  const [text, setText] = useState("");
  const [reference, setReference] = useState("");
  const [mode, setMode] = useState<"text" | "upload">("text");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [material, setMaterial] = useState<Material>();
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [ocrLanguage, setOcrLanguage] = useState<"ara" | "eng" | "auto">("ara");
  const fileInput = useRef<HTMLInputElement>(null);
  async function selectFile(next?: File) {
    if (!next || busy) return;
    setError(""); setConfirmed(false);
    if (!["image/png", "image/jpeg"].includes(next.type) || !next.size || next.size > 1000000) { setError("Choose a PNG or JPEG image under 1 MB."); return; }
    setFile(next); setText("");
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(next);
  }
  async function extract() {
    if (!file) return;
    setBusy(true); setError("");
    try {
      const body = new FormData(); body.append("file", file); body.append("language", ocrLanguage);
      const response = await fetch("/api/ocr", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : data.error?.message ?? "Text extraction failed.");
      setText(data.text); setConfirmed(false);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  async function investigate() {
    if (!text.trim()) return;
    setBusy(true); setError("");
    try {
      const parsed = reference.trim() ? parseReference(reference.trim()) : undefined;
      if (reference.trim() && !parsed) throw new Error('Use a reference such as 1:1, 2:255 or bukhari:1.');
      const project = await repository.create(text.trim().slice(0, 80), text.trim().slice(0, 2000));
      const next: Material = { id: crypto.randomUUID(), projectId: project.id, inputType: mode === "text" ? "text" : "screenshot", originalText: text, editedText: text, revision: 1, createdAt: new Date().toISOString() };
      await repository.saveMaterial(next);
      if (parsed) {
        const excerpt = text.slice(0, 10000);
        await repository.saveClaims([{ id: crypto.randomUUID(), projectId: project.id, materialId: next.id, materialRevision: 1, revision: 1, excerpt, start: 0, end: excerpt.length, statement: text.slice(0, 2000), type: parsed.kind === 'quran' ? claimTypes[0] : claimTypes[1], quotation: text.slice(0, 4000), speaker: '', reference: reference.trim(), validationIssue: '', coverageNote: 'User-supplied reference. Review wording before retrieving evidence.' }]);
      }
      setMaterial(next);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  return <div className="investigation-desk">
    <section className="desk-hero">
      <div className="hero-copy">
        <span className="hero-kicker"><i /> Evidence-first Islamic research</span>
        <h1>From a forwarded quote to a <em>source-backed answer.</em></h1>
        <p>Paste a quotation or upload a screenshot. Tabayyun helps you review the wording, trace approved sources, and keep every conclusion tied to evidence.</p>
        <div className="hero-trust" aria-label="Product principles">
          <span>Arabic &amp; English</span>
          <span>Human-reviewed OCR</span>
          <span>Citations you can inspect</span>
        </div>
      </div>
      <aside className="hero-flow" aria-label="How Tabayyun works">
        <p className="desk-label">A CLEAR, REVIEWABLE TRAIL</p>
        <ol>
          <li><b>1</b><span><strong>Add the wording</strong><small>Paste text or extract it from an image.</small></span></li>
          <li><b>2</b><span><strong>Review the claim</strong><small>You stay in control of what is searched.</small></span></li>
          <li><b>3</b><span><strong>Inspect the evidence</strong><small>Compare passages, citations, and limits.</small></span></li>
        </ol>
      </aside>
    </section>
    <section className="desk-console" aria-label="New investigation">
      <div className="desk-console-heading">
        <div><span className="step-number">01</span><div><p className="desk-label">START HERE</p><h2>What would you like to verify?</h2></div></div>
        <Link href="/sources">See available sources</Link>
      </div>
      <div className="desk-toolbar"><div className="desk-tabs" role="tablist" aria-label="Input method">
        <button role="tab" disabled={busy} aria-selected={mode === "text"} aria-controls="desk-input" onClick={() => setMode("text")} className={mode === "text" ? "active" : ""}>Paste text</button>
        <button role="tab" disabled={busy} aria-selected={mode === "upload"} aria-controls="desk-input" onClick={() => setMode("upload")} className={mode === "upload" ? "active" : ""}>Upload screenshot</button>
      </div><span className="desk-scope">Your text stays editable before any search.</span></div>
      <div id="desk-input" role="tabpanel">
        {mode === "upload" && <div className="desk-dropzone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void selectFile(e.dataTransfer.files[0]); }}><span className="upload-symbol" aria-hidden="true">↑</span><h2>Select or drop a manuscript scan or screenshot</h2><p>PNG or JPEG · Maximum 1 MB · Arabic or English OCR via OCR.space. Review extracted text before investigating.</p><label>Text language<select aria-label="OCR language" value={ocrLanguage} disabled={busy} onChange={e => setOcrLanguage(e.target.value as "ara" | "eng" | "auto")}><option value="ara">Arabic</option><option value="eng">English</option><option value="auto">Detect automatically</option></select></label><input ref={fileInput} aria-label="Upload research image" type="file" accept="image/png,image/jpeg" onChange={e => void selectFile(e.target.files?.[0])} hidden /><button className="secondary" disabled={busy} onClick={() => fileInput.current?.click()}>Browse local files</button>{file && <><p>{file.name}</p>{preview && <Image className="preview" src={preview} width={640} height={280} unoptimized alt="Selected manuscript or screenshot" />}<div className="actions"><button disabled={busy} onClick={() => void extract()}>{busy ? "Extracting…" : "Extract text"}</button></div></>}</div>}
        <label className="desk-input-label" htmlFor="inquiry">{mode === "upload" ? "Review and edit extracted text" : "Your quotation or research claim"}</label>
        <textarea id="inquiry" className="desk-textarea" dir="auto" maxLength={30000} disabled={busy} value={text} onChange={e => { setText(e.target.value); setConfirmed(false); }} placeholder="Paste a claim, quotation, hadith wording, or excerpt in Arabic or English…" />
        <div className="desk-reference-row"><label className="desk-input-label" htmlFor="reference">Know the reference? <span>Optional, but faster</span><input id="reference" aria-label="Known reference (optional)" value={reference} disabled={busy} maxLength={300} onChange={e => setReference(e.target.value)} placeholder="Try 1:1, 2:255 or bukhari:1" /></label><p>A reference creates a claim instantly. Without one, AI can help separate the text into reviewable claims.</p></div><div className="desk-input-meta"><span>Arabic / English · {text.length.toLocaleString()} characters</span><button onClick={() => { setText(""); setReference(""); setConfirmed(false); }} disabled={busy || !text}>Clear text</button></div>
        {mode === "upload" && <label className="check"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I reviewed and confirm this extracted text.</label>}
      </div>
      <div className="desk-action-row"><div className="desk-samples"><span className="desk-label">TRY AN EXAMPLE</span>{samples.map((sample) => <button key={sample.reference} disabled={busy} onClick={() => { setMode("text"); setText(sample.text); setReference(sample.reference); }}>{sample.label}</button>)}</div><button className="desk-analyze" disabled={busy || !text.trim() || (mode === "upload" && !confirmed)} onClick={() => void investigate()}>{busy ? "Preparing inquiry…" : "Investigate & Trace Sources →"}</button></div>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
    {material ? <section className="desk-result" key={material.id}><div className="desk-result-header"><div><span className="result-check" aria-hidden="true">✓</span><span><small>INQUIRY CREATED</small><strong>Now review the claim and trace its source</strong></span></div><Link aria-label="Open saved inquiry ↗" href={`/projects/${material.projectId}`}>Open saved inquiry</Link></div><blockquote className="passage current-inquiry" dir="auto">{material.editedText}</blockquote><ClaimWorkspace material={material} /></section> : <section className="why-section" aria-labelledby="why-title"><div><p className="desk-label">WHY TABAYYUN</p><h2 id="why-title">AI should show its work.</h2><p>Tabayyun does not hand you an unsupported verdict. It creates a chain you can inspect, correct, and return to.</p></div><div className="why-grid"><article><span>01</span><h3>Human in the loop</h3><p>OCR and claim extraction stay editable before they affect the result.</p></article><article><span>02</span><h3>Approved sources</h3><p>Evidence comes from bounded source providers, not model memory.</p></article><article><span>03</span><h3>Honest uncertainty</h3><p>A missing match stays “not found”—never “false” or “fabricated.”</p></article></div></section>}
  </div>;
}


