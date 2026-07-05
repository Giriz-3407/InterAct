import { useEffect, useRef } from 'react';

interface DocumentPipWindowProps {
  stream: MediaStream;
  pipWindow: Window;
  onLeave: () => void;
}

export function DocumentPipWindow({ stream, pipWindow, onLeave }: DocumentPipWindowProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      style={{
        padding: '16px',
        fontFamily: 'system-ui, sans-serif',
        background: '#1a1a2e',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          borderRadius: '8px',
          flex: 1,
          minHeight: 0,
        }}
      />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => pipWindow.close()}
          style={{
            flex: 1,
            padding: '10px 16px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            background: '#4361ee',
            color: 'white',
          }}
        >
          Return to Room
        </button>
        <button
          onClick={onLeave}
          style={{
            flex: 1,
            padding: '10px 16px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            background: '#e63946',
            color: 'white',
          }}
        >
          Leave Room
        </button>
      </div>
    </div>
  );
}
