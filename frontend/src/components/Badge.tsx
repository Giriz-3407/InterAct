import React from 'react';

interface BadgeProps {
  variant: 'live' | 'host' | 'viewer' | 'completed' | 'ended';
}

export const Badge: React.FC<BadgeProps> = ({ variant }) => {
  if (variant === 'live') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold font-geist bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
        Live
      </span>
    );
  }

  if (variant === 'host') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold font-geist bg-primary/10 text-primary border border-primary/20" style={{ color: 'var(--primary)' }}>
        Host
      </span>
    );
  }

  if (variant === 'viewer') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold font-geist bg-zinc-800 text-zinc-400 border border-zinc-700">
        Viewer
      </span>
    );
  }

  if (variant === 'completed') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold font-geist bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        Completed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold font-geist bg-amber-500/10 text-amber-400 border border-amber-500/20">
      Ended
    </span>
  );
};
