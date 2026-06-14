import { useCallback, useEffect, useRef, useState } from 'react';
import { wsClient } from '../lib/websocket';

const STUN_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export type SharingState = 'idle' | 'requesting' | 'sharing' | 'viewing' | 'error';

interface UseWebRTCOptions {
  isHost: boolean;
  currentSocketId: string;
  /** All non-host participant socket IDs */
  viewerIds: string[];
}

interface UseWebRTCReturn {
  sharingState: SharingState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startSharing: () => Promise<void>;
  stopSharing: () => void;
  errorMessage: string | null;
}

export function useWebRTC({ isHost, currentSocketId, viewerIds }: UseWebRTCOptions): UseWebRTCReturn {
  const [sharingState, setSharingState] = useState<SharingState>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // FIX #1: Map of peerId -> RTCPeerConnection instead of a single pcRef.
  // This is the fundamental architectural change that enables Host <-> ViewerN.
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  // ─── Cleanup all peer connections ────────────────────────────────────────
  const cleanup = useCallback(() => {
    pcsRef.current.forEach((pc) => pc.close());
    pcsRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
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

  // ─── HOST: Start screen sharing ────────────────────────────────────────────
  const startSharing = useCallback(async () => {
    if (!isHost) return;
    setErrorMessage(null);
    setSharingState('requesting');

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30, max: 60 } },
        audio: false,
      });
    } catch {
      setSharingState('idle');
      setErrorMessage('Screen sharing was cancelled or permission was denied.');
      return;
    }

    localStreamRef.current = stream;
    setLocalStream(stream);
    setSharingState('sharing');

    // React when the user clicks "Stop sharing" in the browser native bar
    stream.getVideoTracks()[0].onended = () => stopSharing();

    // FIX #2: offer ALL viewers present at share-start time, not just targets[0]
    const currentViewers = viewerIds.filter((id) => id && id !== currentSocketId);
    console.log(`[WebRTC] Starting share, sending offers to ${currentViewers.length} viewer(s)`);
    for (const viewerId of currentViewers) {
      await sendOfferToViewer(viewerId, stream);
    }
  }, [isHost, viewerIds, currentSocketId, sendOfferToViewer]);

  // ─── HOST: Stop sharing ────────────────────────────────────────────────────
  const stopSharing = useCallback(() => {
    cleanup();
    setSharingState('idle');
    wsClient.send('host_stop_share', {});
  }, [cleanup]);

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

  return { sharingState, localStream, remoteStream, startSharing, stopSharing, errorMessage };
}
