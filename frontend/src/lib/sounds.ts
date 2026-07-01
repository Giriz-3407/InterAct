/**
 * Web Audio API helper for minimal, modern room sound effects.
 * Synthesized dynamically to avoid fetching external audio assets.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch((err) => console.warn('Could not resume audio context:', err));
  }
  
  return audioCtx;
}

/**
 * Modern upward chime arpeggio for when the current user joins a room.
 */
export function playSelfJoinSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Gentle rising chord: C4 (261.63), E4 (329.63), G4 (392.00), C5 (523.25)
  const notes = [261.63, 329.63, 392.00, 523.25];
  
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);
    
    // Smooth volume envelope for a warm arpeggio
    gainNode.gain.setValueAtTime(0, now + idx * 0.08);
    gainNode.gain.linearRampToValueAtTime(0.08, now + idx * 0.08 + 0.03); // Soft attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35); // Gentle decay
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + 0.4);
  });
}

/**
 * Bright, pleasant double beep (G5, C6) for when another participant joins the room.
 */
export function playParticipantJoinSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Bright double ding: G5 (783.99), C6 (1046.50)
  const notes = [783.99, 1046.50];
  
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.06);
    
    gainNode.gain.setValueAtTime(0, now + idx * 0.06);
    gainNode.gain.linearRampToValueAtTime(0.06, now + idx * 0.06 + 0.01); // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.22); // Fast decay
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now + idx * 0.06);
    osc.stop(now + idx * 0.06 + 0.25);
  });
}

/**
 * Soft, clean upward pop sound for incoming messages.
 */
export function playMessageSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  osc.type = 'sine';
  // Pitch sweep upward creates a modern bubble pop sound
  osc.frequency.setValueAtTime(450, now);
  osc.frequency.exponentialRampToValueAtTime(850, now + 0.07);
  
  // Quick volume envelope
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.07, now + 0.015);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  osc.start(now);
  osc.stop(now + 0.12);
}
