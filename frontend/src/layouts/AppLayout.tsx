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
    <div className="min-h-screen bg-bg flex font-inter text-on-surface overflow-x-hidden w-full relative">
      {/* Sidebar backdrop overlay on mobile */}
      {isExpanded && (
        <div
          onClick={handleToggle}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-25 md:hidden transition-all duration-300"
        />
      )}

      {/* Unified Collapsible Navigation Sidebar */}
      <Sidebar context={context} isExpanded={isExpanded} onToggle={handleToggle} />
      
      {/* Main Content Area */}
      <div className={`w-full min-h-screen flex flex-col transition-all duration-300 ease-in-out min-w-0 ${
        isExpanded ? 'pl-0 md:pl-64' : 'pl-0 md:pl-16'
      }`}>
        {children}
      </div>
    </div>
  );
};
