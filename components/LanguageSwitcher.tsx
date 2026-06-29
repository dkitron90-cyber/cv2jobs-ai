"use client";

import { useLanguage } from "./LanguageProvider";
import type { Locale } from "../app/lib/i18n";

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();

  function choose(next: Locale) {
    if (next !== locale) setLocale(next);
  }

  return (
    <div className="lang-switcher" role="group" aria-label={t("lang.switch")}>
      <button
        type="button"
        className={locale === "en" ? "active" : ""}
        onClick={() => choose("en")}
        aria-pressed={locale === "en"}
      >
        {t("lang.en")}
      </button>
      <button
        type="button"
        className={locale === "he" ? "active" : ""}
        onClick={() => choose("he")}
        aria-pressed={locale === "he"}
      >
        {t("lang.he")}
      </button>
    </div>
  );
}
