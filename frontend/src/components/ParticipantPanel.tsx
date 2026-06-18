import React from 'react';
import { Avatar } from './Avatar.FC';
import { Badge } from './Badge';

interface Participant {
  socketId: string;
  displayName: string;
  role: 'host' | 'viewer';
  status?: 'active' | 'idle' | 'offline';
  micMuted?: boolean;
}

interface ParticipantPanelProps {
  roomCode: string;
  participants: Participant[];
  currentUserId?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const ParticipantPanel: React.FC<ParticipantPanelProps> = ({
  roomCode,
  participants,
  currentUserId,
  isExpanded,
  onToggleExpand,
}) => {
  return (
    <aside
      className={`ml-16 bg-zinc-950/40 border-r border-slate-border flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
        isExpanded ? 'w-60 p-3' : 'w-12 p-2 items-center'
      }`}
    >
      {/* Header section */}
      {isExpanded ? (
        <div className="mb-3 pb-2 border-b border-zinc-800/60 w-full flex flex-col shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold font-geist text-white tracking-tight uppercase">Participants</h2>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono bg-zinc-850 px-1.5 py-0.5 rounded text-zinc-400">
                {participants.length}
              </span>
              <button
                onClick={onToggleExpand}
                className="p-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                title="Collapse sidebar"
              >
                <span className="material-symbols-outlined text-[16px] block">chevron_left</span>
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2.5">
            <span className="text-[10px] font-geist text-zinc-500 uppercase tracking-wider">Room Code</span>
            <span className="text-xs font-mono text-[#c0c1ff] tracking-wide font-bold">{roomCode}</span>
          </div>
        </div>
      ) : (
        <div className="mb-3 pb-2 border-b border-zinc-800/60 w-full flex flex-col items-center gap-2 shrink-0">
          <button
            onClick={onToggleExpand}
            className="p-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Expand sidebar"
          >
            <span className="material-symbols-outlined text-[16px] block">chevron_right</span>
          </button>
          <span className="text-[10px] font-mono bg-zinc-850 px-1 py-0.5 rounded text-zinc-400" title={`${participants.length} participants`}>
            {participants.length}
          </span>
        </div>
      )}

      {/* Participant list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 w-full">
        {participants.map((p) => {
          const isCurrentUser = p.socketId === currentUserId;
          const initialsColor = p.role === 'host' ? 'bg-indigo-600' : 'bg-zinc-700';

          if (!isExpanded) {
            return (
              <div
                key={p.socketId}
                className="py-1 flex justify-center relative group"
                title={`${p.displayName} (${p.role})${isCurrentUser ? ' (You)' : ''}`}
              >
                <Avatar
                  name={p.displayName}
                  size="xs"
                  color={initialsColor}
                  status="active"
                />
              </div>
            );
          }

          return (
            <div
              key={p.socketId}
              className={`p-1.5 px-2 rounded-lg border flex items-center justify-between gap-2 transition-colors ${
                p.role === 'host'
                  ? 'bg-indigo-600/5 border-indigo-500/15'
                  : 'bg-zinc-900/20 border-zinc-850 hover:bg-zinc-900/40'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Avatar
                  name={p.displayName}
                  size="xs"
                  color={initialsColor}
                  status="active"
                />
                <span className="text-xs text-zinc-350 font-inter truncate pr-1">
                  {p.displayName} {isCurrentUser && '(You)'}
                </span>
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                {p.role === 'host' && (
                  <span
                    className={`material-symbols-outlined text-[14px] ${
                      p.micMuted === false ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'
                    }`}
                    title={p.micMuted === false ? 'Host microphone is active' : 'Host microphone is muted'}
                  >
                    {p.micMuted === false ? 'mic' : 'mic_off'}
                  </span>
                )}
                <Badge variant={p.role} />
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
