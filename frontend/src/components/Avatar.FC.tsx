import React from 'react';
import { getInitials } from '../lib/utils';

interface AvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: string;
  status?: 'active' | 'idle' | 'offline';
  micOn?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 'md',
  color = 'bg-indigo-600',
  status,
  micOn,
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-7 h-7 sm:w-8 sm:h-8 text-[11px] sm:text-xs',
    md: 'w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm',
    lg: 'w-10 h-10 sm:w-12 sm:h-12 text-sm sm:text-base',
  };

  const statusColors = {
    active: 'bg-emerald-500',
    idle: 'bg-amber-500',
    offline: 'bg-zinc-500',
  };

  return (
    <div className="relative inline-block">
      <div
        className={`flex items-center justify-center rounded-full font-geist font-semibold text-white ${sizeClasses[size]} ${color} border border-zinc-800`}
      >
        {getInitials(name)}
      </div>
      
      {status && (
        <span
          className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-1 ring-zinc-900 ${statusColors[status]}`}
        />
      )}
      
      {micOn !== undefined && (
        <div
          className={`absolute -top-1 -right-1 p-0.5 rounded-full text-[10px] ${
            micOn ? 'bg-indigo-500 text-white' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}
        >
          <span className="material-symbols-outlined text-[12px] block">
            {micOn ? 'mic' : 'mic_off'}
          </span>
        </div>
      )}
    </div>
  );
};
