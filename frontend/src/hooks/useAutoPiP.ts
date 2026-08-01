import { useEffect, useRef, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { DocumentPipWindow } from '../components/DocumentPipWindow';

interface UseAutoPiPOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isInRoom: boolean;
  isViewing: boolean;
  onLeaveRoom?: () => void;
  displayName?: string;
  hostName?: string;
  roomId?: string;
  isMuted?: boolean;
  onToggleMic?: () => void;
}

export function useAutoPiP({ 
  videoRef, 
  isInRoom, 
  isViewing, 
  onLeaveRoom,
  displayName = 'Viewer',
  hostName = 'Host',
  roomId = '',
  isMuted = true,
  onToggleMic = () => {},
}: UseAutoPiPOptions): void {
  const persistentMicStreamRef = useRef<MediaStream | null>(null);
  const micAcquiredRef = useRef(false);
  const mediaSessionInitializedRef = useRef(false);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const isViewingRef = useRef(false);
  const pipEnteredRef = useRef(false);
  const pipEnterCountRef = useRef(0);
  const handlerInvokedRef = useRef(false);
  const mediaSessionVideoRef = useRef<HTMLVideoElement | null>(null);
  const pipRootRef = useRef<ReturnType<typeof createRoot> | null>(null);
  const pipWindowRef = useRef<Window | null>(null);

  isViewingRef.current = isViewing;

  // ─── Track video element identity on every render ──────────────────────
  if (mediaSessionVideoRef.current) {
    const same = videoRef.current === mediaSessionVideoRef.current;
    console.log(
      `[VideoIdentity] Render check  Media Session init element: ${mediaSessionVideoRef.current.tagName}@${(mediaSessionVideoRef.current as any).__msId || '?'}  current videoRef: ${videoRef.current?.tagName || 'null'}@${(videoRef.current as any)?.__msId || '?'}  identical: ${same}`
    );
  }

  // Keep a stable reference to the video element when it becomes available
  useEffect(() => {
    if (videoRef.current) {
      const prev = videoElementRef.current;
      const curr = videoRef.current;
      if (prev !== curr) {
        if (prev) {
          console.log(`[VideoIdentity] Video element CHANGED  previous: ${prev.tagName}@${(prev as any).__msId || 'noID'}  new: ${curr.tagName}@${(curr as any).__msId || 'noID'}`);
          console.log(`[VideoIdentity] Previous element still in DOM: ${document.contains(prev)}`);
        } else {
          console.log(`[VideoIdentity] Video element ASSIGNED (first time)  element: ${curr.tagName}@${(curr as any).__msId || 'noID'}  inDOM: ${document.contains(curr)}`);
        }
      }
      videoElementRef.current = videoRef.current;
      tryInitMediaSession();
    }
  });

  // ─── Monitor PiP events on the video element ─────────────────────────
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onEnter = () => {
      pipEnteredRef.current = true;
      pipEnterCountRef.current++;
      console.log(`[AutoPiP] PiP entered (count: ${pipEnterCountRef.current})`);
    };
    const onLeave = () => {
      pipEnteredRef.current = false;
      console.log(`[AutoPiP] PiP left (count: ${pipEnterCountRef.current})`);
    };

    el.addEventListener('enterpictureinpicture', onEnter);
    el.addEventListener('leavepictureinpicture', onLeave);
    return () => {
      el.removeEventListener('enterpictureinpicture', onEnter);
      el.removeEventListener('leavepictureinpicture', onLeave);
    };
  }, [videoRef]);

  // ─── Acquire / release persistent microphone ─────────────────────────
  useEffect(() => {
    if (isInRoom) {
      acquirePersistentMic();
    } else {
      releasePersistentMic();
    }
  }, [isInRoom]);

  // ─── Evaluate init when viewing state changes ─────────────────────────
  useEffect(() => {
    console.log('[AutoPiP] isViewing changed, evaluating Media Session init');
    tryInitMediaSession();
  }, [isViewing]);

  // ─── Evaluate init when video gains srcObject ─────────────────────────
  // No deps: re-runs on every render so it can reach a video element that was
  // mounted after the hook's first mount.  Cleanup prevents listener leaks.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (el.srcObject) {
      console.log('[AutoPiP] Video already has srcObject, evaluating Media Session init');
      tryInitMediaSession();
    }

    const onLoaded = () => {
      console.log('[AutoPiP] Video loaded, evaluating Media Session init');
      tryInitMediaSession();
    };

    el.addEventListener('loadedmetadata', onLoaded);
    return () => el.removeEventListener('loadedmetadata', onLoaded);
  });

  // ─── Monitor visibility changes for eligibility snapshot ─────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        logEligibilitySnapshot();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // ─── Re-render PiP root when isMuted changes (mic icon sync) ────────
  useEffect(() => {
    const root = pipRootRef.current;
    const win = pipWindowRef.current;
    if (!root || !win || win.closed) return;

    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (!stream) return;

    console.log(`[AutoPiP] Re-rendering PiP root with isMuted=${isMuted}`);
    root.render(
      createElement(DocumentPipWindow, {
        stream,
        pipWindow: win,
        onLeave: () => {
          onLeaveRoom?.();
          win.close();
        },
        hostName,
        displayName,
        roomId,
        isMuted,
        onToggleMic,
        connected: window.navigator.onLine,
      })
    );
  }, [isMuted]);

  // ─── Cleanup on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (persistentMicStreamRef.current) {
        console.log('[AutoPiP] Cleanup — releasing persistent mic');
        persistentMicStreamRef.current.getTracks().forEach(t => t.stop());
        persistentMicStreamRef.current = null;
        micAcquiredRef.current = false;
      }
      if (mediaSessionInitializedRef.current) {
        console.log('[AutoPiP] Cleanup — clearing Media Session');
        if ('mediaSession' in navigator) {
          try {
            navigator.mediaSession.metadata = null;
            navigator.mediaSession.playbackState = 'none';
          } catch {
            // noop
          }
        }
        mediaSessionInitializedRef.current = false;
      }
    };
  }, []);

  // ─── Internal functions ──────────────────────────────────────────────

  async function acquirePersistentMic(): Promise<void> {
    if (micAcquiredRef.current) {
      console.log('[AutoPiP] Persistent mic already acquired, skipping');
      return;
    }

    try {
      console.log('[AutoPiP] Acquiring persistent microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      persistentMicStreamRef.current = stream;
      micAcquiredRef.current = true;
      const track = stream.getAudioTracks()[0];

      console.log('[AutoPiP] Persistent mic acquired');
      console.log(`  getUserMedia succeeded: true`);
      console.log(`  stream id: ${stream.id}`);
      console.log(`  track id: ${track?.id ?? 'none'}`);
      console.log(`  track.readyState: ${track?.readyState ?? 'none'}`);
      console.log(`  track.enabled: ${track?.enabled ?? 'none'}`);
      console.log(`  track.muted: ${track?.muted ?? 'none'}`);
      console.log(`  stream.active: ${stream.active}`);

      stream.getAudioTracks().forEach(t => (t.enabled = true));

      console.log('[AutoPiP] Persistent mic acquired, evaluating Media Session init');
      tryInitMediaSession();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`[AutoPiP] Persistent mic acquisition FAILED: ${msg}`);
    }
  }

  function releasePersistentMic(): void {
    if (!micAcquiredRef.current) return;
    console.log('[AutoPiP] Releasing persistent microphone');
    if (persistentMicStreamRef.current) {
      persistentMicStreamRef.current.getTracks().forEach(t => t.stop());
      persistentMicStreamRef.current = null;
    }
    micAcquiredRef.current = false;
  }

  function tryInitMediaSession(): void {
    if (mediaSessionInitializedRef.current) {
      console.log('[AutoPiP] Media Session already initialized, skipping');
      return;
    }
    if (!isViewingRef.current) {
      console.log('[AutoPiP] Cannot init Media Session: not viewing');
      return;
    }
    if (!micAcquiredRef.current) {
      console.log('[AutoPiP] Cannot init Media Session: mic not acquired');
      return;
    }
    const video = videoElementRef.current;
    if (!video) {
      console.log('[AutoPiP] Cannot init Media Session: no video element');
      return;
    }
    if (!video.srcObject) {
      console.log('[AutoPiP] Cannot init Media Session: no srcObject');
      return;
    }

    console.log('[AutoPiP] All conditions met, initializing Media Session');
    logRemoteVideoReady(video);
    initMediaSession(video);
  }

  function initMediaSession(videoElement: HTMLVideoElement): void {
    // Match standalone autoInitMediaSession order: srcObject check first
    if (!videoElement.srcObject) {
      console.log('[AutoPiP] ❌ No stream available for Media Session');
      return;
    }

    if (!('mediaSession' in navigator)) {
      console.log('[AutoPiP] ❌ Media Session API not supported');
      return;
    }

    if (mediaSessionInitializedRef.current) {
      console.log('[AutoPiP] Media Session already initialized, skipping');
      return;
    }

    // Tag the video element with a unique ID for identity tracking
    if (!(videoElement as any).__msId) {
      (videoElement as any).__msId = `video_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
    mediaSessionVideoRef.current = videoElement;
    console.log(`[VideoIdentity] Media Session initialized with video element: ${videoElement.tagName}@${(videoElement as any).__msId}`);
    console.log(`[VideoIdentity] videoRef.current === init element: ${videoRef.current === videoElement}`);

    console.log('[AutoPiP] 🔍 Setting up Media Session...');

    // Set metadata with proper InterAct branding (standalone L814-819)
    const metadata = new MediaMetadata({
      title: 'InterAct',
      artist: 'Screen Share',
      album: 'Collaboration',
    });

    navigator.mediaSession.metadata = metadata;

    // Verify metadata was set (standalone L824-827)
    console.log('[AutoPiP] 📋 Metadata assigned:');
    console.log(`   Title: ${navigator.mediaSession.metadata?.title || 'null'}`);
    console.log(`   Artist: ${navigator.mediaSession.metadata?.artist || 'null'}`);
    console.log(`   Album: ${navigator.mediaSession.metadata?.album || 'null'}`);

    // Check initial playback state (standalone L829-830)
    console.log(`[AutoPiP] 🎵 Initial playbackState: ${navigator.mediaSession.playbackState}`);

    // Setup action handlers with logging (standalone L833-857)
    navigator.mediaSession.setActionHandler('play', () => {
      console.log('[AutoPiP] 🎬 Media Session action: PLAY invoked');
      videoElement.play().catch(() => {});
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      console.log('[AutoPiP] ⏸️ Media Session action: PAUSE invoked');
      videoElement.pause();
    });

    // Try to set enterpictureinpicture handler (standalone L845-857)
    try {
      navigator.mediaSession.setActionHandler('enterpictureinpicture' as unknown as MediaSessionAction, async () => {
        handlerInvokedRef.current = true;
        console.log('[AutoPiP] 🎉 Media Session action: ENTERPICTUREINPICTURE invoked!');

        const stream = videoElement.srcObject as MediaStream | null;
        if (!stream) {
          videoElement.requestPictureInPicture().catch(err => {
            console.log(`[AutoPiP] ❌ PiP request failed: ${err.message}`);
          });
          return;
        }

        const dpiP = (window as any).documentPictureInPicture as { requestWindow: (opts: { width: number; height: number }) => Promise<Window> } | undefined;
        if (dpiP) {
          try {
            const pipWindow = await dpiP.requestWindow({
              width: 480,
              height: 420,
            });

            const pipDocument = pipWindow.document;
            const styleEl = pipDocument.createElement('style');
            styleEl.textContent = `
              @import url('https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Inter:wght@100..900&display=swap');
              body { margin: 0; background: #09090b; overflow: hidden; }
              @keyframes pip-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.35; }
              }
            `;
            pipDocument.head.appendChild(styleEl);

            // Track connection state
            const wsConnected = window.navigator.onLine;

            const root = createRoot(pipDocument.body);
            pipRootRef.current = root;
            pipWindowRef.current = pipWindow;
            root.render(
              createElement(DocumentPipWindow, {
                stream,
                pipWindow,
                onLeave: () => {
                  onLeaveRoom?.();
                  pipWindow.close();
                },
                hostName,
                displayName,
                roomId,
                isMuted,
                onToggleMic,
                connected: wsConnected,
              })
            );

            pipWindow.addEventListener('pagehide', () => {
              pipRootRef.current = null;
              pipWindowRef.current = null;
              root.unmount();
            });
          } catch (e) {
            console.log('[AutoPiP] ❌ Document PiP failed, falling back to video PiP:', e);
            videoElement.requestPictureInPicture().catch(err => {
              console.log(`[AutoPiP] ❌ PiP request failed: ${err.message}`);
            });
          }
        } else {
          videoElement.requestPictureInPicture().catch(err => {
            console.log(`[AutoPiP] ❌ PiP request failed: ${err.message}`);
          });
        }
      });
      console.log('[AutoPiP] ✅ enterpictureinpicture handler registered');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`[AutoPiP] ⚠️ Could not register enterpictureinpicture handler: ${msg}`);
    }

    // Ensure video is playing (standalone L859-888)
    videoElement.play().then(() => {
      console.log('[AutoPiP] ▶️ Video playing');

      // Set playback state to "playing" (standalone L863-865)
      navigator.mediaSession.playbackState = 'playing';
      console.log(`[AutoPiP] ✅ playbackState set to: ${navigator.mediaSession.playbackState}`);

      // Verify all Media Session properties (standalone L867-875)
      console.log('[AutoPiP] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[AutoPiP] 📊 Media Session Status Summary:');
      console.log(`   ✓ metadata: ${navigator.mediaSession.metadata ? 'SET' : 'NULL'}`);
      console.log(`   ✓ playbackState: ${navigator.mediaSession.playbackState}`);
      console.log(`   ✓ Video playing: ${!videoElement.paused}`);
      console.log(`   ✓ Video has stream: ${!!videoElement.srcObject}`);
      console.log(`   ✓ Video dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
      console.log('[AutoPiP] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      console.log('[AutoPiP] 🔍 NOW: Switch to another tab to test automatic PiP');
      console.log('[AutoPiP] ⏰ Wait 3-5 seconds after switching tabs...');
      console.log('[AutoPiP] 📋 If Chrome shows auto PiP, you will see "ENTERPICTUREINPICTURE invoked"');

      // Monitor for any changes (standalone L882-884)
      setTimeout(() => {
        console.log(`[AutoPiP] 🔍 5-second check - playbackState: ${navigator.mediaSession.playbackState}, video.paused: ${videoElement.paused}`);
      }, 5000);

    }).catch(err => {
      console.log(`[AutoPiP] ❌ Failed to play video: ${err.message}`);
    });

    mediaSessionInitializedRef.current = true;
  }

  function logRemoteVideoReady(video: HTMLVideoElement): void {
    console.log('[AutoPiP] Remote video ready');
    console.log(`  srcObject exists: ${!!video.srcObject}`);
    console.log(`  paused: ${video.paused}`);
    console.log(`  readyState: ${video.readyState}`);
    console.log(`  videoWidth: ${video.videoWidth}`);
    console.log(`  videoHeight: ${video.videoHeight}`);
  }

  function logEligibilitySnapshot(): void {
    const track = persistentMicStreamRef.current?.getAudioTracks()[0] ?? null;
    const video = videoElementRef.current;

    console.log('========== AutoPiP Eligibility ==========');
    console.log(`isViewing (React state): ${isViewingRef.current}`);
    console.log(``);
    console.log(`--- Microphone ---`);
    console.log(`Mic stream exists: ${!!persistentMicStreamRef.current}`);
    console.log(`Mic track readyState: ${track?.readyState ?? 'no track'}`);
    console.log(`Mic track enabled: ${track?.enabled ?? 'no track'}`);
    console.log(`Mic track muted: ${track?.muted ?? 'no track'}`);
    console.log(`Stream active: ${persistentMicStreamRef.current?.active ?? false}`);
    console.log(``);
    console.log(`--- Media Session ---`);
    console.log(`MediaSession API present: ${'mediaSession' in navigator}`);
    console.log(`MediaSession playbackState: ${'mediaSession' in navigator ? navigator.mediaSession.playbackState : 'N/A'}`);
    console.log(`MediaSession metadata: ${'mediaSession' in navigator && !!navigator.mediaSession.metadata}`);
    console.log(`enterpictureinpicture handler registered: ${mediaSessionInitializedRef.current}`);
    console.log(`Handler has been invoked before: ${handlerInvokedRef.current}`);
    console.log(`PiP enter count (this session): ${pipEnterCountRef.current}`);
    console.log(`PiP currently active: ${pipEnteredRef.current}`);
    console.log(`document.pictureInPictureElement: ${document.pictureInPictureElement?.id ?? 'null'}`);
    console.log(``);
    console.log(`--- Remote Video ---`);
    console.log(`Video element exists: ${!!video}`);
    console.log(`Video paused: ${video?.paused ?? 'no video'}`);
    console.log(`Video readyState: ${video?.readyState ?? 'no video'}`);
    console.log(`Video srcObject: ${!!video?.srcObject}`);
    console.log(`Video dimensions: ${video ? `${video.videoWidth}x${video.videoHeight}` : 'no video'}`);
    console.log(`document.pictureInPictureEnabled: ${document.pictureInPictureEnabled}`);
    console.log('=========================================');
  }
}
