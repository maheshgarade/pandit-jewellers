import React from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import BottomMenu, { MAIN_PATHS } from "./BottomMenu";

interface LayoutProps {
  children: React.ReactNode;
}

/** Header on every page; the bottom tabs (Calculator, Customers, Estimate) only on those three pages. */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { pathname } = useLocation();
  const tabs = MAIN_PATHS.includes(pathname);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      <main className={`flex-1 ${tabs ? "pb-24" : "pb-6"}`}>{children}</main>
      {tabs ? <BottomMenu activePage={pathname} /> : null}
    </div>
  );
};

export default Layout;
