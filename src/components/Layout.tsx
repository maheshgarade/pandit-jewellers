
import React from 'react';
import Header from './Header';
import BottomMenu from './BottomMenu';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      <main className="flex-1 pb-16">
        {children}
      </main>
      <BottomMenu activePage={currentPath} />
    </div>
  );
};

export default Layout;
