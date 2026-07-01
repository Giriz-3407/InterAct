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
import {
  Plus,
  Users,
  Clock,
  Sparkles,
  Search,
  ArrowRight,
  ShieldAlert,
  Check,
  X,
  Tv,
  UserPlus,
  ChevronRight,
  Compass,
  Activity,
  User,
  Menu
} from 'lucide-react';

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
  <div className="flex flex-col gap-3.5 p-5 sm:p-6 select-none transition-all hover:bg-white/[0.01]">
    <div className="flex items-start justify-between">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.02] border border-white/[0.04]">
        <span style={{ color: accent }}>{icon}</span>
      </div>
      {sub && (
        <span className="status-pill-neutral font-geist text-[9px] tracking-wide py-0.5 px-2">{sub}</span>
      )}
    </div>
    <div>
      <p className="text-2xl font-bold font-geist text-white tracking-tight leading-none mb-1.5">{value}</p>
      <p className="text-xs text-zinc-400 font-inter">{label}</p>
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
  <div className="db-card p-4.5 flex flex-col gap-3.5 group select-none">
    {/* Header */}
    <div className="flex items-start justify-between gap-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="status-pill-live text-[9px] py-0.5 px-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Live
          </span>
        </div>
        <h3 className="text-sm font-bold font-geist text-white leading-snug truncate group-hover:text-[#c0c1ff] transition-colors">{name}</h3>
      </div>
      <span className="status-pill-neutral font-mono text-[9px] py-0.5 px-2 flex-shrink-0 mt-0.5">{duration}</span>
    </div>

    {/* Meta */}
    <div className="flex items-center gap-3 text-xs text-zinc-400 font-inter">
      <div className="flex items-center gap-1.5">
        <User size={13} className="text-zinc-500" />
        <span className="text-zinc-400">{hostName}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <WaveformBarsSmall />
        <span className="text-zinc-400">{participantCount} active</span>
      </div>
    </div>

    {/* Join */}
    <button
      onClick={onJoin}
      className="btn-pill-primary w-full text-xs h-8.5"
    >
      Join Room
    </button>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   ACTIVITY FEED ITEM
   ───────────────────────────────────────────────────────────── */
const feedItems = [
  { icon: '▶', color: '#c0c1ff', bg: 'rgba(192, 193, 255, 0.08)', user: 'Girish K', action: 'started screen sharing', room: 'Design Review', time: '2m ago' },
  { icon: '+', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', user: 'Sarah Johnson', action: 'joined', room: 'Weekly Tech Sync', time: '5m ago' },
  { icon: '✦', color: '#c0c1ff', bg: 'rgba(192, 193, 255, 0.08)', user: 'AI', action: 'generated session summary', room: 'API Review', time: '12m ago' },
  { icon: '⊕', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)', user: 'Alex Smith', action: 'created room', room: 'Sprint Planning', time: '24m ago' },
  { icon: '✓', color: '#a1a1aa', bg: 'rgba(255, 255, 255, 0.05)', user: 'Marco Rossi', action: 'ended session', room: 'Client Demo', time: '1h ago' },
];

const getActivityIcon = (iconStr: string) => {
  switch (iconStr) {
    case '▶': return <Tv size={12} />;
    case '+': return <UserPlus size={12} />;
    case '✦': return <Sparkles size={12} />;
    case '⊕': return <Plus size={12} />;
    case '✓': return <Check size={12} />;
    default: return <Tv size={12} />;
  }
};

const ActivityFeedItem: React.FC<typeof feedItems[0]> = ({ icon, color, bg, user, action, room, time }) => (
  <div className="flex items-start gap-3 py-3 px-1 border-b border-white/[0.02] last:border-b-0 hover:bg-white/[0.01] transition-all rounded-lg select-none">
    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg, color }}>
      {getActivityIcon(icon)}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-zinc-300 font-inter leading-relaxed">
        <span className="font-bold text-zinc-100 font-geist">{user}</span>
        {' '}{action}{' '}
        <span className="text-[#c0c1ff] font-semibold">{room}</span>
      </p>
      <p className="text-[10px] text-zinc-500 mt-1 font-geist">{time}</p>
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
    className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.02] transition-all duration-150 text-left cursor-pointer group active:scale-[0.99]"
  >
    <div className="flex items-center gap-3">
      <div className="w-8.5 h-8.5 rounded-lg bg-[#c0c1ff]/5 border border-[#c0c1ff]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#c0c1ff]/10 group-hover:border-[#c0c1ff]/20 transition-all">
        <Tv size={14} className="text-[#c0c1ff]" />
      </div>
      <div>
        <p className="text-sm font-semibold font-geist text-zinc-200 group-hover:text-white transition-colors">{roomCode}</p>
        <p className="text-xs text-zinc-500 font-inter mt-0.5">
          {participantCount > 0 ? `${participantCount} active now` : 'Retained'}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      {participantCount > 0 && <span className="status-pill-connected text-[9px] py-0.5 px-2">Active</span>}
      <ChevronRight className="text-zinc-500 group-hover:text-[#c0c1ff] group-hover:translate-x-0.5 transition-all" size={16} />
    </div>
  </button>
);

