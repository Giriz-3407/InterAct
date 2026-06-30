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
import { isMobileDevice } from '../lib/mobile';
import { AgentStatusIndicator } from '../components/AgentStatusIndicator';
import { DiagnosticsPanel } from '../components/DiagnosticsPanel';
import { VoiceNegotiationToast } from '../components/VoiceNegotiationToast';
import interactLogo from '../assets/branding/interact-icon-dark-mode.svg';
import { useAuth } from '../context/AuthContext';
import {
  Mic,
  MicOff,
  Tv,
  Share2,
  MessageSquare,
  Users,
  MoreHorizontal,
  LogOut,
  Volume2,
  VolumeX,
  Sparkles,
  FileText,
  X,
  Check,
  Send,
  Settings,
  Monitor,
  Trash2,
  Menu
} from 'lucide-react';

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
   SVG ICON PRIMITIVES (Mapped to Lucide React)
───────────────────────────────────────────────── */
const IconMic = () => <Mic size={16} />;
const IconMicOff = () => <MicOff size={16} />;
const IconScreen = () => <Tv size={16} />;
const IconScreenStop = () => <Tv size={16} className="text-red-400" />;
const IconChat = () => <MessageSquare size={16} />;
const IconPeople = () => <Users size={16} />;
const IconMore = () => <MoreHorizontal size={16} />;
const IconLeave = () => <LogOut size={16} />;
const IconVolumeUp = () => <Volume2 size={16} />;
const IconVolumeOff = () => <VolumeX size={16} />;
const IconShare = () => <Share2 size={13} />;
const IconAI = () => <Sparkles size={18} className="text-[#c0c1ff]" />;
const IconTranscript = () => <FileText size={16} />;
const IconClose = () => <X size={16} />;
const IconCheck = () => <Check size={14} />;
const IconSend = () => <Send size={16} />;
const IconMonitor = () => <Monitor size={42} className="text-zinc-500" />;

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
  badgeClassName?: string;
}

