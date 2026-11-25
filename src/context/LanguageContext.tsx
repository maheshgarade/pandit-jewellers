import React, { createContext, useState, useEffect, useContext, ReactNode } from "react";
import enTranslations from "../translations/en.json";
import mrTranslations from "../translations/mr.json";

export type Language = "en" | "mr";

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const translations: Record<Language, unknown> = { en: enTranslations, mr: mrTranslations };

const lookup = (lang: Language, key: string): string | undefined => {
  let result: unknown = translations[lang];
  for (const k of key.split(".")) {
    if (result && typeof result === "object" && (result as Record<string, unknown>)[k] !== undefined) {
      result = (result as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }
  return typeof result === "string" ? result : undefined;
};

/** The chosen language, for code outside React screens (e.g. the printed estimate). Kept in step by the provider. */
let current: Language = (() => {
  try {
    return localStorage.getItem("language") === "mr" ? "mr" : "en";
  } catch {
    return "en";
  }
})();

/** Translation: the chosen language, else English, else the key itself. `{name}` placeholders are filled from `vars`. */
export const tr = (key: string, vars?: Record<string, string | number>): string => {
  let s = lookup(current, key) ?? lookup("en", key) ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
};

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // Saved choice; Hindi (removed) falls back to English.
  const [language, setLanguageState] = useState<Language>(current);

  const setLanguage = (lang: Language) => {
    current = lang;
    try {
      localStorage.setItem("language", lang);
    } catch {
      /* private mode: keep it for this session */
    }
    setLanguageState(lang);
  };

  current = language;
  useEffect(() => {
    document.documentElement.lang = language; // correct Devanagari shaping and screen-reader voice
  }, [language]);
  const t = (key: string, vars?: Record<string, string | number>): string => tr(key, vars);

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
};
