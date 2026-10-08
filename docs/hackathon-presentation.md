# Tabayyun AI hackathon presentation

## One-sentence pitch

Tabayyun AI turns an Arabic or English quotation into a reviewable, source-linked research trail instead of giving the user an unsupported verdict.

## 30-second pitch

Religious quotations often reach people as screenshots, partial translations, or unattributed posts. A normal chatbot can answer confidently without showing whether the wording matches a source. Tabayyun AI starts with the evidence. It extracts Arabic or English text, asks the user to confirm it, separates individual claims, retrieves only approved source records, compares the wording, and saves a cited research history. Every limitation remains visible, and no search miss becomes a claim that a quotation is false.

## Five-minute deck

### Slide 1: Tabayyun AI

**On slide**

Evidence-led research for Arabic and Islamic-source quotations

From screenshot to reviewable citation trail

**Speaker note**

“Tabayyun” means careful verification. This project helps a researcher move from a quotation or screenshot to inspectable source evidence without turning AI output into a religious ruling.

**Visual**

Use one clean product screenshot showing the investigation desk. Keep the cover minimal.

### Slide 2: The verification problem

**On slide**

- Quotations circulate without a reliable reference
- Arabic OCR can change letters, order, or diacritics
- Translations differ even when they refer to the same passage
- A confident AI answer can hide missing evidence

**Speaker note**

The hard problem is not generating an answer. It is preserving the chain from the user’s exact wording to a specific source, edition, locator, and retrieval record.

### Slide 3: The research workflow

**On slide**

1. Paste text or upload an Arabic or English screenshot
2. Review the extracted text and individual claims
3. Retrieve approved Quran, hadith, tafsir, or book evidence
4. Compare wording and inspect source limitations
5. Save notes, citations, findings, and brief revisions

**Speaker note**

Each stage requires an explicit user action. OCR text must be confirmed. Claims remain editable. Analysis cannot run until the user selects retrieved evidence.

### Slide 4: Product demonstration

**On slide**

Arabic screenshot → reviewed text → claim → source passage → cited finding

**Demo sequence**

1. Upload a clear Arabic screenshot and keep **Arabic** selected
2. Extract, correct one character if needed, and confirm the text
3. Supply a known reference such as `1:1`
4. Retrieve the approved UmmahAPI source passage
5. Open the source detail and show language, edition, locator, and limitations
6. Add the evidence to a research project and save a note

**Speaker note**

Keep the demo focused on one successful path. Mention that OCR assists transcription but the user remains responsible for comparing it with the image.

### Slide 5: Evidence architecture

**On slide**

- Next.js application with server-only provider credentials
- MongoDB ownership boundaries for accounts and research records
- Groq structured outputs for claim extraction and cited analysis
- Approved-resource registry before evidence can enter a finding
- Immutable evidence snapshots and revision history

**Speaker note**

The model never receives an open-ended instruction to browse and decide. The server retrieves bounded evidence, validates the response structure and citations, and records the exact source snapshot used for the finding.

### Slide 6: Responsible AI controls

**On slide**

- No evidence means no AI analysis request
- A failed lookup never means “fabricated”
- Contradictions require directly conflicting cited text
- Source text, researcher notes, and AI interpretation stay separate
- Arabic wording remains visible and editable

**Speaker note**

These controls address the most dangerous failure mode in this domain: presenting model confidence as source authority. Tabayyun reports what the retrieved evidence supports and states what remains unknown.

### Slide 7: What is technically difficult

**On slide**

- Arabic and English OCR with explicit language selection
- UTF-16 claim offsets and Arabic diacritic preservation
- Provider-specific Quran and hadith reference handling
- Citation validation against stored evidence snapshots
- Cancellation, retry limits, rate limits, and stale-revision protection

**Speaker note**

The project handles failures that appear only in real research workflows: edited text invalidates old claims, revoked resources disappear from later use, delayed requests cannot overwrite new work, and account ownership is checked server-side.

### Slide 8: Validation and readiness

**On slide**

- Production build, TypeScript, and ESLint pass
- Unit and integration suites cover grounding, auth, quotas, and provider failures
- 18 browser scenarios cover Arabic display, OCR review, evidence, revisions, and mobile layouts
- Chrome extension build passes
- Live UmmahAPI Quran lookup verified

**Speaker note**

The tests use labelled fixtures for model behavior and do not pretend to measure religious correctness. Live Quran Foundation authentication still needs a corrected credential pair or approved scope, so the demo uses the verified UmmahAPI path.

