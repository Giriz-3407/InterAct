import React from 'react';

interface TopBarProps {
  title: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  showSearch = true,
  searchPlaceholder = 'Search...',
  actions,
}) => {
  return (
    <header className="sticky top-0 right-0 h-14 border-b border-slate-border bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-sidebar'))}
          className="md:hidden p-1 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer flex items-center justify-center shrink-0"
          title="Toggle Navigation"
        >
          <span className="material-symbols-outlined text-[20px] block">menu</span>
        </button>
        <h1 className="text-sm md:text-base font-bold font-geist text-white tracking-tight leading-none">
          {title}
        </h1>
        {showSearch && (
          <div className="relative hidden md:block">
            <span className="material-symbols-outlined text-[18px] text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2">
              search
            </span>
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="pl-9 pr-4 py-1.5 w-64 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all font-inter"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {actions}
      </div>
    </header>
  );
};
