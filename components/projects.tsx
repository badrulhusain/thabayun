"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { repository } from "@/lib/repository";
import type { Project } from "@/lib/types";
export function Projects() {
  const router = useRouter();
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    setError("");
    setLoading(true);
    try {
      setItems(await repository.list());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    repository
      .list()
      .then((items) => {
        if (active) setItems(items);
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
  }, []);
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = String(f.get("title")).trim();
    const question = String(f.get("question")).trim();
    if (!title || !question) {
      setError("Title and research question are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const p = await repository.create(title, question);
      router.push(`/projects/${p.id}`);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(p: Project) {
    if (
      !confirm(
        `Delete “${p.title}” and all its material and evidence? This cannot be undone.`,
      )
    )
      return;
    try {
      await repository.remove(p.id);
      await load();
    } catch (e) {
      setError(String(e));
    }
  }
  async function rename(p: Project) {
    const title = prompt("Project title", p.title)?.trim();
    if (!title) return;
    if (title.length > 120) {
      setError("Title must be 120 characters or fewer.");
      return;
    }
    try {
      await repository.update({ ...p, title });
      await load();
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <>
      <p className="eyebrow">YOUR RESEARCH</p>
      <h1>Begin with a question.</h1>
      <p className="intro">
        Gather material, explore original passages, and keep evidence with your
        own notes.
      </p>
      <p className="badge">Saved on this device.</p>
      {error && (
        <div role="alert" className="error">
          {error} <button onClick={load}>Retry loading</button>
        </div>
      )}
      <div className="project-grid">
        <section>
          <h2>Research projects</h2>
          {loading ? (
            <p role="status">Loading projects…</p>
          ) : items.length ? (
            items.map((p) => (
              <article className="panel" key={p.id}>
                <h3>
                  <Link href={`/projects/${p.id}`}>{p.title}</Link>
                </h3>
                <p>{p.researchQuestion}</p>
                <small>
                  Updated {new Date(p.updatedAt).toLocaleDateString()}
                </small>
                <div className="actions">
                  <button className="secondary" onClick={() => rename(p)}>
                    Rename
                  </button>
                  <button className="danger" onClick={() => remove(p)}>
                    Delete
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="panel">
              <h3>Your first question belongs here.</h3>
              <p>
                Create a project to collect material and save passages for later
                reading.
              </p>
            </div>
          )}
        </section>
        <section className="panel">
          <h2>Create a project</h2>
          <form onSubmit={create}>
            <label>
              Title
              <input
                name="title"
                required
                maxLength={120}
                placeholder="A short research title"
              />
            </label>
            <label>
              Research question
              <textarea
                name="question"
                required
                maxLength={2000}
                placeholder="What would you like to investigate?"
              />
            </label>
            <button disabled={busy}>
              {busy ? "Creating…" : "Create project"}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
