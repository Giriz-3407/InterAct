import React from 'react';
import { Badge } from './Badge';
import { AvatarStack } from './AvatarStack';

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
      className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
        isHighlighted
          ? 'bg-indigo-600/5 border-l-4 border-l-indigo-500 border-zinc-800'
          : 'bg-zinc-950/20 border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 mt-1">
          <span className="material-symbols-outlined text-[20px] block">meeting_room</span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold font-geist text-white tracking-tight">{roomName}</h3>
            <Badge variant={status} />
          </div>
          <p className="text-xs text-zinc-500 font-inter">Host: {hostName} • {dateString}</p>
        </div>
      </div>

      <div className="flex items-center gap-6 self-stretch sm:self-auto justify-between border-t sm:border-t-0 border-zinc-900 pt-3 sm:pt-0">
        <div className="flex flex-col gap-1 text-right">
          <span className="text-[10px] font-bold font-geist text-zinc-500 uppercase tracking-wider">Duration</span>
          <span className="text-xs font-mono text-zinc-300">{durationString}</span>
        </div>

        <div className="flex flex-col gap-1 text-right">
          <span className="text-[10px] font-bold font-geist text-zinc-500 uppercase tracking-wider">Collaborators</span>
          <div className="flex items-center gap-2 mt-0.5">
            <AvatarStack users={dummyUsers} limit={3} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onTranscriptClick?.(id)}
            className="px-3 py-1.5 text-xs font-medium font-geist bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 cursor-pointer transition-colors"
          >
            Transcript
          </button>
          <button className="px-3 py-1.5 text-xs font-medium font-geist bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">play_arrow</span>
            <span>Recording</span>
          </button>
        </div>
      </div>
    </div>
  );
};
