import { useEffect, useRef, useCallback, useState } from 'react';
import { documentPipService } from '../services/documentPipService';

interface UseDocumentPipOptions {
  /** The video ref containing the shared screen/video */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Whether the user is currently viewing a stream */
  isViewing: boolean;
  /** Whether the user is in an active room */
  isInRoom: boolean;
  /** Optional callback when PiP is entered */
  onEnterPiP?: () => void;
  /** Optional callback when PiP is exited */
  onExitPiP?: () => void;
}

interface UseDocumentPipReturn {
  /** Whether PiP is currently active */
  isPiPActive: boolean;
  /** Whether Document PiP is supported by the browser */
  isPiPSupported: boolean;
  /** Manually enter PiP mode */
  enterPiP: () => Promise<void>;
  /** Manually exit PiP mode */
  exitPiP: () => void;
}

/**
 * Custom hook for managing Document Picture-in-Picture functionality.
 * 
 * Manual PiP only — opened only via explicit user action (button click).
 * No automatic behavior on visibilitychange or tab switch.
 * 
 * Automatically exits PiP when:
 * - Stream ends
 * - User leaves the room
 * - Video source is removed
 * 
 * Never allows multiple PiP windows to exist simultaneously.
 */
export function useDocumentPip({
  videoRef,
  isViewing,
  isInRoom,
  onEnterPiP,
  onExitPiP,
}: UseDocumentPipOptions): UseDocumentPipReturn {
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  const userClosedPiPRef = useRef(false);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check Document PiP support on mount
  useEffect(() => {
    const supported = documentPipService.isSupported();
    setIsPiPSupported(supported);
    
    if (!supported) {
      void 0 && console.log('[DocPiP] Document Picture-in-Picture is not supported in this browser');
    } else {
      void 0 && console.log('[DocPiP] Document Picture-in-Picture is supported');
    }
  }, []);

  // Enter PiP mode
  const enterPiP = useCallback(async () => {
    const videoElement = videoRef.current;
    if (!isPiPSupported || !videoElement) {
      void 0 && console.warn('[DocPiP] Cannot enter PiP: not supported or video element unavailable');
      return;
    }

    // Check if already in PiP
    if (documentPipService.isActive()) {
      void 0 && console.log('[DocPiP] Already in Picture-in-Picture mode');
      return;
    }

    // Ensure video has valid src
    if (!videoElement.srcObject) {
      void 0 && console.warn('[DocPiP] Cannot enter PiP: video element has no source');
      return;
    }

    try {
      void 0 && console.log('[DocPiP] Entering Document Picture-in-Picture mode');
      
      const success = await documentPipService.open({
        videoElement,
        onReturnToApp: () => {
          // Focus the original tab/window
          window.focus();
        },
        onClose: () => {
          setIsPiPActive(false);
          
          // If PiP was closed while tab is still hidden, mark as user-closed
          if (document.visibilityState === 'hidden') {
            void 0 && console.log('[DocPiP] User manually closed PiP while tab hidden');
            userClosedPiPRef.current = true;
          }
          
          onExitPiP?.();
        },
      });

      if (success) {
        setIsPiPActive(true);
        userClosedPiPRef.current = false;
        onEnterPiP?.();
      }
    } catch (error) {
      console.error('[DocPiP] Failed to enter Picture-in-Picture:', error);
      // Fail gracefully - don't throw error to user
    }
  }, [isPiPSupported, videoRef, onEnterPiP, onExitPiP]);

  // Exit PiP mode
  const exitPiP = useCallback(() => {
    if (!documentPipService.isActive()) {
      return;
    }

    void 0 && console.log('[DocPiP] Exiting Document Picture-in-Picture mode');
    documentPipService.close();
    setIsPiPActive(false);
    onExitPiP?.();
  }, [onExitPiP]);

  // Auto-exit PiP when stream ends or user leaves room
  useEffect(() => {
    if (documentPipService.isActive() && (!isViewing || !isInRoom)) {
      void 0 && console.log('[DocPiP] Stream ended or left room - exiting PiP');
      exitPiP();
    }
  }, [isViewing, isInRoom, exitPiP]);

  // Monitor PiP window state and sync with React state
  useEffect(() => {
    if (!isPiPSupported) return;

    // Poll to check if PiP window is still open
    checkIntervalRef.current = setInterval(() => {
      const isActive = documentPipService.isActive();
      
      // Sync state if mismatch detected
      if (isActive !== isPiPActive) {
        setIsPiPActive(isActive);
      }
    }, 500);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [isPiPSupported, isPiPActive]);

  // Auto-exit PiP when video source is removed
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const checkVideoSource = () => {
      if (documentPipService.isActive() && !videoElement.srcObject) {
        void 0 && console.log('[DocPiP] Video source removed - exiting PiP');
        exitPiP();
      }
    };

    // Check periodically (stream might end without proper event)
    const interval = setInterval(checkVideoSource, 1000);

    return () => clearInterval(interval);
  }, [videoRef, exitPiP]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (documentPipService.isActive()) {
        void 0 && console.log('[DocPiP] Component unmounting - closing PiP');
        documentPipService.close();
      }
    };
  }, []);

  return {
    isPiPActive,
    isPiPSupported,
    enterPiP,
    exitPiP,
  };
}
