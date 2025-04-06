import React from "react";
import { Link } from "react-router-dom";
import { Calculator, Users, BookmarkCheck } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

interface BottomMenuProps {
  activePage: string;
}

const BottomMenu: React.FC<BottomMenuProps> = ({ activePage }) => {
  const { t } = useLanguage();
  const menuItems = [
    {
      name: t("menu.calculator"),
      path: "/",
      icon: Calculator,
    },
    {
      name: t("menu.customers"),
      path: "/customers",
      icon: Users,
    },
    {
      name: t("menu.shortlisted"),
      path: "/shortlisted",
      icon: BookmarkCheck,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-purple-200 shadow-lg">
      <div className="flex justify-around items-center h-16">
        {menuItems.map((item) => {
          const isActive = activePage === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive
                  ? "text-purple-600"
                  : "text-gray-500 hover:text-purple-400"
              }`}
            >
              <item.icon
                className={`h-5 w-5 mb-1 ${isActive ? "text-purple-600" : ""}`}
              />
              <span className={`text-xs ${isActive ? "font-medium" : ""}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomMenu;
