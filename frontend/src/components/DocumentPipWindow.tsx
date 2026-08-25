import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, MessageSquare, PhoneOff, ArrowLeftToLine, Send, X } from 'lucide-react';
import { wsClient } from '../lib/websocket';

interface MessageItem {
  sender: string;
  message: string;
  timestamp: string;
  type?: string;
}

interface DocumentPipWindowProps {
  stream: MediaStream;
  pipWindow: Window;
  onLeave: () => void;
  hostName?: string;
  displayName: string;
  roomId: string;
  isMuted: boolean;
  onToggleMic: () => void;
  connected: boolean;
}

export function DocumentPipWindow({ 
  stream, 
  pipWindow, 
  onLeave, 
  hostName = 'Host', 
  displayName, 
  isMuted, 
  onToggleMic,
  connected 
}: DocumentPipWindowProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
      
      * { box-sizing: border-box; }
      
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
      
      .custom-scrollbar::-webkit-scrollbar {
        width: 5px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #353437;
        border-radius: 9999px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #8083ff;
      }
    `;
    document.head.appendChild(styleEl);
    return () => { styleEl.remove(); };
  }, []);

  // Sync messages from main window via WebSocket
  useEffect(() => {
    const handleChatMessage = (data: { sender: string; message: string; timestamp: string; type?: string }) => {
      setMessages(prev => [...prev, data]);
    };
    
    const unsub = wsClient.on('chat_message', handleChatMessage);
    return () => { unsub(); };
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleReturnToRoom = useCallback(() => {
    try {
      if (window.opener) {
        window.opener.focus();
      }
    } catch {}
    pipWindow.close();
  }, [pipWindow]);

  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    wsClient.send('chat_message', { message: trimmed });
    setChatInput('');
  }, [chatInput]);

  const handleToggleChat = useCallback(() => {
    setIsChatOpen(prev => !prev);
  }, []);

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { 
      return isoString; 
    }
  };

  // ─── Future extension points ──────────────────────────────────────
  // - Viewer count badge (add to header right, near connection dot)
  // - Live captions overlay (overlay on video with bottom fade gradient)
  // - Cursor overlay (canvas layer over video for remote cursors)
  // - Camera toggle (add to collaboration controls)
  // - Settings button (add to more menu or collaboration controls)

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'H';
  };

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
          padding: '8px 12px',
          minHeight: 44,
          background: 'rgba(17, 17, 19, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(39, 39, 42, 0.4)',
          flexShrink: 0,
        }}
      >
        {/* Left: Avatar + Host name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'Geist', sans-serif",
              color: '#fff',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
            }}
          >
            {getInitials(hostName)}
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Geist', sans-serif",
              color: '#d4d4d8',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {hostName}
          </span>
        </div>

        {/* Right: Connection dot + Return button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: connected ? '#10b981' : '#f43f5e',
              animation: connected ? 'pip-pulse 3s infinite ease-in-out' : 'none',
              flexShrink: 0,
              boxShadow: connected ? '0 0 8px rgba(16, 185, 129, 0.4)' : '0 0 8px rgba(244, 63, 94, 0.4)',
            }}
            title={connected ? 'Connected' : 'Disconnected'}
          />
          <button
            onClick={handleReturnToRoom}
            title="Return to Room"
            style={{
              width: 30,
              height: 30,
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
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
              (e.currentTarget as HTMLButtonElement).style.color = '#a1a1aa';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            <ArrowLeftToLine size={14} />
          </button>
        </div>
      </div>

      {/* ═══════ Center: Video + Chat Overlay ═══════ */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          minHeight: 0,
          overflow: 'hidden',
          position: 'relative',
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

        {/* Chat Overlay Panel */}
        {isChatOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '50%',
              background: 'rgba(17, 17, 19, 0.98)',
              backdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(39, 39, 42, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.6)',
            }}
          >
            {/* Chat Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderBottom: '1px solid rgba(39, 39, 42, 0.4)',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Geist', sans-serif",
                  color: '#d4d4d8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Chat
              </span>
              <button
                onClick={handleToggleChat}
                title="Close chat"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#a1a1aa',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  transition: 'all 0.15s ease',
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
                <X size={14} />
              </button>
            </div>

            {/* Chat Messages */}
            <div
              className="custom-scrollbar"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                minHeight: 0,
              }}
            >
              {messages.length === 0 ? (
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: '#71717a',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    No messages yet
                  </span>
                </div>
              ) : (
                messages.map((m, idx) => {
                  if (m.type === 'system_rename') {
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            color: '#71717a',
                            fontStyle: 'italic',
                            fontFamily: "'Inter', sans-serif",
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          {m.message}
                        </span>
                      </div>
                    );
                  }
                  const isMe = m.sender === displayName;
                  const initials = m.sender.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'flex-start',
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: isMe ? '#6366f1' : '#3f3f46',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 9,
                          fontWeight: 700,
                          fontFamily: "'Geist', sans-serif",
                          color: '#fff',
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                            gap: 6,
                            marginBottom: 3,
                          }}
                        >
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
                            {m.sender}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              fontFamily: "'Geist Mono', monospace",
                              color: '#71717a',
                              flexShrink: 0,
                            }}
                          >
                            {formatTime(m.timestamp)}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: 12,
                            color: '#d4d4d8',
                            fontFamily: "'Inter', sans-serif",
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            padding: '6px 10px',
                            borderRadius: '12px',
                            borderTopLeftRadius: '4px',
                            wordBreak: 'break-word',
                            lineHeight: 1.5,
                            margin: 0,
                          }}
                        >
                          {m.message}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form
              onSubmit={handleSendMessage}
              style={{
                display: 'flex',
                gap: 6,
                padding: '8px 12px',
                borderTop: '1px solid rgba(39, 39, 42, 0.4)',
                flexShrink: 0,
              }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Message..."
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 32,
                  padding: '0 12px',
                  borderRadius: '9999px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontSize: 12,
                  color: '#d4d4d8',
                  fontFamily: "'Inter', sans-serif",
                  outline: 'none',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              />
              <button
                type="submit"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: 'none',
                  background: '#c0c1ff',
                  color: '#09090b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  padding: 0,
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 8px rgba(192, 193, 255, 0.2)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#b0b1ff';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#c0c1ff';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                }}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ═══════ Bottom Collaboration Controls ═══════ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 16px',
          minHeight: 56,
          background: 'rgba(17, 17, 19, 0.95)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(39, 39, 42, 0.4)',
          flexShrink: 0,
          gap: 10,
        }}
      >
        <DockButton
          onClick={onToggleMic}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          danger={isMuted}
        >
          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </DockButton>

        <DockButton
          onClick={handleToggleChat}
          title="Chat"
          active={isChatOpen}
          badge={isChatOpen ? undefined : messages.length}
        >
          <MessageSquare size={16} />
        </DockButton>

        <DockButton
          onClick={onLeave}
          title="Leave room"
          danger
        >
          <PhoneOff size={16} />
        </DockButton>
      </div>
    </div>
  );
}

/* ─── InterAct Dock Button Component ─── */

interface DockButtonProps {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
  active?: boolean;
  badge?: number;
}

function DockButton({ onClick, title, children, danger, active, badge }: DockButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        position: 'relative',
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: danger ? '1px solid rgba(244, 63, 94, 0.3)' : active ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
        background: danger 
          ? 'rgba(244, 63, 94, 0.15)' 
          : active 
            ? 'rgba(79, 70, 229, 0.8)' 
            : 'rgba(255,255,255,0.05)',
        color: danger ? '#f87171' : active ? '#ffffff' : '#d4d4d8',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        padding: 0,
        transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={e => {
        const btn = e.currentTarget as HTMLButtonElement;
        if (danger) {
          btn.style.background = 'rgba(244, 63, 94, 0.25)';
          btn.style.color = '#fff';
        } else {
          btn.style.background = active ? 'rgba(79, 70, 229, 0.9)' : 'rgba(255,255,255,0.1)';
          btn.style.color = '#fff';
        }
        btn.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={e => {
        const btn = e.currentTarget as HTMLButtonElement;
        if (danger) {
          btn.style.background = 'rgba(244, 63, 94, 0.15)';
          btn.style.color = '#f87171';
        } else {
          btn.style.background = active ? 'rgba(79, 70, 229, 0.8)' : 'rgba(255,255,255,0.05)';
          btn.style.color = active ? '#ffffff' : '#d4d4d8';
        }
        btn.style.transform = 'scale(1)';
      }}
      onMouseDown={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
      }}
      onMouseUp={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
      }}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 16,
            height: 16,
            padding: '0 4px',
            borderRadius: '9999px',
            background: '#6366f1',
            color: '#fff',
            fontSize: 9,
            fontWeight: 700,
            fontFamily: "'Geist', sans-serif",
            lineHeight: 1,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
          }}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}
