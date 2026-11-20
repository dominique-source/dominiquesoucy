"use client";
import { createContext, useContext, useEffect } from "react";
import type { Locale } from "@/lib/i18n";
const LocaleContext = createContext<Locale>("fr");
export function LocaleProvider({
  lang,
  children,
}: {
  lang: Locale;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.lang = lang === "fr" ? "fr-CA" : "en-CA";
  }, [lang]);
  return (
    <LocaleContext.Provider value={lang}>{children}</LocaleContext.Provider>
  );
}
export function useLocale() {
  return useContext(LocaleContext);
}
