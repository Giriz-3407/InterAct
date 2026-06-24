import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechRecognitionProps {
  onTranscriptUpdate: (text: string, isFinal: boolean) => void;
}

export interface DiagEntry {
  name: string;
  ts: number;
  elapsed: string;
  extra?: string;
}

export const useSpeechRecognition = ({ onTranscriptUpdate }: UseSpeechRecognitionProps) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagLogs, setDiagLogs] = useState<DiagEntry[]>([]);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const onTranscriptUpdateRef = useRef(onTranscriptUpdate);
  onTranscriptUpdateRef.current = onTranscriptUpdate;

  const startTimeRef = useRef(0);

  const diag = useCallback((name: string, extra?: string) => {
    const elapsed = startTimeRef.current ? `+${(Date.now() - startTimeRef.current).toFixed(0)}ms` : 'N/A';
    const entry: DiagEntry = { name, ts: Date.now(), elapsed, extra };
    setDiagLogs(prev => [...prev.slice(-199), entry]);
    console.log(`[SR DIAG] ${name} | ts=${Date.now()} | elapsed=${elapsed}${extra ? ` | ${extra}` : ''}`);
  }, []);

  const clearDiagLogs = useCallback(() => {
    setDiagLogs([]);
  }, []);

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

    rec.onstart = () => {
      diag('onstart');
    };

    rec.onaudiostart = () => {
      diag('onaudiostart');
    };

    rec.onspeechstart = () => {
      diag('onspeechstart');
    };

    rec.onspeechend = () => {
      diag('onspeechend');
    };

    rec.onresult = (event: any) => {
      diag('onresult', `resultIndex=${event.resultIndex} results.length=${event.results.length} isFinal=${event.results[event.resultIndex]?.isFinal}`);
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

      if (finalTranscript.trim()) {
        onTranscriptUpdateRef.current(finalTranscript.trim(), true);
      }
      
      if (interimTranscript.trim()) {
        onTranscriptUpdateRef.current(interimTranscript.trim(), false);
      }
    };

    rec.onerror = (event: any) => {
      diag('onerror', `code=${event.error} message=${event.message || ''}`);
      if (event.error === 'not-allowed') {
        setError('Microphone permission denied.');
      } else if (event.error === 'network') {
        setError('Network error during transcription.');
      } else {
        setError(`Transcription error: ${event.error}`);
      }
    };

    rec.onend = () => {
      diag('onend', `isListeningRef=${isListeningRef.current} isMobile=${isMobile()}`);
      if (isListeningRef.current) {
        if (isMobile()) {
          diag('onend->PAUSED (mobile path)');
          setIsPaused(true);
          setIsListening(false);
          isListeningRef.current = false;
        } else {
          diag('onend->RESTART (desktop path)');
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error('Failed to restart recognition:', e);
          }
        }
      } else {
        diag('onend->STOPPED (isListeningRef is false)');
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
    diag('start() called');
    setError(null);
    setIsPaused(false);

    const rec = initRecognition();
    if (!rec) {
      setError('Speech recognition not supported in this browser.');
      return;
    }

    startTimeRef.current = Date.now();
    try {
      rec.start();
      setIsListening(true);
      isListeningRef.current = true;
      diag('rec.start() succeeded');
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      diag('rec.start() FAILED', `error=${e}`);
    }
  }, [initRecognition, diag]);

  const stop = useCallback(() => {
    diag('stop() called by consumer');
    setIsListening(false);
    setIsPaused(false);
    isListeningRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        diag('rec.stop() called');
      } catch (e) {
        console.error('Failed to stop speech recognition:', e);
        diag('rec.stop() FAILED', `error=${e}`);
      }
    }
  }, [diag]);

  const resume = useCallback(() => {
    diag('resume() called');
    start();
  }, [start, diag]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      diag('CLEANUP (unmount) aborting');
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
          diag('rec.abort() called');
        } catch (e) {
          diag('rec.abort() FAILED', `error=${e}`);
        }
      }
    };
  }, [diag]);

  return {
    isSupported,
    isListening,
    isPaused,
    error,
    start,
    stop,
    resume,
    diagLogs,
    clearDiagLogs,
  };
};
