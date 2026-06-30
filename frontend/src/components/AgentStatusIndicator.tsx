import React, { useState, useEffect, useRef } from 'react';
import { isMobileDevice } from '../lib/mobile';
import { useDesktopAgent } from '../hooks/useDesktopAgent';
import { Download, RefreshCw, AlertTriangle, Monitor } from 'lucide-react';

export interface AgentStatusIndicatorProps {
  showRefresh?: boolean;
}

export const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = ({ showRefresh = false }) => {
  const { isSupported, status, isOutdated, isLoading, refresh } = useDesktopAgent();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdateDismissed, setIsUpdateDismissed] = useState(false);
  const [isInitialDiscovery, setIsInitialDiscovery] = useState(true);
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

  // Handle initial discovery timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialDiscovery(false);
    }, 8000); // 8 seconds initial discovery window
    return () => clearTimeout(timer);
  }, []);

  // Terminate initial discovery immediately on connection success
  useEffect(() => {
    if (status === 'connected' || status === 'incompatible') {
      setIsInitialDiscovery(false);
    }
  }, [status]);

  if (isMobileDevice || !isSupported) return null;

  // Check if updates are active (outdated, incompatible) and NOT dismissed for this session
  const showUpdateWarning = (isOutdated || status === 'incompatible') && !isUpdateDismissed;

  // Determine indicator appearance
  let dotColor = 'bg-zinc-500';
  let label = 'Agent Offline';
  let pulseClass = '';
  let borderClass = 'border-zinc-800/40';
  let textClass = 'text-zinc-400 hover:text-zinc-300';
  let isActionRequired = true;

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
      isActionRequired = false;
    }
  } else if (status === 'connecting') {
    dotColor = 'bg-amber-400';
    label = 'Agent Connecting';
    pulseClass = 'animate-pulse';
    borderClass = 'border-amber-400/20';
    textClass = 'text-amber-400';
    isActionRequired = true;
  } else if (status === 'disconnected') {
    dotColor = 'bg-rose-500';
    label = 'Agent Offline';
    borderClass = 'border-rose-500/20';
    textClass = 'text-rose-400 hover:text-rose-350';
    isActionRequired = true;
  } else if (status === 'incompatible') {
    if (showUpdateWarning) {
      dotColor = 'bg-amber-500';
      label = 'Agent Outdated';
      borderClass = 'border-amber-600/30';
      textClass = 'text-amber-500 hover:text-amber-400 font-bold';
      isActionRequired = true;
    } else {
      dotColor = 'bg-emerald-500';
      label = 'Agent Connected';
      borderClass = 'border-emerald-500/20';
      textClass = 'text-emerald-400';
      isActionRequired = false;
    }
  }

  const handleIndicatorClick = () => {
    if (isActionRequired || status !== 'connected') {
      setIsOpen(!isOpen);
    }
  };

  const handleLater = () => {
    sessionStorage.setItem('interact_agent_update_dismissed', 'true');
    setIsUpdateDismissed(true);
    setIsOpen(false);
  };

  const downloadUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/download/windows`;

  // Render Compact Offline state when not connected and initial discovery timed out
  const isOfflineCompact = status !== 'connected' && !isInitialDiscovery;

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative inline-block" ref={containerRef}>
        {isOfflineCompact ? (
          /* Compact Offline State (subtle, tiny footprint button) */
          <button
            onClick={handleIndicatorClick}
            className="h-8 w-8 rounded-full bg-zinc-950/80 border border-zinc-800/40 hover:border-rose-500/30 text-rose-400 hover:text-rose-300 hover:bg-zinc-900/60 cursor-pointer flex items-center justify-center relative active:scale-95 transition-all select-none"
            title="Desktop Agent Offline (Click for options)"
          >
            <Monitor size={13} />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full border border-zinc-950 bg-rose-500 animate-pulse" />
          </button>
        ) : (
          /* Standard status badge (Connected or during initial discovery) */
          <button
            onClick={handleIndicatorClick}
            disabled={status === 'connected' && !showUpdateWarning}
            className={`text-xs font-geist font-semibold bg-zinc-950/80 border ${borderClass} ${textClass} px-3 h-8 rounded-full flex items-center gap-1.5 transition-all duration-200 select-none ${
              (isActionRequired || status !== 'connected') ? 'cursor-pointer hover:bg-zinc-900/60 active:scale-95' : 'cursor-default'
            }`}
          >
            {showUpdateWarning ? (
              <span className="text-[10px] leading-none" role="img" aria-label="warning">⚠️</span>
            ) : (
              <span className={`h-1.5 w-1.5 rounded-full ${dotColor} ${pulseClass}`} />
            )}
            <span>{label}</span>
          </button>
        )}

        {/* Dropdown Popover */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 p-4 rounded-xl bg-[#0c0c0e]/95 backdrop-blur-xl border border-zinc-800/40 shadow-2xl z-50 flex flex-col gap-3.5 font-inter text-zinc-300 text-left animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
              <Monitor size={14} className="text-[#c0c1ff]" />
              <h4 className="text-xs font-bold font-geist text-white tracking-tight">Desktop Agent Manager</h4>
            </div>

            {/* Body */}
            {status === 'disconnected' || status === 'connecting' ? (
              <div className="space-y-3">
                <p className="text-[11px] leading-relaxed text-zinc-400">
                  The InterAct Desktop Agent is currently offline. You must run the local agent app on your computer to host collaborative screen shares.
                </p>
                
                <div className="flex flex-col gap-1.5 pt-1.5 border-t border-zinc-900">
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsOpen(false)}
                    className="w-full py-2 bg-[#c0c1ff] hover:bg-[#d0d1ff] text-[#09090b] text-xs font-bold font-geist rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-95"
                  >
                    <Download size={13} />
                    Download Desktop Agent
                  </a>
                  
                  <button
                    onClick={() => {
                      refresh();
                      setIsOpen(false);
                    }}
                    className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white text-xs font-bold font-geist border border-zinc-800 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors active:scale-95"
                  >
                    <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
                    Retry Connection
                  </button>
                </div>

                <div className="bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-800/40 text-[10px] text-zinc-400 space-y-1">
                  <div className="font-bold font-geist text-zinc-300">Quick Diagnostics:</div>
                  <div>• Check if InterAct Agent is running in your taskbar / system tray.</div>
                  <div>• Verify firewall is not blocking localhost port connections.</div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed text-zinc-400">
                    A newer version of the Desktop Agent is available. Update to ensure connection protocol compatibility.
                  </p>
                </div>
                <div className="grid grid-cols-5 gap-2 pt-2 border-t border-zinc-900">
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsOpen(false)}
                    className="col-span-3 py-2 bg-amber-600/20 hover:bg-amber-500/20 text-amber-400 text-xs font-bold font-geist border border-amber-500/30 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors active:scale-95"
                  >
                    <RefreshCw size={12} className="animate-spin-slow" />
                    Update
                  </a>
                  <button
                    onClick={handleLater}
                    className="col-span-2 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 text-xs font-bold font-geist border border-zinc-800 rounded-lg cursor-pointer transition-colors active:scale-95"
                  >
                    Later
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showRefresh && (
        <button
          onClick={refresh}
          disabled={isLoading}
          title="Check for agent updates"
          className="p-1 rounded bg-zinc-950/80 border border-[#1e1e21] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
        </button>
      )}
    </div>
  );
};

export default AgentStatusIndicator;
