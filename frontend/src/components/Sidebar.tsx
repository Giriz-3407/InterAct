import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import interactIcon from '../assets/branding/interact-icon-dark-mode.svg';
import { useAuth } from '../context/AuthContext';

const getInitials = (name?: string): string => {
  if (!name) return 'U';
  return name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

interface SidebarProps {
  context: 'dashboard' | 'history';
  isExpanded: boolean;
  onToggle: () => void;
}

/* ── Nav items ── */
const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    to: '/history',
    label: 'Activity',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    to: '/dashboard',
    label: 'Rooms',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    soon: true,
  },
  {
    to: '/dashboard',
    label: 'Insights',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    soon: true,
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

/* ── Shared nav link renderer ── */
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
      `group relative flex items-center gap-3 rounded-lg transition-all duration-150 ${
        expanded ? 'px-3 py-2.5' : 'w-10 h-10 justify-center mx-auto'
      } ${
        isActive && !item.soon
          ? 'bg-[#c0c1ff]/10 text-[#c0c1ff]'
          : 'text-zinc-500 hover:bg-[#1a1a1d] hover:text-zinc-200'
      }`
    }
  >
    {({ isActive }) => (
      <>
        {/* Active indicator */}
        {isActive && !item.soon && expanded && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#c0c1ff] rounded-r-full" />
        )}
        <span className="flex-shrink-0">{item.icon}</span>
        {expanded && (
          <span className="text-sm font-medium font-geist flex-1">{item.label}</span>
        )}
        {expanded && item.soon && (
          <span className="text-[9px] font-bold font-geist text-zinc-700 bg-[#1e1e21] px-1.5 py-0.5 rounded-full">
            Soon
          </span>
        )}
      </>
    )}
  </NavLink>
);

/* ── Collapse toggle button ── */
interface CollapseButtonProps {
  isExpanded: boolean;
  onToggle: () => void;
}

