# Shamela via Parse

This integration uses Parse API snapshot 11 for bounded discovery and page retrieval. It never downloads the complete Shamela catalog or a complete book.

## Configure

Set PARSE_API_KEY in .env.local or the deployment's server-only environment. SHAMEELA_API_KEY is accepted as a compatibility alias. Never use a NEXT_PUBLIC_ variable. SHAMELA_MAX_PAGES may be set from 1 to 5 and defaults to 3.

The fixed API is fea100ca-ae6c-4130-8469-4b1f65d5931e. Search uses search_books_by_content; the first distinct result pages are resolved with get_book_page. A normal retrieval therefore costs one successful search call plus at most SHAMELA_MAX_PAGES successful page calls.

## Approve the source

Copy docs/shamela-resource.example.json to a private review file. Confirm Parse's terms, Shamela provenance, Arabic language coverage, internal-page-number limitation, and whether an all-library approval is acceptable. Add a real reviewer, ISO reviewedAt, reviewNotes, and change approval to approved, then run:

    npm run resources:import -- path/to/reviewed-shamela-resource.json

For narrower approval, replace providerId all with a numeric Shamela book ID. Searches will then accept results from only that book.

## Evidence behavior

- English or other non-Arabic quotations may receive one AI-generated Arabic discovery query when Groq is configured. Both the submitted quotation and generated query are recorded. The generated query is not evidence.
- Only full page text returned by get_book_page becomes evidence. Search snippets remain context only.
- Each passage preserves the Shamela book title, attributed author, page URL, and internal page number.
- Parse is an independent wrapper over shamela.ws. Page numbering may not match a print edition, and the endpoint does not distinguish body text from footnotes.
- A search match or a judgment quoted inside a book is not an independent authenticity ruling.
