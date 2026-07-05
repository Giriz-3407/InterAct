/**
 * desktopAgent.ts — InterAct Phase 4 / RC1
 *
 * Browser-side WebSocket client that forwards cursor events received from
 * the InterAct backend to the local desktop agent overlay.
 *
 * Requirements Met:
 *  - Configurable port: resolved via import.meta.env.VITE_AGENT_PORT (fallback 8765)
 *  - Exponential backoff: base 500ms, multiplier 2x, max 30s, jitter ±10%
 *  - Agent handshake: immediately parses 'agent_info' event on connection open
 *  - Protocol version validation: validates client BROWSER_PROTOCOL_VERSION against server protocol_version
 *  - Connection health: exposes status callbacks and getters with states ('connecting', 'connected', 'disconnected', 'incompatible')
 *  - Console log levels: structured console warnings and errors for diagnostics
 */

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'incompatible';

export interface AgentInfo {
  version: string;
  protocolVersion: number;
  capabilities: string[];
  platform: string;
  agentPort: number;
}

// BROWSER_PROTOCOL_VERSION must match PROTOCOL_VERSION in agent_version.py
export const BROWSER_PROTOCOL_VERSION = 1;

type VoidCallback = () => void;
type StatusCallback = (status: ConnectionStatus) => void;

import { isMobileDevice } from './mobile';

const noop = (..._args: unknown[]): void => {};

// ---------------------------------------------------------------------------
// Configurable Host-only agent URL resolution
// ---------------------------------------------------------------------------
function getAgentWsUrl(): string {
  const port = (import.meta.env?.VITE_AGENT_PORT) || '8765';
  return `ws://127.0.0.1:${port}`;
}

// ---------------------------------------------------------------------------
// Deterministic participant colour so that participant cursors are drawn with
// consistent and stable colors.
// ---------------------------------------------------------------------------
export const CURSOR_COLORS = [
  '#22d3ee', // cyan-400
  '#fb923c', // orange-400
  '#f472b6', // pink-400
  '#a3e635', // lime-400
  '#818cf8', // indigo-400
  '#34d399', // emerald-400
  '#fbbf24', // amber-400
  '#e879f9', // fuchsia-400
];

export function colorForParticipant(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash * 31) + id.charCodeAt(i)) >>> 0;
  }
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}

// ---------------------------------------------------------------------------
// Coordinate mapper
// ---------------------------------------------------------------------------
export function toDesktopCoords(
  normX: number,
  normY: number,
): { x: number; y: number } {
  return {
    x: Math.round(normX * window.screen.width),
    y: Math.round(normY * window.screen.height),
  };
}

// ---------------------------------------------------------------------------
// Desktop Agent Client
// ---------------------------------------------------------------------------
class DesktopAgentClient {
  private socket: WebSocket | null = null;
  private shouldConnect = false;
  private status: ConnectionStatus = 'disconnected';
  private agentInfo: AgentInfo | null = null;

  // Reconnect Backoff properties
  private baseDelayMs = 500;
  private currentDelayMs = 500;
  private maxDelayMs = 30000;
  private multiplier = 2;
  private jitterPercent = 0.1; // ±10%
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // Handshake timeout to ensure we don't hang in 'connecting' if handshake never comes
  private handshakeTimer: ReturnType<typeof setTimeout> | null = null;
  private handshakeTimeoutMs = 5000;

  // Callbacks
  private readonly statusCbs = new Set<StatusCallback>();
  private readonly connectedCbs = new Set<VoidCallback>();
  private readonly disconnectedCbs = new Set<VoidCallback>();

  // ── Connection lifecycle ──────────────────────────────────────────────────

  /**
   * Open a connection to the local desktop agent.
   * No-op if already connecting or connected.
   */
  connect(): void {
    if (isMobileDevice) return;
    if (this.shouldConnect) return;
    this.shouldConnect = true;
    this.currentDelayMs = this.baseDelayMs; // Reset backoff when user explicitly connects
    this._openSocket();
  }

