import React, { useState, useEffect } from 'react';
import { AppLayout } from '../layouts/AppLayout';
import { TopBar } from '../components/TopBar';
import { StatCard } from '../components/StatCard';
import { SessionCard } from '../components/SessionCard';
import { MOCK_PAST_SESSIONS } from '../data/mockData';
import { TranscriptPanel } from '../components/TranscriptPanel';
import type { PastSession } from '../types';
import { apiClient } from '../lib/axios';

export const HistoryPage: React.FC = () => {
  const [selectedSession, setSelectedSession] = useState<PastSession | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [sessions, setSessions] = useState<PastSession[]>([]);
  const [loading, setLoading] = useState(true);

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
        // Fallback to mock data if API fails
        setSessions(MOCK_PAST_SESSIONS);
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
      <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar max-w-[1600px] w-full mx-auto">
        {/* Top bar filters */}
        <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/60 pb-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button className="px-3.5 py-1.5 rounded-full text-xs font-semibold font-geist bg-indigo-600 text-zinc-950">
              All Time
            </button>
            <button className="px-3.5 py-1.5 rounded-full text-xs font-semibold font-geist bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200">
              Today
            </button>
            <button className="px-3.5 py-1.5 rounded-full text-xs font-semibold font-geist bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200">
              This Week
            </button>
            <button className="px-3.5 py-1.5 rounded-full text-xs font-semibold font-geist bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200">
              This Month
            </button>
          </div>
          
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-semibold font-geist text-zinc-300 hover:bg-zinc-800 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] block">calendar_today</span>
              <span>Last 30 Days</span>
            </button>
            <button className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-semibold font-geist hover:opacity-95 shadow-lg shadow-indigo-500/10">
              Export All
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
        <section className="flex flex-col gap-3 mt-2">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-bold font-geist text-white tracking-tight uppercase tracking-wider text-zinc-500">
              Past Sessions
            </h2>
            <div className="flex gap-1.5">
              <button className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                <span className="material-symbols-outlined text-[16px] block">grid_on</span>
              </button>
              <button className="p-1.5 rounded bg-zinc-800 border border-zinc-750 text-[#c0c1ff]">
                <span className="material-symbols-outlined text-[16px] block">format_list_bulleted</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {loading ? (
              <div className="text-zinc-500 text-xs text-center py-6 animate-pulse">Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <div className="text-zinc-500 text-xs text-center py-6">No past sessions found.</div>
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

          <button className="self-center mt-6 px-5 py-2 rounded-full text-xs font-semibold font-geist bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200">
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
