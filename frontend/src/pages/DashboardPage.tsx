import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { JoinRoomModal } from '../components/JoinRoomModal';
import { MOCK_ROOMS, MOCK_PAST_SESSIONS } from '../data/mockData';
import { apiClient } from '../lib/axios';
import type { PastSession } from '../types';
import interactLogo from '../assets/branding/interact-icon-dark-mode.svg';
import { useAuth } from '../context/AuthContext';
import { AgentStatusIndicator } from '../components/AgentStatusIndicator';

/* ─────────────────────────────────────────────────────────────
   STAT CARD
───────────────────────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon, accent = '#c0c1ff' }) => (
  <div className="db-card p-4 flex flex-col gap-3">
    <div className="flex items-start justify-between">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}14` }}>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      {sub && (
        <span className="text-[10px] font-geist text-zinc-600 bg-[#1a1a1d] px-1.5 py-0.5 rounded-full">{sub}</span>
      )}
    </div>
    <div>
      <p className="text-2xl font-black font-geist text-white tracking-tight leading-none mb-0.5">{value}</p>
      <p className="text-xs text-zinc-500 font-inter">{label}</p>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   LIVE ROOM CARD
───────────────────────────────────────────────────────────── */
interface LiveRoomCardProps {
  name: string;
  hostName: string;
  participantCount: number;
  duration: string;
  onJoin: () => void;
}

const WaveformBarsSmall: React.FC = () => (
  <div className="flex items-end gap-[2px]" style={{ height: '10px' }}>
    {[0, 120, 240, 120, 0].map((delay, i) => (
      <div
        key={i}
        style={{
          width: '2px', height: '100%',
          background: '#10b981', borderRadius: '1px',
          transformOrigin: 'bottom',
          animation: `waveform 0.8s ease-in-out ${delay}ms infinite`,
          transform: 'scaleY(0.3)',
        }}
      />
    ))}
  </div>
);

