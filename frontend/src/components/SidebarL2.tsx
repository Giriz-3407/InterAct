import React from 'react';
import { NavLink } from 'react-router-dom';
import { DesktopAgentStatus } from './DesktopAgentStatus';

interface SidebarL2Props {
  context: 'dashboard' | 'history';
}

export const SidebarL2: React.FC<SidebarL2Props> = ({ context }) => {
  if (context === 'history') {
    return (
      <aside className="w-65 h-screen fixed left-16 top-0 bg-zinc-950/40 border-r border-slate-border flex flex-col p-4 z-20">
        <div className="mb-6">
          <h2 className="text-lg font-bold font-geist text-white">Activity Hub</h2>
          <p className="text-xs text-zinc-500 mt-1 font-inter">Manage workspace history</p>
        </div>
        
        {/* Navigation list */}
        <div className="flex flex-col gap-1 mb-6">
          <button className="flex items-center justify-between px-3 py-2 rounded-lg text-sm bg-indigo-600/15 text-[#c0c1ff] font-geist font-medium text-left">
            <span>All Activity</span>
          </button>
          <button className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-900 font-geist font-medium text-left">
            <span>Recordings</span>
            <span className="text-xs font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">12</span>
          </button>
          <button className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-900 font-geist font-medium text-left">
            <span>Chat Logs</span>
          </button>
          <button className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-900 font-geist font-medium text-left">
            <span>Files Shared</span>
          </button>
        </div>

        {/* Filter Rooms checkbox */}
        <div className="border-t border-slate-border pt-4 mt-2">
          <h3 className="text-xs font-bold font-geist text-zinc-400 uppercase tracking-wider mb-3">Rooms Filter</h3>
          <div className="flex flex-col gap-2">
            <label className="flex items-center text-xs text-zinc-400 gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-0 focus:ring-offset-0" />
              <span>Design Review</span>
            </label>
            <label className="flex items-center text-xs text-zinc-400 gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-0 focus:ring-offset-0" />
              <span>Weekly Sync</span>
            </label>
            <label className="flex items-center text-xs text-zinc-400 gap-2 cursor-pointer">
              <input type="checkbox" className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-0 focus:ring-offset-0" />
              <span>API Review</span>
            </label>
          </div>
        </div>

        {/* Storage Meter */}
        <div className="mt-auto border-t border-slate-border pt-4">
          <div className="mb-4">
            <DesktopAgentStatus />
          </div>
          <div className="flex justify-between text-xs font-mono text-zinc-500 mb-1">
            <span>Storage Used</span>
            <span>82%</span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: '82%' }} />
          </div>
          <button className="w-full mt-3 py-2 rounded-lg text-xs font-semibold font-geist bg-indigo-600 text-zinc-950 hover:bg-indigo-500 transition-colors">
            Upgrade Plan
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-65 h-screen fixed left-16 top-0 bg-zinc-950/40 border-r border-slate-border flex flex-col p-4 z-20">
      <div className="mb-6">
        <h2 className="text-lg font-bold font-geist text-white">Acme Corp</h2>
        <p className="text-xs text-zinc-500 mt-1 font-inter">Design System</p>
      </div>

      <div className="flex flex-col gap-1 mb-6">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-geist font-medium transition-colors ${
              isActive
                ? 'bg-indigo-600/15 text-[#c0c1ff]'
                : 'text-zinc-400 hover:bg-zinc-900'
            }`
          }
        >
          <span className="material-symbols-outlined text-[18px]">dashboard</span>
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/room/ABC-123"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-geist font-medium transition-colors ${
              isActive
                ? 'bg-indigo-600/15 text-[#c0c1ff]'
                : 'text-zinc-400 hover:bg-zinc-900'
            }`
          }
        >
          <span className="material-symbols-outlined text-[18px]">meeting_room</span>
          <span>Rooms</span>
        </NavLink>


      </div>

      <button 
        onClick={() => window.dispatchEvent(new CustomEvent('trigger-create-room'))}
        className="w-full py-2.5 rounded-lg text-sm font-semibold font-geist bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:opacity-95 shadow-lg shadow-indigo-500/10 transition-all flex items-center justify-center gap-2 mb-4"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        <span>New Room</span>
      </button>

      <div className="mt-auto">
        <DesktopAgentStatus />
      </div>
    </aside>
  );
};
