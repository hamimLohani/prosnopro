"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { LANG_COOKIE_NAME, type AppLang } from "@/lib/i18n";

interface LanguageContextValue {
  lang: AppLang;
  setLang: (next: AppLang) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "bn",
  setLang: () => {},
});

export function LanguageProvider({
  initialLang,
  children,
}: {
  initialLang: AppLang;
  children: ReactNode;
}) {
  const [lang, setLangState] = useState<AppLang>(initialLang);

  function setLang(next: AppLang) {
    setLangState(next);
    try {
      document.cookie = `${LANG_COOKIE_NAME}=${next}; path=/; max-age=31536000; samesite=lax`;
      localStorage.setItem(LANG_COOKIE_NAME, next);
    } catch {
      // Ignore storage errors
    }
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang(): LanguageContextValue {
  return useContext(LanguageContext);
}