const CollapseButton: React.FC<CollapseButtonProps> = ({ isExpanded, onToggle }) => (
  <button
    onClick={onToggle}
    className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-[#1a1a1d] transition-colors cursor-pointer flex-shrink-0"
    title={isExpanded ? 'Collapse' : 'Expand'}
  >
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {isExpanded
        ? <path d="M15 18l-6-6 6-6" />
        : <path d="M9 18l6-6-6-6" />
      }
    </svg>
  </button>
);

/* ── Desktop sidebar ── */
const DesktopSidebar: React.FC<SidebarProps> = ({ isExpanded, onToggle }) => {
  const { user, logout } = useAuth();
  return (
    <aside
      className={`hidden md:flex flex-col h-screen bg-[#09090b] border-r border-[#1e1e21] shrink-0 transition-[width] duration-300 ease-out overflow-hidden ${
        isExpanded ? 'w-56' : 'w-[60px]'
      }`}
    >
      {/* Logo + collapse */}
      <div className={`flex items-center h-14 px-3 border-b border-[#1e1e21] flex-shrink-0 ${isExpanded ? 'justify-between' : 'justify-center'}`}>
        {isExpanded ? (
          <>
            <div className="flex items-center gap-2.5">
              <img src={interactIcon} alt="InterAct" className="h-6 w-auto" />
            </div>
            <CollapseButton isExpanded={isExpanded} onToggle={onToggle} />
          </>
        ) : (
          <button onClick={onToggle} className="p-1 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-[#1a1a1d] transition-colors cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav className={`flex-1 py-4 flex flex-col gap-1 ${isExpanded ? 'px-3' : 'px-0'}`}>
        {isExpanded && (
          <p className="text-[9px] font-bold font-geist text-zinc-700 uppercase tracking-widest px-2 mb-2">Navigation</p>
        )}
        {NAV_ITEMS.map(item => (
          <NavItem key={item.label} item={item} expanded={isExpanded} />
        ))}
      </nav>

      {/* Quick create (expanded only) */}
      {isExpanded && (
        <div className="px-3 pb-4 border-t border-[#1e1e21] pt-3 flex-shrink-0">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('trigger-create-room'))}
            className="lp-btn-primary w-full text-xs h-9"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Room
          </button>
        </div>
      )}

      {/* User Profile + Logout */}
      <div className="border-t border-[#1e1e21] p-3 flex-shrink-0 bg-[#09090b]">
        {isExpanded ? (
          <div className="flex items-center justify-between gap-2.5">
            <Link to="/settings?tab=profile" className="flex items-center gap-2 min-w-0 group/profile decoration-none">
              <div className="w-8.5 h-8.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[#c0c1ff] font-geist font-bold text-xs flex items-center justify-center shrink-0 group-hover/profile:border-[#c0c1ff]/50 transition-colors">
                {getInitials(user?.fullName)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-zinc-100 truncate font-geist group-hover/profile:text-white transition-colors">{user?.fullName}</span>
                <span className="text-[10px] text-zinc-500 truncate font-inter">{user?.email}</span>
              </div>
            </Link>
            <button
              onClick={logout}
              className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-[#1a1a1d] transition-colors cursor-pointer shrink-0"
              title="Log Out"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5">
            <Link to="/settings?tab=profile" className="w-8.5 h-8.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[#c0c1ff] font-geist font-bold text-xs flex items-center justify-center shrink-0 hover:border-[#c0c1ff]/50 transition-colors" title={`${user?.fullName} (${user?.email})`}>
              {getInitials(user?.fullName)}
            </Link>
            <button
              onClick={logout}
              className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-[#1a1a1d] transition-colors cursor-pointer"
              title="Log Out"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

/* ── Mobile sidebar drawer ── */
const MobileSidebar: React.FC<SidebarProps> = ({ isExpanded, onToggle }) => {
  const { user, logout } = useAuth();
  return (
    <aside
      className={`md:hidden fixed inset-y-0 left-0 z-30 w-64 bg-[#09090b] border-r border-[#1e1e21] flex flex-col transition-transform duration-300 ease-out ${
        isExpanded ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[#1e1e21] flex-shrink-0">
        <img src={interactIcon} alt="InterAct" className="h-6 w-auto" />
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-[#1a1a1d] transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        <p className="text-[9px] font-bold font-geist text-zinc-700 uppercase tracking-widest px-2 mb-2">Navigation</p>
        {NAV_ITEMS.map(item => (
          <NavItem key={item.label} item={item} expanded={true} onClick={onToggle} />
        ))}
      </nav>

      {/* Quick create */}
      <div className="px-3 pb-5 border-t border-[#1e1e21] pt-3 flex-shrink-0">
        <button
          onClick={() => { window.dispatchEvent(new CustomEvent('trigger-create-room')); onToggle(); }}
          className="lp-btn-primary w-full text-sm h-10"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Room
        </button>
      </div>

      {/* User Profile + Logout */}
      <div className="border-t border-[#1e1e21] p-4 flex-shrink-0 bg-[#09090b]">
        <div className="flex items-center justify-between gap-3">
          <Link to="/settings?tab=profile" className="flex items-center gap-2.5 min-w-0 group/profile decoration-none">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[#c0c1ff] font-geist font-bold text-sm flex items-center justify-center shrink-0 group-hover/profile:border-[#c0c1ff]/50 transition-colors">
              {getInitials(user?.fullName)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-zinc-100 truncate font-geist group-hover/profile:text-white transition-colors">{user?.fullName}</span>
              <span className="text-xs text-zinc-500 truncate font-inter">{user?.email}</span>
            </div>
          </Link>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-[#1a1a1d] transition-colors cursor-pointer shrink-0"
            title="Log Out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
};

/* ── Main export ── */
export const Sidebar: React.FC<SidebarProps> = (props) => (
  <>
    <DesktopSidebar {...props} />
    <MobileSidebar {...props} />
  </>
);
