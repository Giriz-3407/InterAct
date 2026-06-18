console.log("CURSOR_BUILD_MARKER_20260615 \u2014 SOURCE: C:\\Users\\Girish\\Desktop\\InterAct\\frontend");
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar.FC';
import { SidebarL1 } from '../components/SidebarL1';
import { ParticipantPanel } from '../components/ParticipantPanel';
import { HostControlPanel } from '../components/HostControlPanel';
import { wsClient } from '../lib/websocket';
import { apiClient } from '../lib/axios';
import { useWebRTC } from '../hooks/useWebRTC';
import { useCursorPresence } from '../hooks/useCursorPresence';
import { AgentStatusIndicator } from '../components/AgentStatusIndicator';
import { WebRTCAuditPanel } from '../components/WebRTCAuditPanel';


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
  const [isLeftPanelExpanded, setIsLeftPanelExpanded] = useState(true);
  const [isRightSidebarExpanded, setIsRightSidebarExpanded] = useState(true);
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
      if (el && el.srcObject !== stream) {
        el.srcObject = stream;
        el.muted = false;
        el.volume = 1.0;
      }
    });
    // Clean up refs for streams that no longer exist
    remoteMicAudioRefs.current.forEach((_, streamId) => {
      if (!remoteMicStreams.has(streamId)) {
        remoteMicAudioRefs.current.delete(streamId);
      }
    });
  }, [remoteMicStreams]);

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
  };

  const handleShareToggle = useCallback(async () => {
    if (isSharing) {
      stopSharing();
    } else {
      setIsMuted(false); // Unmute mic by default when starting share
      await startSharing();
    }
  }, [isSharing, startSharing, stopSharing]);

  const handleHostControlsClick = useCallback(() => {
    if (!isRightSidebarExpanded) {
      setIsRightSidebarExpanded(true);
      setActiveRightTab('host');
    } else {
      if (activeRightTab === 'host') {
        setIsRightSidebarExpanded(false);
      } else {
        setActiveRightTab('host');
      }
    }
  }, [isRightSidebarExpanded, activeRightTab]);

  // Name Entry Prompt Dialog overlay
  if (showNamePrompt) {
    return (
      <div className="min-h-screen bg-bg text-on-surface flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="glass-panel w-full max-w-sm rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
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
    <div className="min-h-screen bg-bg text-on-surface font-inter flex flex-col h-screen overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-slate-border bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-6 z-25 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold font-geist text-white tracking-tight leading-none">
            Room: {roomId}
          </h1>
          {isHost && <AgentStatusIndicator />}
        </div>

        <div className="flex items-center gap-3">
          {/* Sharing status indicator in header */}
          {isSharing && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-rose-400 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              LIVE
            </span>
          )}
          {isViewing && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-indigo-400">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Receiving Stream
            </span>
          )}

          <div className="h-4 w-px bg-zinc-850 hidden sm:block" />

          {/* Action buttons */}
          {isHost && (
            <button
              onClick={handleHostControlsClick}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-geist border transition-colors flex items-center gap-1.5 cursor-pointer ${
                isRightSidebarExpanded && activeRightTab === 'host'
                  ? 'bg-indigo-950 text-indigo-400 border-indigo-900/30'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">settings_accessibility</span>
              <span>Host Controls</span>
            </button>
          )}

          <button
            onClick={() => navigate('/dashboard')}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold font-geist bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/10 cursor-pointer"
          >
            Leave Room
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Icon Rail */}
        <SidebarL1 />

        {/* Live Participant presence panel */}
        <ParticipantPanel
          roomCode={roomId || ''}
          participants={participants.map((p) => p.socketId === currentSocketId ? { ...p, micMuted: isMuted } : p)}
          currentUserId={currentSocketId}
          isExpanded={isLeftPanelExpanded}
          onToggleExpand={() => setIsLeftPanelExpanded(!isLeftPanelExpanded)}
        />

        {/* Center Screen Sharing Canvas Area */}
        <main className="flex-1 bg-zinc-950/20 p-3 flex flex-col justify-between overflow-hidden relative gap-3">
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
          <div ref={viewportRef} className="flex-1 flex items-center justify-center rounded-2xl border border-zinc-850/60 bg-[#0d1117]/60 overflow-hidden relative w-full h-full">

            {/* Active Indicators Row */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 flex gap-2 pointer-events-none">
              {laserModeActive && (
                <div className="bg-zinc-950/85 text-zinc-100 px-3 py-1.5 rounded-full text-xs font-semibold border border-zinc-800 shadow-md flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>🟢 Laser Active</span>
                </div>
              )}
              {spotlightActive && (
                <div className="bg-zinc-950/85 text-zinc-100 px-3 py-1.5 rounded-full text-xs font-semibold border border-zinc-800 shadow-md flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>🔦 Spotlight Active</span>
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
              <div className="text-center flex flex-col items-center gap-4 max-w-sm z-10 p-8">
                {isRequesting ? (
                  <>
                    <div className="w-12 h-12 rounded-full border-2 border-indigo-500/40 border-t-indigo-500 animate-spin" />
                    <h3 className="text-sm font-bold font-geist text-zinc-400">Opening screen picker…</h3>
                    <p className="text-xs text-zinc-500 font-inter">Select a window, tab, or entire screen to share.</p>
                  </>
                ) : isSharing ? (
                  <>
                    <span className="material-symbols-outlined text-[48px] text-indigo-500">screen_share</span>
                    <h3 className="text-sm font-bold font-geist text-zinc-300">You are sharing your screen</h3>
                    <p className="text-xs text-zinc-500 font-inter leading-relaxed">
                      Participants in this room can see your screen. Use the Stop button to end sharing.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[56px] text-zinc-700">monitor</span>
                    <h3 className="text-sm font-bold font-geist text-zinc-400">
                      {isHost ? 'Ready to share your screen' : 'Waiting for host to share screen'}
                    </h3>
                    <p className="text-xs text-zinc-500 leading-relaxed font-inter">
                      {isHost
                        ? 'Click "Start Sharing" below to begin broadcasting your screen to all participants.'
                        : 'Only the host of the room can initiate a sharing stream. Watching sessions is optimized automatically.'}
                    </p>

                    {isHost && (
                      <button
                        onClick={handleShareToggle}
                        className="mt-2 px-5 py-2.5 rounded-xl text-xs font-semibold font-geist bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:opacity-90 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">screen_share</span>
                        Start Sharing
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Presenter floating pill when sharing */}
            {isSharing && (
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 backdrop-blur">
                <Avatar name={displayName} size="xs" color="bg-indigo-600" />
                <div className="flex flex-col">
                  <span className="text-3xs text-zinc-300 font-inter font-semibold">{displayName} is sharing</span>
                  <span className="text-4xs text-zinc-500 font-mono">LIVE • Screen</span>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse ml-1" />
              </div>
            )}

            {/* Viewer status pill */}
            {isViewing && (
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 backdrop-blur">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-3xs text-zinc-300 font-inter font-semibold">Receiving live stream</span>
              </div>
            )}
          </div>

          {/* Floating RTC controls bar */}
          <div className="flex justify-center z-10 shrink-0">
            <div className="glass-panel px-3 py-1.5 rounded-xl flex items-center gap-2.5 shadow-2xl">
              {/* Microphone toggle — all participants */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border cursor-pointer ${
                  isMuted
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    : 'bg-zinc-900 border-zinc-850 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isMuted ? 'mic_off' : 'mic'}
                </span>
              </button>

              {/* Screen share button — host only */}
              {isHost && (
                <button
                  onClick={handleShareToggle}
                  disabled={isRequesting}
                  className={`px-3.5 h-8 rounded-lg flex items-center justify-center transition-all border gap-1.5 text-xs font-bold font-geist cursor-pointer ${
                    isSharing
                      ? 'bg-rose-600 hover:bg-rose-500 text-white border-transparent'
                      : isRequesting
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white border-transparent hover:opacity-90'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isSharing ? 'stop_screen_share' : 'screen_share'}
                  </span>
                  <span>{isSharing ? 'Stop Sharing' : isRequesting ? 'Requesting…' : 'Share Screen'}</span>
                </button>
              )}

              {/* Host Toggle Shared Audio */}
              {isHost && isSharing && (
                <>
                  <div className="w-px h-5 bg-zinc-800/80" />
                  <button
                    onClick={toggleHostAudio}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border cursor-pointer ${
                      !hostAudioEnabled
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : 'bg-zinc-900 border-zinc-850 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                    title={hostAudioEnabled ? 'Mute shared audio' : 'Unmute shared audio'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {hostAudioEnabled ? 'volume_up' : 'volume_off'}
                    </span>
                  </button>
                </>
              )}

              {/* Viewer Local Mute/Volume controls */}
              {isViewing && (
                <>
                  <div className="w-px h-5 bg-zinc-800/80" />
                  <button
                    onClick={() => setViewerMuted(!viewerMuted)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border cursor-pointer ${
                      viewerMuted
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : 'bg-zinc-900 border-zinc-850 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                    title={viewerMuted ? 'Unmute remote audio' : 'Mute remote audio'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {viewerMuted ? 'volume_off' : 'volume_up'}
                    </span>
                  </button>
                  <div className="flex items-center gap-1.5 px-1">
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
                      className="w-16 h-1 bg-zinc-805 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      style={{
                        WebkitAppearance: 'none',
                        outline: 'none',
                      }}
                    />
                  </div>
                </>
              )}

              <div className="w-px h-5 bg-zinc-800/80" />

              <button
                onClick={() => navigate('/dashboard')}
                className="w-8 h-8 rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center cursor-pointer transition-colors"
                title="Leave Room"
              >
                <span className="material-symbols-outlined text-[18px]">call_end</span>
              </button>
            </div>
          </div>
        </main>

        {/* Right Chat and AI Panel */}
        <aside className={`border-l border-slate-border bg-zinc-950/40 flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          isRightSidebarExpanded ? 'w-80' : 'w-12'
        }`}>
          {isRightSidebarExpanded ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Tab Header Bar */}
              <div className="h-11 border-b border-slate-border bg-zinc-950/60 flex items-center justify-between px-2 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveRightTab('chat')}
                    className={`px-2.5 py-1 text-xs font-semibold font-geist flex items-center gap-1.5 transition-colors cursor-pointer rounded-lg ${
                      activeRightTab === 'chat'
                        ? 'bg-zinc-900 text-[#c0c1ff]'
                        : 'text-zinc-550 hover:text-zinc-300 hover:bg-zinc-900/50'
                    }`}
                    title="Chat"
                  >
                    <span className="material-symbols-outlined text-[15px]">forum</span>
                    <span className="hidden sm:inline">Chat</span>
                    <span className="text-[10px] px-1 bg-zinc-950 rounded text-zinc-500 font-mono">
                      {messages.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveRightTab('ai')}
                    className={`px-2.5 py-1 text-xs font-semibold font-geist flex items-center gap-1.5 transition-colors cursor-pointer rounded-lg ${
                      activeRightTab === 'ai'
                        ? 'bg-zinc-900 text-[#c0c1ff]'
                        : 'text-zinc-550 hover:text-zinc-300 hover:bg-zinc-900/50'
                    }`}
                    title="AI Insights"
                  >
                    <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                    <span className="hidden sm:inline">Insights</span>
                  </button>

                  {isHost && (
                    <button
                      onClick={() => setActiveRightTab('host')}
                      className={`px-2.5 py-1 text-xs font-semibold font-geist flex items-center gap-1.5 transition-colors cursor-pointer rounded-lg ${
                        activeRightTab === 'host'
                          ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/30'
                          : 'text-zinc-555 hover:text-zinc-300 hover:bg-zinc-900/50 border border-transparent'
                      }`}
                      title="Host Controls"
                    >
                      <span className="material-symbols-outlined text-[15px]">settings_accessibility</span>
                      <span className="hidden sm:inline">Host</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setIsRightSidebarExpanded(false)}
                  className="p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  title="Collapse sidebar"
                >
                  <span className="material-symbols-outlined text-[18px] block">chevron_right</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 flex flex-col overflow-hidden relative">
                {activeRightTab === 'chat' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Chat message logs */}
                    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 custom-scrollbar">
                      {messages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-600 gap-2 mt-10">
                          <span className="material-symbols-outlined text-[24px]">chat_bubble_outline</span>
                          <p className="text-2xs font-inter leading-relaxed">No messages yet. Send a message to start the room conversation.</p>
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
                            <div key={idx} className="flex gap-2 items-start">
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
                    <form onSubmit={handleSendMessage} className="p-2.5 border-t border-slate-border flex gap-1.5 shrink-0 bg-zinc-950/20">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Message everyone..."
                        className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-850 text-xs text-zinc-300 placeholder-zinc-550 focus:outline-none focus:border-indigo-500/50 focus:ring-0 font-inter"
                      />
                      <button
                        type="submit"
                        className="p-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-zinc-950 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px] block font-bold">send</span>
                      </button>
                    </form>
                  </div>
                )}

                {activeRightTab === 'ai' && (
                  <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold font-geist text-[#c0c1ff] uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                      <span>AI Insights Summary</span>
                    </div>
                    {/* Compact Card */}
                    <div className="p-3 rounded-xl bg-indigo-600/5 border border-indigo-500/10 shadow-md">
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
                      roomLink={window.location.href}
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
      {Array.from(remoteMicStreams.entries()).map(([streamId]) => (
        <audio
          key={streamId}
          ref={(el) => {
            if (el) {
              remoteMicAudioRefs.current.set(streamId, el);
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
    </div>
  );
};

