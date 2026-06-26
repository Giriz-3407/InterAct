console.log("CURSOR_BUILD_MARKER_20260615 — SOURCE: C:\\Users\\Girish\\Desktop\\InterAct\\frontend");
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar.FC';
import { ParticipantPanel } from '../components/ParticipantPanel';
import { HostControlPanel } from '../components/HostControlPanel';
import { wsClient } from '../lib/websocket';
import { apiClient } from '../lib/axios';
import { useWebRTC } from '../hooks/useWebRTC';
import { useLiveTranscription } from '../hooks/useLiveTranscription';
import { useCursorPresence } from '../hooks/useCursorPresence';
import { AgentStatusIndicator } from '../components/AgentStatusIndicator';
import { WebRTCAuditPanel } from '../components/WebRTCAuditPanel';
import { DiagnosticsPanel } from '../components/DiagnosticsPanel';
import { VoiceNegotiationToast } from '../components/VoiceNegotiationToast';
import { SRDiagPanel } from '../components/SRDiagPanel';
import interactLogo from '../assets/branding/interact-icon-dark-mode.svg';
import { useAuth } from '../context/AuthContext';

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
const IconTranscript = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
    <path d="M12 19v3" />
    <path d="M9 22h6" />
    <path d="m18 8 2 2-2 2" />
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
  isHost: boolean;
  onLeave: () => void;
  onShare: () => void;
}

