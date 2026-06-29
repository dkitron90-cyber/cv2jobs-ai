import type { Job, WorkplaceType } from "../types";

export const ISRAEL_LOCATION_PATTERN = new RegExp(
  [
    "israel",
    "tel[ -]?aviv",
    "herzliya",
    "haifa",
    "jerusalem",
    "ramat gan",
    "petah tikva",
    "petach tikva",
    "ra['']?[ -]?anana",
    "kfar saba",
    "netanya",
    "rehovot",
    "yokneam",
    "yoqneam",
    "be['']?[ -]?er sheva",
    "beer sheva",
    "caesarea",
    "modi['']?[ -]?in",
    "holon",
    "bnei brak",
    "ness ziona",
    "ashdod",
    "or yehuda",
    "rosh ha['']?[ -]?ayin",
    "givatayim",
    "ramat hasharon",
    "hod hasharon",
    "airport city",
    "glilot",
    "ישראל",
    "תל אביב",
    "הרצליה",
    "חיפה",
    "ירושלים",
    "רמת גן",
    "פתח תקווה",
    "רעננה",
    "כפר סבא",
    "נתניה",
    "רחובות",
    "יקנעם",
    "באר שבע",
  ].join("|"),
  "i",
);

export function isIsraelLocation(...parts: Array<string | undefined | null>): boolean {
  const locations = parts.filter(Boolean).join(" | ");
  return ISRAEL_LOCATION_PATTERN.test(locations);
}

export function decodeEntities(value: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&nbsp;": " ",
  };

  return value
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => entities[entity] ?? entity)
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

export function toPlainText(html = ""): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

export function inferWorkplaceFromText(searchable: string): WorkplaceType {
  if (/\bremote\b|עבודה מרחוק|מהבית|מרוחק/i.test(searchable)) return "remote";
  if (/\bhybrid\b|היברידי/i.test(searchable)) return "hybrid";
  if (/on[ -]?site|in the office|office-based|מהמשרד|במשרד/i.test(searchable)) return "on-site";
  return "unspecified";
}

export function deduplicateJobs(jobs: Job[]): Job[] {
  const seen = new Map<string, Job>();

  for (const job of jobs) {
    const key = [job.company, job.title, job.location]
      .join("|")
      .toLocaleLowerCase("en")
      .replace(/[^a-z0-9א-ת]+/g, "");
    const existing = seen.get(key);
    if (!existing || Date.parse(job.updatedAt) > Date.parse(existing.updatedAt)) {
      seen.set(key, job);
    }
  }

  return [...seen.values()].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}

export const FETCH_HEADERS = {
  Accept: "application/json",
  "User-Agent": "CV2JobsAI/0.1",
};
