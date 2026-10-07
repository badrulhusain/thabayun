import type { Passage, Source } from "./types";
// Inspected against Wikisource's Baqarah transcription on 4 October 2026.
// Unique excerpt openings are used instead of inferred modern verse numbers.
export const sources: Source[] = [
  {
    id: "palmer-baqarah",
    title: "The Qur’an — The Chapter of the Heifer",
    author: "Qur’an",
    translator: "E. H. Palmer",
    edition: "Clarendon Press, 1880; Part I",
    sourceType: "Historical English translation",
    language: "English",
    URL: "https://en.wikisource.org/wiki/The_Qur%27an_(Palmer)/Baqarah",
    reuseTerms:
      "Public domain; translator died in 1882. Transcription may require proofreading.",
  },
];
const excerpts: [string, string, string][] = [
  [
    "Clothe not truth with vanity, nor hide the truth the while ye know.",
    "Clothe not truth",
    "truth testimony",
  ],
  [
    "Will ye order men to do piety and forget yourselves? ye read the Book, do ye not then understand?",
    "Will ye order men",
    "piety understanding",
  ],
  [
    "Seek aid with patience and prayer, though it is a hard thing save for the humble, who think that they will meet their Lord, and that to Him will they return.",
    "Seek aid with patience",
    "patience prayer humility",
  ],
  [
    "Be steadfast in prayer, give the alms, and bow down with those who bow.",
    "Be steadfast in prayer, give",
    "prayer charity alms",
  ],
  [
    "They said, 'Glory be to Thee! no knowledge is ours but what Thou thyself hast taught us, verily, Thou art the knowing, the wise.'",
    "Glory be to Thee",
    "knowledge wisdom",
  ],
  [
    "Be ye steadfast in prayer, and give alms; and whatsoever good ye send before for your own souls, ye shall find it with God, for God in all ye do doth see.",
    "Be ye steadfast in prayer",
    "prayer charity good",
  ],
  [
    "Say thou, ‘Bring your proofs, if ye be speaking truth.’",
    "Bring your proofs",
    "proof evidence truth",
  ],
  [
    "God’s is the east and the west, and wherever ye turn there is God’s face; verily, God comprehends and knows.",
    "God’s is the east and the west",
    "east west knowledge",
  ],
  [
    "That is a nation that has passed away, theirs is what they gained; and yours shall be what ye have gained; ye shall not be questioned as to that which they have done.",
    "That is a nation that has passed away",
    "responsibility nation deeds",
  ],
  [
    "The truth (is) from thy Lord; be not therefore one of those who doubt thereof.",
    "The truth (is) from thy Lord",
    "truth doubt",
  ],
];
export const passages: Passage[] = excerpts.map(([text, opening, tags], i) => ({
  id: `palmer-b-${i + 1}`,
  sourceId: sources[0].id,
  text,
  locator: `Chapter II (Baqarah), excerpt beginning “${opening}…”`,
  tags: tags.split(" "),
  surroundingContext:
    i === 6
      ? "They say, ‘None shall enter Paradise save such as be Jews or Christians;’ that is their faith."
      : undefined,
}));
