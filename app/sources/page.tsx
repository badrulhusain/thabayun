import { sources, passages } from "@/lib/collection";
import { ServiceStatus } from '@/components/service-status';
export default function Page() {
  return (
    <>
      <p className="eyebrow">THE COLLECTION</p>
      <h1>Sources and verification coverage</h1>
      <ServiceStatus />
      <section className="panel">
        <h2>Approved provider evidence</h2>
        <p>Claim verification retrieves individually approved Quran Foundation Arabic, translation, or tafsir resources and Sunnah collection resources. API credentials enable access; a reviewer must separately approve the resource’s edition, language, and provenance before it can be used as evidence.</p>
        <p>Enter an explicit Quran reference such as 2:255 or a hadith reference such as bukhari:1. Quotation search is not implemented. Enter the submitted wording in the claim’s Explicit quotation field to compare it with retrieved source text. No result is a religious ruling.</p>
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