  /**
   * Close the connection and cancel any pending reconnect.
   */
  disconnect(): void {
    this.shouldConnect = false;
    this._clearReconnectTimer();
    this._clearHandshakeTimer();
    
    if (this.socket) {
      this.socket.onclose = null; // suppress reconnect trigger
      this.socket.onerror = null;
      this.socket.onmessage = null;
      this.socket.close();
      this.socket = null;
    }
    
    this.agentInfo = null;
    this._setStatus('disconnected');
    this.disconnectedCbs.forEach((cb) => cb());
  }

  /** Returns current connection status. */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /** Returns agent info payload if connected. */
  getAgentInfo(): AgentInfo | null {
    return this.agentInfo;
  }

  /** Returns true only when status is 'connected' */
  isConnected(): boolean {
    return this.status === 'connected';
  }

  /** Subscribe to connection status changes. Returns unsubscribe function. */
  onStatusChange(cb: StatusCallback): VoidCallback {
    this.statusCbs.add(cb);
    // Notify immediately with current status
    cb(this.status);
    return () => this.statusCbs.delete(cb);
  }

  /** Subscribe to connection open (handshake completed successfully) events. */
  onConnected(cb: VoidCallback): VoidCallback {
    this.connectedCbs.add(cb);
    return () => this.connectedCbs.delete(cb);
  }

  /** Subscribe to disconnection events. */
  onDisconnected(cb: VoidCallback): VoidCallback {
    this.disconnectedCbs.add(cb);
    return () => this.disconnectedCbs.delete(cb);
  }

  // ── Cursor event forwarders ───────────────────────────────────────────────

  sendCursorMove(
    participantId: string,
    x: number,
    y: number,
    color: string,
    name: string,
  ): void {
    this._send({ event: 'cursor_move', participantId, x, y, color, name });
    noop('[DesktopAgent] cursor_move forwarded', participantId, x, y);
  }

  sendCursorClick(
    participantId: string,
    x: number,
    y: number,
    color: string,
  ): void {
    this._send({ event: 'cursor_click', participantId, x, y, color });
    noop('[DesktopAgent] cursor_click forwarded', participantId, x, y);
  }

  sendCursorRemove(participantId: string): void {
    this._send({ event: 'cursor_remove', participantId });
    noop('[DesktopAgent] cursor_remove forwarded', participantId);
  }

  sendAnnotationUpdate(
    participantId: string,
    annotationId: string,
    type: 'rect' | 'arrow',
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color?: string,
    name?: string,
  ): void {
    this._send({
      event: 'annotation_update',
      participantId,
      annotationId,
      type,
      startX,
      startY,
      endX,
      endY,
      color,
      name,
    });
    noop('[DesktopAgent] annotation_update forwarded', participantId, annotationId);
  }

  sendAnnotationClear(participantId: string): void {
    this._send({ event: 'annotation_clear', participantId });
    noop('[DesktopAgent] annotation_clear forwarded', participantId);
  }

