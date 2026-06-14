import React, { useState } from 'react';
import { Avatar } from './Avatar.FC';

interface HostControlPanelProps {
  onClose: () => void;
  roomLink: string;
  participants: any[];
  autoDelete: boolean;
  onToggleAutoDelete: (val: boolean) => void;
  onTransferHost: (socketId: string) => void;
  onRemoveParticipant: (socketId: string) => void;
}

export const HostControlPanel: React.FC<HostControlPanelProps> = ({
  onClose,
  roomLink,
  participants,
  autoDelete,
  onToggleAutoDelete,
  onTransferHost,
  onRemoveParticipant,
}) => {
  const [quality, setQuality] = useState<'auto' | '720p' | '1080p'>('auto');

  return (
    <div className="w-96 border-l border-slate-border bg-surface flex flex-col h-full z-10">
      {/* Header */}
      <div className="p-4 border-b border-slate-border flex items-center justify-between">
        <h2 className="text-base font-bold font-geist text-white">Host Controls</h2>
        <button onClick={onClose} className="p-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200">
          <span className="material-symbols-outlined text-[20px] block">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 custom-scrollbar">
        {/* Stream Quality Preferences */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold font-geist text-zinc-500 uppercase tracking-wider">Stream Quality</h3>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-zinc-500 font-geist">Quality Preference</span>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-900 p-0.5 border border-zinc-850">
              {(['auto', '720p', '1080p'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`py-1 text-2xs font-bold font-geist uppercase rounded transition-colors ${
                    quality === q ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Participant list with host roles */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold font-geist text-zinc-500 uppercase tracking-wider">
            Participants ({participants.length})
          </h3>
          <div className="flex flex-col gap-2">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/20 hover:bg-zinc-900/40 border border-zinc-900/40">
                <div className="flex items-center gap-2.5">
                  <Avatar name={p.name} size="sm" color={p.avatarColor} status={p.status} />
                  <div className="flex flex-col">
                    <span className="text-xs text-zinc-300 font-inter font-medium">{p.name}</span>
                    <span className="text-[10px] text-zinc-500 font-geist capitalize">{p.role}</span>
                  </div>
                </div>

                {p.role !== 'host' && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => onTransferHost(p.id)}
                      className="px-2 py-1 rounded border border-zinc-800 text-3xs font-semibold font-geist text-zinc-400 hover:bg-zinc-900 hover:text-[#c0c1ff]"
                    >
                      Make Host
                    </button>
                    <button
                      onClick={() => onRemoveParticipant(p.id)}
                      className="px-2 py-1 rounded border border-rose-950 text-3xs font-semibold font-geist text-rose-400 hover:bg-rose-500/10"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Room Settings */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-bold font-geist text-zinc-500 uppercase tracking-wider">Room Settings</h3>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-zinc-500 font-geist">Room Link</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                readOnly
                value={roomLink}
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-500 focus:outline-none font-mono"
              />
              <button
                onClick={() => navigator.clipboard.writeText(roomLink)}
                className="p-2 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200"
              >
                <span className="material-symbols-outlined text-[16px] block">content_copy</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-zinc-900 pt-3 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300 font-inter">Auto-delete when empty</span>
              <button
                onClick={() => onToggleAutoDelete(!autoDelete)}
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  autoDelete ? 'bg-indigo-500' : 'bg-zinc-800'
                }`}
              >
                <span className={`block w-4 h-4 rounded-full bg-zinc-950 absolute top-1 transition-all ${
                  autoDelete ? 'left-5' : 'left-1'
                }`} />
              </button>
            </div>
            {!autoDelete && (
              <p className="text-[11px] text-zinc-500 font-inter leading-relaxed mt-1 animate-fadeIn">
                This room will be deleted 1 day after staying empty.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer controls */}
      <div className="p-4 border-t border-slate-border flex flex-col gap-2 bg-zinc-950/20">
        <button className="w-full py-2 bg-rose-600 hover:bg-rose-500 rounded-lg text-xs font-semibold font-geist text-white">
          End Room for All
        </button>
      </div>
    </div>
  );
};
