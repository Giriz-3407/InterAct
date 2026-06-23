console.log("CURSOR_BUILD_MARKER_20260615 — SOURCE: C:\\Users\\Girish\\Desktop\\InterAct\\frontend");
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar.FC';
import { ParticipantPanel } from '../components/ParticipantPanel';
import { HostControlPanel } from '../components/HostControlPanel';
import { wsClient } from '../lib/websocket';
import { apiClient } from '../lib/axios';
import { useWebRTC } from '../hooks/useWebRTC';
import { useCursorPresence } from '../hooks/useCursorPresence';
import { isMobileDevice } from '../lib/mobile';
import { AgentStatusIndicator } from '../components/AgentStatusIndicator';
import { WebRTCAuditPanel } from '../components/WebRTCAuditPanel';
import { diagStage7_hostPlayback, diagPrintSummary } from '../hooks/useViewerMicDiag';
import { DiagnosticsPanel } from '../components/DiagnosticsPanel';
import { VoiceNegotiationToast } from '../components/VoiceNegotiationToast';
import interactLogo from '../assets/branding/interact-icon-dark-mode.svg';

interface Participant {
  socketId: string;
  displayName: string;
  role: 'host' | 'viewer';
  micMuted?: boolean;
}

interface MessageItem {
  sender: string;
  message: string;
  timestamp: string;
  type?: string;
}

/* ─────────────────────────────────────────────────
   SVG ICON PRIMITIVES (no Material Symbols needed)
───────────────────────────────────────────────── */
const IconMic = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);
const IconMicOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
    <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);
const IconScreen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);
const IconScreenStop = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3" />
    <path d="M8 21h8M12 17v4" /><line x1="22" y1="3" x2="11" y2="14" />
  </svg>
);
const IconChat = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconPeople = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconMore = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="5" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="12" cy="19" r="1" fill="currentColor" />
  </svg>
);
const IconLeave = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const IconVolumeUp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);
const IconVolumeOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);
const IconShare = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);
const IconAI = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L14.5 9H22L16 13.5L18.5 20.5L12 16L5.5 20.5L8 13.5L2 9H9.5L12 2Z" fill="currentColor" />
  </svg>
);
const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const IconMonitor = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);
const IconSettings = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

/* ─────────────────────────────────────────────────
   DOCK BUTTON
───────────────────────────────────────────────── */
interface DockBtnProps {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  label?: string;
  active?: boolean;
  danger?: boolean;
  badge?: number;
  className?: string;
}