const RoomTopBar: React.FC<RoomTopBarProps> = ({
  roomId, participantCount, isSharing, isViewing, isHost, onLeave, onShare,
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
      {isHost && <AgentStatusIndicator />}
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
  isTranscriptOpen: boolean;
  showMoreMenu: boolean;
  autoDelete: boolean;
  isTranscriptionActive: boolean;
  isTranscriptionSupported: boolean;
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
  onToggleTranscript: () => void;
}

const CollabDock: React.FC<CollabDockProps> = ({
  isMuted, isHost, isSharing, isViewing, hostAudioEnabled, viewerMuted, viewerVolume,
  messageCount, isPeopleOpen, isChatOpen, isTranscriptOpen, showMoreMenu, autoDelete,
  isTranscriptionActive, isTranscriptionSupported,
  onToggleMic, onToggleShare, onToggleHostAudio, onToggleViewerMute, onVolumeChange,
  onToggleChat, onTogglePeople, onToggleMoreMenu, onLeave,
  onOpenHostPanel, onShareRoom, onToggleAutoDelete, onToggleTranscript,
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

        {/* Live Log */}
        <DockBtn
          onClick={onToggleTranscript}
          title={
            !isTranscriptionSupported 
              ? 'Speech transcription is not supported in this browser' 
              : `Live Transcript Log${isTranscriptionActive ? ' (Active)' : ' (Off)'}`
          }
          icon={<IconTranscript />}
          label="Live Log"
          active={isTranscriptOpen}
          className={`${!isTranscriptionSupported ? 'opacity-40 cursor-not-allowed' : ''} ${isTranscriptionActive ? 'text-indigo-400 font-bold' : ''}`}
        />

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
  activeTab: 'chat' | 'transcript' | 'ai' | 'host';
  isHost: boolean;
  messages: MessageItem[];
  chatInput: string;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  displayName: string;
  autoDelete: boolean;
  participants: Participant[];
  roomLink: string;
  isTranscriptionActive: boolean;
  isTranscriptionSupported: boolean;
  roomTranscripts: { id: string; username: string; text: string; timestamp: string; user_id: string }[];
  onTabChange: (tab: 'chat' | 'transcript' | 'ai' | 'host') => void;
  onClose: () => void;
  onChatInputChange: (v: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onToggleAutoDelete: (val: boolean) => void;
  onTransferHost: (id: string) => void;
  onRemoveParticipant: (id: string) => void;
  onToggleTranscription: () => void;
}

const RightDrawer: React.FC<RightDrawerProps> = ({
  isOpen, activeTab, isHost, messages, chatInput, chatEndRef, displayName,
  autoDelete, participants, roomLink,
  isTranscriptionActive, isTranscriptionSupported, roomTranscripts,
  onTabChange, onClose, onChatInputChange, onSendMessage,
  onToggleAutoDelete, onTransferHost, onRemoveParticipant, onToggleTranscription,
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
            {(['chat', 'transcript', 'ai', ...(isHost ? ['host'] : [])] as ('chat' | 'transcript' | 'ai' | 'host')[]).map(tab => (
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
                {tab === 'transcript' && <IconTranscript />}
                {tab === 'ai' && <IconAI />}
                {tab === 'host' && <IconSettings />}
                <span className="capitalize">{tab === 'ai' ? 'Insights' : tab === 'transcript' ? 'Live Log' : tab}</span>
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

        {/* Transcript Panel */}
        {activeTab === 'transcript' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Header controls */}
            <div className="p-4 border-b border-[#1e1e21] bg-[#111113]/50 flex flex-col gap-3 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold font-geist text-zinc-500 uppercase tracking-widest">
                  Speech Logger
                </span>
                <span className={`text-[9px] font-bold font-geist uppercase px-2 py-0.5 rounded-full ${
                  isTranscriptionActive
                    ? 'bg-indigo-500/10 text-[#c0c1ff] animate-pulse-subtle'
                    : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {isTranscriptionActive ? 'Active' : 'Off'}
                </span>
              </div>

              {/* Host Toggle Controls */}
              {isHost ? (
                <button
                  onClick={onToggleTranscription}
                  disabled={!isTranscriptionSupported}
                  className={`w-full py-2 rounded-xl text-xs font-bold font-geist transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    !isTranscriptionSupported
                      ? 'bg-zinc-900 border border-zinc-850 text-zinc-650 cursor-not-allowed'
                      : isTranscriptionActive
                        ? 'bg-rose-600/15 border border-rose-500/30 text-rose-400 hover:bg-rose-600/25'
                        : 'bg-indigo-600/15 border border-indigo-500/30 text-[#c0c1ff] hover:bg-indigo-600/25'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px] block">
                    {isTranscriptionActive ? 'stop_circle' : 'play_circle'}
                  </span>
                  <span>{isTranscriptionActive ? 'Stop transcription' : 'Start transcription'}</span>
                </button>
              ) : (
                /* Viewer Info */
                <p className="text-[11px] text-zinc-500 font-inter leading-relaxed">
                  {isTranscriptionActive
                    ? 'The host has activated room-wide transcription. Speaking in your mic will log text.'
                    : 'Waiting for the host to start live speech transcription.'}
                </p>
              )}

              {/* Browser warning if unsupported */}
              {!isTranscriptionSupported && (
                <p className="text-[10px] text-rose-400 font-inter bg-rose-500/5 border border-rose-500/10 p-2 rounded-lg leading-relaxed">
                  Speech recognition is not supported in this browser. Try Chrome or Edge Desktop.
                </p>
              )}
            </div>

            {/* Scrollable logs */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar min-h-0">
              {roomTranscripts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#1a1a1d] border border-[#27272a] flex items-center justify-center text-zinc-600">
                    <IconTranscript />
                  </div>
                  <div>
                    <p className="text-sm font-bold font-geist text-zinc-400 mb-1">
                      {isTranscriptionActive ? 'Waiting for speech...' : 'No transcript log'}
                    </p>
                    <p className="text-xs text-zinc-600 font-inter leading-relaxed">
                      {isTranscriptionActive
                        ? 'Captions will appear here once someone starts speaking.'
                        : 'Transcripts will be captured automatically once transcription is started.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {roomTranscripts.map((t, idx) => {
                    const isMe = t.username === displayName;
                    return (
                      <div key={t.id || idx} className="flex gap-2.5 items-start min-w-0">
                        <Avatar name={t.username} size="xs" color={isMe ? 'bg-indigo-600' : 'bg-zinc-700'} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-0.5">
                            <span className="text-[11px] font-semibold font-geist text-zinc-300 truncate">{t.username}</span>
                            <span className="text-[9px] font-mono text-zinc-600 shrink-0">
                              {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 font-inter bg-[#111113] border border-[#1e1e21] px-3 py-2 rounded-xl rounded-tl-none break-words leading-relaxed">
                            {t.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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

  const { user } = useAuth();
  const nameParam = searchParams.get('name') || '';
  const displayName = user?.fullName || nameParam || '';

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentSocketId, setCurrentSocketId] = useState<string>('');

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [isMuted, setIsMuted] = useState(true);
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const [autoDelete, setAutoDelete] = useState(true);

  // Panel states — all drawers are overlays, not layout-shifting
  const [isPeopleOpen, setIsPeopleOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'chat' | 'transcript' | 'ai' | 'host'>('chat');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  // Live Speech Transcription States
  interface CaptionItem {
    id: string;
    speakerName: string;
    text: string;
    isFinal: boolean;
    timestamp: number;
  }
  const [isTranscriptionActive, setIsTranscriptionActive] = useState(false);
  const [showConsentBanner, setShowConsentBanner] = useState(false);
  const [activeCaptions, setActiveCaptions] = useState<CaptionItem[]>([]);
  const [roomTranscripts, setRoomTranscripts] = useState<{ id: string; username: string; text: string; timestamp: string; user_id: string }[]>([]);
  const captionTimeoutRef = useRef<any>(null);

  const currentUserObj = participants.find(p => p.socketId === currentSocketId);
  const isHost = currentUserObj ? currentUserObj.role === 'host' : false;

  // Fallback tab
  useEffect(() => {
    if (!isHost && activeRightTab === 'host') setActiveRightTab('chat');
  }, [isHost, activeRightTab]);

  const viewerIds = useMemo(
    () => participants.filter(p => p.role !== 'host').map(p => p.socketId),
    [participants]
  );
  const hostSocketId = useMemo(
    () => participants.find(p => p.role === 'host')?.socketId || '',
    [participants]
  );

  const srOnlyMode = searchParams.get('sralone') === '1';

  // WebRTC
  const {
    sharingState, localStream, remoteStream, remoteMicStreams,
    captureDisplaySurface, startSharing, stopSharing,
    errorMessage, audioWarning, micWarning,
    auditReports, getPeerConnectionStates,
    voiceNegotiation, beginVoiceNegotiation,
    micStream,
  } = useWebRTC({ isHost, currentSocketId, viewerIds, micMuted: isMuted, hostSocketId, srOnly: srOnlyMode });

  // Live Speech Transcription Hook (Server-Side STT)
  const {
    isSupported: isTranscriptionSupported,
    start: startSpeech,
    stop: stopSpeech,
    diagLogs,
    clearDiagLogs,
  } = useLiveTranscription({
    roomCode: roomId || '',
    socketId: currentSocketId,
    micStream,
  });

  // Start/stop audio streaming based on transcription status and microphone mute status.
  // Mute Optimization: Disconnect and stop MediaRecorder immediately when muted.
  useEffect(() => {
    if (isTranscriptionActive && !isMuted) {
      startSpeech();
    } else {
      stopSpeech();
    }
  }, [isTranscriptionActive, isMuted, startSpeech, stopSpeech]);

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
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    el.muted = false;
    el.volume = 1.0;
    void el.play().catch(err => {
      console.warn(`[WebRTC] Audio play failed for stream ${stream.id}:`, err);
    });
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
    });
    remoteMicAudioRefs.current.forEach((_, streamId) => {
      if (!remoteMicStreams.has(streamId)) {
        remoteMicAudioRefs.current.delete(streamId);
      }
    });
  }, [remoteMicStreams, isHost, attachRemoteMicStream]);

  // Message and transcript history
  useEffect(() => {
    if (!roomId || !displayName) return;
    const fetchHistory = async () => {
      try {
        const history = await apiClient.get<MessageItem[]>(`/api/rooms/${roomId}/messages`);
        setMessages(history);
      } catch (err) { console.error('Failed to load message history:', err); }

      try {
        const transcripts = await apiClient.get<any[]>(`/api/transcripts/session/${roomId}`);
        setRoomTranscripts(transcripts.map(t => ({
          id: t.id || t._id,
          username: t.username,
          text: t.text,
          timestamp: t.timestamp,
          user_id: t.user_id
        })));
      } catch (err) { console.error('Failed to load transcript history:', err); }
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
      if (data.transcriptionActive !== undefined) {
        setIsTranscriptionActive(data.transcriptionActive);
        if (data.transcriptionActive) {
          setShowConsentBanner(true);
        }
      }
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
    const unsubTranscriptionStarted = wsClient.on('transcription_started', data => {
      console.log('Transcription started:', data);
      setIsTranscriptionActive(true);
      setShowConsentBanner(true);
    });
    const unsubTranscriptionStopped = () => {
      console.log('Transcription stopped');
      setIsTranscriptionActive(false);
    };
    const unsubTranscriptionStoppedObj = wsClient.on('transcription_stopped', unsubTranscriptionStopped);
    const unsubLiveTranscript = wsClient.on('live_transcript', data => {
      // Update the captions overlay with rolling subtitles
      setActiveCaptions(prev => {
        const index = prev.findIndex(item => item.id === `interim-${data.senderId}`);
        let newCaptions = [...prev];
        if (data.isFinal) {
          if (index !== -1) {
            newCaptions.splice(index, 1);
          }
          newCaptions.push({
            id: `final-${data.senderId}-${Date.now()}`,
            speakerName: data.senderName,
            text: data.text,
            isFinal: true,
            timestamp: Date.now()
          });
        } else {
          const interimItem = {
            id: `interim-${data.senderId}`,
            speakerName: data.senderName,
            text: data.text,
            isFinal: false,
            timestamp: Date.now()
          };
          if (index !== -1) {
            newCaptions[index] = interimItem;
          } else {
            newCaptions.push(interimItem);
          }
        }
        // Limit back-history stored in overlay state to last 5
        return newCaptions.slice(-5);
      });

      if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
      captionTimeoutRef.current = setTimeout(() => {
        setActiveCaptions([]);
      }, 4000);

      // Save finalized transcripts to the drawer transcript list
      if (data.isFinal) {
        setRoomTranscripts(prev => [
          ...prev,
          {
            id: data.id || crypto.randomUUID(),
            username: data.senderName,
            text: data.text,
            timestamp: new Date().toISOString(),
            user_id: data.senderId
          }
        ]);
      }
    });
    return () => {
      wsClient.send('leave_room', {});
      wsClient.disconnect();
      unsubJoined(); unsubParticipantJoined(); unsubParticipantLeft();
      unsubUpdated(); unsubChatMessage(); unsubSettingsUpdated();
      unsubMicStatus(); unsubKicked();
      unsubTranscriptionStarted(); unsubTranscriptionStoppedObj(); unsubLiveTranscript();
    };
  }, [roomId, displayName]);

  // Auto scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Handlers


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

  const handleToggleTranscript = useCallback(() => {
    setIsChatOpen(p => {
      if (!p || activeRightTab !== 'transcript') {
        setActiveRightTab('transcript');
        return true;
      }
      return false;
    });
    if (window.innerWidth < 768) setIsPeopleOpen(false);
  }, [activeRightTab]);

  const handleToggleTranscription = useCallback(() => {
    if (isTranscriptionActive) {
      wsClient.send('stop_transcription', {});
    } else {
      wsClient.send('start_transcription', {});
    }
  }, [isTranscriptionActive]);

  const handleOpenRightDrawer = useCallback((tab: 'chat' | 'ai' | 'host') => {
    setActiveRightTab(tab);
    setIsChatOpen(true);
    if (window.innerWidth < 768) setIsPeopleOpen(false);
  }, []);



  // ── MAIN ROOM LAYOUT ──
  return (
    <div className="min-h-[100dvh] bg-[#09090b] text-zinc-100 font-inter flex flex-col h-[100dvh] overflow-hidden relative">

      {/* Top Bar */}
      <RoomTopBar
        roomId={roomId || ''}
        participantCount={participants.length}
        isSharing={isSharing}
        isViewing={isViewing}
        displayName={displayName}
        isHost={isHost}
        onLeave={() => navigate('/dashboard')}
        onShare={handleShareRoom}
      />

      {/* Consent Banner */}
      {showConsentBanner && isTranscriptionActive && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-35 w-full max-w-md px-4 pointer-events-auto">
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-indigo-950/45 backdrop-blur-md border border-indigo-500/20 shadow-lg text-xs text-[#c0c1ff] font-inter">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#c0c1ff] animate-pulse" />
              <span>
                <strong>Live transcription active.</strong> Speaking in your mic will store text in session transcripts.
              </span>
            </div>
            <button
              onClick={() => setShowConsentBanner(false)}
              className="p-1 rounded hover:bg-indigo-500/10 text-[#c0c1ff] transition-colors cursor-pointer"
            >
              <IconClose />
            </button>
          </div>
        </div>
      )}

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

          {/* Removed duplicate connection indicator */}

          {/* Live Caption Overlay */}
          {activeCaptions.length > 0 && (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-4 pointer-events-none">
              <div className="mx-auto flex flex-col items-stretch gap-2 px-4 py-2.5 rounded-2xl bg-[#09090b]/85 backdrop-blur-xl border border-indigo-500/20 shadow-2xl select-none animate-fade-in">
                {activeCaptions.slice(-2).map((caption) => (
                  <div key={caption.id} className="flex flex-col items-start text-left border-l-2 border-indigo-500/40 pl-2.5">
                    <span className="text-[9px] font-bold font-geist tracking-wider text-[#c0c1ff] uppercase">
                      {caption.speakerName}
                    </span>
                    <p className="text-xs md:text-sm font-inter text-zinc-105 leading-relaxed drop-shadow-sm font-medium">
                      {caption.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SR Alone Mode banner */}
          {srOnlyMode && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4">
              <div className="mx-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-300 text-[10px] font-bold font-geist uppercase tracking-widest">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>SR Alone Mode — WebRTC mic disabled</span>
              </div>
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
            isChatOpen={isChatOpen && activeRightTab === 'chat'}
            isTranscriptOpen={isChatOpen && activeRightTab === 'transcript'}
            showMoreMenu={showMoreMenu}
            autoDelete={autoDelete}
            isTranscriptionActive={isTranscriptionActive}
            isTranscriptionSupported={isTranscriptionSupported}
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
            onToggleTranscript={handleToggleTranscript}
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
          isTranscriptionActive={isTranscriptionActive}
          isTranscriptionSupported={isTranscriptionSupported}
          roomTranscripts={roomTranscripts}
          onTabChange={setActiveRightTab}
          onClose={() => setIsChatOpen(false)}
          onChatInputChange={setChatInput}
          onSendMessage={handleSendMessage}
          onToggleAutoDelete={val => wsClient.send('toggle_auto_delete', { autoDelete: val })}
          onTransferHost={targetId => wsClient.send('transfer_host', { targetId })}
          onRemoveParticipant={targetId => wsClient.send('remove_participant', { targetId })}
          onToggleTranscription={handleToggleTranscription}
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
      <SRDiagPanel logs={diagLogs} onClear={clearDiagLogs} srOnly={srOnlyMode} />
      <VoiceNegotiationToast state={voiceNegotiation} />
    </div>
  );
};
