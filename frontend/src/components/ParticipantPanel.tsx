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
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const ParticipantPanel: React.FC<ParticipantPanelProps> = ({
  roomCode,
  participants,
  currentUserId,
  isExpanded,
  onToggleExpand,
  isPinned = false,
  onTogglePin,
}) => {
  const panelWidth =
    'w-[min(100vw,24rem)] max-w-[calc(100vw-env(safe-area-inset-left)-env(safe-area-inset-right))] md:max-w-none';

  return (
    <>
      {isExpanded && (
        <div
          onClick={onToggleExpand}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[35] md:hidden"
        />
      )}
      <aside
        className={`fixed md:static top-0 bottom-0 left-0 z-40 h-full bg-zinc-950/95 md:bg-zinc-950/40 border-r border-slate-border flex flex-col shrink-0 transition-transform md:transition-all duration-300 ease-out pl-[env(safe-area-inset-left)] md:ml-16 md:transform-none shadow-2xl md:shadow-none ${
          isExpanded
            ? `${panelWidth} translate-x-0 p-3 md:p-3 md:w-60`
            : `${panelWidth} -translate-x-full md:translate-x-0 md:w-12 p-3 md:p-2 md:items-center`
        } ${!isExpanded ? 'invisible md:visible' : ''}`}
      >
      {/* Header section */}
      {isExpanded ? (
        <div className="mb-3 pb-3 border-b border-zinc-800/70 w-full flex flex-col shrink-0 gap-3 pt-[env(safe-area-inset-top)] md:pt-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="text-xs font-bold font-geist text-white tracking-tight uppercase">Participants</h2>
              <p className="text-[10px] text-zinc-500 font-inter mt-0.5">{participants.length} in room</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-800">
                {participants.length}
              </span>
              {onTogglePin && (
                <button
                  type="button"
                  onClick={onTogglePin}
                  className={`p-1 rounded hover:bg-zinc-900 transition-colors cursor-pointer md:hidden ${
                    isPinned ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title={isPinned ? 'Unpin Sidebar' : 'Pin Sidebar'}
                >
                  <span className="material-symbols-outlined text-[16px] block">
                    push_pin
                  </span>
                </button>
              )}
              <button
                onClick={onToggleExpand}
                className="p-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                title="Collapse sidebar"
              >
                <span className="material-symbols-outlined text-[18px] block">close</span>
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-indigo-500/15 bg-indigo-500/5 px-3 py-2">
            <span className="text-[10px] font-geist text-zinc-500 uppercase tracking-wider shrink-0">Room Code</span>
            <span className="text-sm font-mono text-[#c0c1ff] tracking-wide font-bold truncate">{roomCode}</span>
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
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1.5 w-full pb-[env(safe-area-inset-bottom)]">
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
              className={`p-2 rounded-lg border flex items-center justify-between gap-2 transition-colors min-w-0 ${
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
                <div className="min-w-0 flex flex-col">
                  <span className="text-xs text-zinc-300 font-inter font-medium truncate pr-1">
                    {p.displayName} {isCurrentUser && '(You)'}
                  </span>
                  <span className="text-[9px] text-zinc-600 font-geist capitalize leading-none mt-0.5">{p.role}</span>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                <span
                  className={`material-symbols-outlined text-[14px] ${
                    p.micMuted === false ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'
                  }`}
                  title={p.micMuted === false ? 'Microphone is active' : 'Microphone is muted'}
                >
                  {p.micMuted === false ? 'mic' : 'mic_off'}
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
