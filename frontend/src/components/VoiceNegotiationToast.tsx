import React, { useEffect, useState } from 'react';
import type { VoiceNegotiationState } from '../lib/voiceNegotiationDiag';

interface VoiceNegotiationToastProps {
  state: VoiceNegotiationState;
}

export const VoiceNegotiationToast: React.FC<VoiceNegotiationToastProps> = ({ state }) => {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (state.phase !== 'connecting' || state.startedAt == null) {
      return;
    }

    const tick = () => {
      setElapsedSec((performance.now() - state.startedAt!) / 1000);
    };

    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [state.phase, state.startedAt]);

  if (state.phase === 'idle') {
    return null;
  }

  return (
    <div
      className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      aria-live="polite"
    >
      <div
        className={`glass-panel px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md max-w-sm text-center transition-colors ${
          state.phase === 'connected'
            ? 'border-emerald-500/30 bg-emerald-950/40'
            : 'border-indigo-500/30 bg-zinc-950/90'
        }`}
      >
        {state.phase === 'connecting' ? (
          <>
            <p className="text-sm font-semibold font-geist text-white flex items-center justify-center gap-2">
              <span>🎤</span>
              <span>Connecting microphone...</span>
            </p>
            <p className="text-xs text-zinc-400 font-inter mt-1">Please wait before speaking.</p>
            <p className="text-xs text-indigo-300 font-mono mt-2">
              Negotiating audio... ({elapsedSec.toFixed(1)}s)
            </p>
          </>
        ) : (
          <p className="text-sm font-semibold font-geist text-emerald-300 flex items-center justify-center gap-2">
            <span>🎤</span>
            <span>Voice Connected</span>
          </p>
        )}
      </div>
    </div>
  );
};
