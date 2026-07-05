import { useState, useEffect, useRef, useCallback } from 'react';

export interface DiagEntry {
  name: string;
  ts: number;
  elapsed: string;
  extra?: string;
}

interface UseLiveTranscriptionProps {
  roomCode: string;
  socketId: string;
  micStream: MediaStream | null;
}

export const useLiveTranscription = ({
  roomCode,
  socketId,
  micStream,
}: UseLiveTranscriptionProps) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagLogs, setDiagLogs] = useState<DiagEntry[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const startTimeRef = useRef<number>(0);
  const shouldStartRef = useRef(false);

  const diag = useCallback((name: string, extra?: string) => {
    const elapsed = startTimeRef.current
      ? `+${(Date.now() - startTimeRef.current).toFixed(0)}ms`
      : 'N/A';
    const entry: DiagEntry = { name, ts: Date.now(), elapsed, extra };
    setDiagLogs((prev) => [...prev.slice(-199), entry]);
    void 0 && console.log(
      `[TRANSCRIPTION DIAG] ${name} | ts=${Date.now()} | elapsed=${elapsed}${
        extra ? ` | ${extra}` : ''
      }`
    );
  }, []);

  const clearDiagLogs = useCallback(() => {
    setDiagLogs([]);
  }, []);

  const getSupportedMimeType = useCallback(() => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      'audio/aac',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }, []);

  const stop = useCallback(() => {
    diag('stop() called');
    shouldStartRef.current = false;
    setIsListening(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        diag('mediaRecorder.stop() called');
      } catch (e) {
        console.error('Failed to stop MediaRecorder:', e);
      }
      mediaRecorderRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
        diag('audio websocket.close() called');
      } catch (e) {
        console.error('Failed to close audio WebSocket:', e);
      }
      wsRef.current = null;
    }
  }, [diag]);

  const start = useCallback(() => {
    diag('start() called');
    setError(null);
    shouldStartRef.current = true;

    if (!roomCode || !socketId) {
      diag('start() deferred', 'Waiting for roomCode and socketId to be ready');
      return;
    }

    if (!micStream) {
      diag('start() deferred', 'Waiting for microphone stream');
      return;
    }

    if (wsRef.current || mediaRecorderRef.current) {
      diag('start() bypassed', 'WebSocket or MediaRecorder already exists');
      return;
    }

    startTimeRef.current = Date.now();
    diag('ws_connecting', `room=${roomCode} socketId=${socketId}`);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    let wsUrl = apiUrl.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
    wsUrl = `${wsUrl.replace(/\/$/, '')}/ws/audio?roomCode=${roomCode}&socketId=${socketId}`;
    diag('ws_url', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        diag('ws_connected');
        if (!micStream || !shouldStartRef.current) {
          diag('ws_connected -> aborted', 'micStream gone or stopped in interim');
          stop();
          return;
        }

        try {
          const mimeType = getSupportedMimeType();
          diag('media_recorder_init', `mimeType=${mimeType || 'default'}`);

          const recorder = new MediaRecorder(micStream, mimeType ? { mimeType } : undefined);
          mediaRecorderRef.current = recorder;

          recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(event.data);
              }
            }
          };

          recorder.onstart = () => {
            diag('media_recorder_started');
          };

          recorder.onerror = (e: any) => {
            diag('media_recorder_error', e.message || String(e));
            setError(`Audio recording error: ${e.message || String(e)}`);
          };

          recorder.onstop = () => {
            diag('media_recorder_stopped');
          };

          // Slice audio into 200ms chunks and start streaming
          recorder.start(200);
          setIsListening(true);
        } catch (recorderErr: any) {
          console.error('Failed to start MediaRecorder:', recorderErr);
          diag('media_recorder_failed', recorderErr.message || String(recorderErr));
          setError(`Failed to initialize recorder: ${recorderErr.message || String(recorderErr)}`);
          stop();
        }
      };

      ws.onclose = (event) => {
        diag('ws_closed', `code=${event.code} reason=${event.reason || 'none'} wasClean=${event.wasClean}`);
        setIsListening(false);
        wsRef.current = null;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current = null;
        }
      };

      ws.onerror = () => {
        diag('ws_error', 'WebSocket error encountered');
        setError('Audio upload connection error.');
      };
    } catch (e: any) {
      console.error('Failed to create audio WebSocket:', e);
      diag('ws_failed', e.message || String(e));
      setError(`Connection failure: ${e.message || String(e)}`);
      stop();
    }
  }, [roomCode, socketId, micStream, getSupportedMimeType, stop, diag]);

  // Handle auto-starting when queued parameters or stream becomes active/inactive
  useEffect(() => {
    if (shouldStartRef.current) {
      if (micStream && roomCode && socketId) {
        start();
      }
    } else {
      stop();
    }
  }, [micStream, roomCode, socketId, start, stop]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      diag('CLEANUP (unmount)');
      shouldStartRef.current = false;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {}
      }
    };
  }, [diag]);

  return {
    isSupported: true, // Websockets & MediaRecorder are supported in all modern browsers
    isListening,
    isPaused: false, // Legacy compatibility
    error,
    start,
    stop,
    resume: start, // Mapping resume to start
    diagLogs,
    clearDiagLogs,
  };
};