/* ─────────────────────────────────────────────────────────────
   DASHBOARD HEADER (replaces TopBar)
   ───────────────────────────────────────────────────────────── */
interface DashHeaderProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onToggleSidebar: () => void;
  activeRoomCount: number;
}

const DashHeader: React.FC<DashHeaderProps> = ({ onCreateRoom, onJoinRoom, onToggleSidebar, activeRoomCount }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  return (
    <header className="sticky top-0 z-20 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.04]">
      <div className="flex items-center justify-between px-4 sm:px-6 h-14">
        {/* Left: hamburger (mobile) + title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Toggle sidebar"
          >
            <Menu size={18} />
          </button>
          {/* Workspace title */}
          <div className="flex items-center gap-2.5">
            <img src={interactLogo} alt="" className="h-5 w-auto md:hidden" />
            <h1 className="text-sm font-bold font-geist text-white hidden sm:block select-none">Workspace</h1>
            {activeRoomCount > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 status-pill-connected py-0.5 px-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-semibold font-geist text-emerald-400">{activeRoomCount} live</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: search + CTA */}
        <div className="flex items-center gap-2 sm:gap-3 relative">
          <AgentStatusIndicator showRefresh={true} />
          {/* Command-palette search */}
          <button
            className="hidden md:flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.04] text-zinc-400 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-zinc-200 transition-all cursor-pointer text-xs font-geist active:scale-95"
            onClick={() => {}}
          >
            <Search size={13} />
            <span>Search rooms...</span>
            <kbd className="ml-2 text-[9px] border border-white/10 px-1.5 py-0.2 rounded text-zinc-500">⌘K</kbd>
          </button>

          {/* Desktop Primary Actions: visible at sm and larger screens */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={onJoinRoom}
              className="btn-pill-secondary text-xs h-9 px-4 flex items-center gap-1.5"
            >
              <Compass size={13} />
              <span>Join with Code</span>
            </button>
            <button
              onClick={onCreateRoom}
              className="btn-pill-primary text-xs h-9 px-4 flex items-center gap-1.5"
            >
              <Plus size={13} />
              <span>New Room</span>
            </button>
          </div>

          {/* Mobile Dropdown Action: visible on small screens (xs) */}
          <div className="sm:hidden relative">
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="btn-pill-primary text-xs h-9 px-3 flex items-center gap-1"
            >
              <span>New</span>
              <span className={`text-[8px] transition-transform duration-200 ${mobileMenuOpen ? 'rotate-180' : 'rotate-0'}`}>
                ▼
              </span>
            </button>
            {mobileMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setMobileMenuOpen(false)}
                />
                <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-40 bg-[#111113] border border-[#1e1e21] rounded-xl shadow-2xl py-1 animate-fade-in">
                  <button
                    onClick={() => { onCreateRoom(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-zinc-300 hover:bg-white/[0.04] hover:text-white transition-colors cursor-pointer text-left font-geist font-medium"
                  >
                    <Plus size={14} className="text-zinc-500" />
                    <span>New Room</span>
                  </button>
                  <button
                    onClick={() => { onJoinRoom(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-zinc-300 hover:bg-white/[0.04] hover:text-white transition-colors cursor-pointer text-left font-geist font-medium"
                  >
                    <Compass size={14} className="text-zinc-500" />
                    <span>Join with Code</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

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
        onJoinRoom={handleJoinTrigger}
        onToggleSidebar={() => window.dispatchEvent(new CustomEvent('toggle-sidebar'))}
        activeRoomCount={totalActiveRooms}
      />

      {/* Error toast warning */}
      {apiError && (
        <div className="fixed top-4 right-4 z-50 w-80 bg-[#0c0c0e] border border-red-500/20 p-4 rounded-xl shadow-2xl flex items-start gap-3 backdrop-blur-md transition-all duration-300">
          <div className="w-5.5 h-5.5 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-red-500/20">
            <ShieldAlert size={12} className="text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold font-geist text-red-400 mb-0.5">Room Error</p>
            <p className="text-xs text-zinc-400 font-inter leading-relaxed">{apiError}</p>
          </div>
          <button onClick={() => setApiError('')} className="text-zinc-550 hover:text-zinc-300 cursor-pointer active:scale-90 transition-all">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── MAIN SCROLLABLE AREA ── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8">

          {/* ── WORKSPACE HERO ── */}
          <section className="order-2 sm:order-1 relative overflow-hidden rounded-2xl border border-white/[0.03] bg-gradient-to-r from-black/40 to-white/[0.01] p-6 sm:p-8 shadow-panel">
            {/* Ambient radial */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse at 10% 50%, rgba(192, 193, 255, 0.06) 0%, transparent 60%)',
            }} />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              {/* Left: greeting */}
              <div>
                <div className="flex items-center gap-2 mb-3.5 select-none">
                  <span className="status-pill-connected text-[10px] py-0.5 px-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow" />
                    Workspace online
                  </span>
                </div>
                <h2 className="font-geist font-bold text-white tracking-tight leading-tight mb-2.5 select-none"
                  style={{ fontSize: 'clamp(22px, 3vw, 30px)' }}>
                  Ready to collaborate?
                </h2>
                <p className="text-sm text-zinc-400 max-w-md leading-relaxed select-none">
                  Your collaboration workspace is active.{' '}
                  <span className="text-[#c0c1ff] font-semibold">{totalActiveRooms} live {totalActiveRooms === 1 ? 'room' : 'rooms'}</span>
                  {' '}running right now.
                </p>
              </div>
              {/* Right: quick stats strip */}
              <div className="flex gap-4 sm:gap-6 sm:flex-row sm:items-center select-none">
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl font-bold font-geist text-white leading-none">{totalActiveRooms}</span>
                  <span className="text-xs text-zinc-500 font-inter leading-tight">Active<br/>rooms</span>
                </div>
                <div className="w-px h-6 bg-white/[0.04] hidden sm:block" />
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl font-bold font-geist text-white leading-none">
                    {MOCK_ROOMS.reduce((a, r) => a + r.participants.length, 0)}
                  </span>
                  <span className="text-xs text-zinc-500 font-inter leading-tight">Live<br/>collaborators</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── STAT CARDS (Merged Surface) ── */}
          <section className="order-3 sm:order-2 db-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.03] overflow-hidden">
            <StatCard
              label="Rooms created today"
              value="6"
              sub="+2 vs yesterday"
              accent="#c0c1ff"
              icon={<Plus size={16} />}
            />
            <StatCard
              label="Collaboration time"
              value="4h 12m"
              sub="Today"
              accent="#10b981"
              icon={<Clock size={16} />}
            />
            <StatCard
              label="Active participants"
              value={MOCK_ROOMS.reduce((a, r) => a + r.participants.length, 0)}
              sub="Right now"
              accent="#8b5cf6"
              icon={<Users size={16} />}
            />
            <StatCard
              label="AI summaries"
              value="3"
              sub="This week"
              accent="#f59e0b"
              icon={<Sparkles size={16} />}
            />
          </section>

          {/* ── PRIMARY ACTIONS ── */}
          <section className="order-1 sm:order-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Create Room — dominant */}
            <button
              onClick={handleCreateTrigger}
              className="db-action-primary group text-left cursor-pointer relative overflow-hidden rounded-2xl p-6 sm:p-7 flex flex-col gap-4 min-h-[160px] sm:min-h-[180px] transition-all active:scale-[0.99] duration-150"
            >
              {/* Subtle ambient */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 30% 40%, rgba(192,193,255,0.04) 0%, transparent 70%)' }} />
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#c0c1ff]/5 border border-[#c0c1ff]/15 group-hover:bg-[#c0c1ff]/10 group-hover:border-[#c0c1ff]/25 transition-all">
                <Plus size={18} className="text-[#c0c1ff]" />
              </div>
              {/* Text */}
              <div>
                <h3 className="text-base font-bold font-geist text-white tracking-tight mb-1.5">Create Room</h3>
                <p className="text-sm text-zinc-400 leading-relaxed font-inter">
                  Launch an instant collaboration room. Share your link and your team joins in seconds.
                </p>
              </div>
              {/* Arrow */}
              <div className="flex items-center gap-1.5 mt-auto">
                <span className="text-xs font-semibold font-geist text-[#c0c1ff]">Start now</span>
                <ArrowRight className="text-[#c0c1ff] transition-transform group-hover:translate-x-0.5" size={14} />
              </div>
            </button>

            {/* Join Room */}
            <button
              onClick={handleJoinTrigger}
              className="db-action-secondary group text-left cursor-pointer rounded-2xl p-6 sm:p-7 flex flex-col gap-4 min-h-[160px] sm:min-h-[180px] transition-all active:scale-[0.99] duration-150"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.02] border border-white/[0.04] group-hover:bg-white/[0.05] group-hover:border-white/[0.08] transition-all">
                <Compass size={18} className="text-zinc-400 group-hover:text-zinc-300 transition-colors" />
              </div>
              <div>
                <h3 className="text-base font-bold font-geist text-zinc-200 tracking-tight mb-1.5">Join a Room</h3>
                <p className="text-sm text-zinc-400 leading-relaxed font-inter">
                  Have a room code? Enter it to join an active collaboration session instantly.
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-auto">
                <span className="text-xs font-semibold font-geist text-zinc-500 group-hover:text-zinc-300 transition-colors">Enter code</span>
                <ArrowRight className="text-zinc-500 group-hover:text-zinc-300 transition-all transition-transform group-hover:translate-x-0.5" size={14} />
              </div>
            </button>
          </section>

          {/* ── BOTTOM GRID: Rooms + Feed + Intelligence ── */}
          <div className="order-4 sm:order-4 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

            {/* LEFT + MIDDLE: Live Rooms + Recent Rooms */}
            <div className="lg:col-span-2 flex flex-col gap-5 sm:gap-7">

              {/* Live rooms */}
              {MOCK_ROOMS.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3.5 select-none">
                    <h2 className="text-xs font-bold font-geist text-zinc-500 uppercase tracking-widest">
                      Active Rooms ({MOCK_ROOMS.length})
                    </h2>
                    <span className="status-pill-live text-[8px] py-0.5 px-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      Live
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

              {/* Jump back in & History (Unified lists surfaces) */}
              <section>
                <h2 className="text-xs font-bold font-geist text-zinc-500 uppercase tracking-widest mb-3.5 select-none">
                  Recent Rooms
                </h2>
                {jumpBackRooms.length > 0 ? (
                  <div className="flex flex-col border border-white/[0.03] bg-[#0c0c0e] rounded-2xl divide-y divide-white/[0.02] shadow-panel overflow-hidden">
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
                  /* Recent rooms from DB grouped in unified list card */
                  <div className="flex flex-col border border-white/[0.03] bg-[#0c0c0e] rounded-2xl divide-y divide-white/[0.02] shadow-panel overflow-hidden">
                    {pastSessions.slice(0, 3).map(session => (
                      <div key={session.id}
                        className="flex items-center justify-between p-3.5 hover:bg-white/[0.01] transition-all duration-150 select-none">
                        <div className="flex items-center gap-3">
                          <div className="w-8.5 h-8.5 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-center flex-shrink-0">
                            <User size={14} className="text-zinc-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold font-geist text-zinc-300 leading-none mb-1">{session.roomName}</p>
                            <p className="text-[11px] text-zinc-500 font-inter">{session.hostName} · {session.durationString}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className={session.status === 'completed' ? 'status-pill-completed' : 'status-pill-neutral text-[9px] uppercase tracking-wider py-0.5 px-1.5'}>
                            {session.status}
                          </span>
                          <span className="status-pill-neutral font-mono text-[9px] py-0.5 px-1.5">{session.participantsCount}p</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* RIGHT SIDEBAR PANEL: Activity Feed + AI Workspace (Merged surface) */}
            <div className="flex flex-col">
              <section className="db-card p-5 flex flex-col gap-6.5 shadow-panel">
                {/* Section 1: Live Feed */}
                <div>
                  <div className="flex items-center justify-between mb-3 select-none">
                    <div className="flex items-center gap-2">
                      <Activity size={14} className="text-[#c0c1ff]" />
                      <h2 className="text-xs font-bold font-geist text-zinc-400 uppercase tracking-widest">Live Activity Feed</h2>
                    </div>
                    <span className="status-pill-live text-[8px] py-0.5 px-2">
                      <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                      Live
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {feedItems.map((item, i) => (
                      <ActivityFeedItem key={i} {...item} />
                    ))}
                  </div>
                </div>

                <div className="h-px bg-white/[0.03]" />

                {/* Section 2: AI Workspace */}
                <div>
                  <div className="flex items-center gap-2 mb-4 select-none">
                    <Sparkles size={14} className="text-[#c0c1ff]" />
                    <h2 className="text-xs font-bold font-geist text-zinc-400 uppercase tracking-widest">AI Workspace</h2>
                  </div>

                  {/* Insight cards */}
                  <div className="space-y-3.5">
                    <div className="bg-black/35 border border-white/[0.03] rounded-xl p-3.5 hover:border-white/[0.06] transition-all select-none shadow-panel">
                      <p className="text-[10px] font-bold font-geist text-zinc-500 uppercase tracking-wider mb-2">Latest Summary</p>
                      <p className="text-xs text-zinc-300 leading-relaxed font-inter">
                        Design Review focused on token system alignment. 2 action items assigned to Alex and Girish.
                      </p>
                      <div className="mt-3 pt-2.5 border-t border-white/[0.02] flex items-center gap-1.5">
                        <Check size={11} className="text-emerald-400" />
                        <span className="text-[10px] text-zinc-500 font-geist">2 items resolved</span>
                      </div>
                    </div>

                    <div className="bg-black/35 border border-white/[0.03] rounded-xl p-3.5 hover:border-white/[0.06] transition-all select-none shadow-panel">
                      <p className="text-[10px] font-bold font-geist text-zinc-500 uppercase tracking-wider mb-2">Collaboration Trend</p>
                      {/* Mini bar chart */}
                      <div className="flex items-end gap-1.5 h-10 mt-3 px-1">
                        {[40, 65, 50, 80, 70, 90, 75].map((h, i) => (
                          <div key={i} className="flex-1 rounded-t-sm transition-all duration-300 hover:opacity-80 cursor-pointer" style={{
                            height: `${h}%`,
                            background: i === 5 ? '#c0c1ff' : 'rgba(192, 193, 255, 0.15)',
                          }} />
                        ))}
                      </div>
                      <p className="text-[10px] text-zinc-500 font-geist mt-2.5">Peak: Friday 2PM · 90 min avg</p>
                    </div>

                    {/* Quick actions */}
                    <div className="flex flex-col gap-2 pt-2">
                      <button
                        onClick={handleCreateTrigger}
                        className="btn-pill-primary w-full text-xs h-9"
                      >
                        <Plus size={14} />
                        New Room
                      </button>
                      <button
                        onClick={handleJoinTrigger}
                        className="btn-pill-secondary w-full text-xs h-9"
                      >
                        Join with code
                      </button>
                    </div>
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
