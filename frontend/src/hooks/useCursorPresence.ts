import { useEffect, useRef, useState, useCallback } from 'react';
import { wsClient } from '../lib/websocket';
import { isMobileDevice } from '../lib/mobile';
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
  localParticipantId?: string;
  onViewerInteraction?: () => void;
}

interface UseCursorPresenceReturn {
  /** Attach this callback ref to the viewport container div */
  viewportRef: (node: HTMLDivElement | null) => void;
  videoBounds: RectBounds;
  laserModeActive: boolean;
  spotlightActive: boolean;
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
  localParticipantId,
  onViewerInteraction,
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

  // ── Desktop agent connection — host only, never on mobile ─────────────────
  // Connect when this browser becomes the host; keep connection persistent.
  // Viewers never reach this branch (isHost stays false for them).
  useEffect(() => {
    if (!isHost) return;
    if (isMobileDevice) return;
    desktopAgent.connect();
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

  // Presenter Mode state
  const laserModeEnabled = useRef(false);
  const [laserModeActive, setLaserModeActive] = useState(false);
  const lastCtrlPressTime = useRef(0);

  // Spotlight state
  const spotlightEnabled = useRef(false);
  const [spotlightActive, setSpotlightActive] = useState(false);
  const lastAltPressTime = useRef(0);

  // Annotation state
  const altHeld = useRef(false);
  const shiftHeld = useRef(false);
  const isDraggingAnnotation = useRef(false);
  const annotationStartPoint = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentAnnotationId = useRef<string | null>(null);
  const currentAnnotationType = useRef<'rect' | 'arrow'>('rect');

  // Touch gesture state (Mobile Presentation Mode)
  const touchStartInfo = useRef<{
    time: number;
    startX: number;
    startY: number;
    isSingleTouch: boolean;
    hasMovedBeyondThreshold: boolean;
  } | null>(null);

  const TAP_MAX_DURATION = 250; // ms
  const TAP_MOVE_THRESHOLD = 10; // px



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

  const getNormalizedCoords = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!viewportEl) return null;
    if (videoBounds.width <= 0 || videoBounds.height <= 0) return null;

    const rect = viewportEl.getBoundingClientRect();
    const xRel = clientX - rect.left;
    const yRel = clientY - rect.top;

    const normX = (xRel - videoBounds.left) / videoBounds.width;
    const normY = (yRel - videoBounds.top) / videoBounds.height;

    if (normX < 0 || normX > 1 || normY < 0 || normY > 1) return null;
    return { x: normX, y: normY };
  }, [viewportEl, videoBounds.left, videoBounds.top, videoBounds.width, videoBounds.height]);

  const getNormalizedPoint = useCallback((e: MouseEvent): { x: number; y: number } | null => {
    return getNormalizedCoords(e.clientX, e.clientY);
  }, [getNormalizedCoords]);

  // ---------------------------------------------------------------------------
  // Keyboard listeners — track LEFT CTRL state
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isScreenVisible) return;
    if (isHost) return; // Host inputs and shortcuts are handled globally by Desktop Agent

    const onKeyDown = (e: KeyboardEvent) => {
      // Track ALT and SHIFT for annotation modes
      if (e.code === 'AltLeft' && !e.repeat) {
        e.preventDefault(); // Prevent menu focus
        altHeld.current = true;
        console.log('[Annotation] ALT down');

        if (isHostRef.current) {
          const now = Date.now();
          const diff = now - lastAltPressTime.current;

          if (diff > 50 && diff < 350) {
            spotlightEnabled.current = !spotlightEnabled.current;
            setSpotlightActive(spotlightEnabled.current);
            console.log('[Spotlight] Toggled:', spotlightEnabled.current);

            // Reset time to prevent triple-taps
            lastAltPressTime.current = 0;

            // Send spotlight state to local agent
            desktopAgent.sendSpotlightUpdate(localParticipantId || '', spotlightEnabled.current);

            // If spotlight toggled OFF, and laser pointer is also OFF, hide cursor from agent
            if (!spotlightEnabled.current && !ctrlHeld.current && !laserModeEnabled.current) {
              desktopAgent.sendCursorRemove(localParticipantId || '');
            }
          } else {
            lastAltPressTime.current = now;
          }
        }
      }
      if (e.code === 'ShiftLeft') {
        shiftHeld.current = true;
        console.log('[Annotation] SHIFT down');
      }
      if (e.code === 'Escape') {
        console.log('[Runtime] ESC pressed — clearing annotations');
        wsClient.send('annotation_clear', {});
        if (isHostRef.current) {
          desktopAgent.sendAnnotationClear(localParticipantId || '');
        }
      }

      // Ignore repeat events, Right Control, and synthetic repeated events
      if (e.code === 'ControlLeft' && !e.repeat) {
        const now = Date.now();
        const diff = now - lastCtrlPressTime.current;

        // Double-tap threshold: between 50ms and 350ms
        if (diff > 50 && diff < 350) {
          // Toggle Laser Mode
          laserModeEnabled.current = !laserModeEnabled.current;
          setLaserModeActive(laserModeEnabled.current);
          console.log('[Runtime] Laser Mode toggled:', laserModeEnabled.current);

          // Reset stored time to prevent triple-tap double-toggle (cooldown)
          lastCtrlPressTime.current = 0;

          if (!laserModeEnabled.current) {
            // Turned OFF: send cursor_hide immediately
            sendHide();
            if (isHostRef.current) {
              desktopAgent.sendCursorRemove(localParticipantId || '');
              if (spotlightEnabled.current) {
                spotlightEnabled.current = false;
                setSpotlightActive(false);
                desktopAgent.sendSpotlightUpdate(localParticipantId || '', false);
              }
            }
          }
        } else {
          lastCtrlPressTime.current = now;
        }

        // Only track hold if persistent laser mode is OFF
        if (!laserModeEnabled.current) {
          ctrlHeld.current = true;
          console.log('[Runtime] CTRL down');
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'AltLeft') {
        altHeld.current = false;
      }
      if (e.code === 'ShiftLeft') {
        shiftHeld.current = false;
      }
      if (e.code === 'ControlLeft') {
        // Only release/hide on keyup if persistent laser mode is OFF
        if (!laserModeEnabled.current && ctrlHeld.current) {
          ctrlHeld.current = false;
          sendHide();
          if (isHostRef.current) {
            desktopAgent.sendCursorRemove(localParticipantId || '');
            if (spotlightEnabled.current) {
              spotlightEnabled.current = false;
              setSpotlightActive(false);
              desktopAgent.sendSpotlightUpdate(localParticipantId || '', false);
            }
          }
        }
      }
    };

    // Safety: if window loses focus, treat as release and turn Laser Mode & Spotlight OFF
    const onBlur = () => {
      if (ctrlHeld.current || laserModeEnabled.current || spotlightEnabled.current) {
        ctrlHeld.current = false;
        laserModeEnabled.current = false;
        setLaserModeActive(false);
        spotlightEnabled.current = false;
        setSpotlightActive(false);
        sendHide();
        if (isHostRef.current) {
          desktopAgent.sendSpotlightUpdate(localParticipantId || '', false);
          desktopAgent.sendCursorRemove(localParticipantId || '');
        }
      }
    };

    const onMouseUp = () => {
      if (isDraggingAnnotation.current) {
        isDraggingAnnotation.current = false;
        currentAnnotationId.current = null;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('mouseup', onMouseUp);

      // Ensure hide is sent on cleanup (e.g. navigating away)
      if (ctrlHeld.current || laserModeEnabled.current || spotlightEnabled.current) {
        ctrlHeld.current = false;
        laserModeEnabled.current = false;
        setLaserModeActive(false);
        spotlightEnabled.current = false;
        setSpotlightActive(false);
        sendHide();
        if (isHostRef.current) {
          desktopAgent.sendSpotlightUpdate(localParticipantId || '', false);
          desktopAgent.sendCursorRemove(localParticipantId || '');
        }
      }
    };
  }, [isScreenVisible, sendHide, localParticipantId]);

  // ---------------------------------------------------------------------------
  // Mouse move listener on the viewport element — throttled
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isScreenVisible || !viewportEl) return;
    if (isHost) return; // Host inputs are handled globally by Desktop Agent

    const onMouseMove = (e: MouseEvent) => {
      if (e.target && (e.target as HTMLElement).closest('.pointer-events-auto')) {
        return;
      }
      const now = Date.now();

      if (isDraggingAnnotation.current && currentAnnotationId.current) {
        if (now - lastSentAt.current < 33) return; // 30 FPS throttle
        lastSentAt.current = now;

        const point = getNormalizedPoint(e);
        if (!point) return;

        const startPoint = annotationStartPoint.current;
        const annotId = currentAnnotationId.current;
        const annotType = currentAnnotationType.current;

        wsClient.send('annotation_update', {
          annotationId: annotId,
          type: annotType,
          startX: startPoint.x,
          startY: startPoint.y,
          endX: point.x,
          endY: point.y,
        });
        console.log('[Annotation] update sent', annotId);

        if (isHostRef.current) {
          const startDesk = toDesktopCoords(startPoint.x, startPoint.y);
          const endDesk = toDesktopCoords(point.x, point.y);
          desktopAgent.sendAnnotationUpdate(
            localParticipantId || '',
            annotId,
            annotType,
            startDesk.x,
            startDesk.y,
            endDesk.x,
            endDesk.y,
          );
        }
        return;
      }

      const isLaserActive = ctrlHeld.current || laserModeEnabled.current;
      const isSpotlightActive = spotlightEnabled.current;

      if (!isLaserActive && !isSpotlightActive) return;

      if (now - lastSentAt.current < THROTTLE_MS) return;
      lastSentAt.current = now;

      const point = getNormalizedPoint(e);
      if (!point) return;

      if (isLaserActive) {
        console.log('[Runtime] sending cursor_move', point.x.toFixed(3), point.y.toFixed(3));
        sendMove(point.x, point.y);
      }

      if (isHostRef.current && (isLaserActive || isSpotlightActive)) {
        const name = getParticipantName(localParticipantId || '');
        const color = getParticipantColor(localParticipantId || '', name);
        const { x: dx, y: dy } = toDesktopCoords(point.x, point.y);
        desktopAgent.sendCursorMove(
          localParticipantId || '',
          dx,
          dy,
          color,
          name,
        );
      }
    };

    viewportEl.addEventListener('mousemove', onMouseMove);
    return () => viewportEl.removeEventListener('mousemove', onMouseMove);
  }, [isScreenVisible, viewportEl, getNormalizedPoint, sendMove, localParticipantId]);

  useEffect(() => {
    if (!isScreenVisible || !viewportEl) return;
    if (isHost) return; // Host inputs are handled globally by Desktop Agent

    const onMouseDown = (e: MouseEvent) => {
      if (e.target && (e.target as HTMLElement).closest('.pointer-events-auto')) {
        return;
      }
      if (e.button !== 0) return;

      const isAlt = altHeld.current;
      const isShift = shiftHeld.current;

      if (isAlt || isShift) {
        lastAltPressTime.current = 0;
        const point = getNormalizedPoint(e);
        if (!point) return;

        isDraggingAnnotation.current = true;
        annotationStartPoint.current = point;
        const annotationId = `annot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        currentAnnotationId.current = annotationId;
        currentAnnotationType.current = isAlt ? 'rect' : 'arrow';
        console.log('[Annotation] drag start');

        // Send initial update
        wsClient.send('annotation_update', {
          annotationId,
          type: isAlt ? 'rect' : 'arrow',
          startX: point.x,
          startY: point.y,
          endX: point.x,
          endY: point.y,
        });

        if (isHostRef.current) {
          const startDesk = toDesktopCoords(point.x, point.y);
          desktopAgent.sendAnnotationUpdate(
            localParticipantId || '',
            annotationId,
            isAlt ? 'rect' : 'arrow',
            startDesk.x,
            startDesk.y,
            startDesk.x,
            startDesk.y,
          );
        }
        return;
      }

      if ((!ctrlHeld.current && !laserModeEnabled.current)) return;

      const point = getNormalizedPoint(e);
      if (!point) return;

      sendClick(point.x, point.y);
    };

    viewportEl.addEventListener('mousedown', onMouseDown);
    return () => viewportEl.removeEventListener('mousedown', onMouseDown);
  }, [isScreenVisible, viewportEl, getNormalizedPoint, sendClick, localParticipantId]);

  // ---------------------------------------------------------------------------
  // Touch event listeners on the viewport element — Mobile Presentation Mode
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isScreenVisible || !viewportEl) return;
    if (isHost) return; // Host inputs are handled globally by Desktop Agent

    const onTouchStart = (e: TouchEvent) => {
      if (e.target && (e.target as HTMLElement).closest('.pointer-events-auto')) {
        return;
      }
      onViewerInteraction?.();
      if (e.touches.length !== 1) {
        // Not a single-touch gesture (could be multi-touch, pinch, zoom, etc.)
        touchStartInfo.current = null;
        sendHide();
        return;
      }

      const touch = e.touches[0];
      touchStartInfo.current = {
        time: Date.now(),
        startX: touch.clientX,
        startY: touch.clientY,
        isSingleTouch: true,
        hasMovedBeyondThreshold: false,
      };

      if (e.cancelable) {
        e.preventDefault();
      }

      // Show cursor immediately at start position
      const point = getNormalizedCoords(touch.clientX, touch.clientY);
      if (point) {
        sendMove(point.x, point.y);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.target && (e.target as HTMLElement).closest('.pointer-events-auto')) {
        return;
      }
      const startInfo = touchStartInfo.current;
      if (!startInfo || !startInfo.isSingleTouch) return;

      if (e.touches.length !== 1) {
        // Gesture became multi-touch, cancel it
        touchStartInfo.current = null;
        sendHide();
        return;
      }

      const touch = e.touches[0];
      const dx = touch.clientX - startInfo.startX;
      const dy = touch.clientY - startInfo.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > TAP_MOVE_THRESHOLD) {
        startInfo.hasMovedBeyondThreshold = true;
      }

      if (e.cancelable) {
        e.preventDefault();
      }

      // Drag: continuously move virtual cursor
      const now = Date.now();
      if (now - lastSentAt.current >= THROTTLE_MS) {
        lastSentAt.current = now;
        const point = getNormalizedCoords(touch.clientX, touch.clientY);
        if (point) {
          sendMove(point.x, point.y);
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.target && (e.target as HTMLElement).closest('.pointer-events-auto')) {
        return;
      }
      onViewerInteraction?.();
      const startInfo = touchStartInfo.current;
      if (!startInfo || !startInfo.isSingleTouch) return;

      if (e.cancelable) {
        e.preventDefault();
      }

      const duration = Date.now() - startInfo.time;
      const touch = e.changedTouches[0];

      if (touch) {
        const dx = touch.clientX - startInfo.startX;
        const dy = touch.clientY - startInfo.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const isTap = duration < TAP_MAX_DURATION && distance < TAP_MOVE_THRESHOLD && !startInfo.hasMovedBeyondThreshold;

        if (isTap) {
          const point = getNormalizedCoords(touch.clientX, touch.clientY);
          if (point) {
            sendClick(point.x, point.y);
          }
        }
      }

      // Always hide cursor on touch release
      sendHide();
      touchStartInfo.current = null;
    };

    const onTouchCancel = (e: TouchEvent) => {
      if (e.target && (e.target as HTMLElement).closest('.pointer-events-auto')) {
        return;
      }
      onViewerInteraction?.();
      if (e.cancelable) {
        e.preventDefault();
      }
      sendHide();
      touchStartInfo.current = null;
    };

    // Register options with passive: false to allow calling preventDefault()
    viewportEl.addEventListener('touchstart', onTouchStart, { passive: false });
    viewportEl.addEventListener('touchmove', onTouchMove, { passive: false });
    viewportEl.addEventListener('touchend', onTouchEnd, { passive: false });
    viewportEl.addEventListener('touchcancel', onTouchCancel, { passive: false });

    return () => {
      viewportEl.removeEventListener('touchstart', onTouchStart);
      viewportEl.removeEventListener('touchmove', onTouchMove);
      viewportEl.removeEventListener('touchend', onTouchEnd);
      viewportEl.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [isScreenVisible, viewportEl, isHost, getNormalizedCoords, sendMove, sendClick, sendHide, onViewerInteraction]);


  // ---------------------------------------------------------------------------
  // Inbound WebSocket subscriptions
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // ── cursor_move ─────────────────────────────────────────────────────────
    const unsubMove = wsClient.on('cursor_move', (data) => {
      console.log('[Runtime] host received cursor_move', data);
      const { participantId, displayName, x, y } = data as RemoteCursor;
      if (!participantId || x == null || y == null) return;
      if (participantId === localParticipantId) return; // Filter out host's own echo

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
      if (participantId === localParticipantId) return; // Filter out host's own echo

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
      if (participantId === localParticipantId) return;

      // Remove from desktop overlay
      if (isHostRef.current && laserPointerEnabledRef.current) {
        desktopAgent.sendCursorRemove(participantId);
        activeCursorIdsRef.current.delete(participantId);
      }
    });

    // ── annotation_update ───────────────────────────────────────────────────
    const unsubAnnotationUpdate = wsClient.on('annotation_update', (data) => {
      const { participantId, displayName, annotationId, type, startX, startY, endX, endY } = data as {
        participantId: string;
        displayName?: string;
        annotationId: string;
        type: 'rect' | 'arrow';
        startX: number;
        startY: number;
        endX: number;
        endY: number;
      };
      if (!participantId || !annotationId || !type) return;
      if (participantId === localParticipantId) return;
      console.log('[Annotation] host received', annotationId);

      if (isHostRef.current && laserPointerEnabledRef.current) {
        const name = getParticipantName(participantId, displayName);
        const color = getParticipantColor(participantId, name);
        const startDesk = toDesktopCoords(startX, startY);
        const endDesk = toDesktopCoords(endX, endY);
        desktopAgent.sendAnnotationUpdate(
          participantId,
          annotationId,
          type,
          startDesk.x,
          startDesk.y,
          endDesk.x,
          endDesk.y,
          color,
          name,
        );
      }
    });

    // ── annotation_clear ────────────────────────────────────────────────────
    const unsubAnnotationClear = wsClient.on('annotation_clear', (data) => {
      const { participantId } = data as { participantId: string };
      if (!participantId) return;
      if (participantId === localParticipantId) return;

      if (isHostRef.current && laserPointerEnabledRef.current) {
        desktopAgent.sendAnnotationClear(participantId);
      }
    });

    const unsubParticipantLeft = wsClient.on('participant_left', (data) => {
      const { participantId } = data as { participantId: string };
      if (!participantId) return;

      if (isHostRef.current && laserPointerEnabledRef.current) {
        desktopAgent.sendCursorRemove(participantId);
        desktopAgent.sendAnnotationClear(participantId); // Remove participant's annotations!
      }
      activeCursorIdsRef.current.delete(participantId);
      participantColorsRef.current.delete(participantId);
      participantNamesRef.current.delete(participantId);
    });

    return () => {
      unsubMove();
      unsubClick();
      unsubHide();
      unsubAnnotationUpdate();
      unsubAnnotationClear();
      unsubParticipantLeft();
    };
  }, [getParticipantColor, getParticipantName]);

  console.log('[Runtime-Audit] videoBounds:', videoBounds, 'videoDimensions:', videoDimensions, 'containerSize:', containerSize);

  return { viewportRef, videoBounds, laserModeActive, spotlightActive };
}
