import React from 'react';
import { SidebarL1 } from '../components/SidebarL1';
import { SidebarL2 } from '../components/SidebarL2';

interface AppLayoutProps {
  children: React.ReactNode;
  context: 'dashboard' | 'history';
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, context }) => {
  return (
    <div className="min-h-screen bg-bg flex font-inter text-on-surface">
      {/* Vertical Icon Rail */}
      <SidebarL1 />
      
      {/* Contextual Side Panel */}
      <SidebarL2 context={context} />
      
      {/* Main Content Area */}
      <div className="pl-81 w-full min-h-screen flex flex-col transition-all">
        {children}
      </div>
    </div>
  );
};
