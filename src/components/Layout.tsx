import React from "react";
import Header from "./Header";
// import BottomMenu from "./BottomMenu"; // bottom navigation hidden for now
// import { useLocation } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  // const location = useLocation();
  // const currentPath = location.pathname;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      {/* Use pb-16 again when the bottom navigation comes back. */}
      <main className="flex-1 pb-6">{children}</main>
      {/* <BottomMenu activePage={currentPath} /> */}
    </div>
  );
};

export default Layout;
