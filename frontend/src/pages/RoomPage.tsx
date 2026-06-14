import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar.FC';
import { SidebarL1 } from '../components/SidebarL1';
import { ParticipantPanel } from '../components/ParticipantPanel';
import { HostControlPanel } from '../components/HostControlPanel';
import { wsClient } from '../lib/websocket';
import { apiClient } from '../lib/axios';
import { useWebRTC } from '../hooks/useWebRTC';

interface Participant {
  socketId: string;
  displayName: string;
  role: 'host' | 'viewer';
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

  const [showHostControls, setShowHostControls] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isCamOff, setIsCamOff] = useState(true);
  const [autoDelete, setAutoDelete] = useState(true);

  // Check if current user is host
  const currentUserObj = participants.find((p) => p.socketId === currentSocketId);
  const isHost = currentUserObj ? currentUserObj.role === 'host' : false;

  // Automatically close host controls overlay if isHost transitions to false
  useEffect(() => {
    if (!isHost) {
      setShowHostControls(false);
    }
  }, [isHost]);

  // Viewer IDs for WebRTC (all non-host participants)
  const viewerIds = participants
    .filter((p) => p.role !== 'host')
    .map((p) => p.socketId);

  // WebRTC hook
  const { sharingState, remoteStream, startSharing, stopSharing, errorMessage } = useWebRTC({
    isHost,
    currentSocketId,
    viewerIds,
  });

  const isSharing = sharingState === 'sharing';
  const isViewing = sharingState === 'viewing';
  const isRequesting = sharingState === 'requesting';

  // Ref for remote video element
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

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
      await startSharing();
    }
  }, [isSharing, startSharing, stopSharing]);

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
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200"
          >
            <span className="material-symbols-outlined text-[20px] block">arrow_back</span>
          </button>

          <div className="h-4 w-px bg-zinc-800" />

          <h1 className="text-sm font-bold font-geist text-white tracking-tight leading-none">
            Room: {roomId}
          </h1>
          <span className="text-3xs font-mono bg-zinc-900 border border-zinc-800 text-zinc-500 px-2 py-0.5 rounded flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            live-server-01
          </span>
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

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {/* Action buttons */}
          {isHost && (
            <button
              onClick={() => setShowHostControls(!showHostControls)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-geist border transition-colors flex items-center gap-1.5 ${
                showHostControls
                  ? 'bg-indigo-600 border-indigo-500 text-zinc-950'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
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
          participants={participants}
          currentUserId={currentSocketId}
        />

        {/* Center Screen Sharing Canvas Area */}
        <main className="flex-1 bg-zinc-950/20 p-6 flex flex-col justify-between overflow-hidden relative">
          {/* Error message banner */}
          {errorMessage && (
            <div className="mb-3 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 font-inter flex items-center gap-2 shrink-0">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {errorMessage}
            </div>
          )}

          {/* Viewport container */}
          <div className="flex-1 flex items-center justify-center rounded-2xl border border-zinc-800/80 bg-[#0d1117]/60 overflow-hidden relative">

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
                <Avatar name={displayName} size="sm" color="bg-indigo-600" />
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
          <div className="mt-4 flex justify-center z-10 shrink-0">
            <div className="glass-panel px-4 py-2 rounded-2xl flex items-center gap-3 shadow-2xl">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors border ${
                  isMuted
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    : 'bg-zinc-900 border-zinc-850 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isMuted ? 'mic_off' : 'mic'}
                </span>
              </button>

              <button
                onClick={() => setIsCamOff(!isCamOff)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors border ${
                  isCamOff
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    : 'bg-zinc-900 border-zinc-850 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isCamOff ? 'videocam_off' : 'videocam'}
                </span>
              </button>

              {/* Screen share button — host only */}
              {isHost && (
                <button
                  onClick={handleShareToggle}
                  disabled={isRequesting}
                  className={`px-4 h-10 rounded-xl flex items-center justify-center transition-colors border gap-2 text-xs font-bold font-geist ${
                    isSharing
                      ? 'bg-rose-600 hover:bg-rose-500 text-white border-transparent'
                      : isRequesting
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white border-transparent hover:opacity-90'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {isSharing ? 'stop_screen_share' : 'screen_share'}
                  </span>
                  <span>{isSharing ? 'Stop' : isRequesting ? 'Requesting…' : 'Share'}</span>
                </button>
              )}

              <div className="w-px h-6 bg-zinc-800" />

              <button
                onClick={() => navigate('/dashboard')}
                className="w-10 h-10 rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">call_end</span>
              </button>
            </div>
          </div>
        </main>

        {/* Right Chat and AI Panel */}
        <aside className="w-96 border-l border-slate-border bg-zinc-950/40 flex flex-col shrink-0">
          <div className="flex-1 flex flex-col border-b border-slate-border overflow-hidden">
            {/* AI Assistant summary view */}
            <div className="p-4 border-b border-slate-border bg-zinc-950/20">
              <div className="flex items-center gap-1.5 text-xs font-bold font-geist text-[#c0c1ff] uppercase tracking-wider mb-2">
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                <span>AI Insights</span>
              </div>
              <div className="p-3 rounded-lg bg-indigo-600/5 border border-indigo-500/10">
                <p className="text-[11px] text-zinc-400 leading-relaxed font-inter italic">
                  "Ensure middleware validation handles nested structs." (assigned to Alex)
                </p>
              </div>
            </div>

            {/* Chat message logs */}
            <div className="p-4 border-b border-slate-border flex items-center justify-between bg-zinc-950/20">
              <span className="text-xs font-bold font-geist text-white uppercase tracking-wider">Room Chat</span>
              <span className="text-xs font-mono bg-zinc-850 px-1.5 py-0.5 rounded text-[#c0c1ff]">
                {messages.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
              {messages.map((m, idx) => {
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
                  <div key={idx} className="flex gap-2.5 items-start">
                    <Avatar name={m.sender} size="sm" color={isMe ? 'bg-indigo-600' : 'bg-zinc-700'} />
                    <div className="flex-1 flex flex-col gap-0.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-geist font-semibold text-zinc-300">{m.sender}</span>
                        <span className="text-[10px] font-mono text-zinc-500">{formatTime(m.timestamp)}</span>
                      </div>
                      <p className="text-xs text-zinc-400 font-inter bg-zinc-900/40 border border-zinc-900/60 p-2.5 rounded-xl rounded-tl-none">
                        {m.message}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Message Input */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-border flex gap-2 shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Message everyone..."
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-850 text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-0 font-inter"
              />
              <button
                type="submit"
                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-zinc-950 rounded-lg flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] block">send</span>
              </button>
            </form>
          </div>
        </aside>

        {/* Slide-in Host Control Overlay Panel */}
        {showHostControls && isHost && (
          <div className="absolute right-0 top-0 h-full shadow-2xl flex z-30 transition-transform duration-300 ease-in-out">
            <HostControlPanel
              onClose={() => setShowHostControls(false)}
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
  );
};
