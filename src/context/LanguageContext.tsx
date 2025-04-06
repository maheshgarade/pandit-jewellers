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

const translations: Record<Language, TranslationsType> = {
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

  // Translation function
  const t = (key: string): string => {
    const keys = key.split(".");
    let result: TranslationsType | string = translations[language];

    for (const k of keys) {
      if (result && result[k] !== undefined) {
        result = result[k];
      } else {
        return key; // Return the key if translation is not found
      }
    }

    return result?.toString() || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
