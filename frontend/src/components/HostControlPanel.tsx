import React, { useState } from 'react';
import { Avatar } from './Avatar.FC';
import { Copy, Check, ShieldAlert } from 'lucide-react';

interface HostControlPanelProps {
  roomLink: string;
  participants: any[];
  autoDelete: boolean;
  onToggleAutoDelete: (val: boolean) => void;
  onTransferHost: (socketId: string) => void;
  onRemoveParticipant: (socketId: string) => void;
}

export const HostControlPanel: React.FC<HostControlPanelProps> = ({
  roomLink,
  participants,
  autoDelete,
  onToggleAutoDelete,
  onTransferHost,
  onRemoveParticipant,
}) => {
  // Quality state is disabled/automated. Keeping state to preserve UI placeholder.
  const [quality] = useState<'auto' | '720p' | '1080p'>('auto');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col bg-transparent overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b border-white/[0.04] flex items-center justify-between shrink-0 bg-white/[0.01] select-none">
        <div className="min-w-0">
          <h2 className="text-[11px] font-bold font-geist text-white uppercase tracking-widest">Host Controls</h2>
          <p className="text-[10px] text-zinc-500 font-inter mt-0.5">Settings & moderation</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3.5 custom-scrollbar pb-[calc(12px+env(safe-area-inset-bottom))]">
        {/* Stream Quality Preferences */}
        <div className="bg-white/[0.01] border border-white/[0.04] p-3 rounded-xl flex flex-col gap-2.5">
          <div className="flex items-center justify-between select-none">
            <h3 className="text-[9px] font-bold font-geist text-zinc-500 uppercase tracking-widest">Stream Quality</h3>
            <span className="text-[9px] font-mono text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded">Automated</span>
          </div>
          <div className="flex flex-col gap-1.5 opacity-50" title="Stream quality is optimized automatically by connection strength.">
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/40 p-0.5 border border-white/[0.03] pointer-events-none select-none">
              {(['auto', '720p', '1080p'] as const).map((q) => (
                <button
                  key={q}
                  disabled
                  className={`py-1 text-[10px] font-bold font-geist uppercase rounded transition-colors min-w-0 ${
                    quality === q ? 'bg-white/5 text-zinc-400' : 'text-zinc-650'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Participant list with host roles */}
        <div className="bg-white/[0.01] border border-white/[0.04] p-3 rounded-xl flex flex-col gap-2.5">
          <h3 className="text-[9px] font-bold font-geist text-zinc-500 uppercase tracking-widest select-none">
            Manage Room ({participants.length})
          </h3>
          <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto custom-scrollbar pr-0.5">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.01] border border-white/[0.03] hover:border-white/[0.06] transition-all gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0 select-none">
                  <Avatar name={p.name} size="xs" color={p.avatarColor} status={p.status} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs text-zinc-300 font-inter font-medium truncate">{p.name}</span>
                    <span className="text-[9px] text-zinc-550 font-geist capitalize leading-none mt-0.5">{p.role}</span>
                  </div>
                </div>

                {p.role !== 'host' && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => onTransferHost(p.id)}
                      className="px-2 py-1 rounded bg-white/[0.02] border border-white/[0.05] hover:bg-[#c0c1ff]/10 hover:text-[#c0c1ff] hover:border-[#c0c1ff]/20 text-[9px] font-bold font-geist text-zinc-400 transition-all cursor-pointer whitespace-nowrap active:scale-95"
                    >
                      Make Host
                    </button>
                    <button
                      onClick={() => onRemoveParticipant(p.id)}
                      className="px-2 py-1 rounded bg-red-500/[0.02] border border-red-500/10 hover:bg-red-500/10 hover:text-red-400 text-[9px] font-bold font-geist text-red-400/80 transition-all cursor-pointer whitespace-nowrap active:scale-95"
                    >
                      Kick
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Room Settings */}
        <div className="bg-white/[0.01] border border-white/[0.04] p-3 rounded-xl flex flex-col gap-3.5">
          <h3 className="text-[9px] font-bold font-geist text-zinc-500 uppercase tracking-widest select-none">Session Info</h3>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] text-zinc-500 font-geist uppercase tracking-widest select-none">Session Link</label>
            <div className="grid grid-cols-[minmax(0,1fr)_2.25rem] gap-1.5">
              <input
                type="text"
                readOnly
                value={roomLink}
                className="min-w-0 px-2.5 py-2 rounded-lg bg-black/40 border border-white/[0.04] text-[11px] text-zinc-500 focus:outline-none font-mono truncate select-all"
              />
              <button
                onClick={handleCopy}
                className="h-9 w-9 bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] rounded-lg text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer flex items-center justify-center active:scale-95"
                title="Copy room link"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-white/[0.03] pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300 font-inter select-none">Auto-delete when empty</span>
              <button
                onClick={() => onToggleAutoDelete(!autoDelete)}
                className={`w-8 h-4.5 rounded-full transition-all relative cursor-pointer ${
                  autoDelete ? 'bg-[#c0c1ff]' : 'bg-white/10'
                }`}
              >
                <span className={`block w-3.5 h-3.5 rounded-full bg-black absolute top-0.5 transition-all ${
                  autoDelete ? 'left-4' : 'left-0.5'
                }`} />
              </button>
            </div>
            {!autoDelete && (
              <p className="text-[10px] text-zinc-500 font-inter leading-normal mt-0.5 select-none">
                This room will be deleted 1 day after staying empty.
              </p>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-500/[0.02] border border-red-500/10 p-3 rounded-xl flex items-center justify-between gap-2 mt-auto">
          <div className="min-w-0 select-none flex items-center gap-2">
            <ShieldAlert size={14} className="text-red-500/60 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-[9px] font-bold font-geist text-red-400 uppercase tracking-widest">Danger Zone</h3>
              <p className="text-[9px] text-red-400/40 font-inter truncate leading-none mt-0.5">Rooms cleanup automatically.</p>
            </div>
          </div>
          <button 
            disabled 
            className="shrink-0 px-2.5 py-1.5 bg-red-500/5 text-red-500/30 border border-red-500/10 rounded-lg text-[9px] font-bold font-geist cursor-not-allowed opacity-50 whitespace-nowrap"
            title="Room terminates automatically when all participants exit."
          >
            End Room
          </button>
        </div>
      </div>
    </div>
  );
};
