import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechRecognitionProps {
  onTranscriptUpdate: (text: string, isFinal: boolean) => void;
}

export const useSpeechRecognition = ({ onTranscriptUpdate }: UseSpeechRecognitionProps) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const onTranscriptUpdateRef = useRef(onTranscriptUpdate);
  onTranscriptUpdateRef.current = onTranscriptUpdate;

  // Simple mobile detection
  const isMobile = useCallback(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }, []);

  // Check support on mount
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  // Initialize Speech Recognition
  const initRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }

      // If we have a final transcript segment, send it as final
      if (finalTranscript.trim()) {
        onTranscriptUpdateRef.current(finalTranscript.trim(), true);
      }
      
      // If we have an interim transcript, send it as interim
      if (interimTranscript.trim()) {
        onTranscriptUpdateRef.current(interimTranscript.trim(), false);
      }
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone permission denied.');
      } else if (event.error === 'network') {
        setError('Network error during transcription.');
      } else {
        setError(`Transcription error: ${event.error}`);
      }
    };

    rec.onend = () => {
      // If we are supposed to be listening but the API stopped
      if (isListeningRef.current) {
        if (isMobile()) {
          // On mobile: go to paused state and wait for tap-to-resume
          setIsPaused(true);
          setIsListening(false);
          isListeningRef.current = false;
        } else {
          // On desktop: attempt automatic restart to keep transcription continuous
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error('Failed to restart recognition:', e);
          }
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = rec;
    return rec;
  }, [isMobile]);

  // Eagerly create the SpeechRecognition instance on mount so start() is faster
  useEffect(() => {
    initRecognition();
  }, [initRecognition]);

  const start = useCallback(() => {
    setError(null);
    setIsPaused(false);

    const rec = initRecognition();
    if (!rec) {
      setError('Speech recognition not supported in this browser.');
      return;
    }

    try {
      rec.start();
      setIsListening(true);
      isListeningRef.current = true;
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
    }
  }, [initRecognition]);

  const stop = useCallback(() => {
    setIsListening(false);
    setIsPaused(false);
    isListeningRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Failed to stop speech recognition:', e);
      }
    }
  }, []);

  const resume = useCallback(() => {
    start();
  }, [start]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore abort errors
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    isPaused,
    error,
    start,
    stop,
    resume,
  };
};
