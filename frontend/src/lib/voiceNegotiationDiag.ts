/** Temporary diagnostic helpers for voice publish negotiation timing. */

export type VoiceNegotiationPhase = 'idle' | 'connecting' | 'connected';

export interface VoiceNegotiationState {
  phase: VoiceNegotiationPhase;
  /** performance.now() when negotiation began */
  startedAt: number | null;
}

export const VOICE_NEGOTIATION_IDLE: VoiceNegotiationState = { phase: 'idle', startedAt: null };

const TAG = '[VoiceNegotiationDiag]';

export function voiceNegotiationLog(
  event: string,
  negotiationStartedAt: number | null
) {
  const wall = new Date().toISOString();
  const elapsed =
    negotiationStartedAt != null
      ? `${((performance.now() - negotiationStartedAt) / 1000).toFixed(1)}s`
      : '—';
  console.log(`${TAG} ${event} | wall=${wall} | elapsed=${elapsed}`);
}