const DockBtn: React.FC<DockBtnProps> = ({ onClick, title, icon, label, active, danger, badge, className = '' }) => (
  <button
    onClick={onClick}
    title={title}
    className={`room-dock-btn ${active ? 'active' : ''} ${danger ? 'danger' : ''} ${className}`}
  >
    <span className="relative flex items-center justify-center">
      {icon}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-2 -right-2.5 min-w-[16px] h-4 px-0.5 rounded-full bg-[#c0c1ff] text-[#09090b] text-[8px] font-bold font-geist flex items-center justify-center leading-none">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </span>
    {label && <span className="text-[10px] font-geist font-medium leading-none mt-0.5">{label}</span>}
  </button>
);

/* ─────────────────────────────────────────────────
   TOP BAR
───────────────────────────────────────────────── */
interface RoomTopBarProps {
  roomId: string;
  participantCount: number;
  isSharing: boolean;
  isViewing: boolean;
  displayName: string;
  onLeave: () => void;
  onShare: () => void;
}

const RoomTopBar: React.FC<RoomTopBarProps> = ({
  roomId, participantCount, isSharing, isViewing, onLeave, onShare,
}) => (
  <header className="h-14 pt-[env(safe-area-inset-top)] bg-[#09090b]/95 backdrop-blur-md border-b border-[#1e1e21] flex items-center justify-between px-3 sm:px-5 z-20 shrink-0 select-none">
    {/* Left */}
    <div className="flex items-center gap-3 min-w-0">
      <img src={interactLogo} alt="InterAct" className="h-6 w-auto flex-shrink-0" />
      <div className="w-px h-4 bg-[#1e1e21] flex-shrink-0" />
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-sm font-bold text-[#c0c1ff] truncate max-w-[6rem] sm:max-w-[10rem]">
          {roomId}
        </span>
        {/* Status pill */}
        {(isSharing || isViewing) ? (
          <div className="hidden sm:flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold font-geist text-red-400">LIVE</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-400/8 border border-emerald-400/15 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-geist text-emerald-400">Connected</span>
          </div>
        )}
      </div>
    </div>

    {/* Center — participant count */}
    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#111113] border border-[#1e1e21]">
      <IconPeople />
      <span className="text-xs font-geist text-zinc-300 font-semibold">{participantCount}</span>
    </div>

    {/* Right */}
    <div className="flex items-center gap-2">
      <button
        onClick={onShare}
        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e1e21] bg-[#111113] text-zinc-400 hover:text-zinc-100 hover:border-[#27272a] transition-all text-xs font-geist cursor-pointer"
        title="Copy room link"
      >
        <IconShare />
        <span>Share</span>
      </button>
      <button
        onClick={onLeave}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold font-geist cursor-pointer transition-colors"
        title="Leave room"
      >
        <IconLeave />
        <span className="hidden sm:inline">Leave</span>
      </button>
    </div>
  </header>
);

/* ─────────────────────────────────────────────────
   COPY CONFIRMATION TOAST
───────────────────────────────────────────────── */
const CopyToast: React.FC<{ visible: boolean }> = ({ visible }) => (
  <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-[#1e1e21] border border-[#27272a] text-sm font-geist text-zinc-200 shadow-xl transition-all duration-300 ${
    visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
  }`}>
    <span className="text-emerald-400"><IconCheck /></span>
    Room link copied
  </div>
);

/* ─────────────────────────────────────────────────
   MORE MENU
───────────────────────────────────────────────── */
interface MoreMenuProps {
  isHost: boolean;
  autoDelete: boolean;
  onOpenHostPanel: () => void;
  onShareRoom: () => void;
  onToggleAutoDelete: () => void;
  onLeave: () => void;
  onClose: () => void;
}

const MoreMenu: React.FC<MoreMenuProps> = ({
  isHost, autoDelete, onOpenHostPanel, onShareRoom, onToggleAutoDelete, onLeave, onClose,
}) => (
  <>
    <div className="fixed inset-0 z-40" onClick={onClose} />
    <div className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 z-50 w-56 bg-[#111113] border border-[#1e1e21] rounded-xl shadow-2xl overflow-hidden">
      <div className="py-1.5">
        {isHost && (
          <button
            onClick={() => { onOpenHostPanel(); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 hover:bg-[#1a1a1d] hover:text-white transition-colors cursor-pointer text-left"
          >
            <span className="text-zinc-500"><IconSettings /></span>
            Host Controls
          </button>
        )}
        <button
          onClick={() => { onShareRoom(); onClose(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 hover:bg-[#1a1a1d] hover:text-white transition-colors cursor-pointer text-left"
        >
          <span className="text-zinc-500"><IconShare /></span>
          Copy Room Link
        </button>
        {isHost && (
          <button
            onClick={() => { onToggleAutoDelete(); onClose(); }}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm text-zinc-300 hover:bg-[#1a1a1d] hover:text-white transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-zinc-500">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </span>
              Auto-delete room
            </div>
            <div className={`w-8 h-4 rounded-full transition-colors ${autoDelete ? 'bg-[#c0c1ff]' : 'bg-[#27272a]'}`}>
              <div className={`w-3 h-3 rounded-full bg-white shadow-sm mt-0.5 transition-transform ${autoDelete ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
          </button>
        )}
        <div className="h-px bg-[#1e1e21] mx-2 my-1" />
        <button
          onClick={onLeave}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
        >
          <IconLeave />
          Leave Room
        </button>
      </div>
    </div>
  </>
);

/* ─────────────────────────────────────────────────
   COLLABORATION DOCK
───────────────────────────────────────────────── */
interface CollabDockProps {
  isMuted: boolean;
  isHost: boolean;
  isSharing: boolean;
  isViewing: boolean;
  hostAudioEnabled: boolean;
  viewerMuted: boolean;
  viewerVolume: number;
  messageCount: number;
  isPeopleOpen: boolean;
  isChatOpen: boolean;
  showMoreMenu: boolean;
  autoDelete: boolean;
  onToggleMic: () => void;
  onToggleShare: () => void;
  onToggleHostAudio: () => void;
  onToggleViewerMute: () => void;
  onVolumeChange: (v: number) => void;
  onToggleChat: () => void;
  onTogglePeople: () => void;
  onToggleMoreMenu: () => void;
  onLeave: () => void;
  onOpenHostPanel: () => void;
  onShareRoom: () => void;
  onToggleAutoDelete: () => void;
}

const CollabDock: React.FC<CollabDockProps> = ({
  isMuted, isHost, isSharing, isViewing, hostAudioEnabled, viewerMuted, viewerVolume,
  messageCount, isPeopleOpen, isChatOpen, showMoreMenu, autoDelete,
  onToggleMic, onToggleShare, onToggleHostAudio, onToggleViewerMute, onVolumeChange,
  onToggleChat, onTogglePeople, onToggleMoreMenu, onLeave,
  onOpenHostPanel, onShareRoom, onToggleAutoDelete,
}) => (
  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-end justify-center">
    <div className="relative">
      {/* More menu */}
      {showMoreMenu && (
        <MoreMenu
          isHost={isHost}
          autoDelete={autoDelete}
          onOpenHostPanel={onOpenHostPanel}
          onShareRoom={onShareRoom}
          onToggleAutoDelete={onToggleAutoDelete}
          onLeave={onLeave}
          onClose={onToggleMoreMenu}
        />
      )}

      {/* Dock pill */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-[#09090b]/90 backdrop-blur-xl border border-[#1e1e21] shadow-2xl">
        {/* Mic */}
        <DockBtn
          onClick={onToggleMic}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          icon={isMuted ? <IconMicOff /> : <IconMic />}
          label={isMuted ? 'Muted' : 'Mic'}
          danger={isMuted}
        />

        {/* Host shared audio toggle (only when sharing) */}
        {isHost && isSharing && (
          <DockBtn
            onClick={onToggleHostAudio}
            title={hostAudioEnabled ? 'Mute shared audio' : 'Share audio'}
            icon={hostAudioEnabled ? <IconVolumeUp /> : <IconVolumeOff />}
            label="Audio"
            danger={!hostAudioEnabled}
          />
        )}

        {/* Viewer audio controls */}
        {isViewing && (
          <>
            <DockBtn
              onClick={onToggleViewerMute}
              title={viewerMuted ? 'Unmute session audio' : 'Mute session audio'}
              icon={viewerMuted ? <IconVolumeOff /> : <IconVolumeUp />}
              label="Audio"
              danger={viewerMuted}
            />
            <div className="hidden min-[390px]:flex items-center gap-1.5 px-1">
              <input
                type="range" min="0" max="1" step="0.05" value={viewerVolume}
                onChange={(e) => {
                  const vol = parseFloat(e.target.value);
                  onVolumeChange(vol);
                  if (vol > 0 && viewerMuted) onToggleViewerMute();
                }}
                className="w-14 h-1 accent-[#c0c1ff] cursor-pointer"
                style={{ WebkitAppearance: 'none', outline: 'none' }}
              />
            </div>
          </>
        )}

        {/* Screen share (host only) */}
        {isHost && (
          <DockBtn
            onClick={onToggleShare}
            title={isSharing ? 'Stop sharing' : 'Share screen'}
            icon={isSharing ? <IconScreenStop /> : <IconScreen />}
            label={isSharing ? 'Stop' : 'Share'}
            danger={isSharing}
          />
        )}

        <div className="w-px h-6 bg-[#1e1e21] mx-0.5" />

        {/* Chat */}
        <DockBtn
          onClick={onToggleChat}
          title="Chat"
          icon={<IconChat />}
          label="Chat"
          badge={messageCount}
          active={isChatOpen}
        />

        {/* People */}
        <DockBtn
          onClick={onTogglePeople}
          title="Participants"
          icon={<IconPeople />}
          label="People"
          active={isPeopleOpen}
        />

        {/* More */}
        <DockBtn
          onClick={onToggleMoreMenu}
          title="More options"
          icon={<IconMore />}
          label="More"
          active={showMoreMenu}
        />

        <div className="w-px h-6 bg-[#1e1e21] mx-0.5" />

        {/* Leave */}
        <DockBtn
          onClick={onLeave}
          title="Leave room"
          icon={<IconLeave />}
          label="Leave"
          danger
        />
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────
   RIGHT DRAWER (Chat / AI / Host)
───────────────────────────────────────────────── */
interface RightDrawerProps {
  isOpen: boolean;
  activeTab: 'chat' | 'ai' | 'host';
  isHost: boolean;
  messages: MessageItem[];
  chatInput: string;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  displayName: string;
  autoDelete: boolean;
  participants: Participant[];
  roomLink: string;
  onTabChange: (tab: 'chat' | 'ai' | 'host') => void;
  onClose: () => void;
  onChatInputChange: (v: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onToggleAutoDelete: (val: boolean) => void;
  onTransferHost: (id: string) => void;
  onRemoveParticipant: (id: string) => void;
}

const RightDrawer: React.FC<RightDrawerProps> = ({
  isOpen, activeTab, isHost, messages, chatInput, chatEndRef, displayName,
  autoDelete, participants, roomLink,
  onTabChange, onClose, onChatInputChange, onSendMessage,
  onToggleAutoDelete, onTransferHost, onRemoveParticipant,
}) => {
  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return isoString; }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-35 md:hidden" onClick={onClose} />
      )}

      <aside className={`fixed top-0 right-0 bottom-0 z-40 flex flex-col bg-[#09090b]/98 backdrop-blur-xl border-l border-[#1e1e21] shadow-2xl transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } w-[min(100vw,380px)]`}>
        {/* Tab header */}
        <div className="h-14 pt-[env(safe-area-inset-top)] border-b border-[#1e1e21] flex items-center justify-between px-3 shrink-0">
          <div className="flex items-center gap-1">
            {(['chat', 'ai', ...(isHost ? ['host'] : [])] as ('chat' | 'ai' | 'host')[]).map(tab => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`h-8 px-3 text-xs font-semibold font-geist rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab
                    ? 'bg-[#1a1a1d] text-[#c0c1ff]'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#1a1a1d]/50'
                }`}
              >
                {tab === 'chat' && <IconChat />}
                {tab === 'ai' && <IconAI />}
                {tab === 'host' && <IconSettings />}
                <span className="capitalize">{tab === 'ai' ? 'Insights' : tab}</span>
                {tab === 'chat' && messages.length > 0 && (
                  <span className="text-[9px] font-mono bg-[#1e1e21] text-zinc-500 px-1 rounded">{messages.length}</span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-[#1a1a1d] transition-colors cursor-pointer"
          >
            <IconClose />
          </button>
        </div>

        {/* Chat panel */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar min-h-0">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#1a1a1d] border border-[#27272a] flex items-center justify-center text-zinc-600">
                    <IconChat />
                  </div>
                  <div>
                    <p className="text-sm font-bold font-geist text-zinc-400 mb-1">No messages yet</p>
                    <p className="text-xs text-zinc-600 font-inter leading-relaxed">
                      Start the conversation. Everyone in this room can see your messages.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((m, idx) => {
                  if (m.type === 'system_rename') {
                    return (
                      <div key={idx} className="flex justify-center">
                        <span className="text-[11px] text-zinc-600 italic font-inter px-3 py-1 rounded-full bg-[#1a1a1d] border border-[#1e1e21]">
                          {m.message}
                        </span>
                      </div>
                    );
                  }
                  const isMe = m.sender === displayName;
                  return (
                    <div key={idx} className="flex gap-2.5 items-start min-w-0">
                      <Avatar name={m.sender} size="xs" color={isMe ? 'bg-indigo-600' : 'bg-zinc-700'} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <span className="text-[11px] font-semibold font-geist text-zinc-300 truncate">{m.sender}</span>
                          <span className="text-[9px] font-mono text-zinc-600 shrink-0">{formatTime(m.timestamp)}</span>
                        </div>
                        <p className="text-sm text-zinc-400 font-inter bg-[#111113] border border-[#1e1e21] px-3 py-2 rounded-xl rounded-tl-none break-words leading-relaxed">
                          {m.message}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>
            <form
              onSubmit={onSendMessage}
              className="p-3 pb-[calc(12px+env(safe-area-inset-bottom))] border-t border-[#1e1e21] flex gap-2 shrink-0 bg-[#09090b]/95"
            >
              <input
                type="text"
                value={chatInput}
                onChange={e => onChatInputChange(e.target.value)}
                placeholder="Message everyone..."
                className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-[#111113] border border-[#1e1e21] text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#c0c1ff]/40 transition-colors font-inter"
              />
              <button
                type="submit"
                className="w-10 h-10 rounded-xl bg-[#c0c1ff] hover:bg-[#d0d1ff] text-[#09090b] flex items-center justify-center cursor-pointer transition-colors flex-shrink-0"
              >
                <IconSend />
              </button>
            </form>
          </div>
        )}

        {/* AI Insights panel */}
        {activeTab === 'ai' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar pb-[calc(16px+env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2">
              <span className="text-[#c0c1ff]"><IconAI /></span>
              <span className="text-xs font-bold font-geist text-zinc-400 uppercase tracking-widest">AI Insights</span>
            </div>
            <div className="bg-[#111113] border border-[#1e1e21] rounded-xl p-4">
              <p className="text-[10px] font-semibold font-geist text-zinc-500 uppercase tracking-wider mb-3">Action Item</p>
              <p className="text-sm text-zinc-300 leading-relaxed italic font-inter">
                "Ensure middleware validation handles nested structs."
              </p>
              <div className="mt-3 pt-3 border-t border-[#1a1a1d] flex items-center gap-1.5">
                <span className="text-emerald-400"><IconCheck /></span>
                <span className="text-[10px] text-zinc-600 font-geist">Assigned to Alex</span>
              </div>
            </div>
            <div className="bg-[#111113] border border-[#1e1e21] rounded-xl p-4">
              <p className="text-[10px] font-semibold font-geist text-zinc-500 uppercase tracking-wider mb-2">Session Status</p>
              <p className="text-sm text-zinc-500 font-inter leading-relaxed">
                AI is listening. Summaries and action items will appear here as the session progresses.
              </p>
            </div>
          </div>
        )}

        {/* Host Controls panel */}
        {activeTab === 'host' && isHost && (
          <div className="flex-1 overflow-hidden">
            <HostControlPanel
              roomLink={roomLink}
              participants={participants.map(p => ({
                id: p.socketId,
                name: p.displayName,
                role: p.role,
                status: 'active' as const,
                avatarColor: p.role === 'host' ? 'bg-indigo-600' : 'bg-zinc-700',
              }))}
              autoDelete={autoDelete}
              onToggleAutoDelete={onToggleAutoDelete}
              onTransferHost={onTransferHost}
              onRemoveParticipant={onRemoveParticipant}
            />
          </div>
        )}
      </aside>
    </>
  );
};

/* ─────────────────────────────────────────────────
   EMPTY / SHARING STATE
───────────────────────────────────────────────── */
interface CenterStateProps {
  isHost: boolean;
  isRequesting: boolean;
  isSharing: boolean;
  onStartShare: () => void;
  onStopShare: () => void;
}

const CenterState: React.FC<CenterStateProps> = ({ isHost, isRequesting, isSharing, onStartShare, onStopShare }) => {
  if (isRequesting) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="w-12 h-12 rounded-full border-2 border-[#c0c1ff]/30 border-t-[#c0c1ff] animate-spin" />
        <div>
          <h3 className="text-base font-bold font-geist text-zinc-200 mb-1">Opening screen picker…</h3>
          <p className="text-sm text-zinc-500 font-inter">Select a window, tab, or entire screen to share.</p>
        </div>
      </div>
    );
  }

  if (isSharing) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <div className="flex items-center gap-1">
            {[0, 100, 200].map(d => (
              <div key={d} className="w-1 bg-red-400 rounded-full" style={{
                height: '20px', animation: `waveform 0.8s ease-in-out ${d}ms infinite`,
                transformOrigin: 'bottom',
              }} />
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold font-geist text-red-400 uppercase tracking-wider">Broadcasting</span>
          </div>
          <h3 className="text-base font-bold font-geist text-zinc-200 mb-1">You are sharing your screen</h3>
          <p className="text-sm text-zinc-500 font-inter leading-relaxed max-w-xs">
            Participants in this room can see your screen in real time.
          </p>
        </div>
        <button
          onClick={onStopShare}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold font-geist cursor-pointer transition-colors shadow-lg shadow-red-600/20"
        >
          <IconScreenStop />
          Stop Sharing
        </button>
      </div>
    );
  }

  // Idle
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 text-center max-w-sm">
      <div className="w-20 h-20 rounded-2xl bg-[#111113] border border-[#1e1e21] flex items-center justify-center text-zinc-600">
        <IconMonitor />
      </div>
      <div>
        <h3 className="text-lg font-black font-geist text-zinc-200 tracking-tight mb-2">
          {isHost ? 'Ready to share your screen' : 'Waiting for host'}
        </h3>
        <p className="text-sm text-zinc-500 font-inter leading-relaxed">
          {isHost
            ? 'Share your screen to start broadcasting to all participants in this room.'
            : 'The host will begin sharing their screen shortly. You will see it appear here.'}
        </p>
      </div>
      {isHost && (
        <button
          onClick={onStartShare}
          className="lp-btn-primary text-sm h-11 px-6"
        >
          <IconScreen />
          Start Sharing
        </button>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────
   MAIN ROOM PAGE
───────────────────────────────────────────────── */
export const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const nameParam = searchParams.get('name') || '';
  const [displayName, setDisplayName] = useState(nameParam);
  const [nameInput, setNameInput] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(!nameParam);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentSocketId, setCurrentSocketId] = useState<string>('');

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [isMuted, setIsMuted] = useState(true);
  const [autoDelete, setAutoDelete] = useState(true);

  // Panel states — all drawers are overlays, not layout-shifting
  const [isPeopleOpen, setIsPeopleOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'chat' | 'ai' | 'host'>('chat');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  const currentUserObj = participants.find(p => p.socketId === currentSocketId);
  const isHost = currentUserObj ? currentUserObj.role === 'host' : false;

  // Fallback tab
  useEffect(() => {
    if (!isHost && activeRightTab === 'host') setActiveRightTab('chat');
  }, [isHost, activeRightTab]);

  const viewerIds = participants.filter(p => p.role !== 'host').map(p => p.socketId);
  const hostSocketId = participants.find(p => p.role === 'host')?.socketId || '';

  // WebRTC
  const {
    sharingState, localStream, remoteStream, remoteMicStreams,
    captureDisplaySurface, startSharing, stopSharing,
    errorMessage, audioWarning, micWarning,
    auditReports, getPeerConnectionStates,
    voiceNegotiation, beginVoiceNegotiation,
  } = useWebRTC({ isHost, currentSocketId, viewerIds, micMuted: isMuted, hostSocketId });

  const isSharing = sharingState === 'sharing';
  const isViewing = sharingState === 'viewing';
  const isRequesting = sharingState === 'requesting';
  const showLaserPointerNotice = isHost && isSharing && captureDisplaySurface !== 'monitor';

  // Audio states
  const [hostAudioEnabled, setHostAudioEnabled] = useState(true);
  const [viewerMuted, setViewerMuted] = useState(false);
  const [viewerVolume, setViewerVolume] = useState(0.8);

  // Sync host audio track
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => { t.enabled = hostAudioEnabled; });
    }
  }, [localStream, hostAudioEnabled]);

  // Close panels on mobile when sharing/viewing starts
  useEffect(() => {
    if (window.innerWidth < 768 && (isSharing || isViewing)) {
      setIsPeopleOpen(false);
      setIsChatOpen(false);
    }
  }, [isSharing, isViewing]);

  const toggleHostAudio = useCallback(() => setHostAudioEnabled(p => !p), []);

  // Cursor presence
  const isScreenVisible = (isViewing && !!remoteStream) || (isHost && isSharing);
  const { viewportRef, laserModeActive, spotlightActive } = useCursorPresence({
    isScreenVisible, localStream, remoteStream, captureDisplaySurface,
    participants, isHost, localParticipantId: currentSocketId,
  });

  // Refs
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteMicAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const attachRemoteMicStream = useCallback((el: HTMLAudioElement, stream: MediaStream) => {
    if (el.srcObject !== stream) el.srcObject = stream;
    el.muted = false;
    el.volume = 1.0;
    void el.play().catch(err => console.warn('[RoomPage] Remote mic play failed:', err));
  }, []);

  // Attach remote stream
  useEffect(() => {
    if (remoteStream) {
      console.log('[RoomPage] Attaching remote stream. Tracks:', remoteStream.getTracks().map(t => t.kind));
      if (remoteVideoRef.current) { remoteVideoRef.current.srcObject = remoteStream; remoteVideoRef.current.muted = true; }
      if (remoteAudioRef.current) { remoteAudioRef.current.srcObject = remoteStream; remoteAudioRef.current.muted = viewerMuted; remoteAudioRef.current.volume = viewerVolume; }
      const handleTrackAdded = () => {
        console.log('[RoomPage] Track added. Tracks:', remoteStream.getTracks().map(t => t.kind));
        if (remoteVideoRef.current) { remoteVideoRef.current.srcObject = remoteStream; remoteVideoRef.current.muted = true; }
        if (remoteAudioRef.current) { remoteAudioRef.current.srcObject = remoteStream; remoteAudioRef.current.muted = viewerMuted; remoteAudioRef.current.volume = viewerVolume; }
      };
      remoteStream.addEventListener('addtrack', handleTrackAdded);
      remoteStream.addEventListener('removetrack', handleTrackAdded);
      return () => {
        remoteStream.removeEventListener('addtrack', handleTrackAdded);
        remoteStream.removeEventListener('removetrack', handleTrackAdded);
      };
    } else {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    }
  }, [remoteStream, viewerMuted, viewerVolume]);

  // Attach remote mic streams
  useEffect(() => {
    remoteMicStreams.forEach((stream, streamId) => {
      const el = remoteMicAudioRefs.current.get(streamId);
      if (el) attachRemoteMicStream(el, stream);
      if (isHost) {
        setTimeout(() => {
          const audioEl = remoteMicAudioRefs.current.get(streamId) ?? null;
          diagStage7_hostPlayback(streamId, audioEl);
          diagPrintSummary();
        }, 500);
      }
    });
    remoteMicAudioRefs.current.forEach((_, streamId) => {
      if (!remoteMicStreams.has(streamId)) remoteMicAudioRefs.current.delete(streamId);
    });
  }, [remoteMicStreams, isHost, attachRemoteMicStream]);

  // Message history
  useEffect(() => {
    if (!roomId || !displayName) return;
    const fetchHistory = async () => {
      try {
        const history = await apiClient.get<MessageItem[]>(`/api/rooms/${roomId}/messages`);
        setMessages(history);
      } catch (err) { console.error('Failed to load message history:', err); }
    };
    fetchHistory();
  }, [roomId, displayName]);

  // WebSocket lifecycle
  useEffect(() => {
    if (!roomId || !displayName) return;
    const getWsUrl = (): string => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      let wsUrl = apiUrl.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
      if (!wsUrl.endsWith('/ws')) wsUrl = `${wsUrl.replace(/\/$/, '')}/ws`;
      return wsUrl;
    };
    const clientId = localStorage.getItem('client_id') ?? crypto.randomUUID();
    localStorage.setItem('client_id', clientId);
    wsClient.connect(getWsUrl(), () => {
      wsClient.send('join_room', { roomCode: roomId, displayName, clientId });
    });
    const unsubJoined = wsClient.on('room_joined', data => {
      console.log('Joined room:', data);
      setCurrentSocketId(data.socketId);
      setParticipants(data.participants);
      if (data.autoDelete !== undefined) setAutoDelete(data.autoDelete);
      try {
        const joined = JSON.parse(localStorage.getItem('joinedRooms') || '[]');
        if (!joined.includes(data.roomCode)) { joined.push(data.roomCode); localStorage.setItem('joinedRooms', JSON.stringify(joined)); }
      } catch (err) { console.error('Failed to save room to history:', err); }
    });
    const unsubParticipantJoined = wsClient.on('participant_joined', data => {
      console.log('Participant joined:', data.participant);
      setParticipants(prev => { if (prev.some(p => p.socketId === data.participant.socketId)) return prev; return [...prev, data.participant]; });
    });
    const unsubParticipantLeft = wsClient.on('participant_left', data => {
      console.log('Participant left:', data.participantId);
      setParticipants(prev => prev.filter(p => p.socketId !== data.participantId));
    });
    const unsubUpdated = wsClient.on('participants_updated', data => {
      console.log('Participants updated:', data.participants);
      setParticipants(data.participants);
    });
    const unsubChatMessage = wsClient.on('chat_message', data => {
      console.log('Received chat message:', data);
      setMessages(prev => [...prev, { sender: data.sender, message: data.message, timestamp: data.timestamp, type: data.type }]);
    });
    const unsubSettingsUpdated = wsClient.on('room_settings_updated', data => {
      console.log('Room settings updated:', data);
      if (data.autoDelete !== undefined) setAutoDelete(data.autoDelete);
    });
    const unsubMicStatus = wsClient.on('mic_status_update', data => {
      console.log('Mic status updated:', data);
      const { participantId, micMuted } = data;
      setParticipants(prev => prev.map(p => p.socketId === participantId ? { ...p, micMuted } : p));
    });
    const unsubKicked = wsClient.on('kicked', data => {
      console.log('Kicked from room:', data);
      alert(data.reason || 'You have been removed from the room.');
      navigate('/dashboard');
    });
    return () => {
      wsClient.send('leave_room', {});
      wsClient.disconnect();
      unsubJoined(); unsubParticipantJoined(); unsubParticipantLeft();
      unsubUpdated(); unsubChatMessage(); unsubSettingsUpdated();
      unsubMicStatus(); unsubKicked();
    };
  }, [roomId, displayName]);

  // Auto scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Handlers
  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setDisplayName(nameInput.trim());
    setShowNamePrompt(false);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    wsClient.send('chat_message', { message: trimmed });
    setChatInput('');
  };

  const handleShareToggle = useCallback(async () => {
    if (isSharing) { stopSharing(); }
    else { setIsMuted(false); await startSharing(); }
  }, [isSharing, startSharing, stopSharing]);

  const handleShareRoom = useCallback(() => {
    const link = `${window.location.origin}${window.location.pathname}`;
    navigator.clipboard.writeText(link).catch(() => {});
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2500);
  }, []);

  const handleToggleMic = useCallback(() => {
    if (isMuted) beginVoiceNegotiation();
    setIsMuted(p => !p);
  }, [isMuted, beginVoiceNegotiation]);

  const handleTogglePeople = useCallback(() => {
    setIsPeopleOpen(p => !p);
    if (window.innerWidth < 768) setIsChatOpen(false);
  }, []);

  const handleToggleChat = useCallback(() => {
    setIsChatOpen(p => {
      if (!p) setActiveRightTab('chat');
      return !p;
    });
    if (window.innerWidth < 768) setIsPeopleOpen(false);
  }, []);

  const handleOpenRightDrawer = useCallback((tab: 'chat' | 'ai' | 'host') => {
    setActiveRightTab(tab);
    setIsChatOpen(true);
    if (window.innerWidth < 768) setIsPeopleOpen(false);
  }, []);

  // ── NAME PROMPT ──
  if (showNamePrompt) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#111113] border border-[#1e1e21] rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <img src={interactLogo} alt="InterAct" className="h-5 w-auto" />
            </div>
            <h2 className="text-lg font-black font-geist text-white tracking-tight mt-3 mb-1">
              Join Room <span className="text-[#c0c1ff] font-mono">{roomId}</span>
            </h2>
            <p className="text-sm text-zinc-500 font-inter">Choose a display name to enter this collaboration session.</p>
          </div>
          <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold font-geist text-zinc-500 uppercase tracking-wider">Display Name</label>
              <input
                type="text"
                placeholder="e.g. Girish"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                className="px-3 py-2.5 bg-[#0d0d10] border border-[#1e1e21] rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#c0c1ff]/40 transition-colors font-inter"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="lp-btn-primary w-full h-11 text-sm"
            >
              Join Collaboration Session
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── MAIN ROOM LAYOUT ──
  return (
    <div className="min-h-[100dvh] bg-[#09090b] text-zinc-100 font-inter flex flex-col h-[100dvh] overflow-hidden">

      {/* Top Bar */}
      <RoomTopBar
        roomId={roomId || ''}
        participantCount={participants.length}
        isSharing={isSharing}
        isViewing={isViewing}
        displayName={displayName}
        onLeave={() => navigate('/dashboard')}
        onShare={handleShareRoom}
      />

      {/* Warning banners (styled as compact toasts) */}
      {(errorMessage || audioWarning || micWarning) && (
        <div className="flex flex-col gap-1.5 px-4 pt-2 shrink-0 z-20">
          {errorMessage && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-inter">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              {errorMessage}
            </div>
          )}
          {audioWarning && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-inter">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              {audioWarning}
            </div>
          )}
          {micWarning && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-inter">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              {micWarning}
            </div>
          )}
        </div>
      )}

      {/* Workspace frame */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Participants Drawer (LEFT overlay) */}
        <>
          {isPeopleOpen && (
            <div className="fixed inset-0 bg-black/50 z-35" onClick={() => setIsPeopleOpen(false)} />
          )}
          <ParticipantPanel
            roomCode={roomId || ''}
            participants={participants.map(p => p.socketId === currentSocketId ? { ...p, micMuted: isMuted } : p)}
            currentUserId={currentSocketId}
            isExpanded={isPeopleOpen}
            onToggleExpand={handleTogglePeople}
          />
        </>

        {/* CENTER STAGE — always full width (drawers overlay, never push) */}
        <main
          ref={viewportRef}
          className="flex-1 relative flex flex-col overflow-hidden bg-[#0a0a0c] min-w-0"
        >
          {/* Active indicator pills */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex gap-2 pointer-events-none">
            {laserModeActive && (
              <div className="bg-[#09090b]/90 border border-[#1e1e21] text-zinc-100 px-3 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-2 backdrop-blur">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Laser Active
              </div>
            )}
            {spotlightActive && (
              <div className="bg-[#09090b]/90 border border-[#1e1e21] text-zinc-100 px-3 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-2 backdrop-blur">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Spotlight Active
              </div>
            )}
            {showLaserPointerNotice && (
              <div className="bg-[#09090b]/90 border border-[#1e1e21] text-zinc-400 px-3 py-1.5 rounded-full text-[11px] font-inter flex items-center gap-2 backdrop-blur">
                Laser pointer available only when sharing an entire screen
              </div>
            )}
          </div>

          {/* Video content */}
          {isViewing && remoteStream && (
            <video
              ref={remoteVideoRef}
              autoPlay playsInline muted
              className="w-full h-full object-contain"
            />
          )}

          {/* Empty / sharing state */}
          {!isViewing && (
            <div className="flex-1 flex items-center justify-center">
              <CenterState
                isHost={isHost}
                isRequesting={isRequesting}
                isSharing={isSharing}
                onStartShare={handleShareToggle}
                onStopShare={handleShareToggle}
              />
            </div>
          )}

          {/* Presenter pill */}
          {isSharing && (
            <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#09090b]/90 border border-[#1e1e21] backdrop-blur z-20">
              <Avatar name={displayName} size="xs" color="bg-indigo-600" />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-semibold font-inter text-zinc-200 truncate">{displayName} is sharing</span>
                <span className="text-[9px] font-mono text-zinc-500">LIVE · Screen</span>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse ml-1" />
            </div>
          )}

          {/* Viewer status pill */}
          {isViewing && (
            <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#09090b]/90 border border-[#1e1e21] backdrop-blur z-20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c0c1ff] animate-pulse" />
              <span className="text-[10px] font-semibold font-inter text-zinc-200">Receiving live stream</span>
            </div>
          )}

          {/* AgentStatusIndicator — host desktop only, hidden from users */}
          {isHost && !isMobileDevice && (
            <div className="absolute top-3 right-3 z-20">
              <AgentStatusIndicator />
            </div>
          )}

          {/* Collaboration Dock */}
          <CollabDock
            isMuted={isMuted}
            isHost={isHost}
            isSharing={isSharing}
            isViewing={isViewing}
            hostAudioEnabled={hostAudioEnabled}
            viewerMuted={viewerMuted}
            viewerVolume={viewerVolume}
            messageCount={messages.length}
            isPeopleOpen={isPeopleOpen}
            isChatOpen={isChatOpen}
            showMoreMenu={showMoreMenu}
            autoDelete={autoDelete}
            onToggleMic={handleToggleMic}
            onToggleShare={handleShareToggle}
            onToggleHostAudio={toggleHostAudio}
            onToggleViewerMute={() => setViewerMuted(p => !p)}
            onVolumeChange={v => setViewerVolume(v)}
            onToggleChat={handleToggleChat}
            onTogglePeople={handleTogglePeople}
            onToggleMoreMenu={() => setShowMoreMenu(p => !p)}
            onLeave={() => navigate('/dashboard')}
            onOpenHostPanel={() => handleOpenRightDrawer('host')}
            onShareRoom={handleShareRoom}
            onToggleAutoDelete={() => wsClient.send('toggle_auto_delete', { autoDelete: !autoDelete })}
          />
        </main>

        {/* RIGHT DRAWER (Chat / AI / Host) */}
        <RightDrawer
          isOpen={isChatOpen}
          activeTab={activeRightTab}
          isHost={isHost}
          messages={messages}
          chatInput={chatInput}
          chatEndRef={chatEndRef}
          displayName={displayName}
          autoDelete={autoDelete}
          participants={participants}
          roomLink={`${window.location.origin}${window.location.pathname}`}
          onTabChange={setActiveRightTab}
          onClose={() => setIsChatOpen(false)}
          onChatInputChange={setChatInput}
          onSendMessage={handleSendMessage}
          onToggleAutoDelete={val => wsClient.send('toggle_auto_delete', { autoDelete: val })}
          onTransferHost={targetId => wsClient.send('transfer_host', { targetId })}
          onRemoveParticipant={targetId => wsClient.send('remove_participant', { targetId })}
        />
      </div>

      {/* Copy toast */}
      <CopyToast visible={showCopied} />

      {/* Hidden audio elements */}
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
      {Array.from(remoteMicStreams.entries()).map(([streamId, stream]) => (
        <audio
          key={streamId}
          ref={el => {
            if (el) { remoteMicAudioRefs.current.set(streamId, el); attachRemoteMicStream(el, stream); }
            else { remoteMicAudioRefs.current.delete(streamId); }
          }}
          autoPlay
          style={{ display: 'none' }}
        />
      ))}

      {/* Developer tools (unchanged) */}
      <WebRTCAuditPanel
        auditReports={auditReports}
        participants={participants}
        sharingActive={sharingState === 'sharing' || sharingState === 'viewing'}
      />
      {searchParams.get('diag') === '1' && (
        <DiagnosticsPanel isHost={isHost} roomId={roomId || ''} getPeerConnectionStates={getPeerConnectionStates} />
      )}
      <VoiceNegotiationToast state={voiceNegotiation} />
    </div>
  );
};
