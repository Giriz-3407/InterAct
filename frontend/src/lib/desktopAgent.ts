/**
 * desktopAgent.ts — InterAct Phase 4
 *
 * Browser-side WebSocket client that forwards cursor events received from
 * the InterAct backend to the local desktop agent overlay running on
 * ws://localhost:8765.
 *
 * Design:
 *  - Singleton module-level instance shared across the app
 *  - Silent failure: if the agent is not running, all sends are no-ops
 *  - Auto-reconnect: retries every RECONNECT_DELAY_MS until disconnect() is called
 *  - Host-only contract: callers must only call connect() when isHost === true
 *
 * Phase 5 replacement points are marked with [P5].
 */

const AGENT_WS_URL = 'ws://localhost:8765';
const RECONNECT_DELAY_MS = 3_000;

type VoidCallback = () => void;

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
// Phase 4 coordinate mapper
//
// Converts normalised cursor coordinates (0–1, relative to shared screen
// content) into absolute desktop pixel coordinates expected by the agent.
//
// Assumption: window.screen.width/height (logical CSS pixels) approximate
// the host's primary monitor logical pixel space, which matches the logical
// pixel space reported by Qt's QScreen.geometry() at the same DPR.
//
// [P5] Replace with WebRTC track dimensions:
//   const settings = localStream.getVideoTracks()[0].getSettings();
//   x = Math.round(normX * settings.width!);
//   y = Math.round(normY * settings.height!);
// This will give exact mapping regardless of window/tab capture regions.
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
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly connectedCbs = new Set<VoidCallback>();
  private readonly disconnectedCbs = new Set<VoidCallback>();

  // ── Connection lifecycle ──────────────────────────────────────────────────

  /**
   * Open a connection to the local desktop agent.
   * No-op if already connecting or connected.
   * Must only be called when the local user is the host.
   */
  connect(): void {
    if (this.shouldConnect) return;
    this.shouldConnect = true;
    this._openSocket();
  }

  /**
   * Close the connection and cancel any pending reconnect.
   * Safe to call when not connected.
   */
  disconnect(): void {
    this.shouldConnect = false;
    this._clearReconnectTimer();
    if (this.socket) {
      this.socket.onclose = null; // suppress reconnect trigger
      this.socket.close();
      this.socket = null;
      console.log('[DesktopAgent] disconnected');
      this.disconnectedCbs.forEach((cb) => cb());
    }
  }

  /** Returns true only when the WebSocket is in OPEN state. */
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  /** Subscribe to connection open events. Returns an unsubscribe function. */
  onConnected(cb: VoidCallback): VoidCallback {
    this.connectedCbs.add(cb);
    return () => this.connectedCbs.delete(cb);
  }

  /** Subscribe to disconnection events. Returns an unsubscribe function. */
  onDisconnected(cb: VoidCallback): VoidCallback {
    this.disconnectedCbs.add(cb);
    return () => this.disconnectedCbs.delete(cb);
  }

  // ── Cursor event forwarders ───────────────────────────────────────────────

  /**
   * Forward a cursor move to the desktop overlay.
   * x, y must be in desktop pixel coordinates (use toDesktopCoords first).
   */
  sendCursorMove(
    participantId: string,
    x: number,
    y: number,
    color: string,
    name: string,
  ): void {
    this._send({ event: 'cursor_move', participantId, x, y, color, name });
    // Use console.debug to satisfy "no excessive spam" — visible in Verbose filter
    console.debug('[DesktopAgent] cursor_move forwarded', participantId, x, y);
  }

  /**
   * Forward a click ripple to the desktop overlay.
   * x, y must be in desktop pixel coordinates.
   */
  sendCursorClick(
    participantId: string,
    x: number,
    y: number,
    color: string,
  ): void {
    this._send({ event: 'cursor_click', participantId, x, y, color });
    console.log('[DesktopAgent] cursor_click forwarded', participantId, x, y);
  }

  /**
   * Remove a participant cursor from the desktop overlay.
   */
  sendCursorRemove(participantId: string): void {
    this._send({ event: 'cursor_remove', participantId });
    console.log('[DesktopAgent] cursor_remove forwarded', participantId);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private _send(payload: object): void {
    if (!this.isConnected()) return; // silent no-op — agent not running
    this.socket!.send(JSON.stringify(payload));
  }

  private _openSocket(): void {
    if (!this.shouldConnect) return;

    try {
      const ws = new WebSocket(AGENT_WS_URL);

      ws.onopen = () => {
        console.log('[DesktopAgent] connected');
        this._clearReconnectTimer();
        this.connectedCbs.forEach((cb) => cb());
      };

      ws.onclose = () => {
        this.socket = null;
        if (this.shouldConnect) {
          console.warn(
            `[DesktopAgent] disconnected — retrying in ${RECONNECT_DELAY_MS}ms`,
          );
          this.disconnectedCbs.forEach((cb) => cb());
          this._scheduleReconnect();
        }
      };

      ws.onerror = () => {
        // onerror is always followed by onclose — no further action needed here.
        // Errors are intentionally swallowed: if the agent is not running the
        // browser must continue working normally with no user-visible errors.
      };

      ws.onmessage = () => {
        // Agent sends no messages to the browser in Phase 4.
      };

      this.socket = ws;
    } catch {
      // WebSocket constructor can throw in sandboxed / restricted environments.
      if (this.shouldConnect) {
        this._scheduleReconnect();
      }
    }
  }

  private _scheduleReconnect(): void {
    this._clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => this._openSocket(), RECONNECT_DELAY_MS);
  }

  private _clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// Singleton — imported directly wherever needed
export const desktopAgent = new DesktopAgentClient();
