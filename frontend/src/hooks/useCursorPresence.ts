import { useEffect, useRef, useState, useCallback } from 'react';
import { wsClient } from '../lib/websocket';
import { CURSOR_COLORS, colorForParticipant, desktopAgent, toDesktopCoords } from '../lib/desktopAgent';
import type { CaptureDisplaySurface } from './useWebRTC';

export interface RemoteCursor {
  participantId: string;
  displayName: string;
  /** Normalised 0–1 relative to viewport width */
  x: number;
  /** Normalised 0–1 relative to viewport height */
  y: number;
}

export interface RectBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CursorParticipant {
  socketId: string;
  displayName: string;
}

interface UseCursorPresenceOptions {
  /** Whether there is a live screen share currently visible in the viewport */
  isScreenVisible: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  captureDisplaySurface: CaptureDisplaySurface | null;
  participants: CursorParticipant[];
  /**
   * When true this browser is the host. The hook will:
   *  1. Connect to the local desktop agent on ws://localhost:8765
   *  2. Forward cursor_move / cursor_click / cursor_hide to the agent
   * Viewers must pass false — they must never contact the agent.
   */
  isHost: boolean;
}

interface UseCursorPresenceReturn {
  /** Attach this callback ref to the viewport container div */
  viewportRef: (node: HTMLDivElement | null) => void;
  videoBounds: RectBounds;
}

/** Minimum ms between cursor_move sends (~20 fps) */
const THROTTLE_MS = 50;

export function calculateVideoBounds(
  containerWidth: number,
  containerHeight: number,
  videoWidth: number,
  videoHeight: number
): RectBounds {
  if (containerWidth <= 0 || containerHeight <= 0 || videoWidth <= 0 || videoHeight <= 0) {
    return { left: 0, top: 0, width: containerWidth, height: containerHeight };
  }

  const containerRatio = containerWidth / containerHeight;
  const videoRatio = videoWidth / videoHeight;

  let width = containerWidth;
  let height = containerHeight;
  let left = 0;
  let top = 0;

  if (containerRatio > videoRatio) {
    // Pillarboxed (black bars left/right)
    width = containerHeight * videoRatio;
    left = (containerWidth - width) / 2;
  } else {
    // Letterboxed (black bars top/bottom)
    height = containerWidth / videoRatio;
    top = (containerHeight - height) / 2;
  }

  return { left, top, width, height };
}

