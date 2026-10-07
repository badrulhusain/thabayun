import { sources, passages } from "@/lib/collection";
export default function Page() {
  return (
    <>
      <p className="eyebrow">THE COLLECTION</p>
      <h1>Curated sources</h1>
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
