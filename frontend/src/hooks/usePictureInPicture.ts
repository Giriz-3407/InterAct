import { useEffect, useRef, useCallback, useState } from 'react';

interface UsePictureInPictureOptions {
  /** The video ref to use for PiP */
  videoRef: React.RefObject<HTMLVideoElement>;
  /** Whether the user is currently viewing a stream */
  isViewing: boolean;
  /** Whether the user is in an active room */
  isInRoom: boolean;
  /** Optional callback when PiP is entered */
  onEnterPiP?: () => void;
  /** Optional callback when PiP is exited */
  onExitPiP?: () => void;
}

interface UsePictureInPictureReturn {
  /** Whether PiP is currently active */
  isPiPActive: boolean;
  /** Whether PiP is supported by the browser */
  isPiPSupported: boolean;
  /** Manually enter PiP mode */
  enterPiP: () => Promise<void>;
  /** Manually exit PiP mode */
  exitPiP: () => Promise<void>;
}

/**
 * Custom hook for managing Picture-in-Picture functionality.
 * 
 * Automatically enters PiP when:
 * - Tab becomes hidden (document.visibilityState === 'hidden')
 * - User is in an active room
 * - A video stream is available
 * 
 * Automatically exits PiP when:
 * - Tab becomes visible again
 * - Stream ends
 * - User leaves the room
 */
export function usePictureInPicture({
  videoRef,
  isViewing,
  isInRoom,
  onEnterPiP,
  onExitPiP,
}: UsePictureInPictureOptions): UsePictureInPictureReturn {
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  const userClosedPiPRef = useRef(false);
  const wasHiddenRef = useRef(false);
  const pipWindowRef = useRef<PictureInPictureWindow | null>(null);

  // Check PiP support on mount
  useEffect(() => {
    const supported = 
      document.pictureInPictureEnabled && 
      'requestPictureInPicture' in HTMLVideoElement.prototype;
    setIsPiPSupported(supported);
    
    if (!supported) {
      console.log('[PiP] Picture-in-Picture is not supported in this browser');
    } else {
      console.log('[PiP] Picture-in-Picture is supported');
    }
  }, []);

  // Enter PiP mode
  const enterPiP = useCallback(async () => {
    const videoElement = videoRef.current;
    if (!isPiPSupported || !videoElement) {
      console.warn('[PiP] Cannot enter PiP: not supported or video element unavailable');
      return;
    }

    // Check if already in PiP
    if (document.pictureInPictureElement === videoElement) {
      console.log('[PiP] Already in Picture-in-Picture mode');
      return;
    }

    // Ensure video has valid src
    if (!videoElement.srcObject) {
      console.warn('[PiP] Cannot enter PiP: video element has no source');
      return;
    }

    try {
      console.log('[PiP] Entering Picture-in-Picture mode');
      const pipWindow = await videoElement.requestPictureInPicture();
      pipWindowRef.current = pipWindow;
      setIsPiPActive(true);
      userClosedPiPRef.current = false;
      onEnterPiP?.();
    } catch (error) {
      console.error('[PiP] Failed to enter Picture-in-Picture:', error);
      // Fail gracefully - don't throw error to user
    }
  }, [isPiPSupported, videoRef, onEnterPiP]);

  // Exit PiP mode
  const exitPiP = useCallback(async () => {
    if (!document.pictureInPictureElement) {
      return;
    }

    try {
      console.log('[PiP] Exiting Picture-in-Picture mode');
      await document.exitPictureInPicture();
      pipWindowRef.current = null;
      setIsPiPActive(false);
      onExitPiP?.();
    } catch (error) {
      console.error('[PiP] Failed to exit Picture-in-Picture:', error);
    }
  }, [onExitPiP]);

  // Listen for PiP events from the video element
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleEnterPiP = () => {
      console.log('[PiP] Entered Picture-in-Picture (event)');
      setIsPiPActive(true);
    };

    const handleLeavePiP = () => {
      console.log('[PiP] Left Picture-in-Picture (event)');
      setIsPiPActive(false);
      pipWindowRef.current = null;
      
      // If PiP was closed while tab is still hidden, mark as user-closed
      if (document.visibilityState === 'hidden') {
        console.log('[PiP] User manually closed PiP while tab hidden');
        userClosedPiPRef.current = true;
      }
      
      onExitPiP?.();
    };

    videoElement.addEventListener('enterpictureinpicture', handleEnterPiP);
    videoElement.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      videoElement.removeEventListener('enterpictureinpicture', handleEnterPiP);
      videoElement.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, [videoRef, onEnterPiP, onExitPiP]);

  // Auto-enter PiP when tab becomes hidden
  useEffect(() => {
    if (!isPiPSupported) return;

    const handleVisibilityChange = () => {
      const isHidden = document.visibilityState === 'hidden';
      const becameHidden = isHidden && !wasHiddenRef.current;
      const becameVisible = !isHidden && wasHiddenRef.current;
      wasHiddenRef.current = isHidden;

      // Tab became hidden: auto-enter PiP if conditions are met
      if (becameHidden) {
        console.log('[PiP] Tab became hidden');
        
        const videoElement = videoRef.current;
        const state = {
          isInRoom,
          isViewing,
          videoElementExists: videoElement !== null,
          readyState: videoElement?.readyState ?? null,
          paused: videoElement?.paused ?? null,
          hasSrcObject: videoElement?.srcObject !== null && videoElement?.srcObject !== undefined,
          userClosedPiP: userClosedPiPRef.current,
        };
        console.log('[PiP] Guard state:', JSON.stringify(state));

        if (isInRoom && isViewing && videoElement && !userClosedPiPRef.current) {
          console.log('[PiP] Calling enterPiP()');
          void enterPiP();
        } else {
          const reasons: string[] = [];
          if (!isInRoom) reasons.push('!isInRoom');
          if (!isViewing) reasons.push('!isViewing');
          if (!videoElement) reasons.push('!videoElement');
          if (userClosedPiPRef.current) reasons.push('userClosedPiP');
          console.log(`[PiP] Skipped because ${reasons.join(', ')}`);
        }
      }

      // Tab became visible: auto-exit PiP
      if (becameVisible) {
        console.log('[PiP] Tab became visible');
        if (isPiPActive) {
          console.log('[PiP] Auto-exiting PiP (tab visible)');
          void exitPiP();
        }
        // Reset user-closed flag when returning to tab
        userClosedPiPRef.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPiPSupported, isInRoom, isViewing, videoRef, isPiPActive, enterPiP, exitPiP]);

  // Auto-exit PiP when stream ends or user leaves room
  useEffect(() => {
    if (isPiPActive && (!isViewing || !isInRoom)) {
      console.log('[PiP] Stream ended or left room - exiting PiP');
      void exitPiP();
    }
  }, [isPiPActive, isViewing, isInRoom, exitPiP]);

  // Auto-exit PiP when video source is removed
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const checkVideoSource = () => {
      if (isPiPActive && !videoElement.srcObject) {
        console.log('[PiP] Video source removed - exiting PiP');
        void exitPiP();
      }
    };

    // Check periodically (stream might end without proper event)
    const interval = setInterval(checkVideoSource, 1000);

    return () => clearInterval(interval);
  }, [videoRef, isPiPActive, exitPiP]);

  return {
    isPiPActive,
    isPiPSupported,
    enterPiP,
    exitPiP,
  };
}
