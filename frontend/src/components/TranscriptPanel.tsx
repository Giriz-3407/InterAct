import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../lib/axios';
import { Calendar, Clock, Users, Search, X, Download, AlertCircle, FileText } from 'lucide-react';

interface TranscriptEntry {
  _id?: string;
  id?: string;
  room_id: string;
  session_id: string;
  user_id: string;
  username: string;
  text: string;
  timestamp: string; // ISO string
  speaker_id?: string | null;
  speaker_color?: string | null;
  metadata?: any;
}

interface PastSession {
  id: string;
  roomName: string;
  dateString: string;
  durationString: string;
  participantsCount: number;
  hostName: string;
  status: 'completed' | 'ended';
}

interface TranscriptPanelProps {
  isOpen: boolean;
  session: PastSession | null;
  onClose: () => void;
}

const escapeRegExp = (str: string) => {
  return str.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getAvatarColor = (username: string, speakerColor?: string | null) => {
  if (speakerColor) return speakerColor;
  const colors = [
    'bg-indigo-600',
    'bg-emerald-600',
    'bg-rose-600',
    'bg-amber-600',
    'bg-violet-600',
    'bg-sky-600',
    'bg-pink-600',
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  isOpen,
  session,
  onClose,
}) => {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRendered, setIsRendered] = useState(isOpen);
  const [animate, setAnimate] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle slide-in / slide-out animations
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setTimeout(() => {
        setAnimate(true);
      }, 10);
    } else {
      setAnimate(false);
      const timer = setTimeout(() => {
        setIsRendered(false);
      }, 300); // match duration-300
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Load transcripts
  useEffect(() => {
    if (isOpen && session) {
      setLoading(true);
      setError(null);
      setSearchQuery('');
      apiClient
        .get<TranscriptEntry[]>(`/api/transcripts/session/${session.id}`)
        .then((data) => {
          setTranscripts(data || []);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError('Failed to load transcripts. Please try again.');
          setLoading(false);
        });
    }
  }, [isOpen, session]);

  if (!isRendered || !session) return null;

  // Filter client-side
  const filteredTranscripts = transcripts.filter((entry) =>
    entry.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Highlighting matching terms helper
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    const parts = text.split(new RegExp(`(${escapeRegExp(search)})`, 'gi'));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === search.toLowerCase() ? (
            <mark key={index} className="bg-indigo-500/30 text-indigo-200 px-0.5 rounded font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Format time for timeline (e.g. "12:31 PM")
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      return `${hours}:${minutes} ${ampm}`;
    } catch {
      return '';
    }
  };

  // Export plain text
  const handleExport = () => {
    const dateStr = session.dateString.split('•')[0].trim(); // e.g. "Oct 24, 2023"
    const formattedRoomName = session.roomName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    let ymd = '2026-06-24';
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        ymd = `${year}-${month}-${day}`;
      }
    } catch (e) {
      console.error('Failed parsing date', e);
    }

    const filename = `${formattedRoomName}_${session.id}_${ymd}.txt`;
    const baseApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const url = `${baseApiUrl.replace(/\/$/, '')}/api/transcripts/session/${session.id}/export?filename=${encodeURIComponent(filename)}`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          animate ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Slide-over Content Container */}
      <div
        className={`relative w-full max-w-full sm:max-w-[550px] lg:max-w-[650px] h-full bg-[#0c0c0e] border-l border-white/[0.03] shadow-panel flex flex-col transition-transform duration-300 ease-out z-10 ${
          animate ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Sticky Header */}
        <header className="sticky top-0 bg-[#0c0c0e]/80 backdrop-blur-md border-b border-white/[0.03] p-5 flex flex-col gap-3.5 select-none">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <span className="text-[9px] font-bold font-geist text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Room: {session.roomName}
              </span>
              <h2 className="text-base font-extrabold font-geist text-white tracking-tight leading-snug truncate">
                {session.roomName}
              </h2>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-all flex items-center justify-center cursor-pointer active:scale-95"
            >
              <X size={16} />
            </button>
          </div>

          {/* Session Metadata grid */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] font-semibold text-zinc-400">
            <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/[0.03] px-2.5 py-1 rounded-full">
              <Calendar size={12} className="text-zinc-500" />
              <span className="truncate">{session.dateString.split('•')[0].trim()}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/[0.03] px-2.5 py-1 rounded-full">
              <Clock size={12} className="text-zinc-500" />
              <span>{session.durationString}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/[0.03] px-2.5 py-1 rounded-full">
              <Users size={12} className="text-zinc-500" />
              <span>{session.participantsCount} participants</span>
            </div>
          </div>
        </header>

        {/* Sticky Action Bar */}
        <section className="sticky top-[112px] bg-[#0c0c0e]/80 backdrop-blur-md border-b border-white/[0.03] px-5 py-3 flex items-center gap-2 select-none">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search size={14} className="text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search transcript text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white/[0.02] border border-white/[0.04] rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all font-inter"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Export action */}
          <button
            onClick={handleExport}
            disabled={transcripts.length === 0}
            className="px-4 py-2 bg-[#c0c1ff] hover:bg-[#d0d1ff] disabled:opacity-50 border border-transparent text-xs font-semibold font-geist text-[#09090b] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-lg shadow-[#c0c1ff]/5 active:scale-95"
          >
            <Download size={14} />
            <span>Export TXT</span>
          </button>
        </section>

        {/* Scrollable Transcript Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-6">
          {/* Active Search Results Info */}
          {searchQuery && !loading && !error && (
            <div className="text-xs text-zinc-500 font-inter border-b border-white/[0.03] pb-2 flex items-center justify-between select-none">
              <span>
                Showing {filteredTranscripts.length} of {transcripts.length} entries
              </span>
              <button
                onClick={() => setSearchQuery('')}
                className="text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer font-geist font-bold"
              >
                Clear Search
              </button>
            </div>
          )}

          {loading ? (
            /* Skeleton Loading States */
            <div className="flex flex-col gap-6 py-4 animate-pulse select-none">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/[0.02] border border-white/[0.03] shrink-0" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="h-3 bg-white/[0.02] border border-white/[0.03] rounded w-1/4" />
                    <div className="h-4 bg-white/[0.02] border border-white/[0.03] rounded w-5/6" />
                    <div className="h-4 bg-white/[0.02] border border-white/[0.03] rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error State */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-4 select-none">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
                <AlertCircle size={28} />
              </div>
              <p className="text-xs text-zinc-400 font-inter leading-relaxed max-w-[280px]">
                {error}
              </p>
              <button
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  apiClient
                    .get<TranscriptEntry[]>(`/api/transcripts/session/${session.id}`)
                    .then((data) => {
                      setTranscripts(data || []);
                      setLoading(false);
                    })
                    .catch(() => {
                      setError('Failed to load transcripts. Please try again.');
                      setLoading(false);
                    });
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs font-semibold text-zinc-300 hover:bg-white/[0.04] hover:text-white transition-all cursor-pointer active:scale-95"
              >
                Retry
              </button>
            </div>
          ) : transcripts.length === 0 ? (
            /* Empty State: No Transcript Yet */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4 select-none">
              <div className="w-14 h-14 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center text-zinc-500">
                <FileText size={24} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-bold text-white font-geist">No Transcript Yet</h3>
                <p className="text-xs text-zinc-500 font-inter leading-relaxed max-w-[260px]">
                  Transcript data has not been generated for this session.
                </p>
              </div>
            </div>
          ) : filteredTranscripts.length === 0 ? (
            /* Empty State: No Search Results */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4 select-none">
              <div className="w-14 h-14 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center text-zinc-500">
                <Search size={24} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-bold text-white font-geist">No Search Results</h3>
                <p className="text-xs text-zinc-500 font-inter leading-relaxed max-w-[260px]">
                  No transcript entries match your search.
                </p>
              </div>
            </div>
          ) : (
            /* Timeline List */
            <div className="flex flex-col gap-6">
              {filteredTranscripts.map((entry, idx) => {
                const avatarColor = getAvatarColor(entry.username, entry.speaker_color);
                return (
                  <div
                    key={entry.id || entry._id || idx}
                    className="flex items-start gap-3.5 hover:bg-white/[0.01] p-3 -m-3 rounded-xl border border-transparent hover:border-white/[0.02] transition-all group"
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-xl ${avatarColor} flex items-center justify-center text-[10px] font-bold text-white font-geist shrink-0 shadow-md`}
                    >
                      {getInitials(entry.username)}
                    </div>
 
                    {/* Content Block */}
                    <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                      <div className="flex items-baseline gap-2 select-none">
                        <span className="text-xs font-bold font-geist text-zinc-200 tracking-tight">
                          {entry.username}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                          {formatTime(entry.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 font-inter leading-relaxed select-text tracking-wide whitespace-pre-wrap">
                        {highlightText(entry.text, searchQuery)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
