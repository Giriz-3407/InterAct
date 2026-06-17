import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  context: 'dashboard' | 'history';
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, context }) => {
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebar_expanded');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const handleToggle = () => {
    setIsExpanded((prev: boolean) => {
      const next = !prev;
      localStorage.setItem('sidebar_expanded', JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-bg flex font-inter text-on-surface">
      {/* Unified Collapsible Navigation Sidebar */}
      <Sidebar context={context} isExpanded={isExpanded} onToggle={handleToggle} />
      
      {/* Main Content Area */}
      <div className={`w-full min-h-screen flex flex-col transition-all duration-300 ease-in-out ${
        isExpanded ? 'pl-64' : 'pl-16'
      }`}>
        {children}
      </div>
    </div>
  );
};
