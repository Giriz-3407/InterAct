import React from 'react';
import { Avatar } from './Avatar.FC';
import { Badge } from './Badge';
import { Mic, MicOff, Users, ChevronRight, X } from 'lucide-react';

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
  const panelWidth =
    'w-[min(100vw,20rem)] max-w-[calc(100vw-env(safe-area-inset-left)-env(safe-area-inset-right))] md:max-w-none';

  return (
    <>
      {isExpanded && (
        <div
          onClick={onToggleExpand}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[35] md:hidden"
        />
      )}
      <aside
        className={`fixed md:static top-0 bottom-0 left-0 z-40 h-full md:h-auto md:my-3 md:ml-3 bg-[#09090b]/98 md:bg-[#0e0e11]/30 border-r md:border border-white/[0.06] md:border-white/[0.04] md:backdrop-blur-md md:rounded-xl flex flex-col shrink-0 transition-transform md:transition-all duration-300 ease-out md:transform-none shadow-2xl md:shadow-panel ${
          isExpanded
            ? `${panelWidth} translate-x-0 px-5 py-4 md:p-3 md:w-60`
            : `${panelWidth} -translate-x-full md:translate-x-0 md:w-12 p-3 md:p-2 md:items-center`
        } ${!isExpanded ? 'invisible md:visible' : ''}`}
      >
      {/* Header section */}
      {isExpanded ? (
        <div className="mb-3 pb-3 border-b border-white/[0.04] w-full flex flex-col shrink-0 gap-3 pt-[env(safe-area-inset-top)] md:pt-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="text-xs font-bold font-geist text-white tracking-widest uppercase">Participants</h2>
              <p className="text-[11px] text-zinc-550 font-inter mt-0.5">{participants.length} in room</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onToggleExpand}
                className="p-1 rounded hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                title="Collapse sidebar"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-[#c0c1ff]/10 bg-[#c0c1ff]/5 px-2.5 py-1.5">
            <span className="text-[10px] font-geist text-zinc-400 uppercase tracking-widest shrink-0">Room Code</span>
            <span className="text-sm font-mono text-[#c0c1ff] tracking-wide font-bold truncate">{roomCode}</span>
          </div>
        </div>
      ) : (
        <div className="mb-3 pb-2 border-b border-white/[0.04] w-full flex flex-col items-center gap-2 shrink-0">
          <button
            onClick={onToggleExpand}
            className="p-1 rounded hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Expand sidebar"
          >
            <ChevronRight size={14} />
          </button>
          <div className="flex items-center justify-center" title={`${participants.length} participants`}>
            <Users size={12} className="text-zinc-500" />
          </div>
        </div>
      )}

      {/* Participant list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 w-full pb-[env(safe-area-inset-bottom)]">
        {participants.map((p) => {
          const isCurrentUser = p.socketId === currentUserId;
          const initialsColor = p.role === 'host' ? 'bg-indigo-600/90' : 'bg-zinc-700/80';

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
              className={`p-2 rounded-lg border flex items-center justify-between gap-2 transition-all min-w-0 ${
                p.role === 'host'
                  ? 'bg-indigo-650/10 border-indigo-500/10'
                  : 'bg-white/[0.01] border-white/[0.03] hover:bg-white/[0.03] hover:border-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar
                  name={p.displayName}
                  size="xs"
                  color={initialsColor}
                  status="active"
                />
                <div className="min-w-0 flex flex-col">
                  <span className="text-[13px] text-zinc-300 font-inter font-medium truncate pr-1">
                    {p.displayName} {isCurrentUser && '(You)'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-geist capitalize leading-none mt-0.5">{p.role}</span>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                <span title={p.micMuted === false ? 'Microphone is active' : 'Microphone is muted'}>
                  {p.micMuted === false ? (
                    <Mic size={13} className="text-emerald-400 animate-pulse-slow" />
                  ) : (
                    <MicOff size={13} className="text-zinc-600" />
                  )}
                </span>
                {p.role === 'host' && <Badge variant="host" />}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  </>
  );
};
