export type ContentLanguage = "he" | "en" | "mixed";

const HEBREW_RE = /[\u0590-\u05FF]/g;
const LATIN_RE = /[A-Za-z]/g;

export function countScriptChars(text: string) {
  return {
    hebrew: (text.match(HEBREW_RE) ?? []).length,
    latin: (text.match(LATIN_RE) ?? []).length,
  };
}

export function detectContentLanguage(text: string): ContentLanguage {
  const sample = text.slice(0, 8000);
  const { hebrew, latin } = countScriptChars(sample);

  if (hebrew === 0) return "en";
  if (latin === 0) return "he";
  if (hebrew >= latin * 0.35) return hebrew >= latin * 1.2 ? "he" : "mixed";
  return latin >= hebrew * 1.2 ? "en" : "mixed";
}

export function decodeTextBuffer(buffer: Buffer): string {
  const utf8 = buffer.toString("utf-8");
  if (!utf8.includes("\uFFFD")) return utf8.replace(/^\uFEFF/, "");
  return buffer.toString("latin1");
}

export function normalizeSearchText(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("en").replace(/\s+/g, " ").trim();
}
