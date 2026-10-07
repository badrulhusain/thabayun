import { passages, sources } from "./collection";
import type { Result } from "./types";
export function normalize(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
const stop = new Set([
  "the",
  "a",
  "an",
  "of",
  "in",
  "to",
  "and",
  "is",
  "for",
  "what",
  "with",
  "be",
  "it",
]);
export function searchCollection(query: string): Result[] {
  const phrase = normalize(query);
  const words = [
    ...new Set(phrase.split(" ").filter((w) => w.length > 1 && !stop.has(w))),
  ];
  if (!phrase || !words.length) return [];
  return passages
    .map((p) => {
      const source = sources.find((s) => s.id === p.sourceId)!;
      const text = normalize(p.text);
      const title = normalize(source.title);
      const tags = normalize(p.tags.join(" ")).split(" ");
      const tokens = new Set(text.split(" "));
      const score =
        ((" " + text + " ").includes(" " + phrase + " ") ? 100 : 0) +
        words.reduce(
          (n, w) =>
            n +
            (tokens.has(w) ? 10 : 0) +
            (title.split(" ").includes(w) ? 3 : 0) +
            (tags.includes(w) ? 5 : 0),
          0,
        );
      return { ...p, source, score };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