const DockBtn: React.FC<DockBtnProps> = ({ onClick, title, icon, active, danger, badge, className = '', badgeClassName }) => (
  <button
    onClick={onClick}
    title={title}
    className={`room-dock-btn transition-all active:scale-95 relative ${active ? 'active' : ''} ${danger ? 'danger' : ''} ${className}`}
  >
    <span className="flex items-center justify-center">
      {icon}
    </span>
    {badge !== undefined && badge > 0 && (
      <span className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white leading-none shadow-[0_1px_2px_rgba(0,0,0,0.2)] ${badgeClassName || 'bg-indigo-500'}`}>
        {badge}
      </span>
    )}
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
  onShare: () => void;
  isStacked?: boolean;
}

const RoomTopBar: React.FC<RoomTopBarProps> = ({
  roomId, participantCount, isSharing, isViewing, isHost, onShare, isStacked = false,
}) => (
  <div className={isStacked ? "relative w-full z-30 pointer-events-none flex items-center justify-between select-none p-1" : "absolute top-3 left-3 right-3 z-30 pointer-events-none flex items-center justify-between select-none"}>
    {/* Left group */}
    <div className="pointer-events-auto flex items-center gap-3 px-4 h-11 rounded-full bg-black/60 backdrop-blur-xl border border-zinc-800/40 shadow-2xl">
      <img src={interactLogo} alt="InterAct" className="h-5 w-auto flex-shrink-0" />
      <div className="w-px h-4 bg-zinc-800/40 flex-shrink-0" />
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-sm font-bold text-[#c0c1ff]/90 tracking-wide truncate max-w-[6rem] sm:max-w-[10rem]">
          {roomId}
        </span>
        {/* Status pill */}
        {(isSharing || isViewing) ? (
          <div className="hidden sm:flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full h-5.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold font-geist tracking-wider text-red-400">LIVE</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-500/5 border border-emerald-500/15 px-2.5 py-1 rounded-full h-5.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow" />
            <span className="text-[10px] font-semibold font-geist tracking-wide text-emerald-400">Connected</span>
          </div>
        )}
      </div>
    </div>

    {/* Center group (hidden on mobile) */}
    <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 pointer-events-auto items-center gap-1.5 px-4 h-11 rounded-full bg-black/60 backdrop-blur-xl border border-zinc-800/40 shadow-2xl">
      <Users size={13} className="text-zinc-400" />
      <span className="text-sm font-geist text-zinc-300 font-semibold select-none">{participantCount}</span>
    </div>

    {/* Right group */}
    <div className="pointer-events-auto flex items-center gap-2 px-3 h-11 rounded-full bg-black/60 backdrop-blur-xl border border-zinc-800/40 shadow-2xl">
      {isHost && <AgentStatusIndicator />}
      {isHost && <div className="w-px h-4 bg-zinc-800/40 flex-shrink-0" />}
      <button
        onClick={onShare}
        className="hidden sm:flex items-center gap-1.5 px-3 h-8 rounded-full border border-transparent bg-white/5 text-zinc-350 hover:text-white hover:bg-white/10 transition-all text-xs font-geist cursor-pointer active:scale-95"
        title="Copy room link"
      >
        <Share2 size={13} />
        <span>Share</span>
      </button>

    </div>
  </div>
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
  isTranscriptOpen: boolean;
  isTranscriptionActive: boolean;
  isTranscriptionSupported: boolean;
  onOpenHostPanel: () => void;
  onShareRoom: () => void;
  onToggleAutoDelete: () => void;
  onToggleTranscript: () => void;
  onLeave: () => void;
  onClose: () => void;
  isMobile: boolean;
}

const MoreMenu: React.FC<MoreMenuProps> = ({
  isHost, autoDelete, isTranscriptOpen, isTranscriptionActive, isTranscriptionSupported,
  onOpenHostPanel, onShareRoom, onToggleAutoDelete, onToggleTranscript, onLeave, onClose,
  isMobile,
}) => (
  <>
    <div className="fixed inset-0 z-40" onClick={onClose} />
    <div className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 z-50 w-56 bg-[#111113] border border-[#1e1e21] rounded-xl shadow-2xl overflow-hidden animate-fade-in">
      <div className="py-1.5">
        {isHost && (
          <button
            onClick={() => { onOpenHostPanel(); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 hover:bg-[#1a1a1d] hover:text-white transition-colors cursor-pointer text-left font-geist font-medium"
          >
            <span className="text-zinc-500"><Settings size={14} /></span>
            Host Controls
          </button>
        )}
        <button
          onClick={() => { onShareRoom(); onClose(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 hover:bg-[#1a1a1d] hover:text-white transition-colors cursor-pointer text-left font-geist font-medium"
        >
          <span className="text-zinc-500"><Share2 size={14} /></span>
          Copy Room Link
        </button>
        {isHost && (
          <button
            onClick={() => { onToggleAutoDelete(); onClose(); }}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm text-zinc-300 hover:bg-[#1a1a1d] hover:text-white transition-colors cursor-pointer text-left font-geist font-medium"
          >
            <div className="flex items-center gap-3">
              <span className="text-zinc-500">
                <Trash2 size={14} />
              </span>
              auto-delete room
            </div>
            <div className={`w-8 h-4 rounded-full transition-colors ${autoDelete ? 'bg-[#c0c1ff]' : 'bg-[#27272a]'}`}>
              <div className={`w-3 h-3 rounded-full bg-white shadow-sm mt-0.5 transition-transform ${autoDelete ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
          </button>
        )}
        {isMobile && (
          <button
            onClick={() => { onToggleTranscript(); onClose(); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors cursor-pointer text-left font-geist font-medium ${
              isTranscriptOpen
                ? 'text-[#c0c1ff] bg-[#c0c1ff]/5'
                : 'text-zinc-300 hover:bg-[#1a1a1d] hover:text-white'
            } ${!isTranscriptionSupported ? 'opacity-40 cursor-not-allowed' : ''}`}
            disabled={!isTranscriptionSupported}
          >
            <span className={`${isTranscriptOpen ? 'text-[#c0c1ff]' : 'text-zinc-500'}`}>
              <FileText size={14} />
            </span>
            <span className="flex-1">Live Log</span>
            {isTranscriptionActive && (
              <span className="text-[9px] font-bold font-geist uppercase px-1.5 py-0.5 rounded-full bg-[#c0c1ff]/10 text-[#c0c1ff]">
                Active
              </span>
            )}
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
  isStacked?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onMouseEnter?: () => void;
  onClick?: (e: React.MouseEvent) => void;
  isMobile?: boolean;
  participantCount?: number;
}

const CollabDock: React.FC<CollabDockProps> = ({
  isMuted, isHost, isSharing, isViewing, hostAudioEnabled, viewerMuted, viewerVolume,
  messageCount, isPeopleOpen, isChatOpen, isTranscriptOpen, showMoreMenu, autoDelete,
  isTranscriptionActive, isTranscriptionSupported,
  onToggleMic, onToggleShare, onToggleHostAudio, onToggleViewerMute, onVolumeChange,
  onToggleChat, onTogglePeople, onToggleMoreMenu, onLeave,
  onOpenHostPanel, onShareRoom, onToggleAutoDelete, onToggleTranscript,
  isStacked = false,
  isCollapsed = false,
  onToggleCollapse,
  onMouseEnter,
  onClick,
  isMobile = false,
  participantCount = 0,
}) => {
  const effectiveCollapsed = isMobile ? false : isCollapsed;
  let itemIndex = 0;
  const getItemDelayStyle = () => {
    const delay = effectiveCollapsed 
      ? (12 - itemIndex) * 30 
      : itemIndex * 30;
    itemIndex++;
    return isViewing ? {
      transitionDelay: `${delay}ms`
    } : undefined;
  };

  return (
    <div 
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={
        isStacked 
          ? "relative z-30 flex items-end justify-center mb-1" 
          : isViewing
            ? "absolute bottom-4 left-4 z-30 flex items-end justify-start pointer-events-auto"
            : "absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-end justify-center pointer-events-auto"
      }
    >
      <div className="relative animate-fade-in">
        {/* More menu */}
        {showMoreMenu && !effectiveCollapsed && (
          <MoreMenu
            isHost={isHost}
            autoDelete={autoDelete}
            isTranscriptOpen={isTranscriptOpen}
            isTranscriptionActive={isTranscriptionActive}
            isTranscriptionSupported={isTranscriptionSupported}
            onOpenHostPanel={onOpenHostPanel}
            onShareRoom={onShareRoom}
            onToggleAutoDelete={onToggleAutoDelete}
            onToggleTranscript={onToggleTranscript}
            onLeave={onLeave}
            onClose={onToggleMoreMenu}
            isMobile={isMobile}
          />
        )}

        {/* Three grouped parent pills */}
        <div className="flex items-center">
          {/* Left Parent Pill: Mic, Speaker, Share Screen */}
          <div 
            className={`flex items-center whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden rounded-full bg-black/60 backdrop-blur-xl border border-zinc-800/40 shadow-2xl shrink-0 pointer-events-auto h-[56px] px-2.5 gap-2.5`}
            style={isViewing && effectiveCollapsed ? {
              width: '48px',
              height: '48px',
              paddingLeft: '8px',
              paddingRight: '8px',
              gap: '0px',
            } : undefined}
          >
            {/* Collapsible toggle handle button (Only visible in viewer presentation mode, placed at the very start) */}
            {isViewing && !isMobile && onToggleCollapse && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCollapse();
                }}
                className={`w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 hover:text-white flex items-center justify-center shrink-0 transition-all active:scale-95 text-zinc-400 cursor-pointer ${effectiveCollapsed ? 'mr-0' : 'mr-1.5'}`}
                title={effectiveCollapsed ? "Expand Controls" : "Collapse Controls"}
              >
                <Menu size={14} />
              </button>
            )}

            {/* Mic */}
            <div 
              className={`dock-item-anim ${isViewing && effectiveCollapsed ? 'collapsed' : 'expanded'}`}
              style={getItemDelayStyle()}
            >
              <DockBtn
                onClick={onToggleMic}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                icon={isMuted ? <IconMicOff /> : <IconMic />}
                label={isMuted ? 'Muted' : 'Mic'}
                danger={isMuted}
              />
            </div>

            {/* Host shared audio toggle (only when sharing) */}
            {isHost && isSharing && (
              <div 
                className={`dock-item-anim ${isViewing && effectiveCollapsed ? 'collapsed' : 'expanded'}`}
                style={getItemDelayStyle()}
              >
                <DockBtn
                  onClick={onToggleHostAudio}
                  title={hostAudioEnabled ? 'Mute shared audio' : 'Share audio'}
                  icon={hostAudioEnabled ? <IconVolumeUp /> : <IconVolumeOff />}
                  label="Audio"
                  danger={!hostAudioEnabled}
                />
              </div>
            )}

            {/* Viewer audio controls */}
            {isViewing && (
              <>
                <div 
                  className={`dock-item-anim ${isViewing && effectiveCollapsed ? 'collapsed' : 'expanded'}`}
                  style={getItemDelayStyle()}
                >
                  <DockBtn
                    onClick={onToggleViewerMute}
                    title={viewerMuted ? 'Unmute session audio' : 'Mute session audio'}
                    icon={viewerMuted ? <IconVolumeOff /> : <IconVolumeUp />}
                    label="Audio"
                    danger={viewerMuted}
                  />
                </div>
                <div 
                  className={`dock-item-anim dock-item-slider ${isViewing && effectiveCollapsed ? 'collapsed' : 'expanded'} hidden sm:flex items-center gap-1.5 px-1.5`}
                  style={getItemDelayStyle()}
                >
                  <input
                    type="range" min="0" max="1" step="0.05" value={viewerVolume}
                    onChange={(e) => {
                      const vol = parseFloat(e.target.value);
                      onVolumeChange(vol);
                      if (vol > 0 && viewerMuted) onToggleViewerMute();
                    }}
                    className="w-14 h-1 accent-[#c0c1ff] cursor-pointer bg-white/10 rounded-lg appearance-none"
                    style={{ WebkitAppearance: 'none', outline: 'none' }}
                  >
                  </input>
                </div>
              </>
            )}

            {/* Screen share (host only) */}
            {isHost && (
              <div 
                className={`dock-item-anim ${isViewing && effectiveCollapsed ? 'collapsed' : 'expanded'}`}
                style={getItemDelayStyle()}
              >
                <DockBtn
                  onClick={onToggleShare}
                  title={isSharing ? 'Stop sharing' : 'Share screen'}
                  icon={isSharing ? <IconScreenStop /> : <IconScreen />}
                  label={isSharing ? 'Stop' : 'Share'}
                  danger={isSharing}
                />
              </div>
            )}
          </div>

          {/* Center Parent Pill: Live Log, Chat, People, More */}
          <div 
            className={`dock-pill-container flex items-center whitespace-nowrap rounded-full bg-black/60 backdrop-blur-xl border border-zinc-800/40 shadow-2xl shrink-0 pointer-events-auto h-[56px] px-2.5 gap-2.5 ml-2 ${
              isViewing && effectiveCollapsed ? 'collapsed' : ''
            }`}
          >
            {/* Live Log */}
            {!isMobile && (
              <div 
                className={`dock-item-anim ${isViewing && effectiveCollapsed ? 'collapsed' : 'expanded'}`}
                style={getItemDelayStyle()}
              >
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
                  className={`hidden sm:flex ${!isTranscriptionSupported ? 'opacity-40 cursor-not-allowed' : ''} ${isTranscriptionActive ? 'text-indigo-400 font-bold' : ''}`}
                />
              </div>
            )}

            {/* Chat */}
            <div 
              className={`dock-item-anim ${isViewing && effectiveCollapsed ? 'collapsed' : 'expanded'}`}
              style={getItemDelayStyle()}
            >
              <DockBtn
                onClick={onToggleChat}
                title="Chat"
                icon={<IconChat />}
                label="Chat"
                badge={messageCount}
                active={isChatOpen}
              />
            </div>

            {/* People */}
            <div 
              className={`dock-item-anim ${isViewing && effectiveCollapsed ? 'collapsed' : 'expanded'}`}
              style={getItemDelayStyle()}
            >
              <DockBtn
                onClick={onTogglePeople}
                title="Participants"
                icon={<IconPeople />}
                label="People"
                active={isPeopleOpen}
                badge={isMobile ? participantCount : undefined}
                badgeClassName={isMobile ? "bg-zinc-800 border border-zinc-700/50 text-zinc-400" : undefined}
              />
            </div>

            {/* More */}
            <div 
              className={`dock-item-anim ${isViewing && effectiveCollapsed ? 'collapsed' : 'expanded'}`}
              style={getItemDelayStyle()}
            >
              <DockBtn
                onClick={onToggleMoreMenu}
                title="More options"
                icon={<IconMore />}
                label="More"
                active={showMoreMenu}
              />
            </div>
          </div>

          {/* Right Parent Pill: Leave Room */}
          <div 
            className={`dock-pill-container flex items-center whitespace-nowrap rounded-full bg-black/60 backdrop-blur-xl border border-zinc-800/40 shadow-2xl shrink-0 pointer-events-auto h-[56px] px-2.5 gap-2.5 ml-2 ${
              isViewing && effectiveCollapsed ? 'collapsed' : ''
            }`}
          >
            {/* Leave */}
            <div 
              className={`dock-item-anim ${isViewing && effectiveCollapsed ? 'collapsed' : 'expanded'}`}
              style={getItemDelayStyle()}
            >
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
      </div>
    </div>
  );
};

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
  isViewing: boolean;
  isSharing: boolean;
}

const RightDrawer: React.FC<RightDrawerProps> = ({
  isOpen, activeTab, isHost, messages, chatInput, chatEndRef, displayName,
  autoDelete, participants, roomLink,
  isTranscriptionActive, isTranscriptionSupported, roomTranscripts,
  onTabChange, onClose, onChatInputChange, onSendMessage,
  onToggleAutoDelete, onTransferHost, onRemoveParticipant, onToggleTranscription,
  isViewing, isSharing,
}) => {
  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return isoString; }
  };

  const showActiveStream = isViewing || isSharing;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-35 md:hidden" onClick={onClose} />
      )}

      <aside className={`flex flex-col bg-black/60 border-l border-zinc-800/40 shadow-2xl transition-all duration-300 ease-in-out shrink-0 z-40 ${
        showActiveStream
          ? `static h-auto my-3 mr-3 rounded-2xl border ${isOpen ? 'w-[350px] opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`
          : `fixed top-0 right-0 bottom-0 md:top-[72px] md:right-3 md:bottom-3 md:h-[calc(100dvh-5.5rem)] md:w-[350px] md:border md:rounded-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full'}`
      }`}>
        {/* Tab header */}
        <div className="h-14 border-b border-zinc-800/30 flex items-center justify-between px-3 shrink-0 bg-white/[0.01]">
          <div className="flex-1 mr-3 flex items-center gap-1 bg-white/5 p-0.5 rounded-full border border-zinc-800/40">
            {(['chat', 'transcript', 'ai', ...(isHost ? ['host'] : [])] as ('chat' | 'transcript' | 'ai' | 'host')[]).map(tab => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`flex-1 h-8 rounded-full transition-all cursor-pointer flex items-center justify-center relative active:scale-95 ${
                  activeTab === tab
                    ? 'bg-indigo-650/80 text-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
                title={tab === 'ai' ? 'AI Insights' : tab === 'transcript' ? 'Live Log' : tab === 'host' ? 'Host Controls' : 'Chat'}
              >
                <span className="relative flex items-center justify-center">
                  {tab === 'chat' && <MessageSquare size={16} />}
                  {tab === 'transcript' && <FileText size={16} />}
                  {tab === 'ai' && <Sparkles size={16} />}
                  {tab === 'host' && <Settings size={16} />}
                  {tab === 'chat' && messages.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#c0c1ff]" />
                  )}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95 text-zinc-400"
          >
            <IconClose />
          </button>
        </div>

        {/* Chat panel */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar min-h-0">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3 select-none">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-zinc-800/40 flex items-center justify-center text-zinc-500">
                    <MessageSquare size={20} className="text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold font-geist text-zinc-300 mb-1">No messages yet</p>
                    <p className="text-xs text-zinc-500 font-inter leading-normal max-w-[200px] mx-auto">
                      Everyone in this room can see your messages here.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((m, idx) => {
                  if (m.type === 'system_rename') {
                    return (
                      <div key={idx} className="flex justify-center select-none">
                        <span className="text-[11px] text-zinc-550 italic font-inter px-2.5 py-0.5 rounded-full bg-white/5 border border-zinc-800/40">
                          {m.message}
                        </span>
                      </div>
                    );
                  }
                  const isMe = m.sender === displayName;
                  return (
                    <div key={idx} className="flex gap-2.5 items-start min-w-0">
                      <Avatar name={m.sender} size="xs" color={isMe ? 'bg-indigo-600/90' : 'bg-zinc-700/80'} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-0.5">
                          <span className="text-xs font-semibold font-geist text-zinc-300 truncate">{m.sender}</span>
                          <span className="text-[10px] font-mono text-zinc-650 shrink-0">{formatTime(m.timestamp)}</span>
                        </div>
                        <p className="text-sm text-zinc-300 font-inter bg-white/5 border border-zinc-800/40 px-3 py-2 rounded-2xl rounded-tl-none break-words leading-relaxed">
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
              className="p-3.5 border-t border-zinc-800/30 flex gap-2 shrink-0 bg-transparent"
            >
              <input
                type="text"
                value={chatInput}
                onChange={e => onChatInputChange(e.target.value)}
                placeholder="Message everyone..."
                className="flex-1 min-w-0 px-3.5 py-2 h-9 rounded-full bg-white/5 border border-zinc-800/40 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-all font-inter"
              />
              <button
                type="submit"
                className="w-9 h-9 rounded-full bg-[#c0c1ff] hover:bg-[#b0b1ff] active:scale-95 text-[#09090b] flex items-center justify-center cursor-pointer transition-all flex-shrink-0 shadow-sm"
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
            <div className="p-4 border-b border-zinc-800/30 bg-white/[0.01] flex flex-col gap-3 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-geist text-zinc-500 uppercase tracking-widest">
                  Speech Logger
                </span>
                <span className={`text-[10px] font-bold font-geist uppercase px-2 py-0.5 rounded-full ${
                  isTranscriptionActive
                    ? 'bg-[#c0c1ff]/10 text-[#c0c1ff] animate-pulse-slow'
                    : 'bg-white/5 text-zinc-500'
                }`}>
                  {isTranscriptionActive ? 'Active' : 'Off'}
                </span>
              </div>

              {/* Host Toggle Controls */}
              {isHost ? (
                <button
                  onClick={onToggleTranscription}
                  disabled={!isTranscriptionSupported}
                  className={`w-full py-2 rounded-full text-xs font-bold font-geist transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-97 ${
                    !isTranscriptionSupported
                      ? 'bg-white/[0.01] border border-zinc-800/30 text-zinc-650 cursor-not-allowed'
                      : isTranscriptionActive
                        ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15'
                        : 'bg-indigo-650/80 text-white hover:bg-indigo-600'
                  }`}
                >
                  <span>{isTranscriptionActive ? 'Stop transcription' : 'Start transcription'}</span>
                </button>
              ) : (
                /* Viewer Info */
                <p className="text-xs text-zinc-400 font-inter leading-normal">
                  {isTranscriptionActive
                    ? 'The host has activated room-wide transcription. Speech will log captions in real-time.'
                    : 'Waiting for the host to activate speech transcription.'}
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
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3 select-none">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-zinc-800/40 flex items-center justify-center text-zinc-500">
                    <FileText size={20} className="text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold font-geist text-zinc-400 mb-1">
                      {isTranscriptionActive ? 'Waiting for speech...' : 'No transcript log'}
                    </p>
                    <p className="text-xs text-zinc-555 font-inter leading-normal max-w-[200px] mx-auto">
                      {isTranscriptionActive
                        ? 'Captions will appear here once someone starts speaking.'
                        : 'Transcripts will be captured automatically once transcription is started.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3.5">
                  {roomTranscripts.map((t, idx) => {
                    const isMe = t.username === displayName;
                    return (
                      <div key={t.id || idx} className="flex gap-2.5 items-start min-w-0">
                        <Avatar name={t.username} size="xs" color={isMe ? 'bg-indigo-600/90' : 'bg-zinc-700/80'} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-0.5">
                            <span className="text-xs font-semibold font-geist text-zinc-300 truncate">{t.username}</span>
                            <span className="text-[10px] font-mono text-zinc-650 shrink-0">
                              {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-300 font-inter bg-white/5 border border-zinc-800/40 px-3 py-2 rounded-2xl rounded-tl-none break-words leading-relaxed">
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
            <div className="flex items-center gap-2 select-none">
              <span className="text-[#c0c1ff]"><IconAI /></span>
              <span className="text-xs font-bold font-geist text-zinc-500 uppercase tracking-widest">AI Insights</span>
            </div>
            <div className="bg-white/5 border border-zinc-800/40 rounded-2xl p-4 transition-all hover:bg-white/[0.08] hover:border-zinc-800/60">
              <p className="text-[10px] font-bold font-geist text-zinc-500 uppercase tracking-widest mb-3">Action Item</p>
              <p className="text-sm text-zinc-300 leading-relaxed italic font-inter">
                "Ensure middleware validation handles nested structs."
              </p>
              <div className="mt-3 pt-3 border-t border-zinc-800/30 flex items-center gap-1.5 select-none">
                <span className="text-emerald-400"><IconCheck /></span>
                <span className="text-xs text-zinc-400 font-geist">Assigned to Alex</span>
              </div>
            </div>
            <div className="bg-white/5 border border-zinc-800/40 rounded-2xl p-4 transition-all hover:bg-white/[0.08] hover:border-zinc-800/60">
              <p className="text-[10px] font-bold font-geist text-zinc-500 uppercase tracking-widest mb-2">Session Status</p>
              <p className="text-sm text-zinc-400 font-inter leading-relaxed">
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
                avatarColor: p.role === 'host' ? 'bg-indigo-600/90' : 'bg-zinc-700/80',
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
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center select-none">
        <div className="w-10 h-10 rounded-full border-[3px] border-[#c0c1ff]/10 border-t-[#c0c1ff] animate-spin" />
        <div>
          <h3 className="text-base font-semibold font-geist text-zinc-300 mb-1">Opening screen picker…</h3>
          <p className="text-sm text-zinc-550 font-inter">Select a window, tab, or entire screen to share.</p>
        </div>
      </div>
    );
  }

  if (isSharing) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-8 text-center select-none">
        <div className="relative w-16 h-16 rounded-2xl bg-red-500/[0.04] border border-red-500/10 flex items-center justify-center">
          <div className="absolute inset-0 bg-red-500/5 blur-xl rounded-full scale-75 animate-pulse" />
          <div className="flex items-center gap-1">
            {[0, 100, 200].map(d => (
              <div key={d} className="w-1 bg-red-400/90 rounded-full" style={{
                height: '20px', animation: `waveform 0.8s ease-in-out ${d}ms infinite`,
                transformOrigin: 'bottom',
              }} />
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1.5 mb-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold font-geist text-red-400 uppercase tracking-widest">Broadcasting</span>
          </div>
          <h3 className="text-lg font-bold font-geist text-white tracking-tight mb-2 bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            You are sharing your screen
          </h3>
          <p className="text-sm text-zinc-400 font-inter leading-relaxed max-w-[240px] mx-auto">
            Participants in this room can see your screen in real time.
          </p>
        </div>
        <button
          onClick={onStopShare}
          className="flex items-center gap-2 h-9 px-5 rounded-full bg-red-605 hover:bg-red-600 hover:shadow-lg hover:shadow-red-600/10 text-white text-sm font-semibold font-geist cursor-pointer transition-all active:scale-97"
        >
          <IconScreenStop />
          Stop Sharing
        </button>
      </div>
    );
  }

  // Idle
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 text-center max-w-sm select-none">
      <div className="relative w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center text-zinc-500 shadow-panel">
        <div className="absolute inset-0 bg-indigo-500/5 blur-xl rounded-full scale-75 animate-pulse-slow" />
        <IconMonitor />
      </div>
      <div>
        <h3 className="text-lg font-bold font-geist text-white tracking-tight mb-2 bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          {isHost ? 'Ready to share your screen' : 'Waiting for host'}
        </h3>
        <p className="text-sm text-zinc-400 font-inter leading-relaxed max-w-[260px] mx-auto">
          {isHost
            ? 'Share your screen to start broadcasting to all participants in this room.'
            : 'The host will begin sharing their screen shortly. You will see it appear here.'}
        </p>
      </div>
      {isHost && (
        <button
          onClick={onStartShare}
          className="inline-flex items-center justify-center gap-2 h-9 px-5 rounded-full bg-[#c0c1ff] hover:bg-[#b0b1ff] active:scale-97 text-[#09090b] text-xs font-semibold font-geist transition-all shadow-md shadow-purple-500/5 cursor-pointer"
        >
          <IconScreen />
          Start Sharing
        </button>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────
   MOBILE PRESENTATION FLOATING COMPONENTS
───────────────────────────────────────────────── */
interface FloatingHeaderProps {
  roomId: string;
  showCopied: boolean;
  onShare: () => void;
  onInteraction: () => void;
  onRelease: () => void;
}

const FloatingHeader: React.FC<FloatingHeaderProps> = ({
  roomId, showCopied, onShare, onInteraction, onRelease
}) => (
  <div
    onTouchStart={(e) => {
      e.stopPropagation();
      onInteraction();
    }}
    onMouseDown={(e) => {
      e.stopPropagation();
      onInteraction();
    }}
    onTouchEnd={(e) => {
      e.stopPropagation();
      onRelease();
    }}
    onMouseUp={(e) => {
      e.stopPropagation();
      onRelease();
    }}
    className="flex items-center justify-between px-4 py-2.5 w-full bg-black/60 backdrop-blur-xl border border-zinc-800/40 rounded-2xl shadow-lg pointer-events-auto"
    onClick={(e) => e.stopPropagation()}
  >
    <div className="flex items-center gap-2 min-w-0">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
      <span className="text-xs font-bold font-geist text-zinc-200 truncate">Room: {roomId}</span>
    </div>
    <div className="flex items-center gap-1.5">
      <button
        onClick={onShare}
        className="h-7 px-3 rounded-lg bg-indigo-600/90 hover:bg-indigo-500 text-white text-[10px] font-semibold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
      >
        <IconShare />
        <span>{showCopied ? 'Copied!' : 'Share'}</span>
      </button>
    </div>
  </div>
);


interface FloatingChatProps {
  isOpen: boolean;
  messages: any[];
  chatInput: string;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  displayName: string;
  onClose: () => void;
  onChatInputChange: (val: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onInteraction: () => void;
  onRelease: () => void;
}

const FloatingChat: React.FC<FloatingChatProps> = ({
  isOpen, messages, chatInput, chatEndRef, displayName, onClose,
  onChatInputChange, onSendMessage, onInteraction, onRelease
}) => {
  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return isoString; }
  };

  return (
    <>
      {/* Chat Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-35 animate-fade-in pointer-events-auto"
          onClick={onClose}
        />
      )}
      {/* Slide-over chat panel */}
      <div
        onTouchStart={(e) => {
          e.stopPropagation();
          onInteraction();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onInteraction();
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          onRelease();
        }}
        onMouseUp={(e) => {
          e.stopPropagation();
          onRelease();
        }}
        className={`fixed top-0 right-0 bottom-0 z-40 w-80 max-w-[85vw] bg-black/60 backdrop-blur-xl border-l border-zinc-800/40 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'}`}
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-14 px-4 border-b border-zinc-800/30 flex items-center justify-between shrink-0 bg-white/5">
          <span className="text-sm font-bold font-geist text-zinc-200">Live Chat</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <IconClose />
          </button>
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar min-h-0">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <p className="text-xs text-zinc-500 font-inter">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((m, idx) => {
              if (m.type === 'system_rename') {
                return (
                  <div key={idx} className="flex justify-center">
                    <span className="text-[10px] text-zinc-500 italic font-inter px-2.5 py-0.5 rounded-full bg-white/5 border border-zinc-800/20">
                      {m.message}
                    </span>
                  </div>
                );
              }
              const isMe = m.sender === displayName;
              return (
                <div key={idx} className="flex gap-2.5 items-start min-w-0">
                  <Avatar name={m.sender} size="xs" color={isMe ? 'bg-indigo-600/85' : 'bg-zinc-700/80'} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <span className="text-[10px] font-semibold font-geist text-zinc-300 truncate">{m.sender}</span>
                      <span className="text-[8px] font-mono text-zinc-500 shrink-0">{formatTime(m.timestamp)}</span>
                    </div>
                    <p className="text-xs text-zinc-300 font-inter bg-white/5 border border-zinc-800/10 px-2.5 py-1.5 rounded-lg rounded-tl-none break-words leading-relaxed">
                      {m.message}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={onSendMessage}
          className="p-3 border-t border-zinc-800/30 flex gap-2 shrink-0 bg-black/20"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => onChatInputChange(e.target.value)}
            placeholder="Send a message..."
            className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-zinc-900/60 border border-zinc-800/40 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
          />
          <button
            type="submit"
            className="h-9 px-3.5 rounded-lg bg-indigo-600/90 text-white font-semibold text-xs flex items-center justify-center hover:bg-indigo-500 transition-colors shrink-0"
          >
            Send
          </button>
        </form>
      </div>
    </>
  );
};

interface FloatingParticipantsProps {
  isOpen: boolean;
  participants: Participant[];
  currentUserId: string;
  isHost: boolean;
  onClose: () => void;
  onRemoveParticipant: (id: string) => void;
  onInteraction: () => void;
  onRelease: () => void;
}

const FloatingParticipants: React.FC<FloatingParticipantsProps> = ({
  isOpen, participants, currentUserId, isHost, onClose, onRemoveParticipant, onInteraction, onRelease
}) => (
  <>
    {/* Participants Backdrop */}
    {isOpen && (
      <div
        className="fixed inset-0 bg-black/40 z-35 animate-fade-in pointer-events-auto"
        onClick={onClose}
      />
    )}
    {/* Slide-over participants panel */}
    <div
      onTouchStart={(e) => {
        e.stopPropagation();
        onInteraction();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onInteraction();
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        onRelease();
      }}
      onMouseUp={(e) => {
        e.stopPropagation();
        onRelease();
      }}
      className={`fixed top-0 right-0 bottom-0 z-40 w-80 max-w-[85vw] bg-black/60 backdrop-blur-xl border-l border-zinc-800/40 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'}`}
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="h-14 px-4 border-b border-zinc-800/30 flex items-center justify-between shrink-0 bg-white/5">
        <span className="text-sm font-bold font-geist text-zinc-200">Participants ({participants.length})</span>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <IconClose />
        </button>
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
        {participants.map((p) => {
          const isMe = p.socketId === currentUserId;
          return (
            <div key={p.socketId} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/5 border border-zinc-800/20">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={p.displayName} size="xs" color={isMe ? 'bg-indigo-600/85' : 'bg-zinc-700/80'} />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-zinc-200 truncate">{p.displayName} {isMe && '(You)'}</span>
                  <span className="text-[9px] text-zinc-550 capitalize">{p.role}</span>
                </div>
              </div>
              {p.role === 'host' ? (
                <span className="text-[9px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-geist font-semibold">Host</span>
              ) : (
                isHost && !isMe && (
                  <button
                    onClick={() => onRemoveParticipant(p.socketId)}
                    className="text-[10px] text-red-400 hover:text-red-300 font-bold px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                  >
                    Remove
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  </>
);

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

  // Mobile presentation experience states
  const [isMobileControlsVisible, setIsMobileControlsVisible] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDockCollapsed, setIsDockCollapsed] = useState(true);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    getPeerConnectionStates,
    voiceNegotiation, beginVoiceNegotiation,
    micStream,
  } = useWebRTC({ isHost, currentSocketId, viewerIds, micMuted: isMuted, hostSocketId, srOnly: srOnlyMode });

  // Live Speech Transcription Hook (Server-Side STT)
  const {
    isSupported: isTranscriptionSupported,
    start: startSpeech,
    stop: stopSpeech,
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

  // Mobile presentation experience definitions
  const isMobileViewer = isMobileDevice && isViewing && !!remoteStream;

  const showMobileControls = useCallback(() => {
    setIsMobileControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setIsMobileControlsVisible(false);
    }, 3000);
  }, []);

  const resetCollapseTimer = useCallback(() => {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    if (isViewing) {
      collapseTimerRef.current = setTimeout(() => {
        setIsDockCollapsed(true);
      }, 5000); // 5 seconds of inactivity
    }
  }, [isViewing]);

  const handleCanvasClick = useCallback(() => {
    if (isViewing) {
      setIsDockCollapsed(true);
    }
  }, [isViewing]);

  // Collapse dock automatically when screen sharing starts
  useEffect(() => {
    if (isViewing) {
      setIsDockCollapsed(true);
    }
  }, [isViewing]);

  // Manage active timer based on collapsed state changes
  useEffect(() => {
    if (!isDockCollapsed) {
      resetCollapseTimer();
    } else {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    }
    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, [isDockCollapsed, resetCollapseTimer]);

  // Track Mobile state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const mainRef = useRef<HTMLDivElement | null>(null);



  // Initially show controls when Mobile Presentation starts
  useEffect(() => {
    if (isMobileViewer) {
      showMobileControls();
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isMobileViewer, showMobileControls]);

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
    onViewerInteraction: isMobileViewer ? showMobileControls : undefined,
  });

  const composedViewportRef = useCallback((node: HTMLDivElement | null) => {
    mainRef.current = node;
    viewportRef(node);
  }, [viewportRef]);

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
        {!isMobileViewer && (
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
        )}

        {/* CENTER STAGE — always full width (drawers overlay, never push) */}
        <main
          ref={composedViewportRef}
          id="presentation-viewport"
          className="flex-1 relative flex flex-col overflow-hidden bg-[#0c0c0e] border border-white/[0.03] rounded-xl min-w-0 md:my-3 md:mx-3 shadow-panel"
        >
          {/* Main layout routing depending on stream state and mobile viewer status */}
          {!isMobileViewer && isViewing ? (
            /* Immersive Presentation Sharing Mode layout */
            <div 
              onClick={handleCanvasClick}
              className="w-full h-full relative flex items-center justify-center bg-black cursor-pointer"
            >
              {isViewing && remoteStream && (
                <video
                  ref={remoteVideoRef}
                  autoPlay playsInline muted
                  className="w-full h-full object-contain z-10"
                />
              )}

              {/* Overlays floating relative to the video viewport container */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex gap-2 pointer-events-none">
                {laserModeActive && (
                  <div className="bg-[#09090b]/80 border border-white/[0.05] text-zinc-200 px-3 py-1.5 rounded-full text-[10px] font-semibold flex items-center gap-1.5 backdrop-blur shadow-sm select-none pointer-events-auto">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Laser Active
                  </div>
                )}
                {spotlightActive && (
                  <div className="bg-[#09090b]/80 border border-white/[0.05] text-zinc-200 px-3 py-1.5 rounded-full text-[10px] font-semibold flex items-center gap-1.5 backdrop-blur shadow-sm select-none pointer-events-auto">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Spotlight Active
                  </div>
                )}
              </div>

              {isSharing && (
                <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#09090b]/80 border border-white/[0.05] backdrop-blur z-20 shadow-sm select-none">
                  <Avatar name={displayName} size="xs" color="bg-indigo-600/90" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-semibold font-inter text-zinc-200 truncate">{displayName} is sharing</span>
                    <span className="text-[9px] font-mono text-zinc-500">LIVE · Screen</span>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse ml-1" />
                </div>
              )}

              {/* "Receiving live stream" status pill is completely hidden from viewport per request */}

              {/* Collaboration Dock (Floating overlay) */}
              {!isMobileViewer && (
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
                  isCollapsed={isDockCollapsed}
                  onToggleCollapse={() => {
                    setIsDockCollapsed(p => !p);
                    resetCollapseTimer();
                  }}
                  onMouseEnter={resetCollapseTimer}
                  onClick={(e) => {
                    e.stopPropagation();
                    resetCollapseTimer();
                  }}
                  isMobile={isMobile}
                  participantCount={participants.length}
                />
              )}
            </div>
          ) : (
            /* Immersive floating overlay layouts for desktop empty stage or mobile presentation viewports */
            <>
              {/* Floating Top Bar (Desktop only) */}
              {!isMobileViewer && (
                <RoomTopBar
                  roomId={roomId || ''}
                  participantCount={participants.length}
                  isSharing={isSharing}
                  isViewing={isViewing}
                  displayName={displayName}
                  isHost={isHost}
                  onShare={handleShareRoom}
                />
              )}

              {/* Active indicator pills */}
              <div className="absolute top-15 left-1/2 -translate-x-1/2 z-20 flex gap-2 pointer-events-none">
                {laserModeActive && (
                  <div className="bg-[#09090b]/80 border border-white/[0.05] text-zinc-200 px-3 py-1.5 rounded-full text-[10px] font-semibold flex items-center gap-1.5 backdrop-blur shadow-sm select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Laser Active
                  </div>
                )}
                {spotlightActive && (
                  <div className="bg-[#09090b]/80 border border-white/[0.05] text-zinc-200 px-3 py-1.5 rounded-full text-[10px] font-semibold flex items-center gap-1.5 backdrop-blur shadow-sm select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Spotlight Active
                  </div>
                )}
                {showLaserPointerNotice && (
                  <div className="bg-[#09090b]/80 border border-white/[0.05] text-zinc-400 px-3 py-1.5 rounded-full text-[10px] font-inter flex items-center gap-1.5 backdrop-blur shadow-sm select-none">
                    Laser pointer available only when sharing an entire screen
                  </div>
                )}
              </div>

              {/* Video content (Mobile viewport or absolute overlay backups) */}
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
                <div className="absolute top-15 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#09090b]/80 border border-white/[0.05] backdrop-blur z-20 shadow-sm select-none">
                  <Avatar name={displayName} size="xs" color="bg-indigo-600/90" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-semibold font-inter text-zinc-200 truncate">{displayName} is sharing</span>
                    <span className="text-[9px] font-mono text-zinc-500">LIVE · Screen</span>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse ml-1" />
                </div>
              )}

              {/* Viewer status pill (hidden in mobile presentation mode) */}
              {isViewing && !isMobileViewer && (
                <div className="absolute top-15 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#09090b]/80 border border-white/[0.05] backdrop-blur z-20 shadow-sm select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c0c1ff] animate-pulse-slow" />
                  <span className="text-[10px] font-semibold font-inter text-zinc-200">Receiving live stream</span>
                </div>
              )}

              {/* Collaboration Dock (Floating overlay) */}
              {!isMobileViewer && (
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
                  isMobile={isMobile}
                  participantCount={participants.length}
                />
              )}

              {/* Mobile Presentation overlays */}
              {isMobileViewer && (
                <>
                  {/* Floating Header */}
                  <div
                    className={`absolute left-4 right-4 z-30 transition-all duration-300 ease-in-out pointer-events-none ${isMobileControlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
                    style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
                  >
                    <FloatingHeader
                      roomId={roomId || ''}
                      showCopied={showCopied}
                      onShare={handleShareRoom}
                      onInteraction={showMobileControls}
                      onRelease={showMobileControls}
                    />
                  </div>

                  {/* Floating Quick Controls Dock */}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ease-in-out pointer-events-none ${isMobileControlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                    style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
                  >
                    <div
                      onTouchStart={(e) => { e.stopPropagation(); showMobileControls(); }}
                      onMouseDown={(e) => { e.stopPropagation(); showMobileControls(); }}
                      onTouchEnd={(e) => { e.stopPropagation(); showMobileControls(); }}
                      onMouseUp={(e) => { e.stopPropagation(); showMobileControls(); }}
                      onClick={(e) => { e.stopPropagation(); showMobileControls(); }}
                      className="pointer-events-auto"
                    >
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
                        isStacked={true}
                        isCollapsed={isDockCollapsed}
                        onToggleCollapse={() => {
                          setIsDockCollapsed(p => !p);
                          resetCollapseTimer();
                        }}
                        onMouseEnter={resetCollapseTimer}
                        isMobile={isMobile}
                        participantCount={participants.length}
                      />
                    </div>
                  </div>

                  {/* Slide-over Floating Chat Overlay */}
                  <FloatingChat
                    isOpen={isChatOpen}
                    messages={messages}
                    chatInput={chatInput}
                    chatEndRef={chatEndRef}
                    displayName={displayName}
                    onClose={() => setIsChatOpen(false)}
                    onChatInputChange={setChatInput}
                    onSendMessage={handleSendMessage}
                    onInteraction={showMobileControls}
                    onRelease={showMobileControls}
                  />

                  {/* Slide-over Floating Participants Overlay */}
                  <FloatingParticipants
                    isOpen={isPeopleOpen}
                    participants={participants}
                    currentUserId={currentSocketId}
                    isHost={isHost}
                    onClose={() => setIsPeopleOpen(false)}
                    onRemoveParticipant={(targetId) => wsClient.send('remove_participant', { targetId })}
                    onInteraction={showMobileControls}
                    onRelease={showMobileControls}
                  />
                </>
              )}
            </>
          )}

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
        </main>

        {/* RIGHT DRAWER (Chat / AI / Host) */}
        {!isMobileViewer && (
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
            isViewing={isViewing}
            isSharing={isSharing}
          />
        )}
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

      {searchParams.get('diag') === '1' && (
        <DiagnosticsPanel isHost={isHost} roomId={roomId || ''} getPeerConnectionStates={getPeerConnectionStates} />
      )}
      <VoiceNegotiationToast state={voiceNegotiation} />
    </div>
  );
};
