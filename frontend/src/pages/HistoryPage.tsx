import React, { useState, useEffect } from 'react';
import { AppLayout } from '../layouts/AppLayout';
import { TopBar } from '../components/TopBar';
import { StatCard } from '../components/StatCard';
import { SessionCard } from '../components/SessionCard';
import { TranscriptPanel } from '../components/TranscriptPanel';
import type { PastSession } from '../types';
import { apiClient } from '../lib/axios';
import { Calendar, Download, LayoutGrid, List } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [selectedSession, setSelectedSession] = useState<PastSession | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [sessions, setSessions] = useState<PastSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<PastSession[]>('/api/transcripts/sessions')
      .then((data) => {
        setSessions(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch sessions', err);
        setSessions([]);
        setLoading(false);
      });
  }, []);

  const handleTranscriptClick = (sessionId: string) => {
    const sessionObj = sessions.find((s) => s.id === sessionId);
    if (sessionObj) {
      setSelectedSession(sessionObj);
      setIsPanelOpen(true);
    }
  };

  return (
    <AppLayout context="history">
      <TopBar title="Activity Hub" showSearch={true} searchPlaceholder="Search transcripts, recordings..." />
      
      {/* Content Canvas */}
      <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar max-w-[1600px] w-full mx-auto select-none bg-[#09090b]">
        {/* Top bar filters */}
        <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.03] pb-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button className="px-3.5 py-1.5 rounded-full text-xs font-semibold font-geist bg-[#c0c1ff]/10 border border-[#c0c1ff]/20 text-[#c0c1ff] shadow-sm transition-all cursor-pointer">
              All Time
            </button>
            <button className="px-3.5 py-1.5 rounded-full text-xs font-medium font-geist bg-transparent border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02] transition-all cursor-pointer">
              Today
            </button>
            <button className="px-3.5 py-1.5 rounded-full text-xs font-medium font-geist bg-transparent border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02] transition-all cursor-pointer">
              This Week
            </button>
            <button className="px-3.5 py-1.5 rounded-full text-xs font-medium font-geist bg-transparent border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02] transition-all cursor-pointer">
              This Month
            </button>
          </div>
          
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs font-semibold font-geist text-zinc-300 hover:bg-white/[0.05] hover:border-white/[0.08] flex items-center gap-1.5 cursor-pointer transition-all">
              <Calendar size={14} className="text-zinc-500" />
              <span>Last 30 Days</span>
            </button>
            <button className="px-4 py-1.5 text-xs font-semibold font-geist bg-[#c0c1ff] hover:bg-[#d0d1ff] text-[#09090b] rounded-xl transition-all duration-200 flex items-center gap-1.5 shadow-lg shadow-[#c0c1ff]/5 active:scale-95 cursor-pointer">
              <Download size={14} />
              <span>Export All</span>
            </button>
          </div>
        </section>

        {/* Stats Summary Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard label="Total Sessions" value="1,284" subtext="+12% this month" icon="history" accentColor="primary" />
          <StatCard label="Avg. Duration" value="42m 15s" subtext="Stable productivity" icon="timer" accentColor="success" />
          <StatCard label="Active Collaborators" value="86" subtext="Across 12 projects" icon="group" accentColor="primary" />
          <StatCard label="Files Generated" value="312" subtext="Transcripts & shares" icon="file_present" accentColor="warning" />
        </section>

        {/* Sessions List */}
        <section className="flex flex-col gap-3.5 mt-2">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-[10px] font-bold font-geist text-zinc-500 uppercase tracking-widest">
              Past Sessions
            </h2>
            <div className="bg-white/[0.02] border border-white/[0.04] p-1 rounded-xl flex items-center gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white/[0.04] border border-white/[0.05] text-[#c0c1ff] shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.01]'}`}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'list' ? 'bg-white/[0.04] border border-white/[0.05] text-[#c0c1ff] shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.01]'}`}
              >
                <List size={14} />
              </button>
            </div>
          </div>

          <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'flex flex-col gap-3.5'}`}>
            {loading ? (
              <div className="text-zinc-500 text-xs text-center py-12 animate-pulse font-geist uppercase tracking-widest">Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <div className="text-zinc-500 text-xs text-center py-12 font-geist uppercase tracking-widest">No past sessions found.</div>
            ) : (
              sessions.map((session, idx) => (
                <SessionCard
                  key={session.id}
                  id={session.id}
                  roomName={session.roomName}
                  dateString={session.dateString}
                  durationString={session.durationString}
                  participantsCount={session.participantsCount}
                  hostName={session.hostName}
                  status={session.status}
                  isHighlighted={idx === 0}
                  onTranscriptClick={handleTranscriptClick}
                />
              ))
            )}
          </div>

          <button className="self-center mt-6 px-5 py-2 rounded-xl text-xs font-semibold font-geist bg-white/[0.02] border border-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-all cursor-pointer active:scale-95 shadow-sm">
            Load More Sessions
          </button>
        </section>
      </main>

      <TranscriptPanel
        isOpen={isPanelOpen}
        session={selectedSession}
        onClose={() => setIsPanelOpen(false)}
      />
    </AppLayout>
  );
};
