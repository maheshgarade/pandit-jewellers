import React from "react";
import LanguageSelector from "../components/LanguageSelector";
import { useLanguage } from "../context/LanguageContext";

const Header: React.FC = () => {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-purple-800 to-purple-900 shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="w-10 h-10 relative bg-white rounded-full flex items-center justify-center">
          <img
            src="/logo/logo.png"
            alt="Pandit Jeweller Logo"
            className="w-8 h-8 object-contain"
          />
        </div>
        <h1 className="text-xl font-bold text-center bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
          {t("app.title")}
        </h1>
        <LanguageSelector />
      </div>
    </header>
  );
};

export default Header;
