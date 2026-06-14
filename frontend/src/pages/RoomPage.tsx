import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_ROOMS, MOCK_MESSAGES } from '../data/mockData';
import { Avatar } from '../components/Avatar.FC';
import { HostControlPanel } from '../components/HostControlPanel';

export const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  // Find room or fallback to mock design review room
  const room = MOCK_ROOMS.find((r) => r.id === roomId) || MOCK_ROOMS[0];

  // States
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [chatInput, setChatInput] = useState('');
  const [showHostControls, setShowHostControls] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isCamOff, setIsCamOff] = useState(true);
  const [isSharing, setIsSharing] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMessage = {
      id: String(messages.length + 1),
      roomId: room.id,
      senderId: '1',
      senderName: 'Girish K',
      message: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([...messages, newMessage]);
    setChatInput('');
  };

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
            {room.name}
          </h1>
          <span className="text-3xs font-mono bg-zinc-900 border border-zinc-800 text-zinc-500 px-2 py-0.5 rounded flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            live-server-01
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Latency & Rec */}
          <div className="hidden sm:flex items-center gap-4 text-xs font-mono text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-emerald-400">sensors</span>
              <span>24ms</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span>00:42:15</span>
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {/* Action buttons */}
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
        <aside className="w-16 bg-zinc-950/40 border-r border-slate-border flex flex-col items-center py-4 justify-between shrink-0">
          <div className="flex flex-col gap-4">
            <button className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-600/20 text-[#c0c1ff]">
              <span className="material-symbols-outlined text-[20px]">cast_connected</span>
            </button>
            <button className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900">
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            </button>
            <button className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900">
              <span className="material-symbols-outlined text-[20px]">forum</span>
            </button>
          </div>
          <button className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900">
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
        </aside>

        {/* Center Screen Sharing Canvas Area */}
        <main className="flex-1 bg-zinc-950/20 p-6 flex flex-col justify-between overflow-hidden relative">
          {/* Viewport container */}
          <div className="flex-1 flex items-center justify-center rounded-2xl border border-zinc-800/80 bg-[#0d1117]/60 overflow-hidden relative p-8">
            <div className="text-center flex flex-col items-center gap-4 max-w-sm z-10">
              <span className="material-symbols-outlined text-[56px] text-zinc-700">monitor</span>
              <h3 className="text-sm font-bold font-geist text-zinc-400">Waiting for host to share screen</h3>
              <p className="text-xs text-zinc-500 leading-relaxed font-inter">
                Only the host of the room can initiate a sharing stream. Watching sessions is optimized automatically.
              </p>
              <button
                onClick={() => setIsSharing(!isSharing)}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold font-geist bg-indigo-600 text-zinc-950 hover:bg-indigo-500 transition-all cursor-pointer"
              >
                {isSharing ? 'Stop Screen Share' : 'Start Screen Share'}
              </button>
            </div>
            
            {/* Visual presenter floating indicator if sharing */}
            {isSharing && (
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 backdrop-blur">
                <Avatar name="Girish K" size="sm" color="bg-indigo-600" />
                <div className="flex flex-col">
                  <span className="text-3xs text-zinc-300 font-inter font-semibold">Girish is sharing</span>
                  <span className="text-4xs text-zinc-500 font-mono">VS Code (4K, 60fps)</span>
                </div>
              </div>
            )}

            {/* Dummy floating presence avatars inside canvas */}
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 border border-zinc-900 flex items-center justify-center text-xs font-bold text-white">AS</div>
              <div className="w-8 h-8 rounded-full bg-rose-500 border border-zinc-900 flex items-center justify-center text-xs font-bold text-white">SJ</div>
            </div>
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

              <button
                onClick={() => setIsSharing(!isSharing)}
                className={`px-4 h-10 rounded-xl flex items-center justify-center transition-colors border gap-2 text-xs font-bold font-geist ${
                  isSharing
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white border-transparent'
                    : 'bg-zinc-900 border-zinc-850 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">screen_share</span>
                <span>Share</span>
              </button>

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
              <span className="text-xs font-mono bg-zinc-850 px-1.5 py-0.5 rounded text-zinc-400">
                {messages.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
              {messages.map((m) => (
                <div key={m.id} className="flex gap-2.5 items-start">
                  <Avatar name={m.senderName} size="sm" color={m.senderId === '1' ? 'bg-indigo-600' : 'bg-rose-500'} />
                  <div className="flex-1 flex flex-col gap-0.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-geist font-semibold text-zinc-300">{m.senderName}</span>
                      <span className="text-[10px] font-mono text-zinc-500">{m.timestamp}</span>
                    </div>
                    <p className="text-xs text-zinc-450 font-inter bg-zinc-900/40 border border-zinc-900/60 p-2.5 rounded-xl rounded-tl-none">
                      {m.message}
                    </p>
                  </div>
                </div>
              ))}
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
                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-zinc-950 rounded-lg flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[16px] block">send</span>
              </button>
            </form>
          </div>
        </aside>

        {/* Slide-in Host Control Overlay Panel (conditionally rendered) */}
        {showHostControls && (
          <div className="absolute right-0 top-0 h-full shadow-2xl flex z-30 transition-transform duration-300 ease-in-out">
            <HostControlPanel
              onClose={() => setShowHostControls(false)}
              roomName={room.name}
              roomLink={`https://omnisync.io/room/${room.id}`}
              participants={room.participants}
            />
          </div>
        )}
      </div>
    </div>
  );
};
