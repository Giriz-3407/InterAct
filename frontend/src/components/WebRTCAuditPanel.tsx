import React, { useState, useRef, useEffect } from 'react';
import type { WebRTCAuditData } from '../hooks/useWebRTCAudit';

interface Participant {
  socketId: string;
  displayName: string;
  role: 'host' | 'viewer';
}

interface WebRTCAuditPanelProps {
  auditReports: WebRTCAuditData[];
  participants: Participant[];
  sharingActive: boolean;
}

export const WebRTCAuditPanel: React.FC<WebRTCAuditPanelProps> = ({
  auditReports,
  participants,
  sharingActive,
}) => {
  const [isMinimized, setIsMinimized] = useState(true);
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [copyFeedback, setCopyFeedback] = useState(false);

  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
  });

  // Automatically update selected peer if not set or inactive
  useEffect(() => {
    if (auditReports.length > 0) {
      const activeIds = auditReports.map((r) => r.peerId);
      if (!selectedPeerId || !activeIds.includes(selectedPeerId)) {
        setSelectedPeerId(auditReports[0].peerId);
      }
    } else {
      setSelectedPeerId(null);
    }
  }, [auditReports, selectedPeerId]);

  if (!sharingActive) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('select') || target.closest('a')) {
      return;
    }
    if (e.button !== 0) return;

    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragRef.current.isDragging) return;
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;
    
    setPosition({
      x: Math.max(0, dragRef.current.startPosX - deltaX),
      y: Math.max(0, dragRef.current.startPosY - deltaY),
    });
  };

  const handleMouseUp = () => {
    dragRef.current.isDragging = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const getPeerDisplayName = (peerId: string) => {
    const p = participants.find((part) => part.socketId === peerId);
    return p ? p.displayName : `Peer (${peerId.slice(0, 6)})`;
  };

  const getClassification = (localType?: string, remoteType?: string) => {
    if (!localType || !remoteType) return 'Unknown';
    const l = localType.toLowerCase();
    const r = remoteType.toLowerCase();
    if (l === 'relay' || r === 'relay') return 'TURN Relay Detected';
    if (l === 'host' && r === 'host') return 'Direct LAN (host ↔ host)';
    if (l === 'srflx' && r === 'srflx') return 'Direct Internet P2P (srflx ↔ srflx)';
    return 'Mixed NAT Traversal';
  };

  const getHealth = (rttSec?: number, packetsLost?: number) => {
    const rttMs = rttSec !== undefined ? rttSec * 1000 : 0;
    if (rttMs >= 300) return 'Critical';
    if (rttMs >= 150) return 'Poor';
    if (rttMs >= 50 || (packetsLost !== undefined && packetsLost > 0)) return 'Good';
    return 'Excellent';
  };

  const getClassificationColor = (classification: string) => {
    if (classification.includes('TURN') || classification.includes('relay')) {
      return 'bg-rose-500/15 text-rose-400 border border-rose-500/20';
    }
    if (classification.includes('Direct LAN') || classification.includes('P2P')) {
      return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20';
    }
    return 'bg-amber-500/15 text-amber-400 border border-amber-500/20';
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'Excellent':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20';
      case 'Good':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/20';
      case 'Poor':
        return 'bg-orange-500/15 text-orange-400 border border-orange-500/20';
      case 'Critical':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20';
    }
  };

  const handleCopyReport = () => {
    if (auditReports.length === 0) return;

    let reportText = '';
    auditReports.forEach((rep, index) => {
      const pName = getPeerDisplayName(rep.peerId);
      const rttMs = rep.currentRoundTripTime !== undefined ? Math.round(rep.currentRoundTripTime * 1000) : 'N/A';
      const packetsLost = rep.packetsLost ?? 0;
      const inbound = rep.actualInboundKbps !== undefined ? Math.round(rep.actualInboundKbps) : 'N/A';
      const outbound = rep.actualOutboundKbps !== undefined ? Math.round(rep.actualOutboundKbps) : 'N/A';
      const fps = rep.framesPerSecond !== undefined ? Math.round(rep.framesPerSecond) : 'N/A';
      
      const localUpper = (rep.localCandidateType || 'unknown').toUpperCase();
      const remoteUpper = (rep.remoteCandidateType || 'unknown').toUpperCase();

      reportText += `====================\n`;
      reportText += `PEER ${index + 1}\n`;
      reportText += `======\n\n`;
      reportText += `Viewer: ${pName} (${rep.peerId})\n`;
      reportText += `Connection Path: ${localUpper} ↔ ${remoteUpper}\n`;
      reportText += `Local Candidate: ${rep.localCandidateType || 'N/A'}\n`;
      reportText += `Remote Candidate: ${rep.remoteCandidateType || 'N/A'}\n`;
      reportText += `Protocol: ${rep.protocol || 'N/A'}\n`;
      reportText += `RTT: ${rttMs} ms\n`;
      reportText += `Packet Loss: ${packetsLost}\n`;
      reportText += `Inbound: ${inbound} kbps\n`;
      reportText += `Outbound: ${outbound} kbps\n`;
      reportText += `FPS: ${fps}\n\n`;

      if (rep.isHost) {
        reportText += `[Sender Video Metrics]\n`;
        reportText += `Frame Size: ${rep.senderFrameWidth ?? 'N/A'}x${rep.senderFrameHeight ?? 'N/A'}\n`;
        reportText += `Frames Sent: ${rep.senderFramesSent ?? 'N/A'}\n`;
        reportText += `Outbound FPS: ${rep.senderFramesPerSecond ?? 'N/A'}\n`;
        reportText += `Quality Limitation Reason: ${rep.qualityLimitationReason || 'none'}\n`;
        reportText += `Limitation Durations: CPU=${rep.qualityLimitationCpu?.toFixed(2) ?? '0.00'}s, Bandwidth=${rep.qualityLimitationBandwidth?.toFixed(2) ?? '0.00'}s, Other=${rep.qualityLimitationOther?.toFixed(2) ?? '0.00'}s, None=${rep.qualityLimitationNone?.toFixed(2) ?? '0.00'}s\n`;
        reportText += `[Sender Audio Metrics]\n`;
        reportText += `Audio Track Count: ${rep.senderAudioTrackCount ?? 0}\n`;
        reportText += `Track Enabled: ${rep.senderAudioTrackEnabled !== undefined ? (rep.senderAudioTrackEnabled ? 'Yes' : 'No') : 'N/A'}\n`;
        reportText += `Track Muted: ${rep.senderAudioTrackMuted !== undefined ? (rep.senderAudioTrackMuted ? 'Yes' : 'No') : 'N/A'}\n`;
        reportText += `Audio Codec: ${rep.audioCodec || 'N/A'}\n`;
        reportText += `Audio Bitrate: ${rep.audioBitrate !== undefined ? Math.round(rep.audioBitrate) + ' kbps' : 'N/A'}\n`;
        reportText += `Audio Packets Lost: ${rep.audioPacketsLost ?? 0}\n`;
        reportText += `Audio Jitter: ${rep.audioJitter !== undefined ? (rep.audioJitter * 1000).toFixed(2) + ' ms' : 'N/A'}\n`;
        reportText += `Total Audio Energy: ${rep.totalAudioEnergy !== undefined ? rep.totalAudioEnergy.toFixed(4) : 'N/A'}\n\n`;
      } else {
        reportText += `[Receiver Video Metrics]\n`;
        reportText += `Frame Size: ${rep.receiverFrameWidth ?? 'N/A'}x${rep.receiverFrameHeight ?? 'N/A'}\n`;
        reportText += `Frames Decoded: ${rep.receiverFramesDecoded ?? 'N/A'}\n`;
        reportText += `Frames Dropped: ${rep.receiverFramesDropped ?? 'N/A'}\n`;
        reportText += `Inbound FPS: ${rep.receiverFramesPerSecond ?? 'N/A'}\n`;
        reportText += `[Receiver Audio Metrics]\n`;
        reportText += `Audio Track Count: ${rep.receiverAudioTrackCount ?? 0}\n`;
        reportText += `Track Enabled: ${rep.receiverAudioTrackEnabled !== undefined ? (rep.receiverAudioTrackEnabled ? 'Yes' : 'No') : 'N/A'}\n`;
        reportText += `Track Muted: ${rep.receiverAudioTrackMuted !== undefined ? (rep.receiverAudioTrackMuted ? 'Yes' : 'No') : 'N/A'}\n`;
        reportText += `Audio Codec: ${rep.audioCodec || 'N/A'}\n`;
        reportText += `Audio Bitrate: ${rep.audioBitrate !== undefined ? Math.round(rep.audioBitrate) + ' kbps' : 'N/A'}\n`;
        reportText += `Audio Packets Received: ${rep.audioPacketsReceived ?? 0}\n`;
        reportText += `Audio Packets Lost: ${rep.audioPacketsLost ?? 0}\n`;
        reportText += `Audio Jitter: ${rep.audioJitter !== undefined ? (rep.audioJitter * 1000).toFixed(2) + ' ms' : 'N/A'}\n`;
        reportText += `Concealed Samples: ${rep.concealedSamples ?? 0}\n`;
        reportText += `Total Audio Energy: ${rep.totalAudioEnergy !== undefined ? rep.totalAudioEnergy.toFixed(4) : 'N/A'}\n\n`;
      }
    });

    navigator.clipboard.writeText(reportText.trim()).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  if (isMinimized) {
    return (
      <div
        style={{
          position: 'fixed',
          right: `${position.x}px`,
          bottom: `${position.y}px`,
          zIndex: 9999,
        }}
        onMouseDown={handleMouseDown}
        className="glass-panel px-3 py-2 rounded-lg shadow-xl cursor-move text-xs font-geist flex items-center gap-2 text-zinc-300 hover:text-white select-none border border-zinc-800"
      >
        <span className="material-symbols-outlined text-[16px] text-[#c0c1ff] animate-pulse">analytics</span>
        <span>WebRTC Audit</span>
        <button
          onClick={() => setIsMinimized(false)}
          className="ml-1 p-0.5 rounded hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 cursor-pointer flex items-center"
        >
          <span className="material-symbols-outlined text-[14px]">open_in_full</span>
        </button>
      </div>
    );
  }

  const selectedReport = auditReports.find((r) => r.peerId === selectedPeerId) || auditReports[0];
  const hasData = !!selectedReport;
  const classification = hasData ? getClassification(selectedReport.localCandidateType, selectedReport.remoteCandidateType) : 'N/A';
  const health = hasData ? getHealth(selectedReport.currentRoundTripTime, selectedReport.packetsLost) : 'N/A';
  
  const localUpper = hasData && selectedReport.localCandidateType ? selectedReport.localCandidateType.toUpperCase() : 'UNKNOWN';
  const remoteUpper = hasData && selectedReport.remoteCandidateType ? selectedReport.remoteCandidateType.toUpperCase() : 'UNKNOWN';
  const connectionPath = `${localUpper} ↔ ${remoteUpper}`;

  const showLowInbound = hasData && !selectedReport.isHost && selectedReport.actualInboundKbps !== undefined && selectedReport.actualInboundKbps < 1000;
  const showLowOutbound = hasData && selectedReport.isHost && selectedReport.actualOutboundKbps !== undefined && selectedReport.actualOutboundKbps < 1000;
  const showHighRTT = hasData && selectedReport.currentRoundTripTime !== undefined && (selectedReport.currentRoundTripTime * 1000) > 150;
  const showPacketLoss = hasData && selectedReport.packetsLost !== undefined && selectedReport.packetsLost > 0;

  const trackSettings = selectedReport?.captureSettings;

  return (
    <div
      style={{
        position: 'fixed',
        right: `${position.x}px`,
        bottom: `${position.y}px`,
        zIndex: 9999,
        width: '340px',
        maxHeight: '560px',
      }}
      onMouseDown={handleMouseDown}
      className="glass-panel rounded-xl shadow-2xl flex flex-col border border-zinc-850 overflow-hidden font-inter text-zinc-350 select-none cursor-move"
    >
      {/* Header bar */}
      <div className="px-3 py-2.5 bg-zinc-950/80 border-b border-zinc-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 font-geist font-semibold text-xs text-white">
          <span className="material-symbols-outlined text-[16px] text-[#c0c1ff]">analytics</span>
          <span>WebRTC Transport Audit</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-0.5 rounded hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 cursor-pointer flex items-center"
            title="Minimize"
          >
            <span className="material-symbols-outlined text-[14px]">close_fullscreen</span>
          </button>
        </div>
      </div>

      {/* Content body */}
      <div className="p-3 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3.5 text-[11px]">
        {/* Peer selector if multiple */}
        {auditReports.length > 1 && (
          <div className="flex flex-col gap-1 shrink-0">
            <label className="text-[10px] text-zinc-500 font-geist uppercase tracking-wider">Select Peer Connection</label>
            <select
              value={selectedPeerId || ''}
              onChange={(e) => setSelectedPeerId(e.target.value)}
              className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-300 font-inter focus:outline-none focus:border-indigo-500/40 text-[11px]"
            >
              {auditReports.map((rep) => (
                <option key={rep.peerId} value={rep.peerId}>
                  {getPeerDisplayName(rep.peerId)} ({rep.isHost ? 'Viewer' : 'Host'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Selected Peer Info */}
        {!hasData ? (
          <div className="py-4 text-center text-zinc-500 font-geist">
            Waiting for active WebRTC connection...
          </div>
        ) : (
          <>
            {/* Top Level Summary Cards */}
            <div className="bg-zinc-950/40 border border-zinc-900/60 rounded-lg p-2.5 flex flex-col gap-2 shrink-0">
              <div className="flex justify-between items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-geist uppercase tracking-wider">Connection Path</span>
                <span className="font-mono font-bold text-white text-[12px]">
                  {connectionPath}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-geist uppercase tracking-wider">Classification</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getClassificationColor(classification)}`}>
                  {classification}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-geist uppercase tracking-wider">Health</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getHealthColor(health)}`}>
                  {health}
                </span>
              </div>
            </div>

            {/* Warning Badges Section */}
            {(showLowInbound || showLowOutbound || showHighRTT || showPacketLoss) && (
              <div className="flex flex-wrap gap-1.5 shrink-0">
                {showLowInbound && (
                  <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium font-geist text-[9px] flex items-center gap-1 animate-pulse">
                    <span>⚠</span> Low Inbound Bandwidth
                  </span>
                )}
                {showLowOutbound && (
                  <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium font-geist text-[9px] flex items-center gap-1 animate-pulse">
                    <span>⚠</span> Low Outbound Bandwidth
                  </span>
                )}
                {showHighRTT && (
                  <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-medium font-geist text-[9px] flex items-center gap-1">
                    <span>⚠</span> High RTT
                  </span>
                )}
                {showPacketLoss && (
                  <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium font-geist text-[9px] flex items-center gap-1">
                    <span>⚠</span> Packet Loss Detected
                  </span>
                )}
              </div>
            )}

            {/* Current Encoded Stream */}
            <div className="flex flex-col gap-1 shrink-0 bg-zinc-950/40 border border-zinc-900/60 rounded-lg p-2.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-zinc-500 font-geist uppercase tracking-wider">Current Encoded Stream</span>
                <span className="font-mono text-white font-bold text-[11px]">
                  {selectedReport.isHost 
                    ? `${selectedReport.senderFrameWidth ?? 'N/A'}x${selectedReport.senderFrameHeight ?? 'N/A'} @ ${selectedReport.senderFramesPerSecond !== undefined ? Math.round(selectedReport.senderFramesPerSecond) : 'N/A'} fps`
                    : `${selectedReport.receiverFrameWidth ?? 'N/A'}x${selectedReport.receiverFrameHeight ?? 'N/A'} @ ${selectedReport.receiverFramesPerSecond !== undefined ? Math.round(selectedReport.receiverFramesPerSecond) : 'N/A'} fps`
                  }
                </span>
              </div>
            </div>

            {/* Capture Settings */}
            {trackSettings && (
              <div className="flex flex-col gap-1.5 shrink-0">
                <div className="text-[10px] text-zinc-500 font-geist uppercase tracking-wider">Capture Settings (track.getSettings())</div>
                <pre className="p-2 bg-zinc-950/40 border border-zinc-900 rounded font-mono text-[9px] text-zinc-400 overflow-x-auto whitespace-pre custom-scrollbar max-h-[90px]">
                  {JSON.stringify(trackSettings, null, 2)}
                </pre>
              </div>
            )}

            {/* Sender Side Video & Audio Stats */}
            {selectedReport.isHost ? (
              <>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <div className="text-[10px] text-zinc-500 font-geist uppercase tracking-wider">Sender Video Metrics</div>
                  <table className="w-full border-collapse font-mono text-[10px]">
                    <tbody>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">frameWidth / height</td>
                        <td className="text-zinc-300 text-right">{selectedReport.senderFrameWidth ?? 'N/A'}x{selectedReport.senderFrameHeight ?? 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">framesSent</td>
                        <td className="text-zinc-300 text-right">{selectedReport.senderFramesSent ?? 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">framesPerSecond</td>
                        <td className="text-zinc-300 text-right">{selectedReport.senderFramesPerSecond !== undefined ? Math.round(selectedReport.senderFramesPerSecond) : 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">qualityLimitationReason</td>
                        <td className="text-zinc-300 text-right">
                          <span className={`px-1 rounded ${selectedReport.qualityLimitationReason !== 'none' ? 'text-amber-400 font-semibold' : 'text-zinc-300'}`}>
                            {selectedReport.qualityLimitationReason || 'none'}
                          </span>
                        </td>
                      </tr>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">qualityLimitationCpu</td>
                        <td className="text-zinc-300 text-right">{selectedReport.qualityLimitationCpu !== undefined ? `${selectedReport.qualityLimitationCpu.toFixed(2)}s` : '0.00s'}</td>
                      </tr>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">qualityLimitationBandwidth</td>
                        <td className="text-zinc-300 text-right">{selectedReport.qualityLimitationBandwidth !== undefined ? `${selectedReport.qualityLimitationBandwidth.toFixed(2)}s` : '0.00s'}</td>
                      </tr>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">qualityLimitationOther</td>
                        <td className="text-zinc-300 text-right">{selectedReport.qualityLimitationOther !== undefined ? `${selectedReport.qualityLimitationOther.toFixed(2)}s` : '0.00s'}</td>
                      </tr>
                      <tr className="py-1">
                        <td className="text-zinc-500 py-1 font-inter">qualityLimitationNone</td>
                        <td className="text-zinc-300 text-right">{selectedReport.qualityLimitationNone !== undefined ? `${selectedReport.qualityLimitationNone.toFixed(2)}s` : '0.00s'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <div className="text-[10px] text-zinc-500 font-geist uppercase tracking-wider">Sender Audio Metrics</div>
                  <table className="w-full border-collapse font-mono text-[10px]">
                    <tbody>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">Audio Track Count</td>
                        <td className="text-zinc-300 text-right">{selectedReport.senderAudioTrackCount ?? 0}</td>
                      </tr>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">Track Enabled</td>
                        <td className="text-zinc-300 text-right">{selectedReport.senderAudioTrackEnabled !== undefined ? (selectedReport.senderAudioTrackEnabled ? 'Yes' : 'No') : 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">Track Muted</td>
                        <td className="text-zinc-300 text-right">{selectedReport.senderAudioTrackMuted !== undefined ? (selectedReport.senderAudioTrackMuted ? 'Yes' : 'No') : 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">Audio Codec</td>
                        <td className="text-zinc-300 text-right">{selectedReport.audioCodec || 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">Audio Bitrate</td>
                        <td className="text-zinc-300 text-right">{selectedReport.audioBitrate !== undefined ? `${Math.round(selectedReport.audioBitrate)} kbps` : 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">packetsLost</td>
                        <td className="text-zinc-300 text-right">{selectedReport.audioPacketsLost ?? 0}</td>
                      </tr>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">jitter</td>
                        <td className="text-zinc-300 text-right">{selectedReport.audioJitter !== undefined ? `${(selectedReport.audioJitter * 1000).toFixed(2)} ms` : 'N/A'}</td>
                      </tr>
                      <tr className="py-1">
                        <td className="text-zinc-500 py-1 font-inter">totalAudioEnergy</td>
                        <td className="text-zinc-300 text-right">{selectedReport.totalAudioEnergy !== undefined ? selectedReport.totalAudioEnergy.toFixed(4) : 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              /* Receiver Side Video & Audio Stats */
              <>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <div className="text-[10px] text-zinc-500 font-geist uppercase tracking-wider">Receiver Video Metrics</div>
                  <table className="w-full border-collapse font-mono text-[10px]">
                    <tbody>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">frameWidth / height</td>
                        <td className="text-zinc-300 text-right">{selectedReport.receiverFrameWidth ?? 'N/A'}x{selectedReport.receiverFrameHeight ?? 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">framesDecoded</td>
                        <td className="text-zinc-300 text-right">{selectedReport.receiverFramesDecoded ?? 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">framesDropped</td>
                        <td className={`text-right ${selectedReport.receiverFramesDropped && selectedReport.receiverFramesDropped > 0 ? 'text-rose-400 font-bold' : 'text-zinc-300'}`}>{selectedReport.receiverFramesDropped ?? 0}</td>
                      </tr>
                      <tr className="py-1">
                        <td className="text-zinc-500 py-1 font-inter">framesPerSecond</td>
                        <td className="text-zinc-300 text-right">{selectedReport.receiverFramesPerSecond !== undefined ? Math.round(selectedReport.receiverFramesPerSecond) : 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <div className="text-[10px] text-zinc-500 font-geist uppercase tracking-wider">Receiver Audio Metrics</div>
                  <table className="w-full border-collapse font-mono text-[10px]">
                    <tbody>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">Audio Track Count</td>
                        <td className="text-zinc-300 text-right">{selectedReport.receiverAudioTrackCount ?? 0}</td>
                      </tr>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">Track Enabled</td>
                        <td className="text-zinc-300 text-right">{selectedReport.receiverAudioTrackEnabled !== undefined ? (selectedReport.receiverAudioTrackEnabled ? 'Yes' : 'No') : 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">Track Muted</td>
                        <td className="text-zinc-300 text-right">{selectedReport.receiverAudioTrackMuted !== undefined ? (selectedReport.receiverAudioTrackMuted ? 'Yes' : 'No') : 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">Audio Codec</td>
                        <td className="text-zinc-300 text-right">{selectedReport.audioCodec || 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">Audio Bitrate</td>
                        <td className="text-zinc-300 text-right">{selectedReport.audioBitrate !== undefined ? `${Math.round(selectedReport.audioBitrate)} kbps` : 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">packetsReceived</td>
                        <td className="text-zinc-300 text-right">{selectedReport.audioPacketsReceived ?? 0}</td>
                      </tr>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">packetsLost</td>
                        <td className="text-zinc-300 text-right">{selectedReport.audioPacketsLost ?? 0}</td>
                      </tr>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">jitter</td>
                        <td className="text-zinc-300 text-right">{selectedReport.audioJitter !== undefined ? `${(selectedReport.audioJitter * 1000).toFixed(2)} ms` : 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-zinc-900/40 py-1">
                        <td className="text-zinc-500 py-1 font-inter">concealedSamples</td>
                        <td className="text-zinc-300 text-right">{selectedReport.concealedSamples ?? 0}</td>
                      </tr>
                      <tr className="py-1">
                        <td className="text-zinc-500 py-1 font-inter">totalAudioEnergy</td>
                        <td className="text-zinc-300 text-right">{selectedReport.totalAudioEnergy !== undefined ? selectedReport.totalAudioEnergy.toFixed(4) : 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Connection Type Audit Table */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <div className="text-[10px] text-zinc-500 font-geist uppercase tracking-wider">Connection Type Audit</div>
              <table className="w-full border-collapse font-mono text-[10px]">
                <tbody>
                  <tr className="border-b border-zinc-900/40 py-1">
                    <td className="text-zinc-500 py-1 font-inter">Pair ID</td>
                    <td className="text-zinc-300 text-right font-mono truncate max-w-[180px]" title={selectedReport.selectedCandidatePairId}>
                      {selectedReport.selectedCandidatePairId ? selectedReport.selectedCandidatePairId.slice(0, 12) + '...' : 'N/A'}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-900/40 py-1">
                    <td className="text-zinc-500 py-1 font-inter">Local Candidate Type</td>
                    <td className="text-zinc-300 text-right">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium bg-zinc-900 border border-zinc-800 ${
                        selectedReport.localCandidateType === 'relay' ? 'text-rose-400' :
                        selectedReport.localCandidateType === 'host' ? 'text-emerald-400' : 'text-zinc-300'
                      }`}>
                        {selectedReport.localCandidateType || 'N/A'}
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-900/40 py-1">
                    <td className="text-zinc-500 py-1 font-inter">Remote Candidate Type</td>
                    <td className="text-zinc-300 text-right">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium bg-zinc-900 border border-zinc-800 ${
                        selectedReport.remoteCandidateType === 'relay' ? 'text-rose-400' :
                        selectedReport.remoteCandidateType === 'host' ? 'text-emerald-400' : 'text-zinc-300'
                      }`}>
                        {selectedReport.remoteCandidateType || 'N/A'}
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-900/40 py-1">
                    <td className="text-zinc-500 py-1 font-inter">Protocol</td>
                    <td className="text-zinc-300 text-right">{selectedReport.protocol || 'N/A'}</td>
                  </tr>
                  <tr className="border-b border-zinc-900/40 py-1">
                    <td className="text-zinc-500 py-1 font-inter">Relay Protocol</td>
                    <td className="text-zinc-300 text-right">{selectedReport.relayProtocol || 'N/A'}</td>
                  </tr>
                  <tr className="py-1">
                    <td className="text-zinc-500 py-1 font-inter">Network Type</td>
                    <td className="text-zinc-300 text-right">{selectedReport.networkType || 'N/A'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Performance Metrics Table */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <div className="text-[10px] text-zinc-500 font-geist uppercase tracking-wider">Performance Metrics</div>
              <table className="w-full border-collapse font-mono text-[10px]">
                <tbody>
                  <tr className="border-b border-zinc-900/40 py-1">
                    <td className="text-zinc-500 py-1 font-inter">Available Outgoing Bitrate</td>
                    <td className="text-zinc-300 text-right">
                      {selectedReport.availableOutgoingBitrate !== undefined ? `${(selectedReport.availableOutgoingBitrate / 1000).toFixed(0)} kbps` : 'N/A'}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-900/40 py-1">
                    <td className="text-zinc-500 py-1 font-inter">Current RTT</td>
                    <td className="text-zinc-300 text-right">
                      {selectedReport.currentRoundTripTime !== undefined ? `${(selectedReport.currentRoundTripTime * 1000).toFixed(0)} ms` : 'N/A'}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-900/40 py-1">
                    <td className="text-zinc-500 py-1 font-inter">Packets Lost</td>
                    <td className={`text-right ${showPacketLoss ? 'text-rose-400 font-semibold' : 'text-zinc-300'}`}>
                      {selectedReport.packetsLost ?? 0}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-900/40 py-1">
                    <td className="text-zinc-500 py-1 font-inter">Inbound Rate</td>
                    <td className="text-zinc-300 text-right">
                      {selectedReport.actualInboundKbps !== undefined ? `${selectedReport.actualInboundKbps.toFixed(0)} kbps` : 'N/A'}
                    </td>
                  </tr>
                  <tr className="py-1">
                    <td className="text-zinc-500 py-1 font-inter">Outbound Rate</td>
                    <td className="text-zinc-300 text-right">
                      {selectedReport.actualOutboundKbps !== undefined ? `${selectedReport.actualOutboundKbps.toFixed(0)} kbps` : 'N/A'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Footer / Copy report button */}
      {hasData && (
        <div className="px-3 py-2 bg-zinc-950/80 border-t border-zinc-900 shrink-0">
          <button
            onClick={handleCopyReport}
            className={`w-full py-1.5 rounded text-[10px] font-semibold font-geist cursor-pointer transition-colors text-center ${
              copyFeedback
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700/60'
            }`}
          >
            {copyFeedback ? '✓ Audit Report Copied!' : 'Copy Audit Report'}
          </button>
        </div>
      )}
    </div>
  );
};
