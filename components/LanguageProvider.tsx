"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  LOCALE_STORAGE_KEY,
  getMessages,
  parseLocale,
  t as translate,
  type Locale,
  type Messages,
} from "../app/lib/i18n";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: Messages;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = parseLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
    setLocaleState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "he" ? "rtl" : "ltr";
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  const messages = useMemo(() => getMessages(locale), [locale]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale: setLocaleState,
      messages,
      t: (key, vars) => translate(messages, key, vars),
    }),
    [locale, messages],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
