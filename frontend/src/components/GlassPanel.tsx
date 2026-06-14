import React from 'react';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  hoverGlow?: boolean;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className = '',
  hoverGlow = false,
}) => {
  return (
    <div
      className={`glass-panel rounded-xl p-4 transition-all duration-300 ${
        hoverGlow ? 'hover:translate-y-[-2px] hover:border-zinc-700 hover:shadow-lg' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
