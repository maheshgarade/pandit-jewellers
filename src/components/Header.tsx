import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, Settings } from "lucide-react";
import LanguageSelector from "../components/LanguageSelector";
import { useLanguage } from "../context/LanguageContext";
import { useStore } from "@/lib/store";

const Header: React.FC = () => {
  const { t } = useLanguage();
  const { state } = useStore();
  const { pathname } = useLocation();
  const onHome = pathname === "/";
  const back = pathname.startsWith("/settings/") ? "/settings" : "/";

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-purple-800 to-purple-900 shadow-md">
      <div className="container mx-auto flex items-center justify-between gap-2 px-3 py-2">
        {onHome ? (
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
            <img src="/logo/logo.png" alt="Pandit Jewellers logo" className="h-8 w-8 object-contain" />
          </div>
        ) : (
          <Link to={back} aria-label="Back" className="flex h-11 w-11 shrink-0 items-center justify-center text-white">
            <ChevronLeft className="h-6 w-6" />
          </Link>
        )}
        <h1 className="truncate bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-center text-xl font-bold text-transparent">
          {state.shop.name || t("app.title")}
        </h1>
        <div className="flex shrink-0 items-center">
          <LanguageSelector />
          <Link to="/settings" aria-label="Settings" className="flex h-11 w-11 items-center justify-center text-white">
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
