/* eslint-disable @next/next/no-img-element -- Local object URL previews cannot use server image optimization. */
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ClaimWorkspace } from "./claim-workspace";
import { repository } from "@/lib/repository";
import type { Material, Project, Result, SavedEvidence } from "@/lib/types";

async function imageForOCR(file: File): Promise<File> {
  if (file.type !== "image/webp") return file;
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 16000000)
      throw new Error(
        "Image dimensions are too large. Use a smaller screenshot.",
      );
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Could not convert WebP."))),
        "image/png",
      ),
    );
    if (blob.size > 1000000)
      throw new Error("Converted WebP exceeds 1 MB. Use a smaller screenshot.");
    return new File([blob], "screenshot.png", { type: "image/png" });
  } finally {
    bitmap.close();
  }
}

export function Workspace({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project>();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [evidence, setEvidence] = useState<SavedEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"text" | "screenshot">("text");
  const [draft, setDraft] = useState("");
  const [original, setOriginal] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState("");
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrLanguage, setOcrLanguage] = useState<"ara" | "eng" | "auto">("ara");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searched, setSearched] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [selected, setSelected] = useState<Result>();
  const [note, setNote] = useState("");
  const generation = useRef(0);
  const abort = useRef<AbortController | undefined>(undefined);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [p, m, e] = await Promise.all([
        repository.get(projectId),
        repository.materials(projectId),
        repository.evidence(projectId),
      ]);
      setProject(p);
      setMaterials(m);
      setEvidence(e);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    Promise.all([
      repository.get(projectId),
      repository.materials(projectId),
      repository.evidence(projectId),
    ])
      .then(([p, m, e]) => {
        if (active) {
          setProject(p);
          setMaterials(m);
          setEvidence(e);
        }
      })
      .catch((e) => {
        if (active) setError(String(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);
  useEffect(() => {
    let active = true;
    const url = file ? URL.createObjectURL(file) : "";
    Promise.resolve().then(() => {
      if (active) setPreview(url);
    });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);
  useEffect(
    () => () => {
      abort.current?.abort();
    },
    [],
  );
  function cancelOCR() {
    generation.current++;
    abort.current?.abort();
    setOcrBusy(false);
  }
  function changeTab(value: "text" | "screenshot") {
    cancelOCR();
    setTab(value);
    setDraft("");
    setOriginal("");
    setConfirmed(false);
    setFile(undefined);
  }
  async function run(action: () => Promise<void>, message: string) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await action();
      setStatus(message);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function extract() {
    if (!file) return;
    cancelOCR();
    const token = generation.current;
    const controller = new AbortController();
    abort.current = controller;
    setOcrBusy(true);
    setError("");
    try {
      const upload = await imageForOCR(file);
      if (token !== generation.current) return;
      const form = new FormData();
      form.set("file", upload);
      form.set("language", ocrLanguage);
      const response = await fetch("/api/ocr", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      const data = await response.json();
      if (token !== generation.current) return;
      if (!response.ok)
        throw new Error(data.error?.message ?? "OCR failed. Retry.");
      setOriginal(data.text);
      setDraft(data.text);
      setConfirmed(false);
      setStatus("Review and correct the extracted text, then confirm it.");
    } catch (e) {
      if (token === generation.current && !controller.signal.aborted)
        setError(String(e));
    } finally {
      if (token === generation.current) setOcrBusy(false);
    }
  }
  async function search(e: React.FormEvent) {
    e.preventDefault();
    setSearchBusy(true);
    setError("");
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error?.message ?? "Search failed.");
      setResults(data.results);
      setSearched(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setSearchBusy(false);
    }
  }
  if (loading) return <p role="status">Loading research workspace…</p>;
  if (!project)
    return (
      <>
        <h1>
          {error
            ? "Unable to load project"
            : "Project not found on this device"}
        </h1>
        {error && <p role="alert">{error}</p>}
        <button onClick={load}>Retry</button>{" "}
        <Link href="/projects">Back to projects</Link>
      </>
    );
  return (
    <>
      <Link href="/projects">← All projects</Link>
      <p className="eyebrow">RESEARCH WORKSPACE</p>
      <h1>{project.title}</h1>
      <p className="intro">{project.researchQuestion}</p>
      <p className="badge">Saved on this device.</p>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <p role="status" aria-live="polite">
        {status}
      </p>
      <details className="panel">
        <summary>Edit project details</summary>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            const next = {
              ...project,
              title: String(data.get("title")).trim(),
              researchQuestion: String(data.get("question")).trim(),
            };
            if (!next.title || !next.researchQuestion) {
              setError("Title and research question are required.");
              return;
            }
            void run(async () => {
              await repository.update(next);
              setProject(next);
            }, "Project details saved.");
          }}
        >
          <label>
            Title
            <input
              name="title"
              defaultValue={project.title}
              required
              maxLength={120}
            />
          </label>
          <label>
            Research question
            <textarea
              name="question"
              defaultValue={project.researchQuestion}
              required
              maxLength={2000}
            />
          </label>
          <button disabled={busy}>Save details</button>
        </form>
      </details>
      <div className="workspace">
        <section aria-label="Research workspace">
          <article className="panel">
            <h2>Research material</h2>
            <div className="actions" role="group" aria-label="Input type">
              <button
                className={tab === "text" ? "" : "secondary"}
                aria-pressed={tab === "text"}
                onClick={() => changeTab("text")}
              >
                Text
              </button>
              <button
                className={tab === "screenshot" ? "" : "secondary"}
                aria-pressed={tab === "screenshot"}
                onClick={() => changeTab("screenshot")}
              >
                Screenshot
              </button>
            </div>
            {tab === "screenshot" && (
              <>
                <p>
                  Arabic or English OCR. JPEG, PNG, or WebP, up to 1 MB. Extraction sends
                  your image to OCR.space; raw screenshots are not saved in your
                  project.
                </p>
                <label>
                  Text language
                  <select aria-label="OCR language" value={ocrLanguage} disabled={ocrBusy} onChange={(e) => setOcrLanguage(e.target.value as "ara" | "eng" | "auto")}>
                    <option value="ara">Arabic</option>
                    <option value="eng">English</option>
                    <option value="auto">Detect automatically</option>
                  </select>
                </label>
                <label>
                  Screenshot
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      cancelOCR();
                      setDraft("");
                      setOriginal("");
                      setConfirmed(false);
                      const f = e.target.files?.[0];
                      if (
                        f &&
                        (!["image/jpeg", "image/png", "image/webp"].includes(
                          f.type,
                        ) ||
                          f.size > 1000000 ||
                          !f.size)
                      ) {
                        setError("Choose a JPEG, PNG, or WebP under 1 MB.");
                        setFile(undefined);
                        e.target.value = "";
                        return;
                      }
                      setError("");
                      setFile(f);
                    }}
                  />
                </label>
                {preview && (
                  <div>
                    <img
                      className="preview"
                      src={preview}
                      alt="Selected screenshot for text extraction"
                    />
                    <div className="actions">
                      <button disabled={ocrBusy} onClick={extract}>
                        {ocrBusy ? "Extracting…" : "Extract / retry OCR"}
                      </button>
                      <button
                        className="secondary"
                        onClick={() => {
                          cancelOCR();
                          setFile(undefined);
                        }}
                      >
                        Remove screenshot
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            <label>
              {tab === "text"
                ? "Paste or edit text"
                : "Review and edit extracted text"}
              <textarea
                dir="auto"
                value={draft}
                maxLength={100000}
                disabled={ocrBusy}
                onChange={(e) => {
                  generation.current++;
                  setDraft(e.target.value);
                  setConfirmed(false);
                }}
                placeholder="Your research material…"
              />
            </label>
            {tab === "screenshot" && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={ocrBusy || !draft.trim()}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                I reviewed and confirm this text.
              </label>
            )}
            <button
              disabled={
                busy ||
                ocrBusy ||
                !draft.trim() ||
                (tab === "screenshot" && !confirmed)
              }
              onClick={() =>
                void run(async () => {
                  await repository.saveMaterial({
                    id: crypto.randomUUID(),
                    projectId,
                    inputType: tab,
                    originalText: tab === "text" ? draft : original,
                    editedText: draft,
                    createdAt: new Date().toISOString(),
                  });
                  setMaterials(await repository.materials(projectId));
                  setDraft("");
                  setOriginal("");
                  setConfirmed(false);
                  setFile(undefined);
                }, "Research material saved.")
              }
            >
              Save material
            </button>
          </article>
          <h2>Saved research material</h2>
          {!materials.length && (
            <p>Save pasted text or reviewed screenshot text here.</p>
          )}
          {materials.map((m) => (
            <MaterialEditor
              key={m.id}
              material={m}
              busy={busy}
              save={(next) =>
                run(async () => {
                  await repository.saveMaterial(next);
                  setMaterials(await repository.materials(projectId));
                }, "Material changes saved.")
              }
            />
          ))}
          <h2>Saved evidence</h2>
          {!evidence.length && (
            <p>Inspect a relevant passage and save it with a personal note.</p>
          )}
          {evidence.map((e) => (
            <EvidenceEditor
              key={e.id}
              evidence={e}
              busy={busy}
              save={(next) =>
                run(async () => {
                  await repository.saveEvidence(next);
                  setEvidence(await repository.evidence(projectId));
                }, "Personal note saved.")
              }
            />
          ))}
        </section>
        <aside aria-label="Relevant passages">
          <article className="panel">
            <h2>Relevant passages</h2>
            <p>
              Search the curated collection using a short phrase or keywords.
              Try “patience”, “truth”, or “prayer”.
            </p>
            <form onSubmit={search}>
              <label>
                Search query
                <input
                  value={query}
                  maxLength={300}
                  required
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <button
                disabled={
                  searchBusy ||
                  !query.trim() ||
                  (tab === "screenshot" && !!draft && !confirmed)
                }
              >
                {searchBusy ? "Searching…" : "Search collection"}
              </button>
            </form>
            <small>
              10 excerpts · Historical English translation · Limited coverage
            </small>
          </article>
          {searched && !results.length && (
            <div className="panel">
              <h3>No matching passages in this collection</h3>
              <p>
                Try other keywords. The collection is limited; this is not a
                verdict about a claim.
              </p>
            </div>
          )}
          {results.map((r) => (
            <article className="panel" key={r.id}>
              <small>{r.source.sourceType}</small>
              <h3>{r.source.title}</h3>
              <p className="passage" dir="auto">
                {r.text}
              </p>
              <p>
                {r.source.author} · {r.source.translator}
              </p>
              <small>{r.locator}</small>
              <div className="actions">
                <button
                  className="secondary"
                  onClick={() => {
                    setSelected(r);
                    setNote("");
                  }}
                >
                  Inspect passage
                </button>
                <a
                  href={r.source.URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Original ↗
                </a>
              </div>
            </article>
          ))}
        </aside>
      </div>
      {materials.map((m, index) => (
        <article className="panel" id={`analysis-${m.id}`} key={m.id} aria-label={`Analysis for saved material ${index + 1}`}>
          <h2>Analyze saved material {index + 1}</h2>
          <small>Saved material excerpt</small>
          <p dir="auto">{m.editedText.slice(0, 240)}{m.editedText.length > 240 ? "…" : ""}</p>
          <ClaimWorkspace material={m} />
        </article>
      ))}
      {selected && (
        <SourceDialog close={() => setSelected(undefined)}>
          <div className="actions">
            <h2 id="source-title">Source details</h2>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button
              className="secondary"
              onClick={() => setSelected(undefined)}
            >
              Close
            </button>
          </div>
          <h3>{selected.source.title}</h3>
          <p className="passage" dir="auto">
            {selected.text}
          </p>
          <p>
            {selected.source.author} · Translator: {selected.source.translator}{" "}
            · {selected.source.edition}
          </p>
          <small>{selected.locator}</small>
          <h3>Surrounding context</h3>
          <p dir="auto">
            {selected.surroundingContext ??
              "Additional surrounding context is available at the original source."}
          </p>
          <a
            href={selected.source.URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Read original source ↗
          </a>
          <label>
            Personal note
            <textarea
              value={note}
              maxLength={10000}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <button
            disabled={busy || evidence.some((e) => e.passageId === selected.id)}
            onClick={() =>
              void run(async () => {
                await repository.saveEvidence({
                  id: `${projectId}:${selected.id}`,
                  projectId,
                  passageId: selected.id,
                  passageSnapshot: selected,
                  citationSnapshot: selected.source,
                  userNote: note,
                  savedAt: new Date().toISOString(),
                });
                setEvidence(await repository.evidence(projectId));
                setSelected(undefined);
              }, "Evidence saved.")
            }
          >
            {evidence.some((e) => e.passageId === selected.id)
              ? "Already saved"
              : "Save evidence"}
          </button>
        </SourceDialog>
      )}
    </>
  );
}
function SourceDialog({
  children,
  close,
}: {
  children: React.ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      opener?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="source-dialog"
      aria-labelledby="source-title"
      onCancel={close}
    >
      {children}
    </dialog>
  );
}
function MaterialEditor({
  material,
  busy,
  save,
}: {
  material: Material;
  busy: boolean;
  save: (m: Material) => Promise<void>;
}) {
  const [text, setText] = useState(material.editedText);
  return (
    <article className="panel">
      <small>
        {material.inputType === "text" ? "Pasted text" : "Reviewed OCR"} ·{" "}
        {new Date(material.createdAt).toLocaleDateString()}
      </small>
      <label>
        Research text
        <textarea
          dir="auto"
          value={text}
          maxLength={100000}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <button
        className="secondary"
        disabled={busy || !text.trim() || text === material.editedText}
        onClick={() => void save({ ...material, editedText: text })}
      >
        Save edits
      </button>
      <details>
        <summary>Original text</summary>
        <p dir="auto">{material.originalText}</p>
      </details>
      <div className="actions"><a href={`#analysis-${material.id}`}>Review claims and evidence for this material</a></div>
    </article>
  );
}
function EvidenceEditor({
  evidence,
  busy,
  save,
}: {
  evidence: SavedEvidence;
  busy: boolean;
  save: (e: SavedEvidence) => Promise<void>;
}) {
  const [note, setNote] = useState(evidence.userNote);
  return (
    <article className="panel">
      <h3>{evidence.citationSnapshot.title}</h3>
      <p className="passage" dir="auto">
        {evidence.passageSnapshot.text}
      </p>
      <small>{evidence.passageSnapshot.locator}</small>
      <p>
        {evidence.citationSnapshot.author} ·{" "}
        {evidence.citationSnapshot.translator} ·{" "}
        {evidence.citationSnapshot.edition}
      </p>
      <a
        href={evidence.citationSnapshot.URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Original source ↗
      </a>
      <label>
        Personal note
        <textarea
          value={note}
          maxLength={10000}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <button
        className="secondary"
        disabled={busy || note === evidence.userNote}
        onClick={() => void save({ ...evidence, userNote: note })}
      >
        Save note
      </button>
    </article>
  );
}
