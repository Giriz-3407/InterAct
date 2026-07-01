import React from 'react';

interface BadgeProps {
  variant: 'live' | 'host' | 'viewer' | 'completed' | 'ended';
}

export const Badge: React.FC<BadgeProps> = ({ variant }) => {
  if (variant === 'live') {
    return (
      <span className="status-pill-live text-[9px] py-0.5 px-2 select-none">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
        Live
      </span>
    );
  }

  if (variant === 'host') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold font-geist bg-indigo-500/10 border border-indigo-500/20 text-[#c0c1ff] select-none uppercase tracking-wide">
        Host
      </span>
    );
  }

  if (variant === 'viewer') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold font-geist bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 select-none uppercase tracking-wide">
        Viewer
      </span>
    );
  }

  if (variant === 'completed') {
    return (
      <span className="status-pill-completed text-[9px] py-0.5 px-2 select-none">
        Completed
      </span>
    );
  }

  return (
    <span className="status-pill-neutral text-[9px] py-0.5 px-2 select-none">
      Ended
    </span>
  );
};
