import React from 'react';
import { NavLink } from 'react-router-dom';

export const SidebarL1: React.FC = () => {
  return (
    <aside className="w-16 h-screen fixed left-0 top-0 bg-surface border-r border-slate-border flex flex-col items-center py-4 justify-between z-30">
      {/* Top Brand Logo */}
      <div className="flex flex-col items-center gap-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-[#8083ff] to-[#d0bcff] flex items-center justify-center text-zinc-950 font-bold font-geist">
          <span className="material-symbols-outlined text-[24px]">sync</span>
        </div>
        
        {/* Navigation Items */}
        <nav className="flex flex-col gap-4">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-[#c0c1ff]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`
            }
          >
            <span className="material-symbols-outlined text-[22px]">grid_view</span>
          </NavLink>
          
          <NavLink
            to="/room/ABC-123"
            className={({ isActive }) =>
              `w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-[#c0c1ff]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`
            }
          >
            <span className="material-symbols-outlined text-[22px]">cast_connected</span>
          </NavLink>
          
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-[#c0c1ff]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`
            }
          >
            <span className="material-symbols-outlined text-[22px]">history</span>
          </NavLink>
        </nav>
      </div>

      {/* Bottom Profile / Settings */}
      <div className="flex flex-col items-center gap-4">
        <button className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50">
          <span className="material-symbols-outlined text-[22px]">settings</span>
        </button>
        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-semibold font-geist text-white">
          GK
        </div>
      </div>
    </aside>
  );
};
