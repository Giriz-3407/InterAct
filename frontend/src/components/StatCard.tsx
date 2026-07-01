import React from 'react';
import { History, Clock, Users, FileText } from 'lucide-react';

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
  const accentColors = {
    primary: '#c0c1ff',
    success: '#10b981',
    warning: '#f59e0b',
  };

  const iconsMap: Record<string, React.ReactNode> = {
    history: <History size={16} />,
    timer: <Clock size={16} />,
    group: <Users size={16} />,
    file_present: <FileText size={16} />,
  };

  const accent = accentColors[accentColor];
  const lucideIcon = iconsMap[icon] || <FileText size={16} />;

  return (
    <div className="db-card p-5 sm:p-6 select-none flex flex-col gap-3.5">
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.02] border border-white/[0.04]">
          <span style={{ color: accent }}>{lucideIcon}</span>
        </div>
        {subtext && (
          <span className="status-pill-neutral font-geist text-[9px] tracking-wide py-0.5 px-2">{subtext}</span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold font-geist text-white tracking-tight leading-none mb-1.5">{value}</p>
        <p className="text-xs text-zinc-400 font-inter">{label}</p>
      </div>
    </div>
  );
};
