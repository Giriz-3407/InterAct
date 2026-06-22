console.log("CURSOR_BUILD_MARKER_20260615 \u2014 SOURCE: C:\\Users\\Girish\\Desktop\\InterAct\\frontend");
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar.FC';
import { ParticipantPanel } from '../components/ParticipantPanel';
import { HostControlPanel } from '../components/HostControlPanel';
import { wsClient } from '../lib/websocket';
import { apiClient } from '../lib/axios';
import { useWebRTC } from '../hooks/useWebRTC';
import { useCursorPresence } from '../hooks/useCursorPresence';
import { AgentStatusIndicator } from '../components/AgentStatusIndicator';
import { WebRTCAuditPanel } from '../components/WebRTCAuditPanel';
import { diagStage7_hostPlayback, diagPrintSummary } from '../hooks/useViewerMicDiag';
import { DiagnosticsPanel } from '../components/DiagnosticsPanel';
import { VoiceNegotiationToast } from '../components/VoiceNegotiationToast';


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
}

export const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Retrieve initial display name from query parameters
  const nameParam = searchParams.get('name') || '';

  // State
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

  // Layout & Sidebar collapse/tab states
  const [isLeftPanelExpanded, setIsLeftPanelExpanded] = useState(window.innerWidth >= 768);
  const [isLeftPanelPinned] = useState(false);
  const [isRightSidebarExpanded, setIsRightSidebarExpanded] = useState(window.innerWidth >= 768);
  const [isRightSidebarPinned] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'chat' | 'ai' | 'host'>('chat');

  // Check if current user is host
  const currentUserObj = participants.find((p) => p.socketId === currentSocketId);
  const isHost = currentUserObj ? currentUserObj.role === 'host' : false;

  // Fallback active tab to chat if user is no longer host
  useEffect(() => {
    if (!isHost && activeRightTab === 'host') {
      setActiveRightTab('chat');
    }
  }, [isHost, activeRightTab]);

  // Viewer IDs for WebRTC (all non-host participants)
  const viewerIds = participants
    .filter((p) => p.role !== 'host')
    .map((p) => p.socketId);

  // Host socket ID (needed for viewer mic flow)
  const hostSocketId = participants.find((p) => p.role === 'host')?.socketId || '';

  // WebRTC hook
  const {
    sharingState,
    localStream,
    remoteStream,
    remoteMicStreams,
    captureDisplaySurface,
    startSharing,
    stopSharing,
    errorMessage,
    audioWarning,
    micWarning,
    auditReports,
    getPeerConnectionStates,
    voiceNegotiation,
    beginVoiceNegotiation,
  } = useWebRTC({
    isHost,
    currentSocketId,
    viewerIds,
    micMuted: isMuted,
    hostSocketId,
  });

  const isSharing = sharingState === 'sharing';
  const isViewing = sharingState === 'viewing';
  const isRequesting = sharingState === 'requesting';
  const showLaserPointerNotice = isHost && isSharing && captureDisplaySurface !== 'monitor';

  // Audio sharing states
  const [hostAudioEnabled, setHostAudioEnabled] = useState(true);
  const [viewerMuted, setViewerMuted] = useState(false);
  const [viewerVolume, setViewerVolume] = useState(0.8);

  // Synchronize host audio enabled state
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = hostAudioEnabled;
      });
    }
  }, [localStream, hostAudioEnabled]);

  // Screen Share Priority Mode: Automatically close non-pinned drawers on mobile when screen sharing/viewing starts
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile && (isSharing || isViewing)) {
      if (!isLeftPanelPinned) {
        setIsLeftPanelExpanded(false);
      }
      if (!isRightSidebarPinned) {
        setIsRightSidebarExpanded(false);
      }
    }
  }, [isSharing, isViewing, isLeftPanelPinned, isRightSidebarPinned]);

  const toggleHostAudio = useCallback(() => {
    setHostAudioEnabled((prev) => !prev);
  }, []);

  // Live cursor presence — active while viewing a remote stream or sharing as host
  const isScreenVisible = (isViewing && !!remoteStream) || (isHost && isSharing);
  const { viewportRef, laserModeActive, spotlightActive } = useCursorPresence({
    isScreenVisible,
    localStream,
    remoteStream,
    captureDisplaySurface,
    participants,
    isHost,
    localParticipantId: currentSocketId,
  });

  // Refs for remote video & audio elements
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteMicAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const attachRemoteMicStream = useCallback((el: HTMLAudioElement, stream: MediaStream) => {
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    el.muted = false;
    el.volume = 1.0;
    void el.play().catch((err) => {
      console.warn('[RoomPage] Remote mic play failed:', err);
    });
  }, []);

  // Attach remote stream to video & audio elements and handle volume/mute
  useEffect(() => {
    if (remoteStream) {
      console.log('[RoomPage] Attaching remote stream. Tracks:', remoteStream.getTracks().map(t => t.kind));
      
      // Attach to video element (video rendering only, keep muted)
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.muted = true;
      }
      
      // Attach to audio element (audio playback only)
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.muted = viewerMuted;
        remoteAudioRef.current.volume = viewerVolume;
      }

      const handleTrackAdded = () => {
        console.log('[RoomPage] Track added to remoteStream. Tracks:', remoteStream.getTracks().map(t => t.kind));
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.muted = true;
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.muted = viewerMuted;
          remoteAudioRef.current.volume = viewerVolume;
        }
      };

      remoteStream.addEventListener('addtrack', handleTrackAdded);
      remoteStream.addEventListener('removetrack', handleTrackAdded);

      return () => {
        remoteStream.removeEventListener('addtrack', handleTrackAdded);
        remoteStream.removeEventListener('removetrack', handleTrackAdded);
      };
    } else {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }
    }
  }, [remoteStream, viewerMuted, viewerVolume]);

  // Attach remote mic streams to their dynamic audio elements
  useEffect(() => {
    remoteMicStreams.forEach((stream, streamId) => {
      const el = remoteMicAudioRefs.current.get(streamId);
      if (el) {
        attachRemoteMicStream(el, stream);
      }
      if (isHost) {
        setTimeout(() => {
          const audioEl = remoteMicAudioRefs.current.get(streamId) ?? null;
          diagStage7_hostPlayback(streamId, audioEl);
          diagPrintSummary();
        }, 500);
      }
    });
    remoteMicAudioRefs.current.forEach((_, streamId) => {
      if (!remoteMicStreams.has(streamId)) {
        remoteMicAudioRefs.current.delete(streamId);
      }
    });
  }, [remoteMicStreams, isHost, attachRemoteMicStream]);

  // Load message history on startup
  useEffect(() => {
    if (!roomId || !displayName) return;

    const fetchHistory = async () => {
      try {
        const history = await apiClient.get<MessageItem[]>(`/api/rooms/${roomId}/messages`);
        setMessages(history);
      } catch (err) {
        console.error('Failed to load message history:', err);
      }
    };

    fetchHistory();
  }, [roomId, displayName]);

  // WebSocket Connection Lifecycle
  useEffect(() => {
    if (!roomId || !displayName) return;

    const getWsUrl = (): string => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      let wsUrl = apiUrl.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
      if (!wsUrl.endsWith('/ws')) {
        wsUrl = `${wsUrl.replace(/\/$/, '')}/ws`;
      }
      return wsUrl;
    };

    // Connect to backend WebSocket gateway
    wsClient.connect(getWsUrl(), () => {
      // Send join event
      wsClient.send('join_room', {
        roomCode: roomId,
        displayName: displayName
      });
    });

    // Event listeners
    const unsubJoined = wsClient.on('room_joined', (data) => {
      console.log('Joined room:', data);
      setCurrentSocketId(data.socketId);
      setParticipants(data.participants);
      if (data.autoDelete !== undefined) {
        setAutoDelete(data.autoDelete);
      }
      try {
        const joined = JSON.parse(localStorage.getItem('joinedRooms') || '[]');
        if (!joined.includes(data.roomCode)) {
          joined.push(data.roomCode);
          localStorage.setItem('joinedRooms', JSON.stringify(joined));
        }
      } catch (err) {
        console.error('Failed to save room to history:', err);
      }
    });

    const unsubParticipantJoined = wsClient.on('participant_joined', (data) => {
      console.log('Participant joined:', data.participant);
      setParticipants((prev) => {
        if (prev.some((p) => p.socketId === data.participant.socketId)) return prev;
        return [...prev, data.participant];
      });
    });

    const unsubParticipantLeft = wsClient.on('participant_left', (data) => {
      console.log('Participant left:', data.participantId);
      setParticipants((prev) => prev.filter((p) => p.socketId !== data.participantId));
    });

    const unsubUpdated = wsClient.on('participants_updated', (data) => {
      console.log('Participants updated:', data.participants);
      setParticipants(data.participants);
    });

    const unsubChatMessage = wsClient.on('chat_message', (data) => {
      console.log('Received chat message:', data);
      setMessages((prev) => [
        ...prev,
        {
          sender: data.sender,
          message: data.message,
          timestamp: data.timestamp
        }
      ]);
    });

    const unsubSettingsUpdated = wsClient.on('room_settings_updated', (data) => {
      console.log('Room settings updated:', data);
      if (data.autoDelete !== undefined) {
        setAutoDelete(data.autoDelete);
      }
    });

    const unsubMicStatus = wsClient.on('mic_status_update', (data) => {
      console.log('Mic status updated:', data);
      const { participantId, micMuted } = data;
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === participantId ? { ...p, micMuted } : p))
      );
    });

    const unsubKicked = wsClient.on('kicked', (data) => {
      console.log('Kicked from room:', data);
      alert(data.reason || 'You have been removed from the room.');
      navigate('/dashboard');
    });

    return () => {
      wsClient.send('leave_room', {});
      wsClient.disconnect();
      unsubJoined();
      unsubParticipantJoined();
      unsubParticipantLeft();
      unsubUpdated();
      unsubChatMessage();
      unsubSettingsUpdated();
      unsubMicStatus();
      unsubKicked();
    };
  }, [roomId, displayName]);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

    // Auto-close chat drawer on mobile after sending a message if not pinned
    if (window.innerWidth < 768 && !isRightSidebarPinned) {
      setIsRightSidebarExpanded(false);
    }
  };

  const handleShareToggle = useCallback(async () => {
    if (isSharing) {
      stopSharing();
    } else {
      setIsMuted(false); // Unmute mic by default when starting share
      await startSharing();
    }
  }, [isSharing, startSharing, stopSharing]);

  const handleParticipantsToggle = useCallback(() => {
    setIsLeftPanelExpanded((prev) => {
      const next = !prev;
      if (next && window.innerWidth < 768) {
        setIsRightSidebarExpanded(false);
      }
      return next;
    });
  }, []);



  // Name Entry Prompt Dialog overlay
  if (showNamePrompt) {
    return (
      <div className="min-h-screen bg-bg text-on-surface flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="glass-panel w-full max-w-[95vw] sm:max-w-sm rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-4">
          <div className="mb-2">
            <h2 className="text-base font-bold font-geist text-white">Join Room: {roomId}</h2>
            <p className="text-xs text-zinc-500 mt-1 font-inter">Please choose a display name to join this session</p>
          </div>

          <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-zinc-400 font-geist uppercase tracking-wider">Display Name</label>
              <input
                type="text"
                placeholder="e.g. Girish"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="px-3 py-2 bg-zinc-900 border border-zinc-850 rounded-lg text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all font-inter"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-semibold font-geist hover:opacity-95 shadow-lg shadow-indigo-500/10 rounded-lg transition-all"
            >
              Join Collaboration Session
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-bg text-on-surface font-inter flex flex-col h-[100dvh] overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="min-h-[calc(4rem+env(safe-area-inset-top))] md:h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] border-b border-slate-border bg-zinc-950/90 backdrop-blur-md flex items-center justify-between gap-2 px-3 md:px-6 z-[25] shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] uppercase tracking-wider text-zinc-600 font-geist leading-none mb-1 md:hidden">Room</span>
            <h1 className="text-sm md:text-sm font-bold font-geist text-white tracking-tight leading-none flex items-center gap-1.5 min-w-0">
              <span className="font-mono text-[#c0c1ff] truncate max-w-[7.5rem] sm:max-w-none">{roomId}</span>
            </h1>
          </div>
          {isHost && <AgentStatusIndicator />}
        </div>

        <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
          {/* Sharing status indicator in header */}
          {isSharing && (
            <span className="h-8 px-2 flex items-center gap-1 text-[10px] font-mono text-rose-400 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span>LIVE</span>
            </span>
          )}
          {isViewing && (
            <span className="h-8 px-2 flex items-center gap-1 text-[10px] font-mono text-indigo-400 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="hidden min-[380px]:inline">LIVE</span>
            </span>
          )}

          <div className="h-5 w-px bg-zinc-850 hidden md:block" />

          <button
            onClick={() => navigate('/dashboard')}
            className="hidden md:flex w-auto px-3 py-1.5 rounded-lg text-xs font-semibold font-geist bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/10 cursor-pointer items-center justify-center shrink-0"
            title="Leave Room"
          >
            <span>Leave Room</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Live Participant presence panel */}
        <ParticipantPanel
          roomCode={roomId || ''}
          participants={participants.map((p) => p.socketId === currentSocketId ? { ...p, micMuted: isMuted } : p)}
          currentUserId={currentSocketId}
          isExpanded={isLeftPanelExpanded}
          onToggleExpand={handleParticipantsToggle}
        />

        {/* Center Screen Sharing Canvas Area */}
        <main className="flex-1 bg-zinc-950/20 p-2.5 sm:p-3 flex flex-col overflow-hidden relative gap-2.5 md:gap-3 min-w-0">
          {/* Error message banner */}
          {errorMessage && (
            <div className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 font-inter flex items-center gap-2 shrink-0">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {errorMessage}
            </div>
          )}

          {/* Audio warning banner */}
          {audioWarning && (
            <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-inter flex items-center gap-2 shrink-0">
              <span className="material-symbols-outlined text-[16px] text-amber-400">warning</span>
              {audioWarning}
            </div>
          )}

          {/* Microphone warning banner */}
          {micWarning && (
            <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-inter flex items-center gap-2 shrink-0">
              <span className="material-symbols-outlined text-[16px] text-amber-400">warning</span>
              {micWarning}
            </div>
          )}

          {showLaserPointerNotice && (
            <div className="px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 font-inter flex items-center gap-2 shrink-0">
              <span className="material-symbols-outlined text-[16px] text-amber-400">info</span>
              Laser pointer is available only when sharing an entire screen.
            </div>
          )}

          {/* Viewport container */}
          <div ref={viewportRef} className="flex-1 min-h-0 flex items-center justify-center rounded-xl md:rounded-2xl border border-zinc-850/60 bg-[#0d1117]/70 overflow-hidden relative w-full h-full shadow-inner">

            {/* Active Indicators Row */}
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-50 flex gap-2 pointer-events-none max-w-[calc(100%-1.5rem)]">
              {laserModeActive && (
                <div className="bg-zinc-950/85 text-zinc-100 px-3 py-1.5 rounded-full text-[11px] md:text-xs font-semibold border border-zinc-800 shadow-md flex items-center gap-2 whitespace-nowrap">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Laser Active</span>
                </div>
              )}
              {spotlightActive && (
                <div className="bg-zinc-950/85 text-zinc-100 px-3 py-1.5 rounded-full text-[11px] md:text-xs font-semibold border border-zinc-800 shadow-md flex items-center gap-2 whitespace-nowrap">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>Spotlight Active</span>
                </div>
              )}
            </div>

            {/* Remote stream video — visible to viewer when receiving */}
            {isViewing && remoteStream && (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
            )}

            {/* Waiting / Sharing state overlay when no video */}
            {!isViewing && (
              <div className="text-center flex flex-col items-center justify-center gap-3 max-w-[19rem] z-10 p-5 sm:p-8 min-h-0 sm:min-h-[18rem]">
                {isRequesting ? (
                  <>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-indigo-500/40 border-t-indigo-500 animate-spin mb-1" />
                    <h3 className="text-xs sm:text-sm font-bold font-geist text-zinc-300">Opening screen picker…</h3>
                    <p className="text-[10px] sm:text-xs text-zinc-500 font-inter max-w-[280px]">Select a window, tab, or entire screen to share.</p>
                  </>
                ) : isSharing ? (
                  <>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center mb-1 animate-pulse-subtle">
                      <span className="material-symbols-outlined text-[26px] sm:text-[28px] text-indigo-400">screen_share</span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold font-geist text-zinc-300">You are sharing your screen</h3>
                    <p className="text-[10px] sm:text-xs text-zinc-500 font-inter leading-relaxed max-w-[280px] mb-1">
                      Participants in this room can see your screen.
                    </p>
                    <button
                      onClick={handleShareToggle}
                      className="px-4 py-2 rounded-xl text-xs font-semibold font-geist bg-rose-600 hover:bg-rose-500 text-white hover:opacity-90 shadow-lg shadow-rose-600/25 transition-all cursor-pointer flex items-center gap-1.5 min-h-9"
                    >
                      <span className="material-symbols-outlined text-[15px]">stop_screen_share</span>
                      Stop Sharing
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-zinc-900/60 border border-zinc-800 flex items-center justify-center mb-1">
                      <span className="material-symbols-outlined text-[26px] sm:text-[28px] text-zinc-500">monitor</span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold font-geist text-zinc-300">
                      {isHost ? 'Ready to share your screen' : 'Waiting for host to share screen'}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-zinc-500 leading-relaxed font-inter max-w-[280px]">
                      {isHost
                        ? 'Click "Start Sharing" below to begin broadcasting your screen to all participants.'
                        : 'Only the host of the room can initiate a sharing stream. Watching sessions is optimized automatically.'}
                    </p>

                    {isHost && (
                      <button
                        onClick={handleShareToggle}
                        className="mt-2 px-5 py-3 rounded-xl text-xs font-semibold font-geist bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:opacity-90 shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2 min-h-11"
                      >
                        <span className="material-symbols-outlined text-[16px] sm:text-[18px]">screen_share</span>
                        Start Sharing
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Presenter floating pill when sharing */}
            {isSharing && (
              <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 backdrop-blur max-w-[calc(100%-1.5rem)]">
                <Avatar name={displayName} size="xs" color="bg-indigo-600" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-zinc-300 font-inter font-semibold truncate">{displayName} is sharing</span>
                  <span className="text-[9px] text-zinc-500 font-mono">LIVE - Screen</span>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse ml-1" />
              </div>
            )}

            {/* Viewer status pill */}
            {isViewing && (
              <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 backdrop-blur">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-[10px] text-zinc-300 font-inter font-semibold">Receiving live stream</span>
              </div>
            )}
          </div>

          {/* RTC controls bar */}
          <div className="w-full flex items-center justify-center shrink-0 z-10">
            <div className="glass-panel w-full max-w-[30rem] md:w-auto md:max-w-full px-2.5 py-2 rounded-2xl md:rounded-xl flex items-center gap-2 shadow-2xl justify-center overflow-hidden md:flex-nowrap">
              {/* Microphone toggle — all participants */}
              <button
                onClick={() => {
                  if (isMuted) {
                    beginVoiceNegotiation();
                  }
                  setIsMuted(!isMuted);
                }}
                className={`w-11 h-11 md:w-8 md:h-8 rounded-xl md:rounded-lg flex items-center justify-center transition-all border cursor-pointer shrink-0 ${
                  isMuted
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    : 'bg-zinc-900 border-zinc-850 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                <span className="material-symbols-outlined text-[20px] md:text-[18px]">
                  {isMuted ? 'mic_off' : 'mic'}
                </span>
              </button>

              {/* Host Toggle Shared Audio */}
              {isHost && isSharing && (
                <>
                  <div className="w-px h-5 bg-zinc-800/80 shrink-0" />
                  <button
                    onClick={toggleHostAudio}
                    className={`w-11 h-11 md:w-8 md:h-8 rounded-xl md:rounded-lg flex items-center justify-center transition-all border cursor-pointer shrink-0 ${
                      !hostAudioEnabled
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : 'bg-zinc-900 border-zinc-850 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                    title={hostAudioEnabled ? 'Mute shared audio' : 'Unmute shared audio'}
                  >
                    <span className="material-symbols-outlined text-[20px] md:text-[18px]">
                      {hostAudioEnabled ? 'volume_up' : 'volume_off'}
                    </span>
                  </button>
                </>
              )}

              {/* Viewer Local Mute/Volume controls */}
              {isViewing && (
                <>
                  <div className="w-px h-5 bg-zinc-800/80 shrink-0" />
                  <button
                    onClick={() => setViewerMuted(!viewerMuted)}
                    className={`w-11 h-11 md:w-8 md:h-8 rounded-xl md:rounded-lg flex items-center justify-center transition-all border cursor-pointer shrink-0 ${
                      viewerMuted
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : 'bg-zinc-900 border-zinc-850 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                    title={viewerMuted ? 'Unmute remote audio' : 'Mute remote audio'}
                  >
                    <span className="material-symbols-outlined text-[20px] md:text-[18px]">
                      {viewerMuted ? 'volume_off' : 'volume_up'}
                    </span>
                  </button>
                  <div className="hidden min-[390px]:flex items-center gap-1.5 px-1 shrink-0">
                    <span className="text-[10px] text-zinc-500 font-mono">Vol</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={viewerVolume}
                      onChange={(e) => {
                        const vol = parseFloat(e.target.value);
                        setViewerVolume(vol);
                        if (vol > 0 && viewerMuted) {
                          setViewerMuted(false);
                        }
                      }}
                      className="w-14 md:w-16 h-1 bg-zinc-805 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      style={{
                        WebkitAppearance: 'none',
                        outline: 'none',
                      }}
                    />
                  </div>
                </>
              )}

              {/* Mobile-only toggle buttons */}
              {/* Participants list toggle */}
              <button
                onClick={() => {
                  setIsLeftPanelExpanded(!isLeftPanelExpanded);
                  setIsRightSidebarExpanded(false);
                }}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all border cursor-pointer shrink-0 md:hidden ${
                  isLeftPanelExpanded
                    ? 'bg-indigo-600/20 border-indigo-500/30 text-[#c0c1ff]'
                    : 'bg-zinc-900 border-zinc-850 text-zinc-350 hover:bg-zinc-800'
                }`}
                title="Participants"
              >
                <span className="material-symbols-outlined text-[20px]">group</span>
              </button>

              {/* Chat toggle */}
              <button
                onClick={() => {
                  setIsLeftPanelExpanded(false);
                  if (isRightSidebarExpanded && activeRightTab === 'chat') {
                    setIsRightSidebarExpanded(false);
                  } else {
                    setIsRightSidebarExpanded(true);
                    setActiveRightTab('chat');
                  }
                }}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all border cursor-pointer shrink-0 md:hidden relative ${
                  isRightSidebarExpanded && activeRightTab === 'chat'
                    ? 'bg-indigo-600/20 border-indigo-500/30 text-[#c0c1ff]'
                    : 'bg-zinc-900 border-zinc-850 text-zinc-350 hover:bg-zinc-800'
                }`}
                title="Chat"
              >
                <span className="material-symbols-outlined text-[20px]">forum</span>
                {messages.length > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 bg-indigo-600 text-zinc-950 text-[8px] font-bold font-mono rounded-full scale-90">
                    {messages.length}
                  </span>
                )}
              </button>

              {/* Insights toggle */}
              <button
                onClick={() => {
                  setIsLeftPanelExpanded(false);
                  if (isRightSidebarExpanded && activeRightTab === 'ai') {
                    setIsRightSidebarExpanded(false);
                  } else {
                    setIsRightSidebarExpanded(true);
                    setActiveRightTab('ai');
                  }
                }}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all border cursor-pointer shrink-0 md:hidden ${
                  isRightSidebarExpanded && activeRightTab === 'ai'
                    ? 'bg-indigo-600/20 border-indigo-500/30 text-[#c0c1ff]'
                    : 'bg-zinc-900 border-zinc-850 text-zinc-350 hover:bg-zinc-800'
                }`}
                title="AI Insights"
              >
                <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
              </button>

              {/* Host Controls toggle */}
              {isHost && (
                <button
                  onClick={() => {
                    setIsLeftPanelExpanded(false);
                    if (isRightSidebarExpanded && activeRightTab === 'host') {
                      setIsRightSidebarExpanded(false);
                    } else {
                      setIsRightSidebarExpanded(true);
                      setActiveRightTab('host');
                    }
                  }}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all border cursor-pointer shrink-0 md:hidden ${
                    isRightSidebarExpanded && activeRightTab === 'host'
                      ? 'bg-indigo-600/20 border-indigo-500/30 text-[#c0c1ff]'
                      : 'bg-zinc-900 border-zinc-850 text-zinc-350 hover:bg-zinc-800'
                  }`}
                  title="Host Controls"
                >
                  <span className="material-symbols-outlined text-[20px]">settings_accessibility</span>
                </button>
              )}

              <div className="w-px h-5 bg-zinc-800/80 shrink-0" />

              <button
                onClick={() => navigate('/dashboard')}
                className="w-11 h-11 md:w-8 md:h-8 rounded-xl md:rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                title="Leave Room"
              >
                <span className="material-symbols-outlined text-[20px] md:text-[18px]">call_end</span>
              </button>
            </div>
          </div>
        </main>

        {isRightSidebarExpanded && (
          <div
            onClick={() => setIsRightSidebarExpanded(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[35] md:hidden"
          />
        )}

        {/* Right Chat and AI Panel */}
        <aside className={`border-l border-slate-border bg-zinc-950/95 md:bg-zinc-950/40 flex flex-col h-[100dvh] md:h-full shrink-0 transition-transform md:transition-all duration-300 ease-out fixed md:static top-0 bottom-0 right-0 z-40 pr-[env(safe-area-inset-right)] shadow-2xl md:shadow-none ${
          isRightSidebarExpanded
            ? 'w-[min(100vw,24rem)] max-w-[calc(100vw-env(safe-area-inset-left)-env(safe-area-inset-right))] md:max-w-none md:w-96 translate-x-0'
            : 'w-[min(100vw,24rem)] max-w-[calc(100vw-env(safe-area-inset-left)-env(safe-area-inset-right))] md:max-w-none translate-x-full md:translate-x-0 md:w-12'
        } ${!isRightSidebarExpanded ? 'invisible md:visible' : ''}`}>
          {isRightSidebarExpanded ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Tab Header Bar */}
              <div className="min-h-14 pt-[env(safe-area-inset-top)] md:pt-0 border-b border-slate-border bg-zinc-950/60 flex items-center justify-between gap-2 px-3 shrink-0">
                <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                  <button
                    onClick={() => setActiveRightTab('chat')}
                    className={`h-8 px-2 text-xs font-semibold font-geist flex items-center gap-1.5 transition-colors cursor-pointer rounded-lg shrink-0 ${
                      activeRightTab === 'chat'
                        ? 'bg-zinc-900 text-[#c0c1ff]'
                        : 'text-zinc-550 hover:text-zinc-300 hover:bg-zinc-900/50'
                    }`}
                    title="Chat"
                  >
                    <span className="material-symbols-outlined text-[15px]">forum</span>
                    <span>Chat</span>
                    <span className="text-[10px] px-1 bg-zinc-950 rounded text-zinc-500 font-mono">
                      {messages.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveRightTab('ai')}
                    className={`h-8 px-2 text-xs font-semibold font-geist flex items-center gap-1.5 transition-colors cursor-pointer rounded-lg shrink-0 ${
                      activeRightTab === 'ai'
                        ? 'bg-zinc-900 text-[#c0c1ff]'
                        : 'text-zinc-550 hover:text-zinc-300 hover:bg-zinc-900/50'
                    }`}
                    title="AI Insights"
                  >
                    <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                    <span>Insights</span>
                  </button>

                  {isHost && (
                    <button
                      onClick={() => setActiveRightTab('host')}
                      className={`h-8 px-2 text-xs font-semibold font-geist flex items-center gap-1.5 transition-colors cursor-pointer rounded-lg shrink-0 ${
                        activeRightTab === 'host'
                          ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/30'
                          : 'text-zinc-555 hover:text-zinc-300 hover:bg-zinc-900/50 border border-transparent'
                      }`}
                      title="Host Controls"
                    >
                      <span className="material-symbols-outlined text-[15px]">settings_accessibility</span>
                      <span>Host</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsRightSidebarExpanded(false)}
                    className="p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                    title="Collapse sidebar"
                  >
                    <span className="material-symbols-outlined text-[18px] block">close</span>
                  </button>
                </div>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 flex flex-col overflow-hidden relative">
                {activeRightTab === 'chat' && (
                  <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                    {/* Chat message logs */}
                    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 custom-scrollbar min-h-0">
                      {messages.length === 0 ? (
                        <div className="flex-1 min-h-[18rem] flex flex-col items-center justify-center text-center p-6 text-zinc-650 gap-2 my-auto max-w-[260px] mx-auto select-none">
                          <div className="w-11 h-11 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center mb-1">
                            <span className="material-symbols-outlined text-[20px] text-zinc-550">forum</span>
                          </div>
                          <p className="text-xs font-bold font-geist text-zinc-300">No messages yet</p>
                          <p className="text-[10px] font-inter text-zinc-500 leading-normal">Start the room conversation here.</p>
                        </div>
                      ) : (
                        messages.map((m, idx) => {
                          const isMe = m.sender === displayName;
                          const formatTime = (isoString: string) => {
                            try {
                              const d = new Date(isoString);
                              return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            } catch {
                              return isoString;
                            }
                          };

                          return (
                            <div key={idx} className="flex gap-2 items-start min-w-0">
                              <Avatar name={m.sender} size="xs" color={isMe ? 'bg-indigo-600' : 'bg-zinc-700'} />
                              <div className="flex-1 flex flex-col min-w-0">
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="text-[11px] font-geist font-semibold text-zinc-350 truncate">{m.sender}</span>
                                  <span className="text-[9px] font-mono text-zinc-650 shrink-0">{formatTime(m.timestamp)}</span>
                                </div>
                                <p className="text-xs text-zinc-450 font-inter bg-zinc-900/35 border border-zinc-900/60 p-2 rounded-xl rounded-tl-none mt-0.5 break-words leading-relaxed">
                                  {m.message}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Message Input */}
                    <form onSubmit={handleSendMessage} className="sticky bottom-0 p-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] border-t border-slate-border flex gap-1.5 shrink-0 bg-zinc-950/95 backdrop-blur">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Message everyone..."
                        className="min-w-0 flex-1 px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-850 text-sm md:text-xs text-zinc-300 placeholder-zinc-550 focus:outline-none focus:border-indigo-500/50 focus:ring-0 font-inter"
                      />
                      <button
                        type="submit"
                        className="h-10 w-10 bg-indigo-600 hover:bg-indigo-500 text-zinc-950 rounded-lg flex items-center justify-center cursor-pointer transition-colors shrink-0"
                      >
                        <span className="material-symbols-outlined text-[16px] block font-bold">send</span>
                      </button>
                    </form>
                  </div>
                )}

                {activeRightTab === 'ai' && (
                  <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar pb-[calc(12px+env(safe-area-inset-bottom))]">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold font-geist text-[#c0c1ff] uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                      <span>AI Insights Summary</span>
                    </div>
                    {/* Compact Card */}
                    <div className="p-3 rounded-lg bg-indigo-600/5 border border-indigo-500/10 shadow-md">
                      <div className="flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-[16px] text-indigo-400 mt-0.5">assignment</span>
                        <div className="flex-1 flex flex-col gap-1">
                          <p className="text-[11px] text-zinc-300 leading-relaxed font-inter italic">
                            "Ensure middleware validation handles nested structs."
                          </p>
                          <span className="text-[9px] font-mono text-indigo-400 self-end font-semibold">Assigned to: Alex</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeRightTab === 'host' && isHost && (
                  <div className="flex-1 overflow-hidden">
                    <HostControlPanel
                      roomLink={`${window.location.origin}${window.location.pathname}`}
                      participants={participants.map((p) => ({
                        id: p.socketId,
                        name: p.displayName,
                        role: p.role,
                        status: 'active',
                        avatarColor: p.role === 'host' ? 'bg-indigo-600' : 'bg-zinc-700'
                      }))}
                      autoDelete={autoDelete}
                      onToggleAutoDelete={(val) => {
                        wsClient.send('toggle_auto_delete', { autoDelete: val });
                      }}
                      onTransferHost={(targetId) => {
                        wsClient.send('transfer_host', { targetId });
                      }}
                      onRemoveParticipant={(targetId) => {
                        wsClient.send('remove_participant', { targetId });
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Collapsed Rail (w-12) */
            <div className="flex-1 flex flex-col items-center py-3 justify-between bg-zinc-950/60">
              <div className="flex flex-col items-center gap-4 w-full">
                <button
                  onClick={() => setIsRightSidebarExpanded(true)}
                  className="p-1.5 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  title="Expand sidebar"
                >
                  <span className="material-symbols-outlined text-[18px] block">chevron_left</span>
                </button>

                <div className="w-8 h-px bg-zinc-900" />

                <button
                  onClick={() => {
                    setIsRightSidebarExpanded(true);
                    setActiveRightTab('chat');
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center relative cursor-pointer ${
                    activeRightTab === 'chat' ? 'bg-zinc-900 text-[#c0c1ff]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                  }`}
                  title="Chat"
                >
                  <span className="material-symbols-outlined text-[18px]">forum</span>
                  <span className="absolute -top-1 -right-1 px-1 bg-indigo-600 text-zinc-950 text-[8px] font-bold font-mono rounded-full scale-90">
                    {messages.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setIsRightSidebarExpanded(true);
                    setActiveRightTab('ai');
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer ${
                    activeRightTab === 'ai' ? 'bg-zinc-900 text-[#c0c1ff]' : 'text-zinc-500 hover:text-zinc-350 hover:bg-zinc-900/50'
                  }`}
                  title="AI Insights"
                >
                  <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                </button>

                {isHost && (
                  <button
                    onClick={() => {
                      setIsRightSidebarExpanded(true);
                      setActiveRightTab('host');
                    }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer ${
                      activeRightTab === 'host' ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/30' : 'text-zinc-500 hover:text-zinc-350 hover:bg-zinc-900/50'
                    }`}
                    title="Host Controls"
                  >
                    <span className="material-symbols-outlined text-[18px]">settings_accessibility</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
      <audio
        ref={remoteAudioRef}
        autoPlay
        style={{ display: 'none' }}
      />
      {/* Dynamic audio elements for all remote mic streams (host mic + relayed viewer mics) */}
      {Array.from(remoteMicStreams.entries()).map(([streamId, stream]) => (
        <audio
          key={streamId}
          ref={(el) => {
            if (el) {
              remoteMicAudioRefs.current.set(streamId, el);
              attachRemoteMicStream(el, stream);
            } else {
              remoteMicAudioRefs.current.delete(streamId);
            }
          }}
          autoPlay
          style={{ display: 'none' }}
        />
      ))}
      <WebRTCAuditPanel
        auditReports={auditReports}
        participants={participants}
        sharingActive={sharingState === 'sharing' || sharingState === 'viewing'}
      />
      {searchParams.get('diag') === '1' && (
        <DiagnosticsPanel
          isHost={isHost}
          roomId={roomId || ''}
          getPeerConnectionStates={getPeerConnectionStates}
        />
      )}
      <VoiceNegotiationToast state={voiceNegotiation} />
    </div>
  );
};

