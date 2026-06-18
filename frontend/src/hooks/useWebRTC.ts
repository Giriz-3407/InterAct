import { useCallback, useEffect, useRef, useState } from 'react';
import { wsClient } from '../lib/websocket';
import { useWebRTCAudit, type WebRTCAuditData } from './useWebRTCAudit';

const STUN_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export type SharingState = 'idle' | 'requesting' | 'sharing' | 'viewing' | 'error';
export type CaptureDisplaySurface = 'monitor' | 'window' | 'browser' | string;

interface UseWebRTCOptions {
  isHost: boolean;
  currentSocketId: string;
  /** All non-host participant socket IDs */
  viewerIds: string[];
  micMuted: boolean;
}

interface UseWebRTCReturn {
  sharingState: SharingState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  captureDisplaySurface: CaptureDisplaySurface | null;
  startSharing: () => Promise<void>;
  stopSharing: () => void;
  errorMessage: string | null;
  audioWarning: string | null;
  micWarning: string | null;
  micStream: MediaStream | null;
  audioTrackSource: 'display' | 'microphone' | 'mixed' | 'none';
  auditReports: WebRTCAuditData[];
}

export function useWebRTC({ isHost, currentSocketId, viewerIds, micMuted }: UseWebRTCOptions): UseWebRTCReturn {
  const [sharingState, setSharingState] = useState<SharingState>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [captureDisplaySurface, setCaptureDisplaySurface] = useState<CaptureDisplaySurface | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioWarning, setAudioWarning] = useState<string | null>(null);
  const [micWarning, setMicWarning] = useState<string | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [audioTrackSource, setAudioTrackSource] = useState<'display' | 'microphone' | 'mixed' | 'none'>('none');

  const displayStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micGainNodeRef = useRef<GainNode | null>(null);

  // Synchronize microphone mute with gain node or track enabled state
  useEffect(() => {
    if (micGainNodeRef.current && audioContextRef.current) {
      const gainVal = micMuted ? 0 : 1;
      micGainNodeRef.current.gain.setValueAtTime(gainVal, audioContextRef.current.currentTime);
      console.log(`[WebRTC] Set mic mixer gain to ${gainVal}`);
    }
    if (micStream) {
      micStream.getAudioTracks().forEach((track) => {
        track.enabled = !micMuted;
      });
      console.log(`[WebRTC] Set mic tracks enabled to ${!micMuted}`);
    }
  }, [micMuted, micStream]);

  // FIX #1: Map of peerId -> RTCPeerConnection instead of a single pcRef.
  // This is the fundamental architectural change that enables Host <-> ViewerN.
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  // WebRTC performance audit instrumentation
  const auditReports = useWebRTCAudit({ isHost, pcsRef, localStream, remoteStream, sharingState, micStream, audioTrackSource });

  // ─── Cleanup all peer connections ────────────────────────────────────────
  const cleanup = useCallback(() => {
    pcsRef.current.forEach((pc) => pc.close());
    pcsRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((t) => t.stop());
      displayStreamRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch((err) => console.error('[WebRTC] Error closing AudioContext:', err));
      audioContextRef.current = null;
    }
    micGainNodeRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);
    setCaptureDisplaySurface(null);
    setAudioWarning(null);
    setMicWarning(null);
    setMicStream(null);
    setAudioTrackSource('none');
  }, []);

  // ─── Create one RTCPeerConnection keyed by peerId ─────────────────────────
  // FIX #1 continued: store in map, not in a scalar ref.
  // FIX #4: ICE / answer handlers look up by peerId, not a shared ref.
  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    // Close any existing connection to this peer before recreating
    const existing = pcsRef.current.get(peerId);
    if (existing) {
      existing.close();
    }

    const pc = new RTCPeerConnection(STUN_CONFIG);

    // Forward local ICE candidates to the correct remote peer
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        wsClient.send('ice_candidate', { targetId: peerId, candidate: e.candidate });
      }
    };

    // Viewer side: incoming track from host
    pc.ontrack = (e) => {
      if (e.streams?.[0]) {
        setRemoteStream(e.streams[0]);
        setSharingState('viewing');
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`[WebRTC] ICE state for peer ${peerId}:`, state);
      if (state === 'failed' || state === 'closed') {
        pcsRef.current.delete(peerId);
        if (!isHost) {
          setSharingState('idle');
          setRemoteStream(null);
          setErrorMessage('Connection to host was lost.');
        }
      }
    };

    pcsRef.current.set(peerId, pc);
    return pc;
  }, [isHost]);

  // ─── HOST: offer helper for a single viewer ───────────────────────────────
  const sendOfferToViewer = useCallback(async (viewerId: string, stream: MediaStream) => {
    const pc = createPeerConnection(viewerId);

    // Attach all tracks of the current screen stream to this peer connection
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    wsClient.send('webrtc_offer', { targetId: viewerId, offer: pc.localDescription });
    console.log(`[WebRTC] Sent offer to viewer ${viewerId}`);
  }, [createPeerConnection]);

  // ─── HOST: Stop sharing ────────────────────────────────────────────────────
  const stopSharing = useCallback(() => {
    cleanup();
    setSharingState('idle');
    wsClient.send('host_stop_share', {});
  }, [cleanup]);

  // ─── HOST: Start screen sharing ────────────────────────────────────────────
  const startSharing = useCallback(async () => {
    if (!isHost) return;
    setErrorMessage(null);
    setAudioWarning(null);
    setMicWarning(null);
    setSharingState('requesting');

    // 1. Capture display media
    let displayStream: MediaStream;
    try {
      const constraints = {
        video: { frameRate: { ideal: 30, max: 60 } },
        audio: true,
      };
      console.log('[WEBRTC_AUDIT] getDisplayMedia constraints used by Host:', constraints);
      displayStream = await navigator.mediaDevices.getDisplayMedia(constraints);
      displayStreamRef.current = displayStream;
    } catch {
      setSharingState('idle');
      setErrorMessage('Screen sharing was cancelled or permission was denied.');
      return;
    }

    // 2. Request microphone stream
    let micStreamObj: MediaStream | null = null;
    try {
      console.log('[WebRTC] Requesting microphone stream...');
      micStreamObj = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStreamObj;
      setMicStream(micStreamObj);
    } catch (err) {
      console.warn('[WebRTC] Microphone access denied or not available:', err);
      setMicWarning("Microphone access denied. Screen audio sharing will continue.");
    }

    // 3. Audio Mixing Optimization
    const displayAudioTracks = displayStream.getAudioTracks();
    const micAudioTracks = micStreamObj ? micStreamObj.getAudioTracks() : [];
    
    let finalAudioTrack: MediaStreamTrack | null = null;
    let trackSource: 'display' | 'microphone' | 'mixed' | 'none' = 'none';

    const hasDisplayAudio = displayAudioTracks.length > 0;
    const hasMicAudio = micAudioTracks.length > 0;

    if (hasDisplayAudio && hasMicAudio) {
      // Case 1: Both display audio and mic are available -> mix them using AudioContext
      try {
        console.log('[WebRTC] Mixer Case 1: Mixing display audio + mic');
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;

        const dest = audioCtx.createMediaStreamDestination();

        // Feed display stream audio
        const displayAudioStream = new MediaStream([displayAudioTracks[0]]);
        const dispSrc = audioCtx.createMediaStreamSource(displayAudioStream);
        dispSrc.connect(dest);

        // Feed microphone stream audio through a GainNode
        const micAudioStream = new MediaStream([micAudioTracks[0]]);
        const micSrc = audioCtx.createMediaStreamSource(micAudioStream);
        const micGain = audioCtx.createGain();
        
        // Initial gain based on current micMuted status
        micGain.gain.setValueAtTime(micMuted ? 0 : 1, audioCtx.currentTime);
        micGainNodeRef.current = micGain;

        micSrc.connect(micGain);
        micGain.connect(dest);

        if (dest.stream.getAudioTracks().length > 0) {
          finalAudioTrack = dest.stream.getAudioTracks()[0];
          trackSource = 'mixed';
        }
      } catch (err) {
        console.error('[WebRTC] Audio mixing failed, falling back to display audio track:', err);
        finalAudioTrack = displayAudioTracks[0];
        trackSource = 'display';
      }
    } else if (hasDisplayAudio) {
      // Case 2: Display audio only -> route directly
      console.log('[WebRTC] Mixer Case 2: Display audio only');
      finalAudioTrack = displayAudioTracks[0];
      trackSource = 'display';
    } else if (hasMicAudio) {
      // Case 3: Microphone only -> route directly
      console.log('[WebRTC] Mixer Case 3: Microphone audio only');
      finalAudioTrack = micAudioTracks[0];
      // Ensure the mic track matches initial micMuted state
      finalAudioTrack.enabled = !micMuted;
      trackSource = 'microphone';
    } else {
      // Case 4: No audio sources
      console.log('[WebRTC] Mixer Case 4: No audio sources');
      trackSource = 'none';
      setAudioWarning("Audio sharing is unavailable for this capture source. Try sharing a Chrome tab and enable 'Share tab audio'.");
    }

    setAudioTrackSource(trackSource);

    // 4. Construct final output stream (video + chosen/mixed audio track)
    const combinedTracks: MediaStreamTrack[] = [];
    if (displayStream.getVideoTracks().length > 0) {
      combinedTracks.push(displayStream.getVideoTracks()[0]);
    }
    if (finalAudioTrack) {
      combinedTracks.push(finalAudioTrack);
    }

    const combinedStream = new MediaStream(combinedTracks);
    localStreamRef.current = combinedStream;
    setLocalStream(combinedStream);

    const displaySurface = (
      displayStream.getVideoTracks()[0]?.getSettings().displaySurface ?? 'unknown'
    ) as CaptureDisplaySurface;
    setCaptureDisplaySurface(displaySurface);
    if (displaySurface === 'monitor') {
      console.log('[LaserPointer] enabled (monitor capture)');
    } else if (displaySurface === 'window') {
      console.log('[LaserPointer] disabled (window capture)');
    } else if (displaySurface === 'browser') {
      console.log('[LaserPointer] disabled (browser capture)');
    } else {
      console.log('[LaserPointer] disabled (unknown capture)');
    }
    setSharingState('sharing');

    // React when the user clicks "Stop sharing" in the browser native bar
    displayStream.getVideoTracks()[0].onended = () => stopSharing();

    // Send offer to all current viewers
    const currentViewers = viewerIds.filter((id) => id && id !== currentSocketId);
    console.log(`[WebRTC] Starting share, sending offers to ${currentViewers.length} viewer(s)`);
    for (const viewerId of currentViewers) {
      await sendOfferToViewer(viewerId, combinedStream);
    }
  }, [isHost, viewerIds, currentSocketId, micMuted, sendOfferToViewer, stopSharing]);

  // ─── WebSocket signaling handlers ──────────────────────────────────────────
  useEffect(() => {
    if (!currentSocketId) return;

    // VIEWER: receives an offer from the host
    const unsubOffer = wsClient.on('webrtc_offer', async (data) => {
      if (isHost) return;
      const { senderId, offer } = data;
      if (!senderId || !offer) return;

      console.log(`[WebRTC] Viewer received offer from host ${senderId}`);
      const pc = createPeerConnection(senderId);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      wsClient.send('webrtc_answer', { targetId: senderId, answer: pc.localDescription });
    });

    // HOST: receives an answer — FIX #4: route to the correct PC by senderId
    const unsubAnswer = wsClient.on('webrtc_answer', async (data) => {
      if (!isHost) return;
      const { senderId, answer } = data;
      if (!senderId || !answer) return;

      const pc = pcsRef.current.get(senderId);
      if (!pc) {
        console.warn(`[WebRTC] Received answer from unknown sender ${senderId}`);
        return;
      }

      console.log(`[WebRTC] Host applying answer from viewer ${senderId}`);
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // BOTH: ICE candidate — FIX #4: route to the correct PC by senderId
    const unsubIce = wsClient.on('ice_candidate', async (data) => {
      const { senderId, candidate } = data;
      if (!candidate || !senderId) return;

      const pc = pcsRef.current.get(senderId);
      if (!pc) return; // not our candidate

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn(`[WebRTC] Failed to add ICE candidate from ${senderId}:`, err);
      }
    });

    // Viewer: host stopped sharing
    const unsubStop = wsClient.on('host_stop_share', () => {
      if (!isHost) {
        cleanup();
        setSharingState('idle');
        setErrorMessage('Host stopped sharing the screen.');
      }
    });

    return () => {
      unsubOffer();
      unsubAnswer();
      unsubIce();
      unsubStop();
    };
  }, [isHost, currentSocketId, createPeerConnection, cleanup]);

  // ─── HOST: late-joiner — new viewer joins while already sharing ───────────
  // FIX #3: check the pcsRef Map (not a scalar pcRef) so existing connections
  // do NOT prevent new viewers from receiving an offer.
  useEffect(() => {
    if (!isHost || sharingState !== 'sharing' || !localStreamRef.current) return;

    const stream = localStreamRef.current;
    const currentViewers = viewerIds.filter((id) => id && id !== currentSocketId);

    // Find viewers that do NOT yet have a peer connection
    const unconnected = currentViewers.filter((id) => !pcsRef.current.has(id));
    if (unconnected.length === 0) return;

    console.log(`[WebRTC] Late joiner(s) detected, sending offers to: ${unconnected.join(', ')}`);
    unconnected.forEach((viewerId) => {
      sendOfferToViewer(viewerId, stream).catch((err) =>
        console.error(`[WebRTC] Failed to send offer to late-joiner ${viewerId}:`, err)
      );
    });
  }, [viewerIds, isHost, sharingState, currentSocketId, sendOfferToViewer]);

  // Cleanup on unmount
  useEffect(() => () => cleanup(), [cleanup]);

  return {
    sharingState,
    localStream,
    remoteStream,
    captureDisplaySurface,
    startSharing,
    stopSharing,
    errorMessage,
    audioWarning,
    micWarning,
    micStream,
    audioTrackSource,
    auditReports,
  };
}