export function useCursorPresence({
  isScreenVisible,
  localStream,
  remoteStream,
  captureDisplaySurface,
  participants,
  isHost,
}: UseCursorPresenceOptions): UseCursorPresenceReturn {
  // [CursorPresence] mount log
  useEffect(() => {
    console.log('[Runtime] useCursorPresence mounted — isScreenVisible:', isScreenVisible);
  }, []);

  // [Runtime] Log whenever isScreenVisible changes so we can see if the viewer ever activates
  useEffect(() => {
    console.log('[Runtime] isScreenVisible changed ->', isScreenVisible);
  }, [isScreenVisible]);

  // Mutable ref so inbound WS callbacks (set up once with [] deps) always
  // read the latest isHost value without needing to re-subscribe.
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;
  const laserPointerEnabledRef = useRef(captureDisplaySurface === 'monitor');
  laserPointerEnabledRef.current = captureDisplaySurface === 'monitor';
  const participantsRef = useRef<CursorParticipant[]>(participants);
  participantsRef.current = participants;

  const participantNamesRef = useRef(new Map<string, string>());
  const participantColorsRef = useRef(new Map<string, string>());
  const rememberedNameColorsRef = useRef(new Map<string, string>());
  const activeCursorIdsRef = useRef(new Set<string>());
  const wasLaserPointerEnabledRef = useRef(captureDisplaySurface === 'monitor');

  const getParticipantName = useCallback((participantId: string, fallback?: string): string => {
    const participant = participantsRef.current.find((p) => p.socketId === participantId);
    return participant?.displayName || participantNamesRef.current.get(participantId) || fallback || participantId;
  }, []);

  const getParticipantColor = useCallback((participantId: string, displayName?: string): string => {
    const existing = participantColorsRef.current.get(participantId);
    if (existing) return existing;

    const name = displayName || getParticipantName(participantId);
    const nameKey = name.trim().toLocaleLowerCase();
    const activeColorIds = new Set(
      participantsRef.current
        .map((p) => p.socketId)
        .filter((id) => id !== participantId)
    );
    const activeColors = new Set(
      [...participantColorsRef.current.entries()]
        .filter(([id]) => activeColorIds.has(id))
        .map(([, color]) => color)
    );
    const rememberedColor = rememberedNameColorsRef.current.get(nameKey);

    let color = rememberedColor && !activeColors.has(rememberedColor)
      ? rememberedColor
      : CURSOR_COLORS.find((candidate) => !activeColors.has(candidate));

    if (!color) {
      color = colorForParticipant(participantId);
    }

    participantColorsRef.current.set(participantId, color);
    rememberedNameColorsRef.current.set(nameKey, color);
    return color;
  }, [getParticipantName]);

  useEffect(() => {
    const laserPointerEnabled = captureDisplaySurface === 'monitor';

    if (wasLaserPointerEnabledRef.current && !laserPointerEnabled && isHostRef.current) {
      for (const participantId of activeCursorIdsRef.current) {
        desktopAgent.sendCursorRemove(participantId);
      }
      activeCursorIdsRef.current.clear();
    }

    wasLaserPointerEnabledRef.current = laserPointerEnabled;
  }, [captureDisplaySurface]);

  // ── Desktop agent connection — host only ──────────────────────────────────
  // Connect when this browser becomes the host; disconnect on role change or unmount.
  // Viewers never reach this branch (isHost stays false for them).
  useEffect(() => {
    if (!isHost) return;
    desktopAgent.connect();
    return () => desktopAgent.disconnect();
  }, [isHost]);

  useEffect(() => {
    const activeParticipantIds = new Set(participants.map((p) => p.socketId));

    participants.forEach((participant) => {
      participantNamesRef.current.set(participant.socketId, participant.displayName);
      getParticipantColor(participant.socketId, participant.displayName);
    });

    for (const participantId of [...activeCursorIdsRef.current]) {
      if (!activeParticipantIds.has(participantId)) {
        if (isHostRef.current && laserPointerEnabledRef.current) {
          desktopAgent.sendCursorRemove(participantId);
        }
        activeCursorIdsRef.current.delete(participantId);
      }
    }

    for (const participantId of [...participantColorsRef.current.keys()]) {
      if (!activeParticipantIds.has(participantId)) {
        participantColorsRef.current.delete(participantId);
        participantNamesRef.current.delete(participantId);
      }
    }
  }, [participants, getParticipantColor]);

  // Use stateful viewport element to trigger effects properly when the ref is attached
  const [viewportEl, setViewportEl] = useState<HTMLDivElement | null>(null);
  const viewportRef = useCallback((node: HTMLDivElement | null) => {
    setViewportEl(node);
  }, []);

  // Whether LEFT CTRL is currently held
  const ctrlHeld = useRef(false);
  // Timestamp of last send
  const lastSentAt = useRef(0);



  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });

  // ---------------------------------------------------------------------------
  // ResizeObserver to track container boundaries
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!viewportEl) return;

    const rect = viewportEl.getBoundingClientRect();
    setContainerSize({ width: rect.width, height: rect.height });

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(viewportEl);
    return () => observer.disconnect();
  }, [viewportEl]);

  // ---------------------------------------------------------------------------
  // MutationObserver to track video element attachment + metadata loading
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!viewportEl) return;

    const updateDimensions = () => {
      const video = viewportEl.querySelector('video');
      if (video) {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
        } else {
          const handleMetadata = () => {
            setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
          };
          video.addEventListener('loadedmetadata', handleMetadata, { once: true });
        }
      } else if (localStream) {
        const track = localStream.getVideoTracks()[0];
        const settings = track?.getSettings();
        if (settings?.width && settings?.height) {
          setVideoDimensions({ width: settings.width, height: settings.height });
        }
      } else {
        setVideoDimensions({ width: 0, height: 0 });
      }
    };

    updateDimensions();

    const observer = new MutationObserver(() => {
      updateDimensions();
    });

    observer.observe(viewportEl, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [viewportEl, localStream, remoteStream]);

  const videoBounds = calculateVideoBounds(
    containerSize.width,
    containerSize.height,
    videoDimensions.width,
    videoDimensions.height
  );

  // ---------------------------------------------------------------------------
  // Send helpers
  // ---------------------------------------------------------------------------

  const sendMove = useCallback((normX: number, normY: number) => {
    wsClient.send('cursor_move', { x: normX, y: normY });
  }, []);

  const sendClick = useCallback((normX: number, normY: number) => {
    wsClient.send('cursor_click', { x: normX, y: normY });
  }, []);

  const sendHide = useCallback(() => {
    wsClient.send('cursor_hide', {});
  }, []);

  const getNormalizedPoint = useCallback((e: MouseEvent): { x: number; y: number } | null => {
    if (!viewportEl) return null;
    if (videoBounds.width <= 0 || videoBounds.height <= 0) return null;

    const rect = viewportEl.getBoundingClientRect();
    const mouseXRel = e.clientX - rect.left;
    const mouseYRel = e.clientY - rect.top;

    const normX = (mouseXRel - videoBounds.left) / videoBounds.width;
    const normY = (mouseYRel - videoBounds.top) / videoBounds.height;

    if (normX < 0 || normX > 1 || normY < 0 || normY > 1) return null;
    return { x: normX, y: normY };
  }, [viewportEl, videoBounds.left, videoBounds.top, videoBounds.width, videoBounds.height]);

  // ---------------------------------------------------------------------------
  // Keyboard listeners — track LEFT CTRL state
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isScreenVisible) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ControlLeft' && !ctrlHeld.current) {
        ctrlHeld.current = true;
        console.log('[Runtime] CTRL down');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ControlLeft' && ctrlHeld.current) {
        ctrlHeld.current = false;
        sendHide();
      }
    };

    // Safety: if window loses focus while CTRL is held, treat as release
    const onBlur = () => {
      if (ctrlHeld.current) {
        ctrlHeld.current = false;
        sendHide();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);

      // Ensure hide is sent on cleanup (e.g. navigating away)
      if (ctrlHeld.current) {
        ctrlHeld.current = false;
        sendHide();
      }
    };
  }, [isScreenVisible, sendHide]);

  // ---------------------------------------------------------------------------
  // Mouse move listener on the viewport element — throttled
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isScreenVisible || !viewportEl) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!ctrlHeld.current) return;

      const now = Date.now();
      if (now - lastSentAt.current < THROTTLE_MS) return;
      lastSentAt.current = now;

      const point = getNormalizedPoint(e);
      if (!point) return;

      console.log('[Runtime] sending cursor_move', point.x.toFixed(3), point.y.toFixed(3));
      sendMove(point.x, point.y);
    };

    viewportEl.addEventListener('mousemove', onMouseMove);
    return () => viewportEl.removeEventListener('mousemove', onMouseMove);
  }, [isScreenVisible, viewportEl, getNormalizedPoint, sendMove]);

  useEffect(() => {
    if (!isScreenVisible || !viewportEl) return;

    const onMouseDown = (e: MouseEvent) => {
      if (!ctrlHeld.current || e.button !== 0) return;

      const point = getNormalizedPoint(e);
      if (!point) return;

      sendClick(point.x, point.y);
    };

    viewportEl.addEventListener('mousedown', onMouseDown);
    return () => viewportEl.removeEventListener('mousedown', onMouseDown);
  }, [isScreenVisible, viewportEl, getNormalizedPoint, sendClick]);

  // ---------------------------------------------------------------------------
  // Inbound WebSocket subscriptions
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // ── cursor_move ─────────────────────────────────────────────────────────
    const unsubMove = wsClient.on('cursor_move', (data) => {
      console.log('[Runtime] host received cursor_move', data);
      const { participantId, displayName, x, y } = data as RemoteCursor;
      if (!participantId || x == null || y == null) return;

      // Forward to desktop agent — host only, silently skipped if not connected
      if (isHostRef.current && laserPointerEnabledRef.current) {
        const name = getParticipantName(participantId, displayName);
        const color = getParticipantColor(participantId, name);
        participantNamesRef.current.set(participantId, name);
        activeCursorIdsRef.current.add(participantId);
        const { x: dx, y: dy } = toDesktopCoords(x, y);
        desktopAgent.sendCursorMove(
          participantId,
          dx,
          dy,
          color,
          name,
        );
      }
    });

    // ── cursor_click ─────────────────────────────────────────────────────────
    // Backend already relays cursor_click (connection.py line 314).
    // This subscription exists solely to forward them to the desktop agent as ripple events.
    const unsubClick = wsClient.on('cursor_click', (data) => {
      const { participantId, displayName, x, y } =
        data as { participantId: string; displayName?: string; x: number; y: number };
      if (!participantId || x == null || y == null) return;

      if (isHostRef.current && laserPointerEnabledRef.current) {
        const name = getParticipantName(participantId, displayName);
        const color = getParticipantColor(participantId, name);
        const { x: dx, y: dy } = toDesktopCoords(x, y);
        desktopAgent.sendCursorClick(
          participantId,
          dx,
          dy,
          color,
        );
      }
    });

    // ── cursor_hide ──────────────────────────────────────────────────────────
    const unsubHide = wsClient.on('cursor_hide', (data) => {
      console.log('[Runtime] host received cursor_hide', data);
      const { participantId } = data as { participantId: string };
      if (!participantId) return;

      // Remove from desktop overlay
      if (isHostRef.current && laserPointerEnabledRef.current) {
        desktopAgent.sendCursorRemove(participantId);
        activeCursorIdsRef.current.delete(participantId);
      }
    });

    const unsubParticipantLeft = wsClient.on('participant_left', (data) => {
      const { participantId } = data as { participantId: string };
      if (!participantId) return;

      if (isHostRef.current && laserPointerEnabledRef.current) {
        desktopAgent.sendCursorRemove(participantId);
      }
      activeCursorIdsRef.current.delete(participantId);
      participantColorsRef.current.delete(participantId);
      participantNamesRef.current.delete(participantId);
    });

    return () => {
      unsubMove();
      unsubClick();
      unsubHide();
      unsubParticipantLeft();
    };
  }, [getParticipantColor, getParticipantName]);

  console.log('[Runtime-Audit] videoBounds:', videoBounds, 'videoDimensions:', videoDimensions, 'containerSize:', containerSize);

  return { viewportRef, videoBounds };
}
