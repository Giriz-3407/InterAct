import { useEffect, useRef, useState } from 'react';
import type { SharingState } from './useWebRTC';

export interface WebRTCAuditData {
  peerId: string;
  isHost: boolean;
  selectedCandidatePairId?: string;
  localCandidateType?: string;
  remoteCandidateType?: string;
  protocol?: string;
  relayProtocol?: string;
  networkType?: string;
  availableOutgoingBitrate?: number;
  currentRoundTripTime?: number;
  packetsLost?: number;
  framesPerSecond?: number;
  framesSent?: number;
  framesReceived?: number;
  framesDecoded?: number;
  actualInboundKbps?: number;
  actualOutboundKbps?: number;
  captureSettings?: any;
  
  // New Sender fields
  senderFrameWidth?: number;
  senderFrameHeight?: number;
  senderFramesSent?: number;
  senderFramesPerSecond?: number;
  qualityLimitationReason?: string;
  qualityLimitationCpu?: number;
  qualityLimitationBandwidth?: number;
  qualityLimitationOther?: number;
  qualityLimitationNone?: number;

  // New Receiver fields
  receiverFrameWidth?: number;
  receiverFrameHeight?: number;
  receiverFramesDecoded?: number;
  receiverFramesDropped?: number;
  receiverFramesPerSecond?: number;

  // Sender Audio track states
  senderAudioTrackCount?: number;
  senderAudioTrackEnabled?: boolean;
  senderAudioTrackMuted?: boolean;

  // Receiver Audio track states
  receiverAudioTrackCount?: number;
  receiverAudioTrackEnabled?: boolean;
  receiverAudioTrackMuted?: boolean;

  // Audio RTP metrics
  audioPacketsReceived?: number;
  audioPacketsLost?: number;
  audioJitter?: number;

  // Extended Audio metrics
  audioCodec?: string;
  audioBitrate?: number;
  concealedSamples?: number;
  totalAudioEnergy?: number;
}

interface UseWebRTCAuditOptions {
  isHost: boolean;
  pcsRef: React.MutableRefObject<Map<string, RTCPeerConnection>>;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  sharingState: SharingState;
}

interface PeerPrevStats {
  timestamp: number;
  bytesSent?: number;
  bytesReceived?: number;
  framesSent?: number;
  framesDecoded?: number;
  framesReceived?: number;
  audioBytesSent?: number;
  audioBytesReceived?: number;
}

