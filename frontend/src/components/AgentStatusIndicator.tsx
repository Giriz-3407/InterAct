import React, { useState, useEffect, useRef } from 'react';
import { isMobileDevice } from '../lib/mobile';
import { useDesktopAgent } from '../hooks/useDesktopAgent';
import { Download, RefreshCw, AlertTriangle, Monitor } from 'lucide-react';

export const AgentStatusIndicator: React.FC = () => {
  const { isSupported, status, isOutdated, isLoading } = useDesktopAgent();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdateDismissed, setIsUpdateDismissed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync session dismissal state on mount and updates
  useEffect(() => {
    const dismissed = sessionStorage.getItem('interact_agent_update_dismissed') === 'true';
    setIsUpdateDismissed(dismissed);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (isMobileDevice || !isSupported) return null;

  // Check if updates are active (outdated, incompatible) and NOT dismissed for this session
  const showUpdateWarning = (isOutdated || status === 'incompatible') && !isUpdateDismissed;

  // Determine indicator appearance
  let dotColor = 'bg-zinc-500';
  let label = 'Agent Offline';
  let pulseClass = '';
  let borderClass = 'border-zinc-800';
  let textClass = 'text-zinc-400 hover:text-zinc-300';
  let isActionRequired = false;

  // Modify states based on connection status
  if (status === 'connected') {
    if (showUpdateWarning) {
      dotColor = 'bg-amber-500';
      label = 'Update Available';
      borderClass = 'border-amber-500/20';
      textClass = 'text-amber-400 hover:text-amber-300 font-bold';
      isActionRequired = true;
    } else {
      dotColor = 'bg-emerald-500';
      label = 'Agent Connected';
      pulseClass = 'animate-pulse';
      borderClass = 'border-emerald-500/20';
      textClass = 'text-emerald-400';
      isActionRequired = false; // up to date, no click actions
    }
  } else if (status === 'connecting') {
    dotColor = 'bg-amber-400';
    label = 'Agent Connecting';
    pulseClass = 'animate-pulse';
    borderClass = 'border-amber-400/20';
    textClass = 'text-amber-400';
    isActionRequired = true; // can download if it takes too long
  } else if (status === 'disconnected') {
    dotColor = 'bg-rose-500';
    label = 'Agent Offline';
    borderClass = 'border-rose-500/20';
    textClass = 'text-rose-400 hover:text-rose-300';
    isActionRequired = true; // download prompt
  } else if (status === 'incompatible') {
    if (showUpdateWarning) {
      dotColor = 'bg-amber-500';
      label = 'Agent Outdated';
      borderClass = 'border-amber-600/30';
      textClass = 'text-amber-500 hover:text-amber-400 font-bold';
      isActionRequired = true;
    } else {
      // Incompatible status but dismissed, treat as generic online
      dotColor = 'bg-emerald-500';
      label = 'Agent Connected';
      borderClass = 'border-emerald-500/20';
      textClass = 'text-emerald-400';
      isActionRequired = false;
    }
  }

  const handleIndicatorClick = () => {
    if (isActionRequired) {
      setIsOpen(!isOpen);
    }
  };

  const handleLater = () => {
    sessionStorage.setItem('interact_agent_update_dismissed', 'true');
    setIsUpdateDismissed(true);
    setIsOpen(false);
  };

  const downloadUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/download/windows`;

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Status Badge */}
      <button
        onClick={handleIndicatorClick}
        disabled={isLoading || !isActionRequired}
        className={`text-3xs font-mono bg-zinc-950/80 border ${borderClass} ${textClass} px-2 py-0.5 rounded flex items-center gap-1.5 transition-all duration-200 select-none ${
          isActionRequired ? 'cursor-pointer hover:bg-zinc-900/60' : 'cursor-default'
        }`}
      >
        {showUpdateWarning ? (
          <span className="text-[10px] leading-none" role="img" aria-label="warning">⚠️</span>
        ) : (
          <span className={`h-1.5 w-1.5 rounded-full ${dotColor} ${pulseClass}`} />
        )}
        <span>{label}</span>
      </button>

      {/* Dropdown Popover */}
      {isOpen && isActionRequired && (
        <div className="absolute right-0 top-full mt-2 w-64 p-4 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl z-50 flex flex-col gap-3.5 font-inter text-zinc-300 text-left animate-fade-in">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
            <Monitor size={15} className="text-[#c0c1ff]" />
            <h4 className="text-xs font-bold font-geist text-white tracking-tight">Desktop Agent Manager</h4>
          </div>

          {/* Body */}
          {status === 'disconnected' || status === 'connecting' ? (
            <div className="space-y-3">
              <p className="text-[11px] leading-relaxed text-zinc-400">
                The InterAct Desktop Agent is not running on your computer. Running the agent is required to host collaborative screen shares.
              </p>
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="w-full py-2 bg-[#c0c1ff] hover:bg-[#d0d1ff] text-[#09090b] text-xs font-bold font-geist rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-lg"
              >
                <Download size={13} />
                Download Desktop Agent
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-zinc-400">
                  A newer version of the Desktop Agent is available. Update to ensure connection protocol compatibility.
                </p>
              </div>
              <div className="grid grid-cols-5 gap-2 pt-1.5 border-t border-zinc-900">
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className="col-span-3 py-2 bg-amber-600/20 hover:bg-amber-500/20 text-amber-400 text-xs font-bold font-geist border border-amber-500/30 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw size={12} className="animate-spin-slow" />
                  Update
                </a>
                <button
                  onClick={handleLater}
                  className="col-span-2 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 text-xs font-bold font-geist border border-zinc-800 rounded-lg cursor-pointer transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentStatusIndicator;
