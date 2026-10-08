# Fiqh corpus milestone: Turath + OpenITI

Validated 2026-10-08. Shamela is outside this milestone and its blanket all-library resource is disabled.

## Approval blocker in simple terms

A working adapter does not make a source approved. Book evidence is usable only when three separate checks agree:

- `technicalStatus`: the code can safely retrieve or preview the material.
- `sourceReviewStatus`: a qualified human has reviewed the source identity, edition, attribution, and scholarly limitations.
- `usagePermissionStatus`: the intended retrieval, storage, processing, and display are permitted.

The legacy `approval` field remains the final evidence switch. For book resources it cannot enable evidence unless the three checks are also `retrieval-ready`, `approved`, and `permitted`. No reviewer identity, date, permission statement, or approval is inferred by the importer.

## Turath: tested but unapproved

- Provider ID: `963`
- Title: **إعانة الطالبين على حل ألفاظ فتح المعين**
- Author: **أبو بكر (المشهور بالبكري) عثمان بن محمد شطا الدمياطي الشافعي (ت ١٣١٠هـ)**
- Publisher returned by the provider: **دار الفكر للطباعة والنشر والتوريع**
- Edition returned by the provider: **الطبعة: الأولى، ١٤١٨ هـ - ١٩٩٧ م**
- Source: `https://app.turath.io/book/963`
- Rights notice found on the volume copyright pages: **جميع حقوق إعادة الطبع محفوظة للناشر**.

The notice confirms that reprint rights are reserved to the publisher. It is therefore not permission to download, republish, or redistribute the complete edition. The MIT licence on the third-party `turath-sdk` applies to the SDK code, not to book 963's text.

The notice does not answer whether Turath or the publisher permits automated remote search, transient delivery of matching text, persistent storage of excerpts, public display of passages, or computational processing such as embeddings. Those uses remain unclear and require provider terms or direct permission. The resource stays unapproved and no full-book JSON is downloaded or imported.

### What this implementation does

| Operation | Implemented for Turath | Current behavior |
| --- | --- | --- |
| Remote search | Yes, adapter only | One bounded v3 in-book query; up to five returned matches. Evidence use is blocked without an eligible resource record. |
| Temporary retrieval | Yes | Returned match text exists in server memory while the request is processed. |
| Persistent storage | Yes when a resource is eligible | Returned passage text, locator, version hash, metadata, and limitations are saved in MongoDB. Turath is currently blocked before this step. |
| Embeddings | No | No vector or embedding job exists. |
| Passage display | Yes when evidence exists | Saved passages can be displayed in verification and research views. Turath is currently blocked. |
| Full-book ingestion | No | The advertised full-book JSON is not requested or imported. |

Permission clarification is still needed for automated querying, transient retrieval, storing excerpts, displaying excerpts to authenticated or public users, and any future embedding/indexing. These are separate questions; permission for one must not be treated as permission for all.

## OpenITI: independent authenticated preview

The selected candidate is `0987ZaynDinMalibari.FathMucin.JK000228-ara1`, **فتح المعين بشرح قرة العين**, by زين الدين بن عبد العزيز المليباري.

- Release: `v2025.1.9`
- Pinned commit: `cfc4157a3cf2054c0888f133970a4eaa3e22e58c`
- Source-library identifier: `JK000228`
- Reuse terms: `CC BY-NC-SA 4.0`
- Imported result: 1 book and 1,352 page-marker passages

The licence allows sharing and adaptation with attribution, NonCommercial use, and ShareAlike distribution. It does not resolve whether this deployment is noncommercial or whether its presentation/export behavior satisfies attribution and ShareAlike; that deployment decision remains separate. Text quality and the 928/987 AH author-date discrepancy also remain scholarly-review issues.

The importer records `technicalStatus=preview-ready`, `sourceReviewStatus=pending`, `usagePermissionStatus=noncommercial-only`, and `approval=pending`. Authenticated users can search and open passages at `/library`. The text is not eligible for verification evidence or public-source approval until the separate scholarly and deployment-use decisions are made.

## Shamela scope decision

Shamela is outside the current scope. The adapter and existing data are retained, but the blanket `providerId: all` record is set to `approval=pending`, `sourceReviewStatus=out-of-scope`, `usagePermissionStatus=not-reviewed`, and `technicalStatus=disabled`. It cannot participate in retrieval or research generation.
