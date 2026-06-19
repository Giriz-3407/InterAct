/**
 * Viewer → Host mic diagnostic pipeline.
 * Traces 7 stages. Each logs PASS / FAIL / NOT REACHED.
 * Temporary instrumentation — remove after root cause is found.
 */

const TAG = '[DIAG:ViewerMic]';

export interface StageResult {
  stage: number;
  name: string;
  status: 'PASS' | 'FAIL' | 'NOT REACHED';
  details: Record<string, unknown>;
  timestamp: number;
  sessionId: string;
}

const results: StageResult[] = [];

function generateSessionId() {
  return 'diag-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}
let currentSessionId = generateSessionId();

const listeners = new Set<() => void>();

export function subscribeToDiag(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach((l) => {
    try {
      l();
    } catch (e) {
      console.error('Error in diagnostic listener:', e);
    }
  });
}

export function getDiagResults() {
  return [...results];
}

export function getSessionId() {
  return currentSessionId;
}

function logStage(r: Omit<StageResult, 'timestamp' | 'sessionId'>) {
  const resultWithMeta: StageResult = {
    ...r,
    timestamp: Date.now(),
    sessionId: currentSessionId,
  };
  results.push(resultWithMeta);
  const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⬜';
  console.log(`${TAG} Stage ${r.stage} [${r.name}]: ${icon} ${r.status}`);
  if (Object.keys(r.details).length > 0) {
    console.table(r.details);
  }
  notifyListeners();
}

// ─── Stage 1: syncMic executes ──────────────────────────────────────────────
export function diagStage1_syncMicCalled(micMuted: boolean, isHost: boolean) {
  if (isHost) return; // only trace viewer path
  logStage({
    stage: 1,
    name: 'syncMic executes',
    status: 'PASS',
    details: { micMuted, isHost, timestamp: Date.now() },
  });
}

// ─── Stage 2: Microphone acquisition ────────────────────────────────────────
export function diagStage2_micAcquired(
  success: boolean,
  track: MediaStreamTrack | null,
  error?: unknown
) {
  if (success && track) {
    logStage({
      stage: 2,
      name: 'Microphone acquisition',
      status: 'PASS',
      details: {
        trackId: track.id,
        trackKind: track.kind,
        readyState: track.readyState,
        enabled: track.enabled,
        muted: track.muted,
        label: track.label,
        constraints: track.getConstraints?.() ?? 'N/A',
      },
    });
  } else {
    logStage({
      stage: 2,
      name: 'Microphone acquisition',
      status: 'FAIL',
      details: { error: String(error) },
    });
  }
}

// ─── Stage 3: Track attachment ──────────────────────────────────────────────
export function diagStage3_attachCalled(
  pc: RTCPeerConnection,
  micTrack: MediaStreamTrack | null
) {
  if (!micTrack) {
    logStage({
      stage: 3,
      name: 'Track attachment',
      status: 'FAIL',
      details: { reason: 'No mic track available to attach' },
    });
    return;
  }

  const transceivers = pc.getTransceivers();
  const audioSlots = transceivers.filter(
    (t) => t.receiver.track?.kind === 'audio'
  );
  const micSlot = audioSlots[audioSlots.length - 1];

  const transceiverDump = transceivers.map((t, i) => ({
    index: i,
    mid: t.mid,
    direction: t.direction,
    currentDirection: t.currentDirection,
    senderTrackId: t.sender.track?.id ?? null,
    senderTrackKind: t.sender.track?.kind ?? null,
    receiverTrackKind: t.receiver.track?.kind ?? null,
  }));

  logStage({
    stage: 3,
    name: 'Track attachment (pre-replaceTrack)',
    status: micSlot ? 'PASS' : 'FAIL',
    details: {
      totalTransceivers: transceivers.length,
      audioSlotCount: audioSlots.length,
      selectedMicSlotMid: micSlot?.mid ?? 'NONE',
      selectedSlotDirection: micSlot?.direction ?? 'NONE',
      selectedSlotCurrentDirection: micSlot?.currentDirection ?? 'NONE',
      senderTrackBefore: micSlot?.sender.track?.id ?? 'null',
      micTrackId: micTrack.id,
      micTrackReadyState: micTrack.readyState,
      micTrackEnabled: micTrack.enabled,
      transceiverDump,
    },
  });
}

export function diagStage3_replaceTrackResult(
  success: boolean,
  senderTrackAfter: string | null,
  error?: unknown
) {
  logStage({
    stage: 3,
    name: 'Track attachment (post-replaceTrack)',
    status: success ? 'PASS' : 'FAIL',
    details: success
      ? { senderTrackAfter }
      : { error: String(error) },
  });
}

// ─── Stage 4: SDP negotiation ───────────────────────────────────────────────
export function diagStage4_sdp(
  role: 'offer' | 'answer',
  sdp: string | undefined
) {
  if (!sdp) {
    logStage({
      stage: 4,
      name: `SDP negotiation (${role})`,
      status: 'FAIL',
      details: { reason: `No SDP string in ${role}` },
    });
    return;
  }

  // Parse audio m-lines
  const mLines = sdp.split('\r\n').filter((l) => l.startsWith('m='));
  const audioMLines = mLines.filter((l) => l.startsWith('m=audio'));

  // Check direction attributes per audio section
  const sections = sdp.split(/(?=m=)/);
  const audioSections = sections.filter((s) => s.startsWith('m=audio'));
  const audioDetails = audioSections.map((s, i) => {
    const dirMatch = s.match(/a=(sendrecv|sendonly|recvonly|inactive)/);
    const msidMatch = s.match(/a=msid:(\S+)/);
    return {
      index: i,
      mLine: s.split('\r\n')[0],
      direction: dirMatch?.[1] ?? 'not specified (default sendrecv)',
      msid: msidMatch?.[1] ?? 'none',
    };
  });

  logStage({
    stage: 4,
    name: `SDP negotiation (${role})`,
    status: audioMLines.length > 0 ? 'PASS' : 'FAIL',
    details: {
      totalMLines: mLines.length,
      audioMLineCount: audioMLines.length,
      audioSections: audioDetails,
      sdpLength: sdp.length,
    },
  });
}

// ─── Stage 5: Peer connection state ─────────────────────────────────────────
export function diagStage5_pcState(pc: RTCPeerConnection) {
  const state = {
    connectionState: pc.connectionState,
    iceConnectionState: pc.iceConnectionState,
    iceGatheringState: pc.iceGatheringState,
    signalingState: pc.signalingState,
  };

  const connected =
    pc.iceConnectionState === 'connected' ||
    pc.iceConnectionState === 'completed';

  logStage({
    stage: 5,
    name: 'Peer connection state',
    status: connected ? 'PASS' : 'FAIL',
    details: state,
  });
}

// ─── Stage 6: Host reception ────────────────────────────────────────────────
export function diagStage6_hostOnTrack(
  track: MediaStreamTrack,
  streams: readonly MediaStream[],
  transceiver: RTCRtpTransceiver | null,
  peerId: string
) {
  logStage({
    stage: 6,
    name: 'Host reception (ontrack)',
    status: 'PASS',
    details: {
      trackId: track.id,
      trackKind: track.kind,
      trackReadyState: track.readyState,
      trackEnabled: track.enabled,
      trackMuted: track.muted,
      streamCount: streams.length,
      streamIds: streams.map((s) => s.id),
      peerId,
      transceiverMid: transceiver?.mid ?? 'N/A',
      transceiverDirection: transceiver?.direction ?? 'N/A',
      transceiverCurrentDirection: transceiver?.currentDirection ?? 'N/A',
    },
  });
}

// ─── Stage 7: Host playback ────────────────────────────────────────────────
export function diagStage7_hostPlayback(
  streamId: string,
  audioEl: HTMLAudioElement | null
) {
  if (!audioEl) {
    logStage({
      stage: 7,
      name: 'Host playback',
      status: 'FAIL',
      details: { streamId, reason: 'No audio element found for this stream' },
    });
    return;
  }

  logStage({
    stage: 7,
    name: 'Host playback',
    status: audioEl.srcObject ? 'PASS' : 'FAIL',
    details: {
      streamId,
      srcObjectSet: !!audioEl.srcObject,
      autoplay: audioEl.autoplay,
      muted: audioEl.muted,
      volume: audioEl.volume,
      paused: audioEl.paused,
      readyState: audioEl.readyState,
      error: audioEl.error ? audioEl.error.message : null,
    },
  });
}

// ─── Summary ────────────────────────────────────────────────────────────────
export function diagPrintSummary() {
  console.log(`\n${TAG} ════════════════════════════════════════════════`);
  console.log(`${TAG}  VIEWER → HOST MIC DIAGNOSTIC SUMMARY`);
  console.log(`${TAG} ════════════════════════════════════════════════`);

  const allStages = [
    'syncMic executes',
    'Microphone acquisition',
    'Track attachment',
    'SDP negotiation',
    'Peer connection state',
    'Host reception (ontrack)',
    'Host playback',
  ];

  for (let i = 1; i <= 7; i++) {
    const stageResults = results.filter((r) => r.stage === i);
    if (stageResults.length === 0) {
      console.log(`${TAG}  Stage ${i} [${allStages[i - 1]}]: ⬜ NOT REACHED`);
    } else {
      const hasFail = stageResults.some((r) => r.status === 'FAIL');
      const allPass = stageResults.every((r) => r.status === 'PASS');
      const overall = hasFail ? '❌ FAIL' : allPass ? '✅ PASS' : '⚠️ PARTIAL';
      console.log(`${TAG}  Stage ${i} [${allStages[i - 1]}]: ${overall}`);
    }
  }

  const firstFail = results.find((r) => r.status === 'FAIL');
  if (firstFail) {
    console.log(`\n${TAG}  ➡️  FIRST FAILURE: Stage ${firstFail.stage} [${firstFail.name}]`);
    console.log(`${TAG}  Details:`, firstFail.details);
  } else if (results.length > 0) {
    console.log(`\n${TAG}  All reached stages passed. If audio still silent, check Stage 7 autoplay policy or OS audio routing.`);
  }

  console.log(`${TAG} ════════════════════════════════════════════════\n`);
}

export function diagReset() {
  results.length = 0;
  currentSessionId = generateSessionId();
  console.log(`${TAG} Diagnostic results reset. New session: ${currentSessionId}`);
  notifyListeners();
}

// Expose to browser console for manual trigger
if (typeof window !== 'undefined') {
  (window as any).__viewerMicDiag = {
    printSummary: diagPrintSummary,
    reset: diagReset,
    getResults: () => [...results],
  };
}