### Slide 9: Users and impact

**On slide**

**For:** students, researchers, educators, editors, and fact-checkers

**Outcome:** less time tracing quotations and a clearer record of what each source actually says

**Speaker note**

The immediate value is a repeatable research record. A user can revisit the quotation, inspect the original source, see the exact evidence used, and distinguish their notes from automated analysis.

### Slide 10: Next milestone

**On slide**

- Complete production deployment and live account checks
- Add human review for Arabic extraction quality
- Expand approved source editions and scholarly metadata
- Add password recovery and collaboration

**Closing line**

Tabayyun AI makes verification inspectable: every finding begins with a source and ends with evidence the user can review.

## Judge-facing hackathon points

### Problem clarity

- The project addresses a specific, high-consequence failure: unattributed or altered quotations circulating without inspectable evidence.
- The workflow demonstrates the problem in under one minute with a real screenshot and reference.

### Innovation

- Tabayyun combines OCR, claim review, approved-source retrieval, wording comparison, and cited research history in one workflow.
- The product treats uncertainty and failed retrieval as first-class results instead of forcing a verdict.

### Technical execution

- Structured model outputs are validated before display.
- Evidence snapshots preserve source identity, locator, edition, retrieval time, and content version.
- Account ownership, rate limits, cancellation, retries, and stale-write protection cover realistic production failure modes.

### Responsible AI

- AI analysis stays disabled until the user selects evidence.
- The interface labels AI interpretation and keeps it separate from source text.
- The system refuses to turn missing coverage into a religious or authenticity judgment.

### User experience

- Arabic and English input share one review workflow.
- OCR requires correction and confirmation before saving.
- Mobile layouts, keyboard flows, error recovery, and persistent notes have browser coverage.

### Scalability

- Provider adapters separate Quran, hadith, tafsir, word-level, and book retrieval.
- The approved-resource registry allows new sources without weakening provenance rules.
- The research workspace stores reusable evidence and revisioned briefs rather than isolated chat answers.

## Two-minute live demo script

**0:00–0:20 — Problem**

“I received this Arabic quotation as an image. Before interpreting it, I need to know what the image says and which approved source supports it.”

**0:20–0:45 — OCR review**

Select Arabic, upload the prepared image, extract the text, and point out the confirmation checkbox.

“The OCR result is editable because automated transcription can be wrong. I confirm it only after comparing it with the image.”

**0:45–1:15 — Evidence retrieval**

Enter reference `1:1`, create the claim, retrieve evidence, and expand the source details.

“This is source text with a locator and edition, not a model-generated quotation. A provider failure or missing result stays visible as a limitation.”

**1:15–1:40 — Research record**

Add the passage to a research project, save a short note, and open the evidence detail.

“Tabayyun keeps the source snapshot, my note, and the later AI explanation separate.”

**1:40–2:00 — Close**

“The result is not a truth score. It is a reviewable chain from screenshot to claim to evidence. That makes AI useful without asking users to trust an unsupported answer.”

## Demo safety checklist

- Use the verified UmmahAPI Quran path for the live demo
- Keep a pasted-text fallback ready in case OCR.space is slow
- Prepare the Arabic screenshot below 1 MB
- Sign in and create the demo research project before judging starts
- Open `/sources` and confirm storage is connected and approved UmmahAPI resources are present
- Do not demonstrate Quran Foundation until its 401 credential or scope issue is resolved
- Keep a screen recording of the same successful flow as a network-failure backup

## Likely judge questions

**How is this different from asking a chatbot?**

The system retrieves bounded, approved evidence and validates citations before analysis. It preserves the exact evidence record instead of returning a response based only on model memory.

**Does it decide whether a hadith or quotation is authentic?**

No. It reports wording matches, provider-attributed grades when available, coverage limits, and cited analysis. It does not replace qualified scholarship.

**What happens when no source matches?**

The product reports insufficient coverage or no retrieved match. It does not label the claim false or fabricated.

**How do you handle OCR mistakes?**

The user chooses the text language, reviews editable output, and must confirm it before saving. The original image is not stored by the project.

**Can the model invent a citation?**

The server accepts only evidence IDs from the retrieval snapshot. Unknown citations, changed excerpts, and invalid relationships fail validation.

**What remains before public launch?**

A stable HTTPS deployment, public operator/contact details, corrected Quran Foundation access if that provider is shown, live account-isolation checks, and broader human-reviewed Arabic evaluation.
