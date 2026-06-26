import React from 'react';
import { createPortal } from 'react-dom';
import { useDesktopAgent } from '../hooks/useDesktopAgent';

interface DesktopAgentStatusProps {
  isSidebarExpanded?: boolean;
}

export const DesktopAgentStatus: React.FC<DesktopAgentStatusProps> = ({
  isSidebarExpanded = true,
}) => {
  const { isSupported, status, agentInfo, isOutdated, isLoading } = useDesktopAgent();

  if (!isSupported) {
    return null;
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const downloadUrl = `${apiUrl}/api/download/windows`;

  // Determine dot color
  let dotColor = 'bg-zinc-500';
  if (status === 'connected') {
    dotColor = 'bg-emerald-500';
  } else if (status === 'connecting') {
    dotColor = 'bg-amber-400';
  } else if (status === 'incompatible') {
    dotColor = 'bg-amber-500';
  } else if (status === 'disconnected') {
    dotColor = 'bg-rose-500';
  }

  // Determine primary text
  let statusText = 'Desktop Agent not detected';
  if (status === 'connected') {
    statusText = isOutdated && agentInfo 
      ? `Desktop Agent Connected v${agentInfo.version}`
      : 'Desktop Agent Connected';
  } else if (status === 'connecting') {
    statusText = 'Desktop Agent Connecting...';
  } else if (status === 'incompatible') {
    statusText = agentInfo 
      ? `Desktop Agent Incompatible v${agentInfo.version}`
      : 'Desktop Agent Incompatible';
  }

  // Determine active ping animation
  const showPing = status === 'connected' || status === 'connecting';
  const pingColor = status === 'connected' ? 'bg-emerald-400' : 'bg-amber-400';

  return createPortal(
    <div
      className={`fixed bottom-6 left-6 w-60 p-3.5 rounded-xl bg-zinc-900/95 border border-zinc-850 shadow-2xl backdrop-blur-md flex flex-col gap-3 z-40 transition-all duration-300 ${
        isSidebarExpanded ? 'block' : 'hidden md:block'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className="relative flex h-2 w-2">
          {showPing && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pingColor}`}></span>
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`}></span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-zinc-200 font-geist">
            {statusText}
          </span>
        </div>
      </div>
      
      {/* Download prompt: shown only when not detected */}
      {(status === 'disconnected' || status === 'connecting') && !isLoading && (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white text-[10px] font-bold font-geist text-center border border-zinc-700/85 hover:border-zinc-600 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
        >
          <span className="material-symbols-outlined text-[14px]">download</span>
          Download Desktop Agent
        </a>
      )}

      {/* Update prompt: shown when connected but outdated or incompatible */}
      {(isOutdated || status === 'incompatible') && (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 hover:text-amber-200 text-[10px] font-bold font-geist text-center border border-amber-500/30 hover:border-amber-500/50 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
        >
          <span className="material-symbols-outlined text-[14px]">update</span>
          Update Available
        </a>
      )}
    </div>,
    document.body
  );
};
export default DesktopAgentStatus;
