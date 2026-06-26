import React from 'react';
import interactLogo from '../assets/branding/interact-icon-dark-mode.svg';

export const BrandedLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-[#09090b] flex flex-col items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        {/* Logo container with pulse effect */}
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl overflow-hidden">
          <div className="absolute inset-0 bg-indigo-500/5 animate-pulse" />
          <img src={interactLogo} alt="InterAct" className="h-8 w-auto relative z-10" />
        </div>
        
        {/* Title and Loader */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-sm font-semibold font-geist text-zinc-100 tracking-tight">InterAct</h2>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c0c1ff] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#c0c1ff] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#c0c1ff] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
