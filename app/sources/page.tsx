import { sources, passages } from "@/lib/collection";
import { ServiceStatus } from '@/components/service-status';
export default function Page() {
  return (
    <>
      <p className="eyebrow">THE COLLECTION</p>
      <h1>Sources and verification coverage</h1>
      <ServiceStatus />
      <section className="panel"><h2>Fiqh corpus milestone</h2><p>A pinned OpenITI release of <span lang="ar" dir="rtl">فتح المعين</span> is available for authenticated preview. Technical ingestion is ready; scholarly review is pending; its CC BY-NC-SA terms permit noncommercial use subject to attribution and ShareAlike. It is not approved verification evidence.</p><a href="/library">Open the local OpenITI viewer</a></section>
      <section className="panel">
        <h2>Approved provider evidence</h2>
        <p>Claim verification retrieves individually approved Quran and hadith resources from configured providers. API access, scholarly source review, usage permission, and technical readiness are separate decisions. Book evidence requires all three governance checks before the final evidence approval can take effect.</p>
        <p>Enter an explicit Quran reference such as 2:255 or a hadith reference such as bukhari:1. Turath remains unapproved while excerpt retrieval, storage, and display permissions are clarified. OpenITI remains an authenticated preview. Shamela is outside the current scope and its blanket all-library record is disabled. No result is a religious ruling.</p>
        <p>Quran Foundation prelive testing has limited coverage. For verses outside the test environment’s coverage, use approved production access. If no source is returned, inspect the provider status and approval messages before requesting analysis.</p>
      </section>
      <h2>Local demonstration library</h2>
      <p className="intro">
        Ten short excerpts from one historical English translation of Baqarah.
        This starting collection does not cover hadith, jurisprudence, or
        contemporary Muslim issues. A search miss is not a judgment about a
        claim.
      </p>
      {sources.map((s) => (
        <article className="panel" key={s.id}>
          <h2>{s.title}</h2>
          <p>
            {s.author} · Translator: {s.translator}
          </p>
          <p>
            {s.language} · {s.sourceType} · {s.edition}
          </p>
          <p>{s.reuseTerms}</p>
          <a href={s.URL} target="_blank" rel="noopener noreferrer">
            Open original source ↗
          </a>
          <details>
            <summary>Included passages ({passages.length})</summary>
            {passages.map((p) => (
              <div className="excerpt" key={p.id}>
                <p dir="auto">{p.text}</p>
                <small>{p.locator}</small>
              </div>
            ))}
          </details>
        </article>
      ))}
    </>
  );
}