export function useWebRTCAudit({
  isHost,
  pcsRef,
  localStream,
  remoteStream,
  sharingState,
}: UseWebRTCAuditOptions): WebRTCAuditData[] {
  const prevStatsMapRef = useRef<Map<string, PeerPrevStats>>(new Map());
  const [auditReports, setAuditReports] = useState<WebRTCAuditData[]>([]);

  // 1. Log capture settings and monitor for changes when stream is acquired (for Host)
  useEffect(() => {
    if (!isHost || !localStream) return;

    const track = localStream.getVideoTracks()[0];
    if (!track) {
      console.log('[WEBRTC_AUDIT] No local video track found.');
      return;
    }

    const logTrackSettings = () => {
      const settings = track.getSettings();
      console.log('[WEBRTC_AUDIT] Host track.getSettings():', settings);
      console.log('[WEBRTC_AUDIT] Initial Captured Video Track Settings:', {
        width: settings.width,
        height: settings.height,
        frameRate: settings.frameRate,
        displaySurface: settings.displaySurface,
      });

      if (settings.width && settings.height && (settings.width > 1920 || settings.height > 1080)) {
        console.warn(
          `[WEBRTC_AUDIT] WARNING: Captured resolution exceeds 1920x1080: ${settings.width}x${settings.height}`
        );
      }
      if (settings.frameRate && settings.frameRate > 30) {
        console.warn(
          `[WEBRTC_AUDIT] WARNING: Captured frame rate exceeds 30 FPS: ${settings.frameRate}`
        );
      }
    };

    logTrackSettings();

    // In case track settings change dynamically (e.g. browser resizing or constraint updates)
    (track as any).onconfigurationchange = () => {
      console.log('[WEBRTC_AUDIT] Captured video track configuration changed.');
      logTrackSettings();
    };

    return () => {
      (track as any).onconfigurationchange = null;
    };
  }, [isHost, localStream]);

  // 2. Log remote track settings (for Viewer)
  useEffect(() => {
    if (isHost || !remoteStream) return;

    const track = remoteStream.getVideoTracks()[0];
    if (!track) return;

    const logRemoteTrackSettings = () => {
      const settings = track.getSettings();
      console.log('[WEBRTC_AUDIT] Viewer track.getSettings():', settings);
      console.log('[WEBRTC_AUDIT] Remote Inbound Video Track Settings:', {
        width: settings.width,
        height: settings.height,
        frameRate: settings.frameRate,
      });

      if (settings.width && settings.height && (settings.width > 1920 || settings.height > 1080)) {
        console.warn(
          `[WEBRTC_AUDIT] WARNING: Inbound track resolution exceeds 1920x1080: ${settings.width}x${settings.height}`
        );
      }
      if (settings.frameRate && settings.frameRate > 30) {
        console.warn(
          `[WEBRTC_AUDIT] WARNING: Inbound track frame rate exceeds 30 FPS: ${settings.frameRate}`
        );
      }
    };

    logRemoteTrackSettings();

    (track as any).onconfigurationchange = () => {
      console.log('[WEBRTC_AUDIT] Remote video track configuration changed.');
      logRemoteTrackSettings();
    };

    return () => {
      (track as any).onconfigurationchange = null;
    };
  }, [isHost, remoteStream]);

  // 3. Periodic stats collector (every 2 seconds)
  useEffect(() => {
    const isActive = sharingState === 'sharing' || sharingState === 'viewing';
    if (!isActive) {
      prevStatsMapRef.current.clear();
      setAuditReports([]);
      return;
    }

    const intervalId = setInterval(async () => {
      const pcs = pcsRef.current;
      if (pcs.size === 0) {
        setAuditReports([]);
        return;
      }

      const reports: WebRTCAuditData[] = [];

      for (const [peerId, pc] of pcs.entries()) {
        if (pc.signalingState === 'closed') {
          prevStatsMapRef.current.delete(peerId);
          continue;
        }

        try {
          const stats = await pc.getStats();
          const now = Date.now();
          const prev = prevStatsMapRef.current.get(peerId);

          // Metrics to collect
          let framesSent: number | undefined;
          let framesReceived: number | undefined;
          let framesDecoded: number | undefined;
          let framesPerSecond: number | undefined;
          let bytesSent: number | undefined;
          let bytesReceived: number | undefined;
          let packetsLost: number | undefined;
          let availableOutgoingBitrate: number | undefined;
          let currentRoundTripTime: number | undefined;
          let activeWidth: number | undefined;
          let activeHeight: number | undefined;

          let selectedCandidatePairId: string | undefined;
          let localCandidateId: string | undefined;
          let remoteCandidateId: string | undefined;

          // New Sender fields
          let senderFrameWidth: number | undefined;
          let senderFrameHeight: number | undefined;
          let senderFramesSent: number | undefined;
          let senderFramesPerSecond: number | undefined;
          let qualityLimitationReason: string | undefined;
          let qualityLimitationCpu: number | undefined;
          let qualityLimitationBandwidth: number | undefined;
          let qualityLimitationOther: number | undefined;
          let qualityLimitationNone: number | undefined;

          // New Receiver fields
          let receiverFrameWidth: number | undefined;
          let receiverFrameHeight: number | undefined;
          let receiverFramesDecoded: number | undefined;
          let receiverFramesDropped: number | undefined;
          let receiverFramesPerSecond: number | undefined;

          // Audio metrics fields
          let audioPacketsReceived: number | undefined;
          let audioPacketsLost: number | undefined;
          let audioJitter: number | undefined;
          let audioCodec: string | undefined;
          let audioBitrate: number | undefined;
          let concealedSamples: number | undefined;
          let totalAudioEnergy: number | undefined;
          let audioBytesSent: number | undefined;
          let audioBytesReceived: number | undefined;

          stats.forEach((report) => {
            // Outbound Video Track (Host side)
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
              framesSent = report.framesSent;
              bytesSent = report.bytesSent;
              framesPerSecond = report.framesPerSecond;
              activeWidth = report.frameWidth;
              activeHeight = report.frameHeight;

              // Extract extra sender fields
              senderFrameWidth = report.frameWidth;
              senderFrameHeight = report.frameHeight;
              senderFramesSent = report.framesSent;
              senderFramesPerSecond = report.framesPerSecond;
              qualityLimitationReason = report.qualityLimitationReason;
              if (report.qualityLimitationDurations) {
                qualityLimitationCpu = report.qualityLimitationDurations.cpu;
                qualityLimitationBandwidth = report.qualityLimitationDurations.bandwidth;
                qualityLimitationOther = report.qualityLimitationDurations.other;
                qualityLimitationNone = report.qualityLimitationDurations.none;
              }
            }

            // Outbound Audio Track (Host side)
            if (report.type === 'outbound-rtp' && report.kind === 'audio') {
              audioBytesSent = report.bytesSent;
              if (report.codecId) {
                const codecReport = stats.get(report.codecId);
                if (codecReport) {
                  audioCodec = codecReport.mimeType;
                }
              }
            }

            // Inbound Video Track (Viewer side)
            if (report.type === 'inbound-rtp' && report.kind === 'video') {
              framesReceived = report.framesReceived; // Might be undefined on some browsers
              framesDecoded = report.framesDecoded;
              bytesReceived = report.bytesReceived;
              framesPerSecond = report.framesPerSecond;
              packetsLost = report.packetsLost;
              activeWidth = report.frameWidth;
              activeHeight = report.frameHeight;

              // Extract extra receiver fields
              receiverFrameWidth = report.frameWidth;
              receiverFrameHeight = report.frameHeight;
              receiverFramesDecoded = report.framesDecoded;
              receiverFramesDropped = report.framesDropped;
              receiverFramesPerSecond = report.framesPerSecond;
            }

            // Inbound Audio Track (Viewer side)
            if (report.type === 'inbound-rtp' && report.kind === 'audio') {
              audioPacketsReceived = report.packetsReceived;
              audioPacketsLost = report.packetsLost;
              audioJitter = report.jitter;
              audioBytesReceived = report.bytesReceived;
              concealedSamples = report.concealedSamples;
              totalAudioEnergy = report.totalAudioEnergy;

              if (report.codecId) {
                const codecReport = stats.get(report.codecId);
                if (codecReport) {
                  audioCodec = codecReport.mimeType;
                }
              }
            }

            // Remote Inbound RTP (Host side getting report from Viewer)
            if (report.type === 'remote-inbound-rtp' && report.kind === 'video') {
              packetsLost = report.packetsLost;
              if (report.roundTripTime !== undefined) {
                currentRoundTripTime = report.roundTripTime;
              }
            }

            // Remote Inbound Audio RTP (Host side getting report from Viewer)
            if (report.type === 'remote-inbound-rtp' && report.kind === 'audio') {
              audioPacketsLost = report.packetsLost;
              audioJitter = report.jitter;
            }

            // Candidate Pair (Active Connection Info)
            if (report.type === 'candidate-pair') {
              if (report.state === 'succeeded' || report.nominated) {
                selectedCandidatePairId = report.id;
                localCandidateId = report.localCandidateId;
                remoteCandidateId = report.remoteCandidateId;
                if (report.availableOutgoingBitrate !== undefined) {
                  availableOutgoingBitrate = report.availableOutgoingBitrate; // in bps
                }
                if (report.currentRoundTripTime !== undefined) {
                  currentRoundTripTime = report.currentRoundTripTime; // in seconds
                }
              }
            }
          });

          // Fetch local and remote candidate details
          const localCandidate = localCandidateId ? stats.get(localCandidateId) : null;
          const remoteCandidate = remoteCandidateId ? stats.get(remoteCandidateId) : null;

          const localCandidateType = localCandidate?.candidateType;
          const remoteCandidateType = remoteCandidate?.candidateType;
          const protocol = localCandidate?.protocol;
          const relayProtocol = localCandidate?.relayProtocol || remoteCandidate?.relayProtocol;
          const networkType = localCandidate?.networkType;

          // Fetch capture track settings
          const videoTrack = isHost
            ? localStream?.getVideoTracks()[0]
            : remoteStream?.getVideoTracks()[0];
          const trackSettings = videoTrack?.getSettings();
          const captureSettings = trackSettings ? {
            ...trackSettings
          } : undefined;

          // Calculate Deltas/Rates if we have a previous report
          let actualOutboundKbps: number | undefined;
          let actualInboundKbps: number | undefined;
          let actualEffectiveFPS: number | undefined;

          if (prev) {
            const deltaSec = (now - prev.timestamp) / 1000;
            if (deltaSec > 0) {
              if (bytesSent !== undefined && prev.bytesSent !== undefined) {
                actualOutboundKbps = ((bytesSent - prev.bytesSent) * 8) / 1000 / deltaSec;
              }
              if (bytesReceived !== undefined && prev.bytesReceived !== undefined) {
                actualInboundKbps = ((bytesReceived - prev.bytesReceived) * 8) / 1000 / deltaSec;
              }
              if (isHost && framesSent !== undefined && prev.framesSent !== undefined) {
                actualEffectiveFPS = (framesSent - prev.framesSent) / deltaSec;
              } else if (!isHost && framesDecoded !== undefined && prev.framesDecoded !== undefined) {
                actualEffectiveFPS = (framesDecoded - prev.framesDecoded) / deltaSec;
              }

              // Compute audio bitrates
              if (isHost && audioBytesSent !== undefined && prev.audioBytesSent !== undefined) {
                audioBitrate = ((audioBytesSent - prev.audioBytesSent) * 8) / 1000 / deltaSec;
              } else if (!isHost && audioBytesReceived !== undefined && prev.audioBytesReceived !== undefined) {
                audioBitrate = ((audioBytesReceived - prev.audioBytesReceived) * 8) / 1000 / deltaSec;
              }
            }
          }

          // Fetch local track level audio info
          let senderAudioTrackCount: number | undefined;
          let senderAudioTrackEnabled: boolean | undefined;
          let senderAudioTrackMuted: boolean | undefined;
          if (isHost && localStream) {
            const audioTracks = localStream.getAudioTracks();
            senderAudioTrackCount = audioTracks.length;
            if (audioTracks.length > 0) {
              senderAudioTrackEnabled = audioTracks[0].enabled;
              senderAudioTrackMuted = audioTracks[0].muted;
            }
          }

          let receiverAudioTrackCount: number | undefined;
          let receiverAudioTrackEnabled: boolean | undefined;
          let receiverAudioTrackMuted: boolean | undefined;
          if (!isHost && remoteStream) {
            const audioTracks = remoteStream.getAudioTracks();
            receiverAudioTrackCount = audioTracks.length;
            if (audioTracks.length > 0) {
              receiverAudioTrackEnabled = audioTracks[0].enabled;
              receiverAudioTrackMuted = audioTracks[0].muted;
            }
          }

          // Store current values for the next interval
          prevStatsMapRef.current.set(peerId, {
            timestamp: now,
            bytesSent,
            bytesReceived,
            framesSent,
            framesDecoded,
            framesReceived,
            audioBytesSent,
            audioBytesReceived,
          });

          // Add to report list
          reports.push({
            peerId,
            isHost,
            selectedCandidatePairId,
            localCandidateType,
            remoteCandidateType,
            protocol,
            relayProtocol,
            networkType,
            availableOutgoingBitrate,
            currentRoundTripTime,
            packetsLost,
            framesPerSecond: framesPerSecond ?? actualEffectiveFPS,
            framesSent,
            framesReceived,
            framesDecoded,
            actualInboundKbps,
            actualOutboundKbps,
            captureSettings,

            // New Sender fields
            senderFrameWidth,
            senderFrameHeight,
            senderFramesSent,
            senderFramesPerSecond,
            qualityLimitationReason,
            qualityLimitationCpu,
            qualityLimitationBandwidth,
            qualityLimitationOther,
            qualityLimitationNone,

            // New Receiver fields
            receiverFrameWidth,
            receiverFrameHeight,
            receiverFramesDecoded,
            receiverFramesDropped,
            receiverFramesPerSecond,

            // Audio track metrics
            senderAudioTrackCount,
            senderAudioTrackEnabled,
            senderAudioTrackMuted,
            receiverAudioTrackCount,
            receiverAudioTrackEnabled,
            receiverAudioTrackMuted,

            // Audio RTP & Quality metrics
            audioPacketsReceived,
            audioPacketsLost,
            audioJitter,
            audioCodec,
            audioBitrate,
            concealedSamples,
            totalAudioEnergy,
          });

          // Log the metrics dump
          console.log(`[WEBRTC_AUDIT] Stats Dump for Peer Connection [${peerId}]:`, {
            role: isHost ? 'Host' : 'Viewer',
            framesSent: framesSent ?? 'N/A',
            framesReceived: framesReceived ?? 'N/A',
            framesDecoded: framesDecoded ?? 'N/A',
            framesPerSecond: framesPerSecond ?? 'N/A',
            bytesSent: bytesSent ?? 'N/A',
            bytesReceived: bytesReceived ?? 'N/A',
            packetsLost: packetsLost ?? 'N/A',
            availableOutgoingBitrate: availableOutgoingBitrate !== undefined ? `${(availableOutgoingBitrate / 1000).toFixed(1)} kbps` : 'N/A',
            currentRoundTripTime: currentRoundTripTime !== undefined ? `${(currentRoundTripTime * 1000).toFixed(1)} ms` : 'N/A',
            computed: {
              actualOutboundKbps: actualOutboundKbps !== undefined ? `${actualOutboundKbps.toFixed(1)} kbps` : 'N/A',
              actualInboundKbps: actualInboundKbps !== undefined ? `${actualInboundKbps.toFixed(1)} kbps` : 'N/A',
              actualEffectiveFPS: actualEffectiveFPS !== undefined ? `${actualEffectiveFPS.toFixed(1)}` : 'N/A',
            },
          });

          // Warnings based on active stream settings in stats
          if (activeWidth && activeHeight && (activeWidth > 1920 || activeHeight > 1080)) {
            console.warn(
              `[WEBRTC_AUDIT] WARNING: Active stream resolution exceeds 1920x1080: ${activeWidth}x${activeHeight}`
            );
          }
          if (framesPerSecond && framesPerSecond > 30) {
            console.warn(
              `[WEBRTC_AUDIT] WARNING: Active stream frame rate exceeds 30 FPS: ${framesPerSecond}`
            );
          } else if (actualEffectiveFPS && actualEffectiveFPS > 30) {
            console.warn(
              `[WEBRTC_AUDIT] WARNING: Calculated effective frame rate exceeds 30 FPS: ${actualEffectiveFPS.toFixed(1)}`
            );
          }
        } catch (err) {
          console.error(`[WEBRTC_AUDIT] Failed to fetch stats for peer ${peerId}:`, err);
        }
      }

      setAuditReports(reports);
    }, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isHost, pcsRef, sharingState, localStream, remoteStream]);

  return auditReports;
}
