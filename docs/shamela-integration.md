# Shamela via Parse — outside current scope

The adapter code and existing source data are retained, but Shamela is not eligible evidence in the current milestone. The former blanket `providerId: all` database record is disabled without being deleted:

- `approval=pending`
- `sourceReviewStatus=out-of-scope`
- `usagePermissionStatus=not-reviewed`
- `technicalStatus=disabled`

Do not change the example record to approved or import it as an approval. A future re-entry into scope should start with a specific numeric Shamela book ID, documented provider terms, a usage-permission decision for the intended operations, and a separate scholarly source review.

## Retained technical adapter

The inactive adapter uses Parse API snapshot 11 for bounded discovery and page retrieval. It never downloads the complete Shamela catalog or a complete book. Configuration may remain present, but a credential does not grant source approval or usage permission.

The fixed API is `fea100ca-ae6c-4130-8469-4b1f65d5931e`. Search uses `search_books_by_content`; candidate pages are resolved with `get_book_page`. `SHAMELA_MAX_PAGES` may be set from 1 to 5 and defaults to 3.

If the integration is reconsidered, review Parse's terms, Shamela provenance, Arabic coverage, page-number limitations, storage/display permission, and the exact book edition before enabling a resource.

## Retained evidence behavior

- English or other non-Arabic quotations can receive one AI-generated Arabic discovery query when Groq is configured. A generated query is not evidence.
- Only full page text returned by `get_book_page` can become evidence; search snippets are context only.
- Passages preserve book title, attributed author, page URL, and internal page number.
- Page numbering may not match a print edition, and the endpoint does not distinguish body text from footnotes.
- A search match or a judgment quoted inside a book is not an independent authenticity ruling.
