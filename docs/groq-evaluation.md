# Groq bilingual engineering evaluation

Run date: 5 October 2026. Provider: Groq, using the official SDK, strict JSON Schema, and the application's existing validators. Prompt versions: `tabayyun-extract-groq-v2` and `tabayyun-analysis-groq-v2`.

This run used ten synthetic, agent-reviewed cases, tested against both exact requested models: four extraction cases (two English, two Arabic) and six analysis cases (three English, three Arabic). No saved user research was sent. Both source passages and attributed speakers were explicitly test fixtures, outside the curated collection. An independent fluent-Arabic human review remains pending; this is an engineering evaluation, not a completed human-reviewed or scholarly benchmark.

## Observed results

| Model | Extraction cases passing all automated checks | Analysis cases passing validation and expected support outcome | Provider-rejected attempts |
| --- | --- | --- | --- |
| `openai/gpt-oss-20b` | 0 / 4 | 4 / 6 | 3 (one extraction, two analysis) |
| `openai/gpt-oss-120b` | 2 / 4 | 6 / 6 | 0 |

The analysis failures for 20B were provider rejections, not observed unsupported/contradictory findings. In the first run, those provider errors were classified as `MODEL_REQUEST_REJECTED`; the detailed provider error code was not retained. We cannot attribute those failures specifically to the model, schema configuration, or generation from that record. The adapter now separately handles the recognized `json_validate_failed` code without exposing provider response bodies or weakening strict mode.

All ten successfully returned analysis responses passed passage-ID and exact-excerpt validation. Both models correctly produced insufficient evidence for the English and Arabic empty-evidence cases. 120B returned partial support for the English overgeneralization and insufficient evidence for the Arabic overgeneralization; both match the annotated acceptable outcomes. There were no fabricated citations accepted in this small run. This does not prove that either model will always cite correctly.

## Review of extraction weaknesses

- **20B offsets:** all five claims across its three completed extraction cases had invalid character offsets. The application flagged each for correction rather than permitting retrieval/analysis. It also populated the quotation field for ordinary unquoted factual assertions and included quotation delimiters in an attributed quotation.
- **120B offsets:** the two English cases had valid excerpt offsets. In Arabic, one of the two negation-case claims had a bad offset; the Arabic attribution case with a leading emoji also had invalid offsets. A shorter excerpt without the final punctuation differs from the annotated span, but that alone would not prove an extraction error; the offset mismatch independently fails application validation.
- **Language:** both models produced English standalone statements for Arabic negation examples, while retaining Arabic excerpts. Manual inspection confirmed that the negation itself was preserved in those English statements. This was not reported as negation loss. Language changes are separately recorded for review.
- **Attribution:** the speaker fields were retained in completed attributed-view cases, but standalone statements did not repeat the named speaker. The application displays attribution separately; users should edit statements to retain whose view is being reported. These cases are not counted as author assertions on the basis of the statement alone.
- **Questions/instructions/hypotheticals:** completed extraction responses retained the expected assertion counts and excluded the question, embedded instruction, and hypothetical examples. The rejected Arabic 20B attribution request yields no conclusion about that case.

We retain the requested 20B extraction and 120B analysis defaults. These observations support keeping claim review, exact-span validation, citation validation, and manual correction essential. They do not justify silently changing models, repairing offsets without review, using model memory as evidence, or trusting outputs based on model size.

## Data and reproducibility

- Annotations: [dataset](../tests/evaluation/dataset.json).
- Full synthetic outputs, per-case measurements, usage, latency, completion status, and observed failures: [JSON report](groq-evaluation-results.json).
- Command: `npm run eval:groq -- --live`, with server-side `GROQ_API_KEY` configured. Both models are tested on both tasks sequentially. The optional local environment-file loader reads `.env.local` before `.env`; shell/deployment variables take precedence.
- A run without `--live` performs no model calls. It should not overwrite an existing live-results artifact. The runner exits nonzero when any case fails; this distinguishes observed evaluation failures from failures in the passing automated unit/browser suites.

Exact-annotation precision/recall combines excerpt boundaries, claim type, quotation, speaker, and reference fields. It is intentionally strict and can reject acceptable alternative wording/boundaries. Inspect the outputs and review notes rather than interpreting the table as general model accuracy. Tiny samples, synthetic non-scholarly facts, one run per case, and missing independent human review limit every conclusion. The application collection still has no Arabic originals, hadith, or scholarly texts; Arabic test passages are not production source coverage.
