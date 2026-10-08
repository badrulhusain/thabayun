# Fiqh corpus milestone: Turath + OpenITI

Validated 2026-10-07. This scope intentionally excludes Shamela setup and integration.

## Turath

- SDK reviewed: `ragaeeb/turath-sdk` 1.0.0 requires Node >=22; this project uses Node 24.
- The SDK source currently calls public `https://api.turath.io/` version 3 endpoints and `https://files.turath.io/books/`; no API credential is used by the SDK.
- Live metadata succeeded for book ID `963`, **إعانة الطالبين على حل ألفاظ فتح المعين**, by أبو بكر عثمان بن محمد شطا الدمياطي الشافعي (d. 1310 AH), author ID `431`.
- Provider metadata identifies Dar al-Fikr, first edition, 1418 AH / 1997 CE. Live page 7 also succeeded and identified volume 1, print page 13.
- A bounded live in-book search succeeded. The adapter reports provider/HTTP/validation failures instead of converting them to empty success results.
- The advertised full-book JSON was not downloaded or imported: the displayed edition says reprint rights are reserved, so public technical availability was not treated as permission to ingest the full edition.

## OpenITI

Metadata was searched in release `v2025.1.9`, commit `cfc4157a3cf2054c0888f133970a4eaa3e22e58c`.

Candidates found:

- `0987ZaynDinMalibari.FathMucin.JK000228-ara1` — primary, cleaned فتح المعين; Beirut, Dar al-Fikr; selected.
- Four additional versions of فتح المعين were found but not downloaded.
- `1310BakriDimyati.HashiyaIcanaTalibin.JK000179-ara1` — primary, cleaned إعانة الطالبين; Beirut, Dar al-Fikr; not downloaded.
- Two additional versions of إعانة الطالبين were found but not downloaded.

Only the selected text and its release metadata were downloaded. The import preserves the original OpenITI mARkdown, page markers, header, pinned release/commit, URI, attribution, and CC BY-NC-SA 4.0 license. The internal text header gives the author's death as 928 AH while release metadata encodes 987 AH; this discrepancy is preserved as a review issue, not silently resolved.

Database import result: 1 book, 1,352 page-marker passages, SHA-256 `7d8547462c6b108fb66adcec4536c802d1a25c5e431e949ac7ec7284dd12206a`. Approval remains `pending`. Authenticated users can search and open passages at `/library`; approved-evidence retrieval cannot consume it until a human reviewer explicitly approves the resource.