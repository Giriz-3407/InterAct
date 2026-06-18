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
  remoteHostMicStream: MediaStream | null;
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
  const [remoteHostMicStream, setRemoteHostMicStream] = useState<MediaStream | null>(null);
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
    setRemoteHostMicStream(null);
    setCaptureDisplaySurface(null);
    setAudioWarning(null);
    setMicWarning(null);
    setMicStream(null);
    setAudioTrackSource('none');
  }, []);

  // ─── Create one RTCPeerConnection keyed by peerId ─────────────────────────
  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const existing = pcsRef.current.get(peerId);
    if (existing) {
      existing.close();
    }

    const pc = new RTCPeerConnection(STUN_CONFIG);

    // Create a data channel to guarantee connection establishment when no media tracks are present
    if (isHost) {
      try {
        pc.createDataChannel('omnisync-voice-broadcast');
      } catch (err) {
        console.warn('[WebRTC] Failed to create data channel:', err);
      }
    }

    // Forward local ICE candidates to the correct remote peer
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        wsClient.send('ice_candidate', { targetId: peerId, candidate: e.candidate });
      }
    };

    // Viewer side: incoming track from host
    pc.ontrack = (e) => {
      const track = e.track;
      const stream = e.streams?.[0];
      if (!stream) return;

      console.log(`[WebRTC] Viewer received track: id=${track.id}, kind=${track.kind}, streamId=${stream.id}`);

      if (track.kind === 'video') {
        // Video track is screen share video
        setRemoteStream(stream);
        setSharingState('viewing');
      } else if (track.kind === 'audio') {
        // Check if the stream has a video track (which means it's the screen share audio)
        const hasVideo = stream.getVideoTracks().length > 0;
        if (hasVideo) {
          console.log(`[WebRTC] Set remote screen audio stream: ${stream.id}`);
          setRemoteStream(stream);
        } else {
          console.log(`[WebRTC] Set remote host microphone stream: ${stream.id}`);
          setRemoteHostMicStream(stream);
        }
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
          setRemoteHostMicStream(null);
          setErrorMessage('Connection to host was lost.');
        }
      }
    };

    pcsRef.current.set(peerId, pc);
    return pc;
  }, [isHost]);

  // ─── Sync tracks based on current active sources ──────────────────────────
  const syncTracks = useCallback((pc: RTCPeerConnection) => {
    const activeTracks: { track: MediaStreamTrack; stream: MediaStream }[] = [];

    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((track) => {
        activeTracks.push({ track, stream: displayStreamRef.current! });
      });
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => {
        activeTracks.push({ track, stream: micStreamRef.current! });
      });
    }

    const senders = pc.getSenders();

    // 1. Remove senders that are no longer active
    senders.forEach((sender) => {
      if (sender.track) {
        const isActive = activeTracks.some((t) => t.track.id === sender.track?.id);
        if (!isActive) {
          console.log(`[WebRTC] Removing inactive track: id=${sender.track.id}, kind=${sender.track.kind}`);
          try {
            pc.removeTrack(sender);
          } catch (err) {
            console.warn('[WebRTC] Error removing track:', err);
          }
        }
      }
    });

    // 2. Add active tracks that don't have a sender yet
    activeTracks.forEach(({ track, stream }) => {
      const alreadyAdded = senders.some((sender) => sender.track?.id === track.id);
      if (!alreadyAdded) {
        console.log(`[WebRTC] Adding active track: id=${track.id}, kind=${track.kind}, streamId=${stream.id}`);
        try {
          pc.addTrack(track, stream);
        } catch (err) {
          console.warn('[WebRTC] Error adding track:', err);
        }
      }
    });
  }, []);

  // ─── HOST: offer helper for a single viewer ───────────────────────────────
  const sendOfferToViewer = useCallback(async (viewerId: string) => {
    let pc = pcsRef.current.get(viewerId);
    if (!pc) {
      pc = createPeerConnection(viewerId);
    }

    syncTracks(pc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    wsClient.send('webrtc_offer', { targetId: viewerId, offer: pc.localDescription });
    console.log(`[WebRTC] Sent offer to viewer ${viewerId}`);
  }, [createPeerConnection, syncTracks]);

  // ─── HOST: sync tracks with all connected viewers ─────────────────────────
  const syncAllViewers = useCallback(async () => {
    if (!isHost) return;
    const currentViewers = viewerIds.filter((id) => id && id !== currentSocketId);
    console.log(`[WebRTC] Syncing tracks for ${currentViewers.length} viewer(s)`);
    for (const viewerId of currentViewers) {
      try {
        await sendOfferToViewer(viewerId);
      } catch (err) {
        console.error(`[WebRTC] Failed to send offer to viewer ${viewerId}:`, err);
      }
    }
  }, [isHost, viewerIds, currentSocketId, sendOfferToViewer]);

  // ─── HOST: Stop sharing ────────────────────────────────────────────────────
  const stopSharing = useCallback(() => {
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((track) => track.stop());
      displayStreamRef.current = null;
    }
    setLocalStream(null);
    setCaptureDisplaySurface(null);
    setSharingState('idle');
    wsClient.send('host_stop_share', {});

    // Sync tracks (will remove screen tracks and renegotiate)
    syncAllViewers();
  }, [syncAllViewers]);

  // ─── HOST: Start screen sharing ────────────────────────────────────────────
  const startSharing = useCallback(async () => {
    if (!isHost) return;
    setErrorMessage(null);
    setAudioWarning(null);
    setMicWarning(null);
    setSharingState('requesting');

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

    localStreamRef.current = displayStream;
    setLocalStream(displayStream);

    const displaySurface = (
      displayStream.getVideoTracks()[0]?.getSettings().displaySurface ?? 'unknown'
    ) as CaptureDisplaySurface;
    setCaptureDisplaySurface(displaySurface);
    setSharingState('sharing');

    displayStream.getVideoTracks()[0].onended = () => stopSharing();

    // Sync tracks with all viewers and renegotiate
    await syncAllViewers();
  }, [isHost, syncAllViewers, stopSharing]);

  // ─── HOST: Sync audio track source for audit panel ────────────────────────
  useEffect(() => {
    const hasDisplayAudio = !!displayStreamRef.current && displayStreamRef.current.getAudioTracks().length > 0;
    const hasMic = !!micStream && !micMuted;

    if (hasDisplayAudio && hasMic) {
      setAudioTrackSource('mixed');
    } else if (hasDisplayAudio) {
      setAudioTrackSource('display');
    } else if (hasMic) {
      setAudioTrackSource('microphone');
    } else {
      setAudioTrackSource('none');
    }
  }, [micStream, micMuted, localStream]);

  // ─── HOST: Clean up connections for viewers who left ───────────────────────
  useEffect(() => {
    if (!isHost) return;

    const activeIds = new Set(viewerIds);
    pcsRef.current.forEach((pc, id) => {
      if (!activeIds.has(id)) {
        console.log(`[WebRTC] Viewer ${id} left. Closing peer connection.`);
        pc.close();
        pcsRef.current.delete(id);
      }
    });
  }, [viewerIds, isHost]);

  // ─── HOST: Synchronize microphone mute and capture mic on-demand ──────────
  useEffect(() => {
    if (!isHost) return;

    const syncMic = async () => {
      if (!micMuted) {
        if (!micStreamRef.current) {
          try {
            console.log('[WebRTC] Requesting microphone stream...');
            const micStreamObj = await navigator.mediaDevices.getUserMedia({ audio: true });
            micStreamRef.current = micStreamObj;
            micStreamObj.getAudioTracks().forEach(t => t.enabled = true);
            setMicStream(micStreamObj);

            // Sync tracks with all viewers and renegotiate (add mic track)
            await syncAllViewers();
          } catch (err) {
            console.error('[WebRTC] Microphone access denied or not available:', err);
            setMicWarning("Microphone access denied.");
          }
        } else {
          micStreamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = true;
          });
          wsClient.send('mic_status_update', { micMuted: false });
          console.log('[WebRTC] Enabled mic tracks and sent mic_status_update (false)');
        }
      } else {
        if (micStreamRef.current) {
          micStreamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = false;
          });
          wsClient.send('mic_status_update', { micMuted: true });
          console.log('[WebRTC] Disabled mic tracks and sent mic_status_update (true)');
        }
      }
    };

    syncMic();
  }, [micMuted, isHost, syncAllViewers]);

  // ─── WebSocket signaling handlers ──────────────────────────────────────────
  useEffect(() => {
    if (!currentSocketId) return;

    // VIEWER: receives an offer from the host
    const unsubOffer = wsClient.on('webrtc_offer', async (data) => {
      if (isHost) return;
      const { senderId, offer } = data;
      if (!senderId || !offer) return;

      console.log(`[WebRTC] Viewer received offer from host ${senderId}`);
      let pc = pcsRef.current.get(senderId);
      if (!pc) {
        pc = createPeerConnection(senderId);
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      wsClient.send('webrtc_answer', { targetId: senderId, answer: pc.localDescription });
    });

    // HOST: receives an answer
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

    // BOTH: ICE candidate
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
        setRemoteStream(null);
        setSharingState('idle');
      }
    });

    return () => {
      unsubOffer();
      unsubAnswer();
      unsubIce();
      unsubStop();
    };
  }, [isHost, currentSocketId, createPeerConnection, cleanup]);

  // ─── HOST: late-joiner — new viewer joins ──────────────────────────────────
  useEffect(() => {
    if (!isHost) return;

    const currentViewers = viewerIds.filter((id) => id && id !== currentSocketId);

    // Find viewers that do NOT yet have a peer connection
    const unconnected = currentViewers.filter((id) => !pcsRef.current.has(id));
    if (unconnected.length === 0) return;

    // We only connect if some media source is active
    const mediaActive = !!displayStreamRef.current || !!micStreamRef.current;
    if (!mediaActive) return;

    console.log(`[WebRTC] Late joiner(s) detected, sending offers to: ${unconnected.join(', ')}`);
    unconnected.forEach((viewerId) => {
      sendOfferToViewer(viewerId).catch((err) =>
        console.error(`[WebRTC] Failed to send offer to late-joiner ${viewerId}:`, err)
      );
    });

    // Also send the host's current mic state to the newly joined viewers
    if (micStreamRef.current) {
      wsClient.send('mic_status_update', { micMuted });
    }
  }, [viewerIds, isHost, currentSocketId, sendOfferToViewer, micMuted]);

  // Cleanup on unmount
  useEffect(() => () => cleanup(), [cleanup]);

  return {
    sharingState,
    localStream,
    remoteStream,
    remoteHostMicStream,
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
