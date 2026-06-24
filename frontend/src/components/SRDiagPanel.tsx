import { useState, useRef, useEffect } from 'react';
import type { DiagEntry } from '../hooks/useSpeechRecognition';

interface Props {
  logs: DiagEntry[];
  onClear: () => void;
}

const ICON_MIC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

export const SRDiagPanel = ({ logs, onClear }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length, isOpen]);

  const formatTs = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
  };

  const last = logs[logs.length - 1];
  const statusColor = !logs.length
    ? 'bg-zinc-500'
    : last.name === 'onend->PAUSED (mobile path)' || last.name === 'onend->STOPPED (isListeningRef is false)'
      ? 'bg-rose-500'
      : last.name.startsWith('onend')
        ? 'bg-amber-500'
        : 'bg-emerald-500';

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-[9999] flex items-center gap-2 px-3 py-2 rounded-full border border-zinc-700 bg-zinc-900/90 text-zinc-100 shadow-xl backdrop-blur-md cursor-pointer transition-all hover:bg-zinc-800 hover:-translate-y-0.5"
      >
        <span className={`h-2.5 w-2.5 rounded-full ${statusColor} animate-pulse-subtle`} />
        <span className="text-[10px] font-semibold tracking-wider uppercase font-mono">
          SR {logs.length}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-[9999] w-80 max-h-[50vh] flex flex-col rounded-xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl shadow-2xl overflow-hidden font-mono select-none">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900/60 shrink-0">
        <div className="flex items-center gap-2">
          <ICON_MIC />
          <span className="text-[11px] font-bold text-zinc-200 tracking-wider uppercase">
            Speech Rec
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
            {logs.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onClear}
            className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded cursor-pointer transition-colors"
            title="Clear"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded cursor-pointer transition-colors"
            title="Minimize"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-0.5">
        {logs.length === 0 && (
          <p className="text-[10px] text-zinc-600 text-center py-6">No events yet</p>
        )}
        {logs.map((entry, i) => {
          const isError = entry.name.includes('FAILED') || entry.name.includes('error');
          const isEnd = entry.name.startsWith('onend');
          const isStart = entry.name.startsWith('start') || entry.name.startsWith('onstart');
          return (
            <div
              key={i}
              className={`flex items-start gap-1.5 px-2 py-1 rounded text-[9.5px] leading-relaxed ${
                isError ? 'bg-rose-500/10 text-rose-300' :
                isEnd ? 'bg-amber-500/8 text-amber-300' :
                isStart ? 'bg-emerald-500/8 text-emerald-300' :
                'text-zinc-400'
              }`}
            >
              <span className="shrink-0 text-zinc-600 w-[63px]">{formatTs(entry.ts)}</span>
              <span className="shrink-0 text-zinc-600 w-[46px]">{entry.elapsed}</span>
              <span className="break-all min-w-0">{entry.name}{entry.extra ? ` \u2190 ${entry.extra}` : ''}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
