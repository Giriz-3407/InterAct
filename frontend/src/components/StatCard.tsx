import React from 'react';
import { GlassPanel } from './GlassPanel';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: string;
  accentColor?: 'primary' | 'success' | 'warning';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon,
  accentColor = 'primary',
}) => {
  const accentBorderClasses = {
    primary: 'border-l-4 border-l-[#c0c1ff]',
    success: 'border-l-4 border-l-[#10b981]',
    warning: 'border-l-4 border-l-[#f59e0b]',
  };

  const textColors = {
    primary: 'text-[#c0c1ff]',
    success: 'text-[#10b981]',
    warning: 'text-[#f59e0b]',
  };

  return (
    <GlassPanel className={`${accentBorderClasses[accentColor]} flex items-center justify-between`}>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-zinc-500 font-geist uppercase tracking-wider">{label}</span>
        <span className="text-2xl font-bold font-geist text-white">{value}</span>
        {subtext && <span className="text-[11px] font-inter text-zinc-400">{subtext}</span>}
      </div>
      <div className={`p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 ${textColors[accentColor]}`}>
        <span className="material-symbols-outlined text-[20px] block">{icon}</span>
      </div>
    </GlassPanel>
  );
};
