import React, { useEffect, useState } from 'react';
import { isMobileDevice } from '../lib/mobile';
import { desktopAgent } from '../lib/desktopAgent';
import type { ConnectionStatus } from '../lib/desktopAgent';

export const AgentStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>(desktopAgent.getStatus());
  const [agentVersion, setAgentVersion] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = desktopAgent.onStatusChange((newStatus) => {
      setStatus(newStatus);
      const info = desktopAgent.getAgentInfo();
      setAgentVersion(info ? info.version : null);
    });
    return unsubscribe;
  }, []);

  if (isMobileDevice) return null;

  let dotColor = 'bg-zinc-500';
  let label = 'Agent Offline';
  let pulseClass = '';
  let borderClass = 'border-zinc-800';
  let textClass = 'text-zinc-400';
  let tooltip = 'Desktop Agent is not connected. Make sure the executable is running locally.';

  switch (status) {
    case 'connected':
      dotColor = 'bg-emerald-500';
      label = `Agent Connected${agentVersion ? ` v${agentVersion}` : ''}`;
      pulseClass = 'animate-pulse';
      borderClass = 'border-emerald-500/20';
      textClass = 'text-emerald-400';
      tooltip = 'Desktop Agent is connected on localhost and ready for screen integration.';
      break;
    case 'connecting':
      dotColor = 'bg-amber-400';
      label = 'Agent Connecting';
      pulseClass = 'animate-pulse';
      borderClass = 'border-amber-400/20';
      textClass = 'text-amber-400';
      tooltip = 'Attempting connection to local Desktop Agent on localhost...';
      break;
    case 'disconnected':
      dotColor = 'bg-rose-500';
      label = 'Agent Disconnected';
      borderClass = 'border-rose-500/20';
      textClass = 'text-rose-400';
      tooltip = 'Desktop Agent is disconnected. Retrying connection...';
      break;
    case 'incompatible':
      dotColor = 'bg-amber-500';
      label = 'Agent Version Mismatch';
      borderClass = 'border-amber-600/30';
      textClass = 'text-amber-500 font-bold';
      tooltip = 'Incompatible protocol version. Please upgrade your Desktop Agent executable and refresh the page.';
      break;
  }

  return (
    <div
      className={`text-3xs font-mono bg-zinc-950/80 border ${borderClass} ${textClass} px-2 py-0.5 rounded flex items-center gap-1.5 cursor-help transition-all duration-200`}
      title={tooltip}
    >
      {status === 'incompatible' ? (
        <span className="text-[10px] leading-none" role="img" aria-label="warning">⚠️</span>
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor} ${pulseClass}`} />
      )}
      <span>{label}</span>
    </div>
  );
};
export default AgentStatusIndicator;
