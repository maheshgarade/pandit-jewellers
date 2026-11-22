import React, { createContext, useState, useContext, ReactNode } from "react";
import enTranslations from "../translations/en.json";
import hiTranslations from "../translations/hi.json";
import mrTranslations from "../translations/mr.json";

export type Language = "en" | "hi" | "mr";

type TranslationsType = typeof enTranslations;

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
};

const translations: Record<Language, Partial<TranslationsType>> = {
  en: enTranslations,
  hi: hiTranslations,
  mr: mrTranslations,
};

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // Initialize with the browser language or default to English
  const [language, setLanguage] = useState<Language>(() => {
    const savedLang = localStorage.getItem("language");
    if (savedLang && ["en", "hi", "mr"].includes(savedLang)) {
      return savedLang as Language;
    }
    return "en";
  });

  // Save language preference when it changes
  React.useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  // Translation function: the chosen language, else English, else the key itself.
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
  const t = (key: string): string => lookup(language, key) ?? lookup("en", key) ?? key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
