import React from 'react';
import { Avatar } from './Avatar.FC';
import { Badge } from './Badge';
import { Mic, MicOff, Users, ChevronRight, X, Settings } from 'lucide-react';

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
  isHost?: boolean;
  onOpenHostPanel?: () => void;
}

const PANEL_EASE = 'ease-[cubic-bezier(0.16,1,0.3,1)]';
const PANEL_MOTION = `transition-all duration-300 ${PANEL_EASE}`;

export const ParticipantPanel: React.FC<ParticipantPanelProps> = ({
  roomCode,
  participants,
  currentUserId,
  isExpanded,
  onToggleExpand,
  isHost = false,
  onOpenHostPanel,
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
        className={`fixed md:static top-0 bottom-0 left-0 z-40 h-full md:h-auto md:my-3 md:ml-3 bg-[#09090b]/98 md:bg-[#0e0e11]/30 border-r md:border border-white/[0.06] md:border-white/[0.04] md:backdrop-blur-md md:rounded-xl flex flex-col shrink-0 overflow-hidden transition-transform md:transition-all duration-300 ${PANEL_EASE} md:transform-none shadow-2xl md:shadow-panel ${
          isExpanded
            ? `${panelWidth} translate-x-0 px-5 py-4 md:p-3 md:w-60`
            : `${panelWidth} -translate-x-full md:translate-x-0 md:w-12 p-3 md:p-2 md:items-center`
        } ${!isExpanded ? 'invisible md:visible' : ''}`}
      >
      {/* Header section */}
      <div
        className={`w-full flex flex-col shrink-0 overflow-hidden border-b border-white/[0.04] ${PANEL_MOTION} ${
          isExpanded
            ? 'mb-3 pb-3 gap-3 pt-[env(safe-area-inset-top)] md:pt-0'
            : 'mb-3 pb-2 gap-2 pt-[env(safe-area-inset-top)] md:pt-0 items-center'
        }`}
      >
        <div className={`flex items-center ${PANEL_MOTION} ${isExpanded ? 'justify-between' : 'justify-center'}`}>
          <div
            className={`min-w-0 flex flex-col overflow-hidden ${PANEL_MOTION} ${
              isExpanded ? 'opacity-100 max-w-[220px]' : 'opacity-0 max-w-0 pointer-events-none'
            }`}
          >
            <h2 className="text-xs font-bold font-geist text-white tracking-widest uppercase whitespace-nowrap">Participants</h2>
            <p className="text-[11px] text-zinc-550 font-inter mt-0.5 whitespace-nowrap">{participants.length} in room</p>
          </div>
          <button
            onClick={onToggleExpand}
            className={`p-1 rounded hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer shrink-0 ${isExpanded ? '' : 'md:-ml-0.5'}`}
            title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isExpanded ? <X size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
        <div
          className={`flex items-center justify-center overflow-hidden ${PANEL_MOTION} ${
            isExpanded ? 'opacity-0 max-h-0' : 'opacity-100 max-h-5'
          }`}
          title={`${participants.length} participants`}
        >
          <Users size={12} className="text-zinc-500" />
        </div>
        <div
          className={`flex items-center justify-between gap-3 rounded-lg border px-2.5 overflow-hidden ${PANEL_MOTION} ${
            isExpanded
              ? 'border-[#c0c1ff]/10 bg-[#c0c1ff]/5 py-1.5 opacity-100 max-h-12'
              : 'border-transparent py-0 opacity-0 max-h-0 px-0'
          }`}
        >
          <span className="text-[10px] font-geist text-zinc-400 uppercase tracking-widest shrink-0 whitespace-nowrap">Room Code</span>
          <span className="text-sm font-mono text-[#c0c1ff] tracking-wide font-bold truncate">{roomCode}</span>
        </div>
      </div>

      {/* Participant list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 w-full pb-[env(safe-area-inset-bottom)]">
        {participants.map((p, index) => {
          const isCurrentUser = p.socketId === currentUserId;
          const initialsColor = p.role === 'host' ? 'bg-indigo-600/90' : 'bg-zinc-700/80';
          const itemDelay = isExpanded ? `${index * 30}ms` : '0ms';

          return (
            <div
              key={p.socketId}
              className={`relative group rounded-lg border flex items-center min-w-0 ${PANEL_MOTION} ${
                isExpanded
                  ? `p-2 justify-between gap-2 ${
                      p.role === 'host'
                        ? 'bg-indigo-600/10 border-indigo-500/10'
                        : 'bg-white/[0.01] border-white/[0.03] hover:bg-white/[0.03] hover:border-white/[0.06]'
                    }`
                  : 'py-1 justify-center border-transparent'
              }`}
              title={isExpanded ? undefined : `${p.displayName} (${p.role})${isCurrentUser ? ' (You)' : ''}`}
            >
              <div className="flex items-center min-w-0">
                <Avatar
                  name={p.displayName}
                  size="xs"
                  color={initialsColor}
                  status="active"
                />
                <div
                  className={`min-w-0 flex flex-col overflow-hidden ${PANEL_MOTION} ${
                    isExpanded ? 'opacity-100 max-w-[150px] ml-2.5' : 'opacity-0 max-w-0 ml-0'
                  }`}
                  style={{ transitionDelay: itemDelay }}
                >
                  <span className="text-[13px] text-zinc-300 font-inter font-medium truncate whitespace-nowrap pr-1">
                    {p.displayName} {isCurrentUser && '(You)'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-geist capitalize leading-none mt-0.5 whitespace-nowrap">{p.role}</span>
                </div>
              </div>
              <div
                className={`shrink-0 flex items-center gap-1.5 overflow-hidden ${PANEL_MOTION} ${
                  isExpanded ? 'opacity-100 max-w-[80px]' : 'opacity-0 max-w-0 pointer-events-none'
                }`}
                style={{ transitionDelay: itemDelay }}
              >
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

      {/* Host Controls Button at bottom of Participants Panel (Desktop only) */}
      {isHost && onOpenHostPanel && (
        <div className={`hidden md:flex w-full shrink-0 border-t border-white/[0.04] pt-2.5 mt-auto items-center ${isExpanded ? 'justify-stretch' : 'justify-center'}`}>
          <button
            onClick={onOpenHostPanel}
            className={`flex items-center gap-2.5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer active:scale-95 ${
              isExpanded
                ? 'w-full px-2 py-1.5 justify-start'
                : 'w-full py-1.5 justify-center'
            }`}
            title="Host Controls"
          >
            <Settings size={18} className="shrink-0 text-zinc-400" />
            {isExpanded && (
              <span className="text-xs font-medium font-geist tracking-wide truncate">
                Host Controls
              </span>
            )}
          </button>
        </div>
      )}
    </aside>
  </>
  );
};
