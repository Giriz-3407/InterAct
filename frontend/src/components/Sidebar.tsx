import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import interactIcon from '../assets/branding/interact-icon-dark-mode.svg';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Compass,
  Tv,
  Sparkles,
  Settings,
  Plus,
  LogOut,
  ChevronLeft,
  Menu
} from 'lucide-react';

const getInitials = (name?: string): string => {
  if (!name) return 'U';
  return name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

interface SidebarProps {
  context: 'dashboard' | 'history';
  isExpanded: boolean;
  onToggle: () => void;
}

const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={15} />,
  },
  {
    to: '/history',
    label: 'Activity',
    icon: <Compass size={15} />,
  },
  {
    to: '/dashboard',
    label: 'Rooms',
    icon: <Tv size={15} />,
    soon: true,
  },
  {
    to: '/dashboard',
    label: 'Insights',
    icon: <Sparkles size={15} />,
    soon: true,
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: <Settings size={15} />,
  },
];

interface NavItemProps {
  item: typeof NAV_ITEMS[0];
  expanded: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ item, expanded, onClick }) => (
  <NavLink
    to={item.to}
    onClick={onClick}
    title={!expanded ? item.label : undefined}
    className={({ isActive }) =>
      `group relative flex items-center gap-3 rounded-xl transition-all duration-200 ${
        expanded ? 'px-3 py-2.5 mx-2' : 'w-10 h-10 justify-center mx-auto'
      } ${
        isActive && !item.soon
          ? 'bg-white/[0.04] border border-white/[0.05] text-[#c0c1ff] shadow-sm font-semibold'
          : 'text-zinc-400 hover:bg-white/[0.02] hover:text-zinc-200 border border-transparent'
      }`
    }
  >
    <span className="flex-shrink-0 transition-colors group-hover:text-zinc-100">{item.icon}</span>
    {expanded && (
      <span className="text-xs font-medium flex-1">{item.label}</span>
    )}
    {expanded && item.soon && (
      <span className="text-[9px] font-bold font-geist text-zinc-500 bg-white/[0.04] border border-white/[0.03] px-1.5 py-0.5 rounded-full select-none">
        Soon
      </span>
    )}
  </NavLink>
);

interface CollapseButtonProps {
  isExpanded: boolean;
  onToggle: () => void;
}

const CollapseButton: React.FC<CollapseButtonProps> = ({ isExpanded, onToggle }) => (
  <button
    onClick={onToggle}
    className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-all flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
    title={isExpanded ? 'Collapse' : 'Expand'}
  >
    <ChevronLeft size={14} />
  </button>
);

