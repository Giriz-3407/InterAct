import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, MessageSquare, LogOut, ArrowLeftFromLine } from 'lucide-react';

interface DocumentPipWindowProps {
  stream: MediaStream;
  pipWindow: Window;
  onLeave: () => void;
}

export function DocumentPipWindow({ stream, pipWindow, onLeave }: DocumentPipWindowProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [connected] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Inject InterAct design system into PiP document
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Inter:wght@100..900&display=swap');
      body {
        margin: 0;
        background: #09090b;
        font-family: 'Inter', sans-serif;
        overflow: hidden;
      }
      @keyframes pip-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.35; }
      }
    `;
    document.head.appendChild(styleEl);
    return () => { styleEl.remove(); };
  }, []);

  const handleReturnToRoom = useCallback(() => {
    try {
      if (window.opener) {
        window.opener.focus();
      }
    } catch {}
    pipWindow.close();
  }, [pipWindow]);

  const handleToggleMic = useCallback(() => {
    setIsMuted(prev => !prev);
    // TODO: Wire to actual voice implementation
  }, []);

  const handleChat = useCallback(() => {
    // TODO: Implement PiP chat — focus main tab for now
    try {
      if (window.opener) {
        window.opener.focus();
      }
    } catch {}
  }, []);

  // ─── Future extension points ──────────────────────────────────────
  // - Viewer count badge
  // - Live captions overlay
  // - Cursor overlay
  // - Camera toggle
  // - Settings button

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#09090b',
        color: '#e5e1e4',
        fontFamily: "'Inter', sans-serif",
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* ═══════ Top Bar ═══════ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          minHeight: 38,
          borderBottom: '1px solid rgba(39, 39, 42, 0.4)',
          flexShrink: 0,
        }}
      >
        {/* Left: Avatar + Host name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #818cf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 600,
              fontFamily: "'Geist', sans-serif",
              color: '#fff',
              flexShrink: 0,
            }}
          >
            H
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "'Geist', sans-serif",
              color: '#d4d4d8',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Host
          </span>
        </div>

        {/* Right: Connection dot + Return button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: connected ? '#10b981' : '#f43f5e',
              animation: connected ? 'pip-pulse 3s infinite ease-in-out' : 'none',
              flexShrink: 0,
            }}
          />
          <button
            onClick={handleReturnToRoom}
            title="Return to Room"
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.05)',
              color: '#a1a1aa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              padding: 0,
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
              (e.currentTarget as HTMLButtonElement).style.color = '#a1a1aa';
            }}
          >
            <ArrowLeftFromLine size={13} />
          </button>
        </div>
      </div>

      {/* ═══════ Center: Video ═══════ */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* ═══════ Bottom Controls ═══════ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-evenly',
          padding: '6px 12px',
          minHeight: 42,
          borderTop: '1px solid rgba(39, 39, 42, 0.4)',
          flexShrink: 0,
          gap: 6,
        }}
      >
        <IconButton
          onClick={handleToggleMic}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          danger={isMuted}
        >
          {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
        </IconButton>

        <IconButton
          onClick={handleChat}
          title="Chat"
        >
          <MessageSquare size={15} />
        </IconButton>

        <IconButton
          onClick={onLeave}
          title="Leave room"
          danger
        >
          <LogOut size={15} />
        </IconButton>
      </div>

      {/* ─── Extension points (hidden, preserve layout for future) ─── */}
      <div aria-hidden style={{ display: 'none' }}>
        {/* Viewer count badge */}
        {/* Live captions overlay */}
        {/* Cursor overlay */}
        {/* Camera toggle */}
        {/* Settings button */}
      </div>
    </div>
  );
}

/* ─── Compact Icon Button ─── */

interface IconButtonProps {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}

function IconButton({ onClick, title, children, danger }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 34,
        height: 34,
        borderRadius: '50%',
        border: danger ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid transparent',
        background: danger ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255,255,255,0.05)',
        color: danger ? '#f87171' : '#d4d4d8',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        padding: 0,
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={e => {
        const btn = e.currentTarget as HTMLButtonElement;
        if (danger) {
          btn.style.background = 'rgba(244, 63, 94, 0.25)';
          btn.style.color = '#fff';
        } else {
          btn.style.background = 'rgba(255,255,255,0.1)';
          btn.style.color = '#fff';
        }
      }}
      onMouseLeave={e => {
        const btn = e.currentTarget as HTMLButtonElement;
        if (danger) {
          btn.style.background = 'rgba(244, 63, 94, 0.15)';
          btn.style.color = '#f87171';
        } else {
          btn.style.background = 'rgba(255,255,255,0.05)';
          btn.style.color = '#d4d4d8';
        }
      }}
    >
      {children}
    </button>
  );
}
