import React from 'react';
import { NavLink } from 'react-router-dom';
import interactIcon from '../assets/branding/interact-icon-text-dark-mode.svg';

interface SidebarProps {
  context: 'dashboard' | 'history';
  isExpanded: boolean;
  onToggle: () => void;
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-geist font-medium transition-colors duration-200 ${
    isActive
      ? 'bg-indigo-600/10 text-[#c0c1ff] border-l-2 border-indigo-500'
      : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
  }`;

export const Sidebar: React.FC<SidebarProps> = ({ context, isExpanded, onToggle }) => {
  return (
    <>
      {/* Desktop sidebar — in flex flow, width transitions */}
      <aside
        className={`hidden md:flex flex-col h-screen bg-zinc-950 border-r border-zinc-850 overflow-hidden shrink-0 transition-[width] duration-300 ease-out ${
          isExpanded ? 'w-64' : 'w-16'
        }`}
      >
        {/* Top Brand / Logo & Collapse Toggle */}
        <div className={`flex items-center justify-between w-full mb-6 shrink-0 ${isExpanded ? 'flex-row p-4' : 'flex-col gap-4 p-4 md:p-2 md:items-center'}`}>
          {isExpanded ? (
            <div className="flex items-center gap-2.5">
              <img src={interactIcon} alt="InterAct" className="w-7 h-7 object-contain" />
              <div className="flex flex-col">
                <h2 className="text-xs font-bold font-geist text-white tracking-tight uppercase">InterAct</h2>
                <span className="text-[9px] text-zinc-550 leading-none">workspace v1.0</span>
              </div>
            </div>
          ) : (
            <img src={interactIcon} alt="InterAct" className="w-7 h-7 object-contain" />
          )}

          <button
            onClick={onToggle}
            className="p-1 rounded-lg hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 transition-colors duration-200 cursor-pointer shrink-0"
            title={isExpanded ? 'Collapse Navigation' : 'Expand Navigation'}
          >
            <span className="material-symbols-outlined text-[18px] block">
              {isExpanded ? 'chevron_left' : 'menu'}
            </span>
          </button>
        </div>

        {/* Main Navigation links */}
        <div className="flex flex-col gap-1 w-full shrink-0 px-3">
          <NavLink
            to="/dashboard"
            className={navLinkClass}
            title={!isExpanded ? 'Dashboard' : undefined}
          >
            <span className="material-symbols-outlined text-[18px]">grid_view</span>
            {isExpanded && <span>Dashboard</span>}
          </NavLink>

          <NavLink
            to="/history"
            className={navLinkClass}
            title={!isExpanded ? 'Activity Hub' : undefined}
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            {isExpanded && <span>Activity Hub</span>}
          </NavLink>
        </div>

        {/* Context-Specific Side panel content */}
        {isExpanded ? (
          <div className="flex-1 flex flex-col overflow-hidden w-full mt-6 border-t border-zinc-900 pt-4 gap-4 px-4">
            {context === 'dashboard' ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold font-geist text-zinc-500 uppercase tracking-wider">Quick Actions</span>
                </div>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('trigger-create-room'))}
                  className="w-full py-2 rounded-lg text-xs font-semibold font-geist bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:opacity-95 shadow-lg shadow-indigo-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>New Room</span>
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold font-geist text-zinc-500 uppercase tracking-wider mb-1">Hub Options</span>
                  <button className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs bg-indigo-650/10 text-[#c0c1ff] font-geist font-medium text-left">
                    <span>All Activity</span>
                  </button>
                  <button className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:bg-zinc-900/50 font-geist font-medium text-left">
                    <span>Recordings</span>
                    <span className="text-[10px] font-mono bg-zinc-850 text-zinc-550 px-1.5 py-0.2 rounded">12</span>
                  </button>
                  <button className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:bg-zinc-900/50 font-geist font-medium text-left">
                    <span>Chat Logs</span>
                  </button>
                  <button className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:bg-zinc-900/50 font-geist font-medium text-left">
                    <span>Files Shared</span>
                  </button>
                </div>

                {/* Filters */}
                <div className="border-t border-zinc-900 pt-3">
                  <span className="text-[10px] font-bold font-geist text-zinc-500 uppercase tracking-wider mb-2.5 block">Rooms Filter</span>
                  <div className="flex flex-col gap-2">
                    {['Design Review', 'Weekly Sync', 'API Review'].map((label) => (
                      <label key={label} className="flex items-center text-xs text-zinc-400 gap-2 cursor-pointer hover:text-zinc-300">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="w-3.5 h-3.5 rounded border-zinc-800 bg-zinc-950 text-indigo-500 focus:ring-0 focus:ring-offset-0"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Storage Meter at the bottom */}
                <div className="mt-auto border-t border-zinc-900 pt-3.5">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500 mb-1">
                    <span>Storage Used</span>
                    <span>82%</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden border border-zinc-850">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: '82%' }} />
                  </div>
                  <button className="w-full mt-2.5 py-1.5 rounded-lg text-[10px] font-bold font-geist bg-indigo-600 text-zinc-950 hover:bg-indigo-500 transition-all cursor-pointer">
                    Upgrade Plan
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Collapsed quick triggers */
          <div className="flex-1 flex flex-col justify-between w-full mt-6 border-t border-zinc-900 pt-4 items-center px-2">
            <div className="flex flex-col gap-3">
              {context === 'dashboard' ? (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('trigger-create-room'))}
                  className="w-8 h-8 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white flex items-center justify-center cursor-pointer shadow-lg shadow-indigo-500/10 hover:opacity-90"
                  title="Create New Room"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              ) : (
                <button
                  className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 flex items-center justify-center cursor-pointer"
                  title="All Activity"
                >
                  <span className="material-symbols-outlined text-[18px]">folder</span>
                </button>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Mobile sidebar — fixed overlay, slides via translateX */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-30 w-64 bg-zinc-950 border-r border-zinc-850 flex flex-col transition-transform duration-300 ease-out ${
          isExpanded ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-850 shrink-0">
          <div className="flex items-center gap-2.5">
            <img src={interactIcon} alt="InterAct" className="w-7 h-7 object-contain" />
            <div className="flex flex-col">
              <h2 className="text-xs font-bold font-geist text-white tracking-tight uppercase">InterAct</h2>
              <span className="text-[9px] text-zinc-550 leading-none">workspace v1.0</span>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="p-1 rounded-lg hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            title="Close"
          >
            <span className="material-symbols-outlined text-[20px] block">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-1 px-3 py-4 shrink-0">
          <NavLink to="/dashboard" className={navLinkClass} onClick={onToggle}>
            <span className="material-symbols-outlined text-[18px]">grid_view</span>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/history" className={navLinkClass} onClick={onToggle}>
            <span className="material-symbols-outlined text-[18px]">history</span>
            <span>Activity Hub</span>
          </NavLink>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="border-t border-zinc-900 pt-4">
            {context === 'dashboard' ? (
              <div className="flex flex-col gap-4">
                <span className="text-[10px] font-bold font-geist text-zinc-500 uppercase tracking-wider">Quick Actions</span>
                <button
                  onClick={() => { window.dispatchEvent(new CustomEvent('trigger-create-room')); onToggle(); }}
                  className="w-full py-2 rounded-lg text-xs font-semibold font-geist bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:opacity-95 shadow-lg shadow-indigo-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>New Room</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold font-geist text-zinc-500 uppercase tracking-wider mb-1">Hub Options</span>
                <button className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs bg-indigo-650/10 text-[#c0c1ff] font-geist font-medium text-left">
                  <span>All Activity</span>
                </button>
                <button className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:bg-zinc-900/50 font-geist font-medium text-left">
                  <span>Recordings</span>
                  <span className="text-[10px] font-mono bg-zinc-850 text-zinc-550 px-1.5 py-0.2 rounded">12</span>
                </button>
                <button className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:bg-zinc-900/50 font-geist font-medium text-left">
                  <span>Chat Logs</span>
                </button>
                <button className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:bg-zinc-900/50 font-geist font-medium text-left">
                  <span>Files Shared</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
