import React from 'react';
import { Badge } from './Badge';
import { AvatarStack } from './AvatarStack';
import { Tv, Play, Calendar, User } from 'lucide-react';

interface SessionCardProps {
  id: string;
  roomName: string;
  dateString: string;
  durationString: string;
  participantsCount: number;
  hostName: string;
  status: 'completed' | 'ended';
  isHighlighted?: boolean;
  onTranscriptClick?: (id: string) => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  id,
  roomName,
  dateString,
  durationString,
  participantsCount,
  hostName,
  status,
  isHighlighted = false,
  onTranscriptClick,
}) => {
  // Generate dummy participant list for stack
  const dummyUsers = Array.from({ length: participantsCount }, (_, idx) => ({
    name: `User ${idx}`,
  }));

  return (
    <div
      className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-all duration-200 select-none ${
        isHighlighted
          ? 'bg-white/[0.01] border-indigo-500/20 shadow-panel'
          : 'bg-[#0c0c0e] border-white/[0.03] hover:border-white/[0.06] shadow-panel'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-zinc-400 mt-0.5">
          <Tv size={16} />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold font-geist text-white tracking-tight leading-none">{roomName}</h3>
            <Badge variant={status} />
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-inter">
            <span className="flex items-center gap-1"><User size={12} className="text-zinc-600" /> Host: {hostName}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Calendar size={12} className="text-zinc-600" /> {dateString}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-white/[0.02] pt-4 md:pt-0">
        <div className="flex flex-col gap-1.5 text-left md:text-right">
          <span className="text-[9px] font-bold font-geist text-zinc-500 uppercase tracking-widest leading-none">Duration</span>
          <span className="text-xs font-mono text-zinc-300">{durationString}</span>
        </div>

        <div className="flex flex-col gap-1.5 text-left md:text-right">
          <span className="text-[9px] font-bold font-geist text-zinc-500 uppercase tracking-widest leading-none">Collaborators</span>
          <div className="flex items-center gap-2 mt-0.5">
            <AvatarStack users={dummyUsers} limit={3} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onTranscriptClick?.(id)}
            className="px-3.5 py-1.5 text-xs font-semibold font-geist bg-white/[0.04] border border-white/[0.06] text-zinc-300 rounded-xl hover:bg-white/[0.08] hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
          >
            Transcript
          </button>
          <button className="px-3.5 py-1.5 text-xs font-semibold font-geist bg-[#c0c1ff]/10 border border-[#c0c1ff]/20 text-[#c0c1ff] rounded-xl hover:bg-[#c0c1ff]/15 transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95">
            <Play size={12} fill="currentColor" />
            <span>Recording</span>
          </button>
        </div>
      </div>
    </div>
  );
};
