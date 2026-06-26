import React from 'react';
import { useDesktopAgent } from '../hooks/useDesktopAgent';

export const DesktopAgentStatus: React.FC = () => {
  const { isSupported, isDetected, agentInfo } = useDesktopAgent();

  if (!isSupported) {
    return null;
  }

  const downloadUrl = 'https://github.com/Girish/InterAct-Agent/releases/latest';

  return (
    <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-850 backdrop-blur-sm flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <div className="relative flex h-2 w-2">
          {isDetected && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${isDetected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-zinc-200 font-geist">
            {isDetected ? 'Desktop Agent Connected' : 'Desktop Agent not detected'}
          </span>
          {isDetected && agentInfo && (
            <span className="text-[10px] text-zinc-500 font-mono">
              v{agentInfo.agent_version}
            </span>
          )}
        </div>
      </div>
      
      {!isDetected && (
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
    </div>
  );
};