const DesktopSidebar: React.FC<SidebarProps> = ({ isExpanded, onToggle }) => {
  const { user, logout } = useAuth();
  return (
    <aside
      className={`hidden md:flex flex-col h-screen bg-[#0c0c0e] border-r border-white/[0.03] shadow-panel shrink-0 transition-[width] duration-300 ease-out overflow-hidden ${
        isExpanded ? 'w-56' : 'w-[60px]'
      }`}
    >
      {/* Logo + collapse */}
      <div className={`flex items-center h-14 px-3 border-b border-white/[0.03] flex-shrink-0 ${isExpanded ? 'justify-between' : 'justify-center'}`}>
        {isExpanded ? (
          <>
            <div className="flex items-center gap-2.5 select-none">
              <img src={interactIcon} alt="InterAct" className="h-6 w-auto" />
            </div>
            <CollapseButton isExpanded={isExpanded} onToggle={onToggle} />
          </>
        ) : (
          <button onClick={onToggle} className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-all flex items-center justify-center cursor-pointer active:scale-95">
            <Menu size={14} />
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav className={`flex-1 py-4 flex flex-col gap-1 ${isExpanded ? 'px-1' : 'px-0'}`}>
        {isExpanded && (
          <p className="text-[9px] font-bold font-geist text-zinc-600 uppercase tracking-widest px-4 mb-2 select-none">Navigation</p>
        )}
        {NAV_ITEMS.map(item => (
          <NavItem key={item.label} item={item} expanded={isExpanded} />
        ))}
      </nav>

      {/* Quick create (expanded only) */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-white/[0.03] pt-4 flex-shrink-0">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('trigger-create-room'))}
            className="btn-pill-primary w-full text-xs h-9 gap-1.5 rounded-xl font-geist font-semibold"
          >
            <Plus size={14} strokeWidth={2.5} />
            New Room
          </button>
        </div>
      )}

      {/* User Profile + Logout */}
      <div className="border-t border-white/[0.03] p-3 flex-shrink-0 bg-[#0c0c0e]">
        {isExpanded ? (
          <div className="flex items-center justify-between gap-2.5">
            <Link to="/settings?tab=profile" className="flex items-center gap-2 min-w-0 group/profile decoration-none">
              <div className="w-8.5 h-8.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[#c0c1ff] font-geist font-bold text-xs flex items-center justify-center shrink-0 group-hover/profile:border-[#c0c1ff]/50 transition-colors">
                {getInitials(user?.fullName)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-zinc-100 truncate font-geist group-hover/profile:text-white transition-colors">{user?.fullName}</span>
                <span className="text-[10px] text-zinc-500 truncate font-inter">{user?.email}</span>
              </div>
            </Link>
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-zinc-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all cursor-pointer shrink-0 active:scale-95"
              title="Log Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5">
            <Link to="/settings?tab=profile" className="w-8.5 h-8.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[#c0c1ff] font-geist font-bold text-xs flex items-center justify-center shrink-0 hover:border-[#c0c1ff]/50 transition-colors" title={`${user?.fullName} (${user?.email})`}>
              {getInitials(user?.fullName)}
            </Link>
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-zinc-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all cursor-pointer active:scale-95"
              title="Log Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

const MobileSidebar: React.FC<SidebarProps> = ({ isExpanded, onToggle }) => {
  const { user, logout } = useAuth();
  return (
    <aside
      className={`md:hidden fixed inset-y-0 left-0 z-30 w-64 bg-[#0c0c0e] border-r border-white/[0.03] flex flex-col transition-transform duration-300 ease-out ${
        isExpanded ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.03] flex-shrink-0">
        <img src={interactIcon} alt="InterAct" className="h-6 w-auto" />
        <button
          onClick={onToggle}
          className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer active:scale-95"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        <p className="text-[9px] font-bold font-geist text-zinc-600 uppercase tracking-widest px-2 mb-2 select-none">Navigation</p>
        {NAV_ITEMS.map(item => (
          <NavItem key={item.label} item={item} expanded={true} onClick={onToggle} />
        ))}
      </nav>

      {/* Quick create */}
      <div className="px-3 pb-5 border-t border-white/[0.03] pt-4 flex-shrink-0">
        <button
          onClick={() => { window.dispatchEvent(new CustomEvent('trigger-create-room')); onToggle(); }}
          className="btn-pill-primary w-full text-sm h-10 gap-1.5 rounded-xl font-geist font-semibold"
        >
          <Plus size={16} strokeWidth={2.5} />
          New Room
        </button>
      </div>

      {/* User Profile + Logout */}
      <div className="border-t border-white/[0.03] p-4 flex-shrink-0 bg-[#0c0c0e]">
        <div className="flex items-center justify-between gap-3">
          <Link to="/settings?tab=profile" className="flex items-center gap-2.5 min-w-0 group/profile decoration-none">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[#c0c1ff] font-geist font-bold text-sm flex items-center justify-center shrink-0 group-hover/profile:border-[#c0c1ff]/50 transition-colors">
              {getInitials(user?.fullName)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-zinc-100 truncate font-geist group-hover/profile:text-white transition-colors">{user?.fullName}</span>
              <span className="text-xs text-zinc-500 truncate font-inter">{user?.email}</span>
            </div>
          </Link>
          <button
            onClick={logout}
            className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-zinc-500 hover:text-red-400 hover:bg-red-500/10 hover:border-[#f87171]/20 transition-all cursor-pointer shrink-0 active:scale-95"
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export const Sidebar: React.FC<SidebarProps> = (props) => (
  <>
    <DesktopSidebar {...props} />
    <MobileSidebar {...props} />
  </>
);
