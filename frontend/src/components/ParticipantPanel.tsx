import React from 'react';
import { Avatar } from './Avatar.FC';
import { Badge } from './Badge';

interface Participant {
  socketId: string;
  displayName: string;
  role: 'host' | 'viewer';
  status?: 'active' | 'idle' | 'offline';
}

interface ParticipantPanelProps {
  roomCode: string;
  participants: Participant[];
  currentUserId?: string;
}

export const ParticipantPanel: React.FC<ParticipantPanelProps> = ({
  roomCode,
  participants,
  currentUserId,
}) => {
  return (
    <aside className="w-60 ml-16 bg-zinc-950/40 border-r border-slate-border flex flex-col h-full shrink-0 p-4">
      {/* Header section */}
      <div className="mb-4 pb-3 border-b border-zinc-800/60">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold font-geist text-white tracking-tight">Participants</h2>
          <span className="text-2xs font-mono bg-zinc-850 px-1.5 py-0.5 rounded text-zinc-400">
            {participants.length}
          </span>
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-[11px] font-geist text-zinc-500 uppercase tracking-wider">Room Code</span>
          <span className="text-xs font-mono text-[#c0c1ff] tracking-wide font-bold">{roomCode}</span>
        </div>
      </div>

      {/* Participant list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2">
        {participants.map((p) => {
          const isCurrentUser = p.socketId === currentUserId;
          const initialsColor = p.role === 'host' ? 'bg-indigo-600' : 'bg-zinc-700';

          return (
            <div
              key={p.socketId}
              className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                p.role === 'host'
                  ? 'bg-indigo-600/5 border-indigo-500/15'
                  : 'bg-zinc-900/20 border-zinc-850 hover:bg-zinc-900/40'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar
                  name={p.displayName}
                  size="sm"
                  color={initialsColor}
                  status="active" // Green presence dot
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-zinc-300 font-inter font-medium truncate">
                    {p.displayName} {isCurrentUser && '(You)'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">online</span>
                </div>
              </div>

              <div className="shrink-0">
                <Badge variant={p.role} />
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
