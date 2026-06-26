import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  context: 'dashboard' | 'history';
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, context }) => {
  const [isExpanded, setIsExpanded] = useState(() => {
    if (window.innerWidth < 768) return false;
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

  useEffect(() => {
    const handleToggleEvent = () => {
      setIsExpanded((prev: boolean) => !prev);
    };
    window.addEventListener('toggle-sidebar', handleToggleEvent);
    return () => window.removeEventListener('toggle-sidebar', handleToggleEvent);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        const saved = localStorage.getItem('sidebar_expanded');
        setIsExpanded(saved !== null ? JSON.parse(saved) : true);
      } else {
        setIsExpanded(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="h-screen bg-bg flex font-inter text-on-surface overflow-hidden w-full relative">
      {/* Sidebar backdrop overlay on mobile */}
      {isExpanded && (
        <div
          onClick={handleToggle}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-25 md:hidden transition-opacity duration-300"
        />
      )}

      <Sidebar context={context} isExpanded={isExpanded} onToggle={handleToggle} />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {children}
      </div>
    </div>
  );
};