const LiveRoomCard: React.FC<LiveRoomCardProps> = ({ name, hostName, participantCount, duration, onJoin }) => (
  <div className="db-card p-4 flex flex-col gap-3 group">
    {/* Header */}
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <span className="text-[10px] font-bold font-geist text-red-400 uppercase tracking-wider">Live</span>
        </div>
        <h3 className="text-sm font-bold font-geist text-white leading-snug truncate">{name}</h3>
      </div>
      <span className="text-[10px] font-mono text-zinc-500 bg-[#1a1a1d] px-1.5 py-0.5 rounded flex-shrink-0 mt-1">{duration}</span>
    </div>

    {/* Meta */}
    <div className="flex items-center gap-3 text-xs text-zinc-500 font-inter">
      <div className="flex items-center gap-1.5">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
        <span>{hostName}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <WaveformBarsSmall />
        <span>{participantCount} active</span>
      </div>
    </div>

    {/* Join */}
    <button
      onClick={onJoin}
      className="w-full py-2 rounded-lg text-xs font-semibold font-geist text-[#09090b] transition-all cursor-pointer"
      style={{ background: '#c0c1ff' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#d0d1ff')}
      onMouseLeave={e => (e.currentTarget.style.background = '#c0c1ff')}
    >
      Join Room
    </button>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   ACTIVITY FEED ITEM
───────────────────────────────────────────────────────────── */
const feedItems = [
  { icon: '▶', color: '#c0c1ff', bg: '#c0c1ff14', user: 'Girish K', action: 'started screen sharing', room: 'Design Review', time: '2m ago' },
  { icon: '+', color: '#10b981', bg: '#10b98114', user: 'Sarah Johnson', action: 'joined', room: 'Weekly Tech Sync', time: '5m ago' },
  { icon: '✦', color: '#c0c1ff', bg: '#c0c1ff14', user: 'AI', action: 'generated session summary', room: 'API Review', time: '12m ago' },
  { icon: '⊕', color: '#8b5cf6', bg: '#8b5cf614', user: 'Alex Smith', action: 'created room', room: 'Sprint Planning', time: '24m ago' },
  { icon: '✓', color: '#52525b', bg: '#52525b14', user: 'Marco Rossi', action: 'ended session', room: 'Client Demo', time: '1h ago' },
];

const ActivityFeedItem: React.FC<typeof feedItems[0]> = ({ icon, color, bg, user, action, room, time }) => (
  <div className="flex items-start gap-3 py-3 border-b border-[#1a1a1d] last:border-b-0">
    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold" style={{ background: bg, color }}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-zinc-300 font-inter leading-snug">
        <span className="font-semibold text-zinc-100 font-geist">{user}</span>
        {' '}{action}{' '}
        <span className="text-[#c0c1ff]">{room}</span>
      </p>
      <p className="text-[11px] text-zinc-600 mt-0.5 font-geist">{time}</p>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   RECENT ROOM (jump-back) ROW
───────────────────────────────────────────────────────────── */
interface JumpBackRowProps {
  roomCode: string;
  participantCount: number;
  onClick: () => void;
}

const JumpBackRow: React.FC<JumpBackRowProps> = ({ roomCode, participantCount, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between p-3 rounded-xl border border-[#1e1e21] bg-[#111113] hover:border-[#c0c1ff]/20 hover:bg-[#141416] transition-all text-left cursor-pointer group"
  >
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-[#c0c1ff]/8 border border-[#c0c1ff]/15 flex items-center justify-center flex-shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c0c1ff" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold font-geist text-zinc-200">{roomCode}</p>
        <p className="text-xs text-zinc-500 font-inter">
          {participantCount > 0 ? `${participantCount} active now` : 'Retained'}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      {participantCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      <svg className="text-zinc-600 group-hover:text-[#c0c1ff] transition-colors" width="14" height="14"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </div>
  </button>
);

/* ─────────────────────────────────────────────────────────────
   DASHBOARD HEADER (replaces TopBar)
───────────────────────────────────────────────────────────── */
interface DashHeaderProps {
  onCreateRoom: () => void;
  onToggleSidebar: () => void;
  activeRoomCount: number;
}

const DashHeader: React.FC<DashHeaderProps> = ({ onCreateRoom, onToggleSidebar, activeRoomCount }) => (
  <header className="sticky top-0 z-20 bg-[#09090b]/90 backdrop-blur-md border-b border-[#1e1e21]">
    <div className="flex items-center justify-between px-4 sm:px-6 h-14">
      {/* Left: hamburger (mobile) + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-[#1a1a1d] transition-colors cursor-pointer"
          aria-label="Toggle sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        {/* Workspace title */}
        <div className="flex items-center gap-2">
          <img src={interactLogo} alt="" className="h-5 w-auto md:hidden" />
          <h1 className="text-sm font-bold font-geist text-white hidden sm:block">Workspace</h1>
          {activeRoomCount > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-400/8 border border-emerald-400/20 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-semibold font-geist text-emerald-400">{activeRoomCount} live</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: search + CTA */}
      <div className="flex items-center gap-2 sm:gap-3">
        <AgentStatusIndicator />
        {/* Command-palette search */}
        <button
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111113] border border-[#1e1e21] text-zinc-500 hover:border-[#27272a] hover:text-zinc-300 transition-all cursor-pointer text-xs font-geist"
          onClick={() => {}}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span>Search rooms...</span>
          <kbd className="ml-2 text-[9px] border border-[#27272a] px-1 rounded text-zinc-600">⌘K</kbd>
        </button>
        <button
          onClick={onCreateRoom}
          className="lp-btn-primary text-xs h-9 px-3 sm:px-4"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="hidden xs:inline">Create Room</span>
          <span className="xs:hidden">New</span>
        </button>
      </div>
    </div>
  </header>
);

/* ─────────────────────────────────────────────────────────────
   MAIN DASHBOARD PAGE
───────────────────────────────────────────────────────────── */
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'join'>('join');
  const [apiError, setApiError] = useState('');
  const [selectedRoomCode, setSelectedRoomCode] = useState('');
  const [jumpBackRooms, setJumpBackRooms] = useState<{ roomCode: string; active: boolean; participantCount: number }[]>([]);
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);

  const totalActiveRooms = MOCK_ROOMS.length;

  useEffect(() => {
    apiClient
      .get<PastSession[]>('/api/transcripts/sessions')
      .then((data) => {
        setPastSessions(data || []);
      })
      .catch((err) => {
        console.error('Failed to fetch dashboard sessions', err);
        setPastSessions(MOCK_PAST_SESSIONS);
      });
  }, []);

  useEffect(() => {
    const fetchJumpBackRooms = async () => {
      try {
        const stored = JSON.parse(localStorage.getItem('joinedRooms') || '[]');
        if (stored.length === 0) return;
        const promises = stored.map(async (code: string) => {
          try {
            return await apiClient.get<{ roomCode: string; active: boolean; participantCount: number }>(`/api/rooms/${code}`);
          } catch { return null; }
        });
        const results = await Promise.all(promises);
        const validRooms = results.filter((r): r is { roomCode: string; active: boolean; participantCount: number } => r !== null);
        setJumpBackRooms(validRooms);
        localStorage.setItem('joinedRooms', JSON.stringify(validRooms.map(r => r.roomCode)));
      } catch (err) { console.error('Failed to load jump back rooms:', err); }
    };
    fetchJumpBackRooms();
  }, []);

  const handleDirectCreateRoom = async () => {
    setApiError('');
    try {
      const data = await apiClient.post<{ roomCode: string }>('/api/rooms', {});
      if (data?.roomCode && user?.fullName) {
        navigate(`/room/${data.roomCode}?name=${encodeURIComponent(user.fullName)}`);
      }
    } catch (err: any) {
      console.error(err);
      setApiError('Server error. Please try again.');
    }
  };

  useEffect(() => {
    const handleTriggerCreate = () => {
      handleDirectCreateRoom();
    };
    window.addEventListener('trigger-create-room', handleTriggerCreate);
    return () => window.removeEventListener('trigger-create-room', handleTriggerCreate);
  }, [user]);

  useEffect(() => {
    if (apiError) {
      const t = setTimeout(() => setApiError(''), 4000);
      return () => clearTimeout(t);
    }
  }, [apiError]);

  const handleModalSubmit = async (_displayName: string, roomCode?: string) => {
    setApiError('');
    if (!roomCode) return;
    try {
      const roomData = await apiClient.get<{ roomCode: string; active: boolean }>(`/api/rooms/${roomCode}`);
      if (roomData?.active && user?.fullName) {
        navigate(`/room/${roomCode}?name=${encodeURIComponent(user.fullName)}`);
      } else {
        setApiError('Room is inactive.');
        setModalOpen(false);
      }
    } catch {
      setApiError('Room not found. Please verify the code.');
      setModalOpen(false);
    }
  };

  const handleCreateTrigger = () => {
    handleDirectCreateRoom();
  };
  const handleJoinTrigger = () => { setSelectedRoomCode(''); setModalMode('join'); setModalOpen(true); };
  const handleJumpBackIn = (roomCode: string) => {
    if (user?.fullName) {
      navigate(`/room/${roomCode}?name=${encodeURIComponent(user.fullName)}`);
    }
  };

  return (
    <AppLayout context="dashboard">
      {/* Header */}
      <DashHeader
        onCreateRoom={handleCreateTrigger}
        onToggleSidebar={() => window.dispatchEvent(new CustomEvent('toggle-sidebar'))}
        activeRoomCount={totalActiveRooms}
      />

      {/* Error toast */}
      {apiError && (
        <div className="fixed top-4 right-4 z-50 w-80 bg-[#111113] border border-red-500/30 p-4 rounded-xl shadow-2xl flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold font-geist text-red-400 mb-0.5">Room Error</p>
            <p className="text-xs text-zinc-400 font-inter leading-relaxed">{apiError}</p>
          </div>
          <button onClick={() => setApiError('')} className="text-zinc-600 hover:text-zinc-300 cursor-pointer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      )}

      {/* ── MAIN SCROLLABLE AREA ── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8">

          {/* ── WORKSPACE HERO ── */}
          <section className="relative overflow-hidden rounded-2xl border border-[#1e1e21] bg-[#0d0d10] p-6 sm:p-8">
            {/* Ambient radial */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.1) 0%, transparent 60%)',
            }} />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              {/* Left: greeting */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-geist text-emerald-400">Workspace online</span>
                </div>
                <h2 className="font-geist font-black text-white tracking-tight leading-tight mb-2"
                  style={{ fontSize: 'clamp(22px, 3vw, 32px)' }}>
                  Ready to collaborate?
                </h2>
                <p className="text-sm text-zinc-400 max-w-md leading-relaxed">
                  Your collaboration workspace is active.{' '}
                  <span className="text-zinc-300">{totalActiveRooms} live {totalActiveRooms === 1 ? 'room' : 'rooms'}</span>
                  {' '}running right now.
                </p>
              </div>
              {/* Right: quick stats strip */}
              <div className="flex gap-3 sm:flex-col sm:items-end">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black font-geist text-white">{totalActiveRooms}</span>
                  <span className="text-xs text-zinc-500 font-inter leading-tight">Active<br/>rooms</span>
                </div>
                <div className="w-px bg-[#1e1e21] sm:hidden" />
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black font-geist text-white">
                    {MOCK_ROOMS.reduce((a, r) => a + r.participants.length, 0)}
                  </span>
                  <span className="text-xs text-zinc-500 font-inter leading-tight">Live<br/>collaborators</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── STAT CARDS ── */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Rooms created today"
              value="6"
              sub="+2 vs yesterday"
              accent="#c0c1ff"
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>}
            />
            <StatCard
              label="Collaboration time"
              value="4h 12m"
              sub="Today"
              accent="#10b981"
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
            />
            <StatCard
              label="Active participants"
              value={MOCK_ROOMS.reduce((a, r) => a + r.participants.length, 0)}
              sub="Right now"
              accent="#8b5cf6"
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
            />
            <StatCard
              label="AI summaries"
              value="3"
              sub="This week"
              accent="#f59e0b"
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.5 9H22L16 13.5L18.5 20.5L12 16L5.5 20.5L8 13.5L2 9H9.5L12 2Z" fill="#f59e0b" /></svg>}
            />
          </section>

          {/* ── PRIMARY ACTIONS ── */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Create Room — dominant */}
            <button
              onClick={handleCreateTrigger}
              className="db-action-primary group text-left cursor-pointer relative overflow-hidden rounded-2xl p-6 sm:p-7 flex flex-col gap-4 min-h-[160px] sm:min-h-[180px] transition-all"
            >
              {/* Subtle ambient */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 30% 40%, rgba(192,193,255,0.06) 0%, transparent 70%)' }} />
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#c0c1ff18', border: '1px solid #c0c1ff25' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0c1ff" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              {/* Text */}
              <div>
                <h3 className="text-base font-black font-geist text-white tracking-tight mb-1.5">Create Room</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Launch an instant collaboration room. Share your link and your team joins in seconds.
                </p>
              </div>
              {/* Arrow */}
              <div className="flex items-center gap-1.5 mt-auto">
                <span className="text-xs font-semibold font-geist text-[#c0c1ff]">Start now</span>
                <svg className="transition-transform group-hover:translate-x-1" width="14" height="14"
                  viewBox="0 0 24 24" fill="none" stroke="#c0c1ff" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Join Room */}
            <button
              onClick={handleJoinTrigger}
              className="db-action-secondary group text-left cursor-pointer rounded-2xl p-6 sm:p-7 flex flex-col gap-4 min-h-[160px] sm:min-h-[180px] transition-all"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#1a1a1d] border border-[#27272a]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-black font-geist text-zinc-200 tracking-tight mb-1.5">Join a Room</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Have a room code? Enter it to join an active collaboration session instantly.
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-auto">
                <span className="text-xs font-semibold font-geist text-zinc-500 group-hover:text-zinc-300 transition-colors">Enter code</span>
                <svg className="transition-transform group-hover:translate-x-1 text-zinc-500 group-hover:text-zinc-300" width="14" height="14"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </section>

          {/* ── BOTTOM GRID: Rooms + Feed + Intelligence ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

            {/* LEFT + MIDDLE: Live Rooms + Recent Rooms */}
            <div className="lg:col-span-2 flex flex-col gap-4 sm:gap-6">

              {/* Live rooms */}
              {MOCK_ROOMS.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-bold font-geist text-zinc-500 uppercase tracking-widest">
                      Active Rooms ({MOCK_ROOMS.length})
                    </h2>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[10px] text-zinc-600 font-geist">Live</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {MOCK_ROOMS.map(room => (
                      <LiveRoomCard
                        key={room.id}
                        name={room.name}
                        hostName={room.hostName}
                        participantCount={room.participants.length}
                        duration={room.id === 'ABC-123' ? '45 min' : '12 min'}
                        onJoin={() => navigate(`/room/${room.id}`)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Jump back in */}
              <section>
                <h2 className="text-xs font-bold font-geist text-zinc-500 uppercase tracking-widest mb-3">
                  Recent Rooms
                </h2>
                {jumpBackRooms.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {jumpBackRooms.map(room => (
                      <JumpBackRow
                        key={room.roomCode}
                        roomCode={room.roomCode}
                        participantCount={room.participantCount}
                        onClick={() => handleJumpBackIn(room.roomCode)}
                      />
                    ))}
                  </div>
                ) : (
                  /* Recent rooms from DB */
                  <div className="flex flex-col gap-2">
                    {pastSessions.slice(0, 3).map(session => (
                      <div key={session.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-[#1e1e21] bg-[#111113]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#1a1a1d] flex items-center justify-center flex-shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold font-geist text-zinc-300 leading-none mb-0.5">{session.roomName}</p>
                            <p className="text-[11px] text-zinc-600 font-inter">{session.hostName} · {session.durationString}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold font-geist uppercase px-1.5 py-0.5 rounded-full ${
                            session.status === 'completed'
                              ? 'bg-emerald-400/10 text-emerald-500'
                              : 'bg-zinc-800 text-zinc-500'
                          }`}>
                            {session.status}
                          </span>
                          <span className="text-[10px] text-zinc-600 font-geist">{session.participantsCount}p</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* RIGHT: Activity Feed + Intelligence */}
            <div className="flex flex-col gap-4 sm:gap-6">

              {/* Activity feed */}
              <section className="db-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-xs font-bold font-geist text-zinc-500 uppercase tracking-widest">Live Feed</h2>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c0c1ff] animate-pulse" />
                </div>
                <div>
                  {feedItems.map((item, i) => (
                    <ActivityFeedItem key={i} {...item} />
                  ))}
                </div>
              </section>

              {/* AI Intelligence panel */}
              <section className="db-card p-4">
                <div className="flex items-center gap-2 mb-4">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L14.5 9H22L16 13.5L18.5 20.5L12 16L5.5 20.5L8 13.5L2 9H9.5L12 2Z" fill="#c0c1ff" />
                  </svg>
                  <h2 className="text-xs font-bold font-geist text-zinc-400 uppercase tracking-widest">AI Workspace</h2>
                </div>

                {/* Insight cards */}
                <div className="space-y-3">
                  <div className="bg-[#0d0d10] border border-[#1e1e21] rounded-xl p-3">
                    <p className="text-[10px] font-semibold font-geist text-zinc-500 uppercase tracking-wider mb-2">Latest Summary</p>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Design Review focused on token system alignment. 2 action items assigned to Alex and Girish.
                    </p>
                    <div className="mt-2 pt-2 border-t border-[#1a1a1d] flex items-center gap-1.5">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                      <span className="text-[10px] text-zinc-600 font-geist">2 items resolved</span>
                    </div>
                  </div>

                  <div className="bg-[#0d0d10] border border-[#1e1e21] rounded-xl p-3">
                    <p className="text-[10px] font-semibold font-geist text-zinc-500 uppercase tracking-wider mb-2">Collaboration Trend</p>
                    {/* Mini bar chart */}
                    <div className="flex items-end gap-1 h-10">
                      {[40, 65, 50, 80, 70, 90, 75].map((h, i) => (
                        <div key={i} className="flex-1 rounded-sm" style={{
                          height: `${h}%`,
                          background: i === 5 ? '#c0c1ff' : '#c0c1ff20',
                        }} />
                      ))}
                    </div>
                    <p className="text-[10px] text-zinc-600 font-geist mt-2">Peak: Friday 2PM — 90 min avg</p>
                  </div>

                  {/* Quick actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleCreateTrigger}
                      className="lp-btn-primary w-full text-xs h-9"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      New Room
                    </button>
                    <button
                      onClick={handleJoinTrigger}
                      className="lp-btn-ghost w-full text-xs h-9"
                    >
                      Join with code
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Modal */}
      <JoinRoomModal
        isOpen={modalOpen}
        mode={modalMode}
        initialRoomCode={selectedRoomCode}
        onClose={() => { setModalOpen(false); setSelectedRoomCode(''); }}
        onSubmit={handleModalSubmit}
      />
    </AppLayout>
  );
};
