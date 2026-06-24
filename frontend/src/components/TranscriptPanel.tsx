import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../lib/axios';

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
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
        className={`absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${
          animate ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Slide-over Content Container */}
      <div
        className={`relative w-full max-w-full sm:max-w-[550px] lg:max-w-[650px] h-full bg-zinc-950 border-l border-zinc-900 shadow-2xl flex flex-col transition-transform duration-300 ease-out z-10 ${
          animate ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Sticky Header */}
        <header className="sticky top-0 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <span className="text-[10px] font-bold font-geist text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-subtle"></span>
                Room: {session.roomName}
              </span>
              <h2 className="text-base font-extrabold font-geist text-white tracking-tight leading-snug truncate">
                {session.roomName}
              </h2>
            </div>
            
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] block">close</span>
            </button>
          </div>

          {/* Session Metadata grid */}
          <div className="grid grid-cols-3 gap-2 border-t border-zinc-900/60 pt-3 text-[11px] font-inter text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-zinc-500">calendar_today</span>
              <span className="truncate">{session.dateString.split('•')[0].trim()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-zinc-500">timer</span>
              <span>{session.durationString}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-zinc-500">group</span>
              <span>{session.participantsCount} participants</span>
            </div>
          </div>
        </header>

        {/* Sticky Action Bar */}
        <section className="sticky top-[109px] bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 px-5 py-3 flex items-center gap-2">
          {/* Search bar */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-zinc-500">
              search
            </span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search transcript text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-zinc-900 border border-zinc-850 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all font-inter"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-zinc-500 hover:text-zinc-300"
              >
                <span className="material-symbols-outlined text-[14px] block">close</span>
              </button>
            )}
          </div>

          {/* Export action */}
          <button
            onClick={handleExport}
            disabled={transcripts.length === 0}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 border border-zinc-850 text-xs font-semibold font-geist text-zinc-300 hover:text-zinc-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[14px]">download</span>
            <span>Export TXT</span>
          </button>
        </section>

        {/* Scrollable Transcript Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-6">
          {/* Active Search Results Info */}
          {searchQuery && !loading && !error && (
            <div className="text-xs text-zinc-500 font-inter border-b border-zinc-900 pb-2 flex items-center justify-between">
              <span>
                Showing {filteredTranscripts.length} of {transcripts.length} entries
              </span>
              <button
                onClick={() => setSearchQuery('')}
                className="text-indigo-400 hover:underline cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          )}

          {loading ? (
            /* Skeleton Loading States */
            <div className="flex flex-col gap-6 py-4 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 shrink-0" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="h-3 bg-zinc-900 rounded w-1/4" />
                    <div className="h-4 bg-zinc-900 rounded w-5/6" />
                    <div className="h-4 bg-zinc-900 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error State */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
              <div className="p-3 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500">
                <span className="material-symbols-outlined text-[32px] block">warning</span>
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
                className="px-3.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : transcripts.length === 0 ? (
            /* Empty State: No Transcript Yet */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
              <div className="w-14 h-14 rounded-full bg-zinc-900/50 border border-zinc-850 flex items-center justify-center text-zinc-500">
                <span className="material-symbols-outlined text-[28px] block">sticky_note_2</span>
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
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
              <div className="w-14 h-14 rounded-full bg-zinc-900/50 border border-zinc-850 flex items-center justify-center text-zinc-500">
                <span className="material-symbols-outlined text-[28px] block">search_off</span>
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
            <div className="flex flex-col gap-5">
              {filteredTranscripts.map((entry, idx) => {
                const avatarColor = getAvatarColor(entry.username, entry.speaker_color);
                return (
                  <div
                    key={entry.id || entry._id || idx}
                    className="flex items-start gap-3 hover:bg-zinc-900/10 p-1.5 -m-1.5 rounded-lg transition-colors group"
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center text-[10px] font-bold text-zinc-950 font-geist shrink-0 shadow-sm`}
                    >
                      {getInitials(entry.username)}
                    </div>

                    {/* Content Block */}
                    <div className="flex-1 flex flex-col gap-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold font-geist text-zinc-200 tracking-tight">
                          {entry.username}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">
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