  sendSpotlightUpdate(participantId: string, active: boolean): void {
    this._send({ event: 'spotlight_update', participantId, active });
    noop('[DesktopAgent] spotlight_update forwarded', participantId, active);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private _setStatus(newStatus: ConnectionStatus): void {
    if (this.status !== newStatus) {
      noop(`[DesktopAgent] Status change: ${this.status} -> ${newStatus}`);
      this.status = newStatus;
      this.statusCbs.forEach((cb) => cb(newStatus));
    }
  }

  private _send(payload: object): void {
    if (!this.isConnected()) return; // silent no-op if agent not fully connected
    try {
      this.socket?.send(JSON.stringify(payload));
    } catch (err) {
      console.error('[DesktopAgent] Failed to send message:', err);
    }
  }

  private _openSocket(): void {
    if (!this.shouldConnect) return;

    this._setStatus('connecting');
    const wsUrl = getAgentWsUrl();
    noop(`[DesktopAgent] Connecting to ${wsUrl}...`);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        noop('[DesktopAgent] WebSocket open. Waiting for agent_info handshake...');
        
        // Start handshake timeout timer
        this._clearHandshakeTimer();
        this.handshakeTimer = setTimeout(() => {
          noop('[DesktopAgent] Handshake timed out. Reconnecting...');
          ws.close();
        }, this.handshakeTimeoutMs);
      };

      ws.onclose = () => {
        this.socket = null;
        this.agentInfo = null;
        this._clearHandshakeTimer();

        if (this.shouldConnect) {
          this._setStatus('disconnected');
          this.disconnectedCbs.forEach((cb) => cb());
          this._scheduleReconnect();
        } else if (this.status !== 'incompatible') {
          this._setStatus('disconnected');
        }
      };

      ws.onerror = () => {
        // onerror is followed by onclose, no reconnect scheduling here.
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg && msg.event === 'agent_info') {
            this._clearHandshakeTimer();
            this._handleHandshake(msg);
          }
        } catch (err) {
          noop('[DesktopAgent] Failed to parse message from agent:', err);
        }
      };

      this.socket = ws;
    } catch (err) {
      console.error('[DesktopAgent] Socket construction failed:', err);
      if (this.shouldConnect) {
        this._setStatus('disconnected');
        this._scheduleReconnect();
      }
    }
  }

  private _handleHandshake(payload: any): void {
    const serverProtocol = Number(payload.protocol_version);
    
    if (isNaN(serverProtocol) || serverProtocol !== BROWSER_PROTOCOL_VERSION) {
      console.error(
        `[DesktopAgent] Protocol version mismatch! ` +
        `Browser expects: ${BROWSER_PROTOCOL_VERSION}, Agent sent: ${payload.protocol_version}`
      );
      
      this.agentInfo = null;
      this._setStatus('incompatible');
      
      // Stop reconnecting as requested by Option A
      this.shouldConnect = false;
      this._clearReconnectTimer();
      
      if (this.socket) {
        this.socket.onclose = null;
        this.socket.onerror = null;
        this.socket.close();
        this.socket = null;
      }
      return;
    }

    // Handshake successful
    this.agentInfo = {
      version: payload.version,
      protocolVersion: serverProtocol,
      capabilities: payload.capabilities || [],
      platform: payload.platform || 'unknown',
      agentPort: Number(payload.agent_port) || 8765,
    };

    noop(
      `[DesktopAgent] Handshake successful! Agent version: ${this.agentInfo.version}, Platform: ${this.agentInfo.platform}`
    );

    this.currentDelayMs = this.baseDelayMs; // Reset backoff delay on successful connection
    this._setStatus('connected');
    this.connectedCbs.forEach((cb) => cb());
  }

  private _scheduleReconnect(): void {
    if (isMobileDevice) return;
    this._clearReconnectTimer();

    // Jitter calculation: ±10%
    const jitterFactor = 1 + (Math.random() * (this.jitterPercent * 2) - this.jitterPercent);
    const delayWithJitter = Math.round(this.currentDelayMs * jitterFactor);

    noop(
      `[DesktopAgent] Reconnect scheduled in ${delayWithJitter}ms (base delay: ${this.currentDelayMs}ms)`
    );

    this.reconnectTimer = setTimeout(() => {
      this._openSocket();
    }, delayWithJitter);

    // Double the delay for the next attempt up to the max limit
    this.currentDelayMs = Math.min(this.maxDelayMs, this.currentDelayMs * this.multiplier);
  }

  private _clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private _clearHandshakeTimer(): void {
    if (this.handshakeTimer !== null) {
      clearTimeout(this.handshakeTimer);
      this.handshakeTimer = null;
    }
  }
}

// Singleton — imported directly wherever needed
export const desktopAgent = new DesktopAgentClient();
