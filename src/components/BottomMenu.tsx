import React from "react";
import { Link } from "react-router-dom";
import { Calculator, FileText, Users } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useStore } from "@/lib/store";

/** The main tabs. */
export const MAIN_PATHS = ["/", "/customers", "/estimate"];

const BottomMenu: React.FC<{ activePage: string }> = ({ activePage }) => {
  const { t } = useLanguage();
  const { state } = useStore();
  const count = state.estimate.items.length + state.estimate.old.length;
  const menuItems = [
    { name: t("menu.calculator"), path: "/", icon: Calculator, badge: 0 },
    { name: t("menu.customers"), path: "/customers", icon: Users, badge: 0 },
    { name: t("menu.estimate"), path: "/estimate", icon: FileText, badge: count },
  ];

  return (
    <nav aria-label={t("menu.main")} className="fixed bottom-0 left-0 right-0 z-30 border-t border-purple-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-lg">
      <div className="flex h-16 items-center justify-around">
        {menuItems.map((item) => {
          const isActive = activePage === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={isActive ? "page" : undefined}
              className={`flex h-full w-full flex-col items-center justify-center ${isActive ? "text-purple-700" : "text-gray-600"}`}
            >
              <span className="relative">
                <item.icon className="mb-1 h-5 w-5" aria-hidden="true" />
                {item.badge ? (
                  <span className="absolute -right-3 -top-2 min-w-[18px] rounded-full bg-rose-600 px-1 text-center text-[11px] font-bold leading-[18px] text-white">
                    {item.badge}
                    <span className="sr-only"> {t("customers.items")}</span>
                  </span>
                ) : null}
              </span>
              <span className={`text-xs ${isActive ? "font-semibold" : ""}`}>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomMenu;
