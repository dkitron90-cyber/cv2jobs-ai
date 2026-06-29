import { messages as en } from "./messages/en";
import { messages as he } from "./messages/he";
import type { ContentLanguage } from "../text-language";
import type { Locale, Messages } from "./types";

export type { Locale, Messages };

const catalogs: Record<Locale, Messages> = { en, he };

export const LOCALE_STORAGE_KEY = "cv2jobs-locale";

export function parseLocale(value: unknown): Locale {
  return value === "he" ? "he" : "en";
}

export function getMessages(locale: Locale): Messages {
  return catalogs[locale];
}

export function t(
  messages: Messages,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const parts = key.split(".");
  let value: unknown = messages;

  for (const part of parts) {
    if (value && typeof value === "object" && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }

  if (typeof value !== "string") return key;
  if (!vars) return value;

  return value.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ""));
}

export function getErrorMessage(locale: Locale, code: keyof Messages["errors"]): string {
  return getMessages(locale).errors[code];
}

export function getLocaleDateFormatter(locale: Locale, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-IL", options);
}

export function getPromptLanguageRule(locale: Locale): string {
  if (locale === "he") {
    return "Write every human-readable string value in Hebrew (modern Israeli professional tone). Keep JSON keys in English. Keep company and product names in English when that is standard in Israel.";
  }

  return "Write every human-readable string value in English. Keep JSON keys in English.";
}

export function getCvReadingRule(cvLanguage: ContentLanguage): string {
  if (cvLanguage === "he") {
    return "The CV is in Hebrew. Read Hebrew accurately (RTL). Preserve Hebrew job titles, skills, and employers from the CV. Include bilingual searchKeywords: each important term in Hebrew plus its common English equivalent used in Israeli tech job posts (e.g. מפתח תוכנה + software engineer).";
  }

  if (cvLanguage === "mixed") {
    return "The CV mixes Hebrew and English. Read both scripts accurately. Include searchKeywords in both languages for the same concepts.";
  }

  return "The CV is in English. Extract keywords that also work against Hebrew job postings in Israel when relevant.";
}

export function getCrossLanguageMatchingRule(
  cvLanguage: ContentLanguage,
  locale: Locale,
  jobLanguage: ContentLanguage = "en",
): string {
  const outputLanguage = locale === "he" ? "Hebrew" : "English";

  if (cvLanguage === "he" || cvLanguage === "mixed") {
    return `Many live job posts are in English even when the CV is Hebrew. Match on skills, seniority, and experience across languages. Write reasons and analysis in ${outputLanguage}, but compare Hebrew CV content to English job posts accurately.`;
  }

  if (jobLanguage === "he" && locale === "en") {
    return "The job description may be in Hebrew. Read it accurately and explain the match in English.";
  }

  return "Compare CV and job description accurately even if they use different languages.";
}
