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
    <section className="desk-context">
      <div className="desk-emblem" aria-hidden="true">▤</div>
      <div><span className="desk-label">PRIMARY SOURCE CONCORDANCE · RESEARCH WORKSPACE</span><h1>Investigate quotations. Follow the evidence.</h1><p>Trace religious quotations, hadith attributions, and historical claims to their sources.</p></div>
      <Link className="desk-context-link" href="/sources">Explore source collection ↗</Link>
    </section>
    <section className="desk-console" aria-label="New investigation">
      <div className="desk-toolbar"><div className="desk-tabs" role="tablist" aria-label="Input method">
        <button role="tab" disabled={busy} aria-selected={mode === "text"} aria-controls="desk-input" onClick={() => setMode("text")} className={mode === "text" ? "active" : ""}>✎ &nbsp; Direct Text / Citation</button>
        <button role="tab" disabled={busy} aria-selected={mode === "upload"} aria-controls="desk-input" onClick={() => setMode("upload")} className={mode === "upload" ? "active" : ""}>▧ &nbsp; Upload Image</button>
      </div><span className="desk-scope">Corpus scope: <Link href="/sources">View available sources ↗</Link></span></div>
      <div id="desk-input" role="tabpanel">
        {mode === "upload" && <div className="desk-dropzone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void selectFile(e.dataTransfer.files[0]); }}><span className="upload-symbol" aria-hidden="true">↑</span><h2>Select or drop a manuscript scan or screenshot</h2><p>PNG or JPEG · Maximum 1 MB · Arabic or English OCR via OCR.space. Review extracted text before investigating.</p><label>Text language<select aria-label="OCR language" value={ocrLanguage} disabled={busy} onChange={e => setOcrLanguage(e.target.value as "ara" | "eng" | "auto")}><option value="ara">Arabic</option><option value="eng">English</option><option value="auto">Detect automatically</option></select></label><input ref={fileInput} aria-label="Upload research image" type="file" accept="image/png,image/jpeg" onChange={e => void selectFile(e.target.files?.[0])} hidden /><button className="secondary" disabled={busy} onClick={() => fileInput.current?.click()}>Browse local files</button>{file && <><p>{file.name}</p>{preview && <Image className="preview" src={preview} width={640} height={280} unoptimized alt="Selected manuscript or screenshot" />}<div className="actions"><button disabled={busy} onClick={() => void extract()}>{busy ? "Extracting…" : "Extract text"}</button></div></>}</div>}
        <label className="desk-input-label" htmlFor="inquiry">{mode === "upload" ? "Review and edit extracted text" : "Your quotation or research claim"}</label>
        <textarea id="inquiry" className="desk-textarea" dir="auto" maxLength={30000} disabled={busy} value={text} onChange={e => { setText(e.target.value); setConfirmed(false); }} placeholder="Paste a claim, quotation, hadith wording, or excerpt in Arabic or English…" />
        <label className="desk-input-label" htmlFor="reference">Known reference (optional)</label><input id="reference" value={reference} disabled={busy} maxLength={300} onChange={e => setReference(e.target.value)} placeholder="1:1, 2:255 or bukhari:1" /><p className="desk-input-label">A known reference creates a claim without AI extraction. Bounded Quran, hadith, and Shamela book search is available for compatible approved resources. <Link href="/sources">Check available sources</Link>.</p><div className="desk-input-meta"><span>Arabic / English · {text.length.toLocaleString()} characters</span><button onClick={() => { setText(""); setReference(""); setConfirmed(false); }} disabled={busy || !text}>⌫ &nbsp; Clear</button></div>
        {mode === "upload" && <label className="check"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I reviewed and confirm this extracted text.</label>}
      </div>
      <div className="desk-action-row"><div className="desk-samples"><span className="desk-label">SAMPLE INQUIRIES</span>{samples.map((sample, i) => <button key={sample.reference} disabled={busy} onClick={() => { setMode("text"); setText(sample.text); setReference(sample.reference); }}><b>{i + 1}.</b> {sample.label}</button>)}</div><button className="desk-analyze" disabled={busy || !text.trim() || (mode === "upload" && !confirmed)} onClick={() => void investigate()}>{busy ? "Preparing inquiry…" : "Investigate & Trace Sources →"}</button></div>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
    <div className="desk-status"><span><i /> {material ? "INQUIRY SAVED · READY FOR CLAIM REVIEW" : "INVESTIGATION DESK · READY"}</span><span>Evidence and notes saved on this device</span></div>
    {material ? <section className="desk-result" key={material.id}><div className="desk-result-header"><span className="desk-label">CURRENT INQUIRY</span><Link href={`/projects/${material.projectId}`}>Open saved inquiry ↗</Link></div><blockquote className="passage" dir="auto">{material.editedText}</blockquote><ClaimWorkspace material={material} /></section> : <div className="desk-empty-grid"><section className="desk-result"><div className="desk-section-title"><span aria-hidden="true">▤</span><h2>Primary Textual Concordance</h2><span className="desk-chip">AWAITING INQUIRY</span></div><div className="desk-empty"><span className="desk-empty-mark" aria-hidden="true">❧</span><h3>Every inquiry begins with a source.</h3><p>Enter a quotation above to create an inquiry. Review its claims, retrieve relevant passages, and inspect the original citations.</p></div><div className="desk-note">Exact wording, source context, and attributed grades are reviewed separately.</div></section><aside className="desk-result"><div className="desk-section-title"><span aria-hidden="true">◈</span><h2>Synthesis & Source Matrix</h2></div><ol className="desk-steps"><li><span>01</span><div><h3>Review the claim</h3><p>Confirm wording, attribution, and references.</p></div></li><li><span>02</span><div><h3>Trace primary evidence</h3><p>Inspect retrieved passages and their source context.</p></div></li><li><span>03</span><div><h3>Build a supported finding</h3><p>Compare the evidence and preserve your notes.</p></div></li></ol><Link className="desk-method-link" href="/sources">Source corpora & methodology ↗</Link></aside></div>}
  </div>;
}


