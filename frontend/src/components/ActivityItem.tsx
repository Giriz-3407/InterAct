import React from 'react';

interface ActivityItemProps {
  description: string;
  timestamp: string;
  type: string;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({
  description,
  timestamp,
  type,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'chat_message': return 'forum';
      case 'screen_shared': return 'play_circle';
      case 'room_created': return 'add_box';
      default: return 'notifications';
    }
  };

  const isHighlighted = description.includes('mentioned you');

  return (
    <div className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
      isHighlighted 
        ? 'bg-indigo-600/5 border-indigo-500/25 active-glow' 
        : 'bg-zinc-900/20 border-zinc-800/40 hover:bg-zinc-900/40'
    }`}>
      <div className={`p-1.5 rounded-lg border text-xs mt-0.5 ${
        isHighlighted
          ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
      }`}>
        <span className="material-symbols-outlined text-[16px] block">{getIcon()}</span>
      </div>
      <div className="flex-1 flex flex-col gap-0.5">
        <p className="text-xs text-zinc-300 font-inter leading-relaxed">{description}</p>
        <span className="text-[10px] font-mono text-zinc-500">{timestamp}</span>
      </div>
    </div>
  );
};
