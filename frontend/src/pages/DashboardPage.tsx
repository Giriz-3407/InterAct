import React from 'react';
import { AppLayout } from '../layouts/AppLayout';
import { TopBar } from '../components/TopBar';
import { StatCard } from '../components/StatCard';
import { RoomCard } from '../components/RoomCard';
import { ActivityItem } from '../components/ActivityItem';
import { MOCK_ROOMS, MOCK_ACTIVITIES } from '../data/mockData';

export const DashboardPage: React.FC = () => {
  // Aggregate stats
  const totalActiveRooms = MOCK_ROOMS.length;
  const totalParticipants = MOCK_ROOMS.reduce((sum, r) => sum + r.participants.length, 0);

  return (
    <AppLayout context="dashboard">
      <TopBar title="Dashboard" showSearch={true} searchPlaceholder="Search rooms, features..." />
      
      {/* Content Canvas */}
      <main className="flex-1 p-6 flex flex-col xl:flex-row gap-6 overflow-y-auto custom-scrollbar max-w-[1600px] w-full mx-auto">
        <div className="flex-1 flex flex-col gap-6">
          {/* Stats Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Active Rooms" value={totalActiveRooms} icon="meeting_room" accentColor="primary" />
            <StatCard label="Live Collaborators" value={totalParticipants} icon="people" accentColor="success" />
            <StatCard label="Sessions Today" value={7} icon="today" accentColor="warning" />
          </section>

          {/* Jump Back In Section */}
          <section className="mt-2">
            <h2 className="text-sm font-bold font-geist text-white tracking-tight mb-4 uppercase tracking-wider text-zinc-500">
              Jump Back In
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1 */}
              <div className="glass-panel p-4 rounded-xl flex flex-col justify-between h-36 border border-zinc-800/80 hover:border-zinc-700/80 transition-all cursor-pointer">
                <div>
                  <h3 className="text-xs font-bold font-geist text-white">Product Roadmap v2</h3>
                  <p className="text-[10px] text-zinc-500 font-inter mt-1">Edited 2m ago</p>
                </div>
                <div className="flex justify-between items-center mt-4 border-t border-zinc-900 pt-3">
                  <div className="flex -space-x-1.5 overflow-hidden">
                    <span className="w-5 h-5 rounded-full bg-indigo-500 border border-zinc-900 text-3xs font-bold font-geist flex items-center justify-center text-white">GK</span>
                    <span className="w-5 h-5 rounded-full bg-emerald-500 border border-zinc-900 text-3xs font-bold font-geist flex items-center justify-center text-white">AS</span>
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-zinc-500">more_horiz</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="glass-panel p-4 rounded-xl flex flex-col justify-between h-36 border border-zinc-800/80 hover:border-zinc-700/80 transition-all cursor-pointer">
                <div>
                  <h3 className="text-xs font-bold font-geist text-white">Landing Page Assets</h3>
                  <p className="text-[10px] text-zinc-500 font-inter mt-1">Edited 4h ago</p>
                </div>
                <div className="flex justify-between items-center mt-4 border-t border-zinc-900 pt-3">
                  <div className="flex -space-x-1.5 overflow-hidden">
                    <span className="w-5 h-5 rounded-full bg-rose-500 border border-zinc-900 text-3xs font-bold font-geist flex items-center justify-center text-white">SJ</span>
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-zinc-500">more_horiz</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="glass-panel p-4 rounded-xl flex flex-col justify-between h-36 border border-zinc-800/80 hover:border-zinc-700/80 transition-all cursor-pointer">
                <div>
                  <h3 className="text-xs font-bold font-geist text-white">Q4 Sprint Board</h3>
                  <p className="text-[10px] text-zinc-500 font-inter mt-1">Edited yesterday</p>
                </div>
                <div className="flex justify-between items-center mt-4 border-t border-zinc-900 pt-3">
                  <div className="flex -space-x-1.5 overflow-hidden">
                    <span className="w-5 h-5 rounded-full bg-amber-500 border border-zinc-900 text-3xs font-bold font-geist flex items-center justify-center text-white">MR</span>
                    <span className="w-5 h-5 rounded-full bg-indigo-500 border border-zinc-900 text-3xs font-bold font-geist flex items-center justify-center text-white">GK</span>
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-zinc-500">more_horiz</span>
                </div>
              </div>
            </div>
          </section>

          {/* Active Rooms Grid */}
          <section className="mt-2">
            <h2 className="text-sm font-bold font-geist text-white tracking-tight mb-4 uppercase tracking-wider text-zinc-500">
              Live Rooms
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MOCK_ROOMS.map((room) => (
                <RoomCard
                  key={room.id}
                  id={room.id}
                  name={room.name}
                  hostName={room.hostName}
                  duration={room.id === 'ABC-123' ? '45 min' : '12 min'}
                  participants={room.participants}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Right Sidebar Activity Feed */}
        <aside className="w-full xl:w-80 flex flex-col gap-4">
          <div className="glass-panel p-4 rounded-xl flex-1 flex flex-col gap-4">
            <h2 className="text-sm font-bold font-geist text-white tracking-tight border-b border-zinc-800/60 pb-3">
              Activity Feed
            </h2>
            <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 pr-1">
              {MOCK_ACTIVITIES.map((activity) => (
                <ActivityItem
                  key={activity.id}
                  description={activity.description}
                  timestamp={activity.timestamp}
                  type={activity.type}
                />
              ))}
            </div>
          </div>
        </aside>
      </main>
    </AppLayout>
  );
};
