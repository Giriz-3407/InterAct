import { useEffect, useRef, useState, useCallback } from 'react';
import { wsClient } from '../lib/websocket';

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

interface UseCursorPresenceOptions {
  /** Whether there is a live screen share currently visible in the viewport */
  isScreenVisible: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

interface UseCursorPresenceReturn {
  /** Attach this callback ref to the viewport container div */
  viewportRef: (node: HTMLDivElement | null) => void;
  /** Map of participantId → RemoteCursor for all visible remote peers */
  remoteCursors: Map<string, RemoteCursor>;
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
}: UseCursorPresenceOptions): UseCursorPresenceReturn {
  // [CursorPresence] mount log
  useEffect(() => {
    console.log('[Runtime] useCursorPresence mounted — isScreenVisible:', isScreenVisible);
  }, []);

  // [Runtime] Log whenever isScreenVisible changes so we can see if the viewer ever activates
  useEffect(() => {
    console.log('[Runtime] isScreenVisible changed ->', isScreenVisible);
  }, [isScreenVisible]);

  // Use stateful viewport element to trigger effects properly when the ref is attached
  const [viewportEl, setViewportEl] = useState<HTMLDivElement | null>(null);
  const viewportRef = useCallback((node: HTMLDivElement | null) => {
    setViewportEl(node);
  }, []);

  // Whether LEFT CTRL is currently held
  const ctrlHeld = useRef(false);
  // Timestamp of last send
  const lastSentAt = useRef(0);

  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(
    new Map()
  );

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

  const sendHide = useCallback(() => {
    wsClient.send('cursor_hide', {});
  }, []);

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

      const rect = viewportEl.getBoundingClientRect();
      const mouseXRel = e.clientX - rect.left;
      const mouseYRel = e.clientY - rect.top;

      const normX = (mouseXRel - videoBounds.left) / videoBounds.width;
      const normY = (mouseYRel - videoBounds.top) / videoBounds.height;

      // Clamp to [0, 1] — ignore moves outside the actual video bounds
      if (normX < 0 || normX > 1 || normY < 0 || normY > 1) return;

      console.log('[Runtime] sending cursor_move', normX.toFixed(3), normY.toFixed(3));
      sendMove(normX, normY);
    };

    viewportEl.addEventListener('mousemove', onMouseMove);
    return () => viewportEl.removeEventListener('mousemove', onMouseMove);
  }, [isScreenVisible, viewportEl, sendMove, videoBounds.left, videoBounds.top, videoBounds.width, videoBounds.height]);

  // ---------------------------------------------------------------------------
  // Inbound WebSocket subscriptions
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const unsubMove = wsClient.on('cursor_move', (data) => {
      console.log('[Runtime] host received cursor_move', data);
      const { participantId, displayName, x, y } = data as RemoteCursor;
      if (!participantId || x == null || y == null) return;

      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.set(participantId, { participantId, displayName, x, y });
        return next;
      });
    });

    const unsubHide = wsClient.on('cursor_hide', (data) => {
      console.log('[Runtime] host received cursor_hide', data);
      const { participantId } = data as { participantId: string };
      if (!participantId) return;

      setRemoteCursors((prev) => {
        if (!prev.has(participantId)) return prev;
        const next = new Map(prev);
        next.delete(participantId);
        return next;
      });
    });

    return () => {
      unsubMove();
      unsubHide();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // When screen share becomes invisible, clear all remote cursors
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isScreenVisible) {
      setRemoteCursors(new Map());
    }
  }, [isScreenVisible]);

  console.log('[Runtime-Audit] videoBounds:', videoBounds, 'videoDimensions:', videoDimensions, 'containerSize:', containerSize);

  return { viewportRef, remoteCursors, videoBounds };
}
