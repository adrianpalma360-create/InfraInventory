import React from 'react';
import { Sidebar, NavigationTab } from './Sidebar.js';
import { Topbar } from './Topbar.js';
import { Footer } from './Footer.js';

interface LayoutProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  breadcrumbs?: string[];
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  breadcrumbs,
  children,
}) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0F14] text-[#F1F5F9]">
      <Sidebar currentTab={currentTab} onSelectTab={onSelectTab} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          currentTab={currentTab}
          onSelectTab={onSelectTab}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          breadcrumbs={breadcrumbs}
        />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
        <Footer onSelectTab={onSelectTab} />
      </div>
    </div>
  );
};
