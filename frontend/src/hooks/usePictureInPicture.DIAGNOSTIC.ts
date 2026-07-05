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
 * DIAGNOSTIC VERSION - Custom hook for managing Picture-in-Picture functionality.
 * 
 * This version includes comprehensive logging for root-cause investigation.
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
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 [PiP DIAGNOSTIC] Checking browser support...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 1. Is the browser actually reporting document.pictureInPictureEnabled === true?
    const pipEnabled = document.pictureInPictureEnabled;
    console.log('✓ CHECK #1: document.pictureInPictureEnabled =', pipEnabled);
    
    const pipInPrototype = 'requestPictureInPicture' in HTMLVideoElement.prototype;
    console.log('✓ CHECK #1b: requestPictureInPicture in HTMLVideoElement.prototype =', pipInPrototype);
    
    const supported = pipEnabled && pipInPrototype;
    setIsPiPSupported(supported);
    
    if (!supported) {
      console.error('❌ [PiP DIAGNOSTIC] Picture-in-Picture is NOT SUPPORTED');
      console.log('  → pipEnabled:', pipEnabled);
      console.log('  → pipInPrototype:', pipInPrototype);
    } else {
      console.log('✅ [PiP DIAGNOSTIC] Picture-in-Picture IS SUPPORTED');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }, []);

  // Enter PiP mode
  const enterPiP = useCallback(async () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 [PiP DIAGNOSTIC] enterPiP() CALLED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 6. Is requestPictureInPicture() ever being called?
    console.log('✓ CHECK #6: enterPiP() function was invoked');
    
    const videoElement = videoRef.current;
    
    // 3. Does videoRef.current exist at the moment auto-PiP is triggered?
    console.log('✓ CHECK #3: videoRef.current exists =', !!videoElement);
    if (!videoElement) {
      console.error('❌ FAILURE: videoRef.current is null/undefined');
      console.log('  → Cannot proceed without video element');
      return;
    }
    
    // 2. Is the video element the one actually rendering the remote stream?
    console.log('✓ CHECK #2: Video element tag name =', videoElement.tagName);
    console.log('  → Video element class =', videoElement.className);
    console.log('  → Video element id =', videoElement.id || '(none)');
    
    if (!isPiPSupported) {
      console.error('❌ FAILURE: PiP not supported');
      console.log('  → isPiPSupported =', isPiPSupported);
      return;
    }

    // 14. Is there already an active Picture-in-Picture element?
    const existingPiPElement = document.pictureInPictureElement;
    console.log('✓ CHECK #14: document.pictureInPictureElement =', existingPiPElement);
    
    if (existingPiPElement === videoElement) {
      console.warn('⚠️  ALREADY IN PIP: This video is already in Picture-in-Picture mode');
      return;
    }
    
    if (existingPiPElement) {
      console.warn('⚠️  ANOTHER PIP ACTIVE: Different element is in PiP:', existingPiPElement);
      console.log('  → Will attempt to replace it');
    }

    // 12. Is the remote stream using a MediaStream attached via srcObject (required)?
    const srcObject = videoElement.srcObject;
    console.log('✓ CHECK #12: videoElement.srcObject =', srcObject);
    console.log('  → srcObject type =', srcObject?.constructor?.name || 'null');
    
    if (!srcObject) {
      console.error('❌ FAILURE: Video element has no srcObject (MediaStream required)');
      return;
    }
    
    if (srcObject instanceof MediaStream) {
      const tracks = srcObject.getTracks();
      console.log('  → MediaStream tracks:', tracks.length);
      tracks.forEach((track, i) => {
        console.log(`    Track ${i}: ${track.kind} - ${track.label} (enabled: ${track.enabled}, muted: ${track.muted}, readyState: ${track.readyState})`);
      });
    }

    // 4. Does videoRef.current.readyState indicate that video playback has started?
    const readyState = videoElement.readyState;
    console.log('✓ CHECK #4: videoElement.readyState =', readyState);
    console.log('  → Meaning:', {
      0: 'HAVE_NOTHING',
      1: 'HAVE_METADATA',
      2: 'HAVE_CURRENT_DATA',
      3: 'HAVE_FUTURE_DATA',
      4: 'HAVE_ENOUGH_DATA'
    }[readyState]);
    
    if (readyState < 2) {
      console.warn('⚠️  WARNING: Video readyState is low (not enough data yet)');
    }

    // 5. Is the video actually playing (not paused)?
    const isPaused = videoElement.paused;
    const isEnded = videoElement.ended;
    console.log('✓ CHECK #5: Video playing status:');
    console.log('  → paused =', isPaused);
    console.log('  → ended =', isEnded);
    console.log('  → currentTime =', videoElement.currentTime);
    console.log('  → duration =', videoElement.duration);
    
    if (isPaused) {
      console.warn('⚠️  WARNING: Video is paused - PiP may fail');
    }
    if (isEnded) {
      console.error('❌ FAILURE: Video has ended');
      return;
    }

    // Additional video element state
    console.log('📊 Additional video element state:');
    console.log('  → videoWidth =', videoElement.videoWidth);
    console.log('  → videoHeight =', videoElement.videoHeight);
    console.log('  → muted =', videoElement.muted);
    console.log('  → volume =', videoElement.volume);
    console.log('  → autoplay =', videoElement.autoplay);
    console.log('  → playsInline =', videoElement.playsInline);

    // 13. Is any fullscreen logic interfering with PiP?
    const isFullscreen = !!document.fullscreenElement;
    console.log('✓ CHECK #13: Fullscreen active =', isFullscreen);
    if (isFullscreen) {
      console.log('  → Fullscreen element =', document.fullscreenElement);
    }

    // Additional comprehensive state check before API call
    console.log('\n📸 COMPLETE VIDEO STATE SNAPSHOT (immediately before API call):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('document.pictureInPictureElement:', document.pictureInPictureElement);
    console.log('video.disablePictureInPicture:', videoElement.disablePictureInPicture);
    console.log('video.disableRemotePlayback:', videoElement.disableRemotePlayback);
    console.log('video.readyState:', videoElement.readyState, '→', {
      0: 'HAVE_NOTHING',
      1: 'HAVE_METADATA',
      2: 'HAVE_CURRENT_DATA',
      3: 'HAVE_FUTURE_DATA',
      4: 'HAVE_ENOUGH_DATA'
    }[videoElement.readyState]);
    console.log('video.networkState:', videoElement.networkState, '→', {
      0: 'NETWORK_EMPTY',
      1: 'NETWORK_IDLE',
      2: 'NETWORK_LOADING',
      3: 'NETWORK_NO_SOURCE'
    }[videoElement.networkState]);
    console.log('video.paused:', videoElement.paused);
    console.log('video.ended:', videoElement.ended);
    console.log('video.currentTime:', videoElement.currentTime);
    console.log('video.srcObject:', videoElement.srcObject);
    console.log('video.videoWidth:', videoElement.videoWidth);
    console.log('video.videoHeight:', videoElement.videoHeight);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      console.log('\n🎬 ATTEMPTING: videoElement.requestPictureInPicture()...');
      
      // 6. Is requestPictureInPicture() ever being called?
      console.log('✓ CHECK #6: About to call requestPictureInPicture()');
      
      const pipWindow = await videoElement.requestPictureInPicture();
      
      console.log('✅ SUCCESS: Entered Picture-in-Picture mode!');
      console.log('  → PiP window:', pipWindow);
      console.log('  → PiP window width:', pipWindow.width);
      console.log('  → PiP window height:', pipWindow.height);
      
      pipWindowRef.current = pipWindow;
      setIsPiPActive(true);
      userClosedPiPRef.current = false;
      onEnterPiP?.();
      
    } catch (error) {
      // 7. If it is called, does it reject? Log the exact exception.
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ CHECK #7: requestPictureInPicture() REJECTED');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Error object:', error);
      console.error('  → Error name:', (error as Error).name);
      console.error('  → Error message:', (error as Error).message);
      console.error('  → Error stack:', (error as Error).stack);
      
      // 11. Is the browser rejecting PiP because of a user-gesture requirement?
      if ((error as Error).name === 'NotAllowedError') {
        console.error('❌ CHECK #11: NotAllowedError - USER GESTURE REQUIRED');
        console.error('  → PiP requires user interaction (click, tap, etc.)');
        console.error('  → Auto-trigger from visibility change may not count as user gesture');
      } else if ((error as Error).name === 'InvalidStateError') {
        console.error('  → InvalidStateError - Video element is in invalid state');
      } else if ((error as Error).name === 'NotSupportedError') {
        console.error('  → NotSupportedError - Feature not supported');
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }, [isPiPSupported, videoRef, onEnterPiP]);

  // Exit PiP mode
  const exitPiP = useCallback(async () => {
    console.log('\n🛑 [PiP DIAGNOSTIC] exitPiP() CALLED');
    
    if (!document.pictureInPictureElement) {
      console.log('  → No PiP element active, nothing to exit');
      return;
    }

    try {
      console.log('  → Calling document.exitPictureInPicture()...');
      await document.exitPictureInPicture();
      pipWindowRef.current = null;
      setIsPiPActive(false);
      console.log('✅ Exited Picture-in-Picture mode');
      onExitPiP?.();
    } catch (error) {
      console.error('❌ Failed to exit Picture-in-Picture:', error);
      console.error('  → Error:', (error as Error).message);
    }
  }, [onExitPiP]);

  // Listen for PiP events from the video element
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleEnterPiP = () => {
      console.log('🎯 [PiP EVENT] enterpictureinpicture fired');
      setIsPiPActive(true);
    };

    const handleLeavePiP = () => {
      console.log('🎯 [PiP EVENT] leavepictureinpicture fired');
      console.log('  → Document visibility:', document.visibilityState);
      setIsPiPActive(false);
      pipWindowRef.current = null;
      
      // If PiP was closed while tab is still hidden, mark as user-closed
      if (document.visibilityState === 'hidden') {
        console.log('  → User manually closed PiP while tab hidden');
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

      // 8. Is the Page Visibility API event actually firing?
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('👁️  [PiP DIAGNOSTIC] visibilitychange event fired');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✓ CHECK #8: Page Visibility API is working');
      console.log('  → document.visibilityState =', document.visibilityState);
      console.log('  → isHidden =', isHidden);
      console.log('  → becameHidden =', becameHidden);
      console.log('  → becameVisible =', becameVisible);
      console.log('  → wasHiddenRef.current =', wasHiddenRef.current);

      // Tab became hidden: auto-enter PiP if conditions are met
      if (becameHidden) {
        console.log('\n📱 Tab became hidden - checking conditions for auto-PiP...');
        
        const videoElement = videoRef.current;
        
        // 9. Is the auto-trigger condition ever becoming true?
        // 10. Is another condition preventing enterPiP() from executing?
        console.log('✓ CHECK #9 & #10: Evaluating auto-trigger conditions:');
        console.log('  → isInRoom =', isInRoom, isInRoom ? '✅' : '❌');
        console.log('  → isViewing =', isViewing, isViewing ? '✅' : '❌');
        console.log('  → videoElement exists =', !!videoElement, !!videoElement ? '✅' : '❌');
        console.log('  → userClosedPiPRef.current =', userClosedPiPRef.current, !userClosedPiPRef.current ? '✅' : '❌ (user previously closed)');
        
        const allConditionsMet = isInRoom && isViewing && videoElement && !userClosedPiPRef.current;
        console.log('  → ALL CONDITIONS MET =', allConditionsMet ? '✅ YES' : '❌ NO');
        
        if (allConditionsMet) {
          console.log('✅ Conditions satisfied - calling enterPiP()...');
          void enterPiP();
        } else {
          console.warn('❌ Conditions NOT satisfied - auto-PiP will NOT trigger');
          if (!isInRoom) console.log('  → Blocked: Not in room');
          if (!isViewing) console.log('  → Blocked: Not viewing stream');
          if (!videoElement) console.log('  → Blocked: Video element not available');
          if (userClosedPiPRef.current) console.log('  → Blocked: User previously closed PiP');
        }
      }

      // Tab became visible: auto-exit PiP
      if (becameVisible) {
        console.log('\n🔆 Tab became visible');
        console.log('  → isPiPActive =', isPiPActive);
        
        if (isPiPActive) {
          console.log('  → Auto-exiting PiP...');
          void exitPiP();
        }
        
        // Reset user-closed flag when returning to tab
        console.log('  → Resetting userClosedPiPRef to false');
        userClosedPiPRef.current = false;
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPiPSupported, isInRoom, isViewing, videoRef, isPiPActive, enterPiP, exitPiP]);

  // Auto-exit PiP when stream ends or user leaves room
  useEffect(() => {
    if (isPiPActive && (!isViewing || !isInRoom)) {
      console.log('🔴 [PiP DIAGNOSTIC] Stream ended or left room - exiting PiP');
      console.log('  → isViewing =', isViewing);
      console.log('  → isInRoom =', isInRoom);
      void exitPiP();
    }
  }, [isPiPActive, isViewing, isInRoom, exitPiP]);

  // Auto-exit PiP when video source is removed
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const checkVideoSource = () => {
      if (isPiPActive && !videoElement.srcObject) {
        console.log('🔴 [PiP DIAGNOSTIC] Video source removed - exiting PiP');
        void exitPiP();
      }
    };

    // Check periodically (stream might end without proper event)
    const interval = setInterval(checkVideoSource, 1000);

    return () => clearInterval(interval);
  }, [videoRef, isPiPActive, exitPiP]);

  // Log manual button usage
  useEffect(() => {
    if (isPiPSupported) {
      console.log('\n📋 [PiP DIAGNOSTIC] Hook state summary:');
      console.log('  → isPiPSupported =', isPiPSupported);
      console.log('  → isPiPActive =', isPiPActive);
      console.log('  → isInRoom =', isInRoom);
      console.log('  → isViewing =', isViewing);
      console.log('  → enterPiP function available =', typeof enterPiP === 'function');
      console.log('  → exitPiP function available =', typeof exitPiP === 'function');
      
      // 15. Is the More menu's manual PiP button working? If not, why?
      console.log('\n✓ CHECK #15: Manual PiP button debugging:');
      console.log('  → Button should be visible when:');
      console.log('    • isViewing = true (currently:', isViewing, ')');
      console.log('    • isPiPSupported = true (currently:', isPiPSupported, ')');
      console.log('    • isPiPActive = false (currently:', isPiPActive, ')');
      console.log('  → Button should call enterPiP() when clicked');
      console.log('  → Try clicking the More menu and selecting "Picture-in-Picture"');
    }
  }, [isPiPSupported, isPiPActive, isInRoom, isViewing, enterPiP, exitPiP]);

  return {
    isPiPActive,
    isPiPSupported,
    enterPiP,
    exitPiP,
  };
}
