import { useCallback, useEffect, useRef, useState } from 'react';
import { wsClient } from '../lib/websocket';
import { useWebRTCAudit, type WebRTCAuditData } from './useWebRTCAudit';
import {
  diagStage1_syncMicCalled,
  diagStage2_micAcquired,
  diagStage3_attachCalled,
  diagStage3_replaceTrackResult,
  diagStage4_sdp,
  diagStage5_pcState,
  diagStage6_hostOnTrack,
  diagReset,
} from './useViewerMicDiag';

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
  /** Socket ID of the current host (needed for viewer mic flow) */
  hostSocketId: string;
}

interface UseWebRTCReturn {
  sharingState: SharingState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  remoteMicStreams: Map<string, MediaStream>;
  captureDisplaySurface: CaptureDisplaySurface | null;
  startSharing: () => Promise<void>;
  stopSharing: () => void;
  errorMessage: string | null;
  audioWarning: string | null;
  micWarning: string | null;
  micStream: MediaStream | null;
  audioTrackSource: 'display' | 'microphone' | 'mixed' | 'none';
  auditReports: WebRTCAuditData[];
  getPeerConnectionStates: () => { connectionState: string; iceConnectionState: string };
}

export function useWebRTC({ isHost, currentSocketId, viewerIds, micMuted, hostSocketId }: UseWebRTCOptions): UseWebRTCReturn {
  const [sharingState, setSharingState] = useState<SharingState>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteMicStreams, setRemoteMicStreams] = useState<Map<string, MediaStream>>(new Map());
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

  // Host-side: tracks received from viewers' microphones, keyed by viewerId
  const viewerMicTracksRef = useRef<Map<string, { track: MediaStreamTrack; stream: MediaStream }>>(new Map());

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
    viewerMicTracksRef.current.clear();

    setLocalStream(null);
    setRemoteStream(null);
    setRemoteMicStreams(new Map());
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

    // Incoming tracks from remote peer
    pc.ontrack = (e) => {
      const track = e.track;
      const stream = e.streams?.[0] ?? new MediaStream([track]);

      console.log(`[DIAG:HostOnTrack] Invocation for peer: ${peerId}`);
      console.log(`[DIAG:HostOnTrack] track.id: ${track.id}`);
      console.log(`[DIAG:HostOnTrack] kind: ${track.kind}`);
      console.log(`[DIAG:HostOnTrack] streams.length: ${e.streams ? e.streams.length : 0}`);
      console.log(`[DIAG:HostOnTrack] transceiver.mid: ${e.transceiver?.mid ?? 'undefined'}`);

      console.log(`[WebRTC] Received track: id=${track.id}, kind=${track.kind}, streamId=${stream.id}, from=${peerId}`);

      if (isHost) {
        // Host receiving track from a viewer — this is a viewer's microphone
        if (track.kind === 'audio') {
          console.log(`[WebRTC] Host received viewer mic track from ${peerId}`);
          diagStage6_hostOnTrack(track, e.streams, e.transceiver, peerId);
          viewerMicTracksRef.current.set(peerId, { track, stream });

          // Host local playback — hear the viewer
          setRemoteMicStreams((prev) => {
            const next = new Map(prev);
            next.set(stream.id, stream);
            return next;
          });

          track.onended = () => {
            console.log(`[WebRTC] Viewer mic track ended for ${peerId}`);
            viewerMicTracksRef.current.delete(peerId);
            setRemoteMicStreams((prev) => {
              const next = new Map(prev);
              next.delete(stream.id);
              return next;
            });
          };

          // Relay this viewer's mic to all other viewers
          const otherViewers = viewerIds.filter((id) => id && id !== currentSocketId && id !== peerId);
          for (const otherViewerId of otherViewers) {
            sendOfferToViewerRef.current?.(otherViewerId).catch((err) =>
              console.error(`[WebRTC] Failed to relay mic to ${otherViewerId}:`, err)
            );
          }
        }
      } else {
        // Viewer receiving tracks from host
        if (track.kind === 'video') {
          setRemoteStream(stream);
          setSharingState('viewing');
        } else if (track.kind === 'audio') {
          const hasVideo = stream.getVideoTracks().length > 0;
          if (hasVideo) {
            console.log(`[WebRTC] Set remote screen audio stream: ${stream.id}`);
            setRemoteStream(stream);
          } else {
            // Microphone audio (host's own mic or relayed viewer mic)
            console.log(`[WebRTC] Set remote mic stream: ${stream.id}`);
            setRemoteMicStreams((prev) => {
              const next = new Map(prev);
              next.set(stream.id, stream);
              return next;
            });

            track.onended = () => {
              setRemoteMicStreams((prev) => {
                const next = new Map(prev);
                next.delete(stream.id);
                return next;
              });
            };

            track.onmute = () => {
              console.log(`[WebRTC] Remote mic track muted: ${stream.id}`);
            };

            track.onunmute = () => {
              console.log(`[WebRTC] Remote mic track unmuted: ${stream.id}`);
            };
          }
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`[WebRTC] ICE state for peer ${peerId}:`, state);
      if (state === 'connected' || state === 'completed' || state === 'failed') {
        diagStage5_pcState(pc);
      }
      if (state === 'failed' || state === 'closed') {
        pcsRef.current.delete(peerId);
        if (isHost) {
          viewerMicTracksRef.current.delete(peerId);
        } else {
          setSharingState('idle');
          setRemoteStream(null);
          setRemoteMicStreams(new Map());
          setErrorMessage('Connection to host was lost.');
        }
      }
    };

    pcsRef.current.set(peerId, pc);
    return pc;
  }, [isHost, viewerIds, currentSocketId]);

  // ─── Sync tracks based on current active sources ──────────────────────────
  // targetViewerId: when syncing for a specific viewer, exclude that viewer's own
  // relayed mic track (don't echo their mic back to them)
  const syncTracks = useCallback((pc: RTCPeerConnection, targetViewerId?: string) => {
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

    // Host: include relayed viewer mic tracks (excluding target viewer's own mic)
    if (isHost && targetViewerId) {
      viewerMicTracksRef.current.forEach(({ track, stream }, viewerId) => {
        if (viewerId !== targetViewerId && track.readyState === 'live') {
          activeTracks.push({ track, stream });
        }
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

    // 3. Host: ensure a recvonly audio transceiver exists for receiving viewer mic
    if (isHost) {
      const transceivers = pc.getTransceivers();
      const hasRecvSlot = transceivers.some((t) =>
        t.receiver.track?.kind === 'audio' &&
        (t.direction === 'recvonly') &&
        !t.sender.track
      );
      if (!hasRecvSlot) {
        try {
          pc.addTransceiver('audio', { direction: 'recvonly' });
          console.log(`[WebRTC] Added recvonly audio transceiver for viewer mic slot`);
        } catch (err) {
          console.warn('[WebRTC] Error adding recvonly transceiver:', err);
        }
      }
    }
  }, [isHost]);

  // ─── HOST: offer helper for a single viewer ───────────────────────────────
  const sendOfferToViewer = useCallback(async (viewerId: string) => {
    let pc = pcsRef.current.get(viewerId);
    if (!pc) {
      pc = createPeerConnection(viewerId);
    }

    syncTracks(pc, viewerId);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    wsClient.send('webrtc_offer', { targetId: viewerId, offer: pc.localDescription });
    console.log(`[WebRTC] Sent offer to viewer ${viewerId}`);
  }, [createPeerConnection, syncTracks]);

  // Stable ref for sendOfferToViewer (used in ontrack callback which can't depend on it)
  const sendOfferToViewerRef = useRef(sendOfferToViewer);
  useEffect(() => {
    sendOfferToViewerRef.current = sendOfferToViewer;
  }, [sendOfferToViewer]);

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
        // Clean up their relayed mic track
        if (viewerMicTracksRef.current.has(id)) {
          viewerMicTracksRef.current.delete(id);
          // Renegotiate with remaining viewers to remove the departed viewer's mic
          syncAllViewers();
        }
      }
    });
  }, [viewerIds, isHost, syncAllViewers]);

  // ─── Synchronize microphone mute and capture mic on-demand ────────────────
  // Works for BOTH host and viewer
  useEffect(() => {
    const syncMic = async () => {
      diagStage1_syncMicCalled(micMuted, isHost);
      if (!micMuted) {
        if (!micStreamRef.current) {
          try {
            console.log('[WebRTC] Requesting microphone stream...');
            if (!isHost) diagReset();
            const micStreamObj = await navigator.mediaDevices.getUserMedia({ audio: true });
            micStreamRef.current = micStreamObj;
            micStreamObj.getAudioTracks().forEach((t) => (t.enabled = true));
            setMicStream(micStreamObj);
            if (!isHost) diagStage2_micAcquired(true, micStreamObj.getAudioTracks()[0] ?? null);

            if (isHost) {
              // Host: sync tracks with all viewers and renegotiate (add mic track)
              await syncAllViewers();
            } else {
              // Viewer: attach mic to existing PC's sendonly transceiver, or request PC
              const pc = pcsRef.current.get(hostSocketId);
              if (pc) {
                await attachViewerMicToPC(pc, micStreamObj);
              } else {
                // No PC exists — request host to establish one
                wsClient.send('audio_publish_request', { targetId: hostSocketId });
                console.log('[WebRTC] Sent audio_publish_request to host (no existing PC)');
              }
            }
          } catch (err) {
            console.error('[WebRTC] Microphone access denied or not available:', err);
            if (!isHost) diagStage2_micAcquired(false, null, err);
            setMicWarning('Microphone access denied.');
          }
        } else {
          micStreamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = true;
          });

          // Viewer: also re-enable on the transceiver sender
          if (!isHost) {
            const pc = pcsRef.current.get(hostSocketId);
            if (pc) {
              await attachViewerMicToPC(pc, micStreamRef.current);
            }
          }
        }
        wsClient.send('mic_status_update', { micMuted: false });
        console.log('[WebRTC] Mic enabled, sent mic_status_update (false)');
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
  }, [micMuted, isHost, syncAllViewers, hostSocketId]);

  // ─── Helper: attach viewer mic track to the host's recvonly mic-slot transceiver ──
  // The host adds the recvonly slot as the LAST audio transceiver in syncTracks.
  // After setRemoteDescription(offer), all viewer transceivers have direction 'sendrecv'
  // (per RFC 8829 §5.10), so we cannot match by direction. We select by position instead.
  async function attachViewerMicToPC(pc: RTCPeerConnection, micStreamObj: MediaStream) {
    const micTrack = micStreamObj.getAudioTracks()[0];
    if (!micTrack) {
      diagStage3_attachCalled(pc, null);
      return;
    }

    const transceivers = pc.getTransceivers();
    const audioSlots = transceivers.filter(
      (t) => t.receiver.track?.kind === 'audio'
    );
    const micSlot = audioSlots[audioSlots.length - 1];

    if (micSlot) {
      micSlot.direction = 'sendonly';
    }

    diagStage3_attachCalled(pc, micTrack);

    if (!micSlot) {
      console.warn('[WebRTC] No audio transceiver available for viewer mic');
      return;
    }

    if (micSlot.sender.track?.id === micTrack.id) {
      console.log('[WebRTC] Viewer mic already on correct transceiver');
      diagStage3_replaceTrackResult(true, micTrack.id);
      return;
    }

    if (micSlot.sender.setStreams) {
      micSlot.sender.setStreams(micStreamObj);
    }
    try {
      await micSlot.sender.replaceTrack(micTrack);
      console.log('[WebRTC] Viewer mic attached to last audio transceiver (mic slot) via replaceTrack');
      diagStage3_replaceTrackResult(true, micSlot.sender.track?.id ?? null);
    } catch (err) {
      console.warn('[WebRTC] Failed to replaceTrack on mic slot transceiver:', err);
      diagStage3_replaceTrackResult(false, null, err);
    }
  }

  // ─── WebSocket signaling handlers ──────────────────────────────────────────
  useEffect(() => {
    if (!currentSocketId) return;

    // Receives an offer (viewer from host, or host could receive renegotiation)
    const unsubOffer = wsClient.on('webrtc_offer', async (data) => {
      const { senderId, offer } = data;
      if (!senderId || !offer) return;

      if (isHost) {
        // Host should not normally receive offers in this architecture,
        // but handle gracefully if it happens
        console.warn(`[WebRTC] Host received unexpected offer from ${senderId}, ignoring`);
        return;
      }

      // Viewer: receives an offer from the host
      console.log(`[WebRTC] Viewer received offer from host ${senderId}`);
      let pc = pcsRef.current.get(senderId);
      if (!pc) {
        pc = createPeerConnection(senderId);
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      if (!isHost) diagStage4_sdp('offer', offer.sdp);

      // If viewer has an active mic, attach it to the mic-slot transceiver before answering
      if (micStreamRef.current && !micMuted) {
        await attachViewerMicToPC(pc, micStreamRef.current);
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (!isHost) {
        diagStage4_sdp('answer', answer.sdp);
        diagStage5_pcState(pc);
      }

      wsClient.send('webrtc_answer', { targetId: senderId, answer: pc.localDescription });
    });

    // Receives an answer
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

      console.log(`[DIAG:HostTransceivers] --- Transceiver Dump for Peer ${senderId} ---`);
      const transceivers = pc.getTransceivers();
      transceivers.forEach((t, i) => {
        console.log(`[DIAG:HostTransceivers] Index ${i} | mid: ${t.mid} | direction: ${t.direction} | currentDirection: ${t.currentDirection} | sender.track.id: ${t.sender.track?.id ?? 'null'} | receiver.track.id: ${t.receiver.track?.id ?? 'null'}`);
      });
      console.log(`[DIAG:HostTransceivers] ----------------------------------------------`);
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

    // Host: viewer wants to publish audio (no existing PC)
    const unsubAudioPublish = wsClient.on('audio_publish_request', async (data) => {
      if (!isHost) return;
      const { participantId } = data;
      if (!participantId) return;

      console.log(`[WebRTC] Host received audio_publish_request from ${participantId}`);
      try {
        await sendOfferToViewer(participantId);
      } catch (err) {
        console.error(`[WebRTC] Failed to create PC for audio_publish_request from ${participantId}:`, err);
      }
    });

    return () => {
      unsubOffer();
      unsubAnswer();
      unsubIce();
      unsubStop();
      unsubAudioPublish();
    };
  }, [isHost, currentSocketId, createPeerConnection, cleanup, sendOfferToViewer, micMuted]);

  // ─── HOST: late-joiner — new viewer joins ──────────────────────────────────
  useEffect(() => {
    if (!isHost) return;

    const currentViewers = viewerIds.filter((id) => id && id !== currentSocketId);

    // Find viewers that do NOT yet have a peer connection
    const unconnected = currentViewers.filter((id) => !pcsRef.current.has(id));
    if (unconnected.length === 0) return;

    // We connect if some media source is active (display, host mic, or viewer mics being relayed)
    const mediaActive = !!displayStreamRef.current || !!micStreamRef.current || viewerMicTracksRef.current.size > 0;
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

  const getPeerConnectionStates = useCallback(() => {
    if (pcsRef.current.size === 0) {
      return { connectionState: 'new', iceConnectionState: 'new' };
    }
    const pcs = Array.from(pcsRef.current.values());
    const connectionState = pcs.map((pc) => pc.connectionState).join(', ');
    const iceConnectionState = pcs.map((pc) => pc.iceConnectionState).join(', ');
    return { connectionState, iceConnectionState };
  }, []);

  return {
    sharingState,
    localStream,
    remoteStream,
    remoteMicStreams,
    captureDisplaySurface,
    startSharing,
    stopSharing,
    errorMessage,
    audioWarning,
    micWarning,
    micStream,
    audioTrackSource,
    auditReports,
    getPeerConnectionStates,
  };
}
