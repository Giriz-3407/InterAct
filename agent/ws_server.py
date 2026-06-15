"""
ws_server.py — InterAct Desktop Agent, Phase 3

Local WebSocket server that receives cursor events from external clients
and bridges them safely to the Qt overlay on the main thread.

Threading model:
  - Main thread    : Qt event loop (overlay, painting, timers)
  - Daemon thread  : asyncio event loop (WebSocket server)
  - Bridge         : CursorBridge(QObject) with Qt Signals

  CursorBridge signals are emitted from the asyncio/daemon thread.
  PySide6 automatically queues cross-thread signal emissions, so the
  connected overlay slots execute on the Qt main thread with no explicit
  locking required.

Supported events (JSON over WebSocket):
  cursor_move   — move/create a participant cursor
  cursor_click  — add a click ripple at a position
  cursor_remove — remove a participant cursor

Usage:
    from ws_server import CursorBridge, start_websocket_server
    bridge = CursorBridge()
    bridge.cursor_moved.connect(overlay.set_cursor_position)
    bridge.cursor_clicked.connect(overlay.add_click_ripple)
    bridge.cursor_removed.connect(overlay.remove_cursor)
    start_websocket_server(bridge, host="localhost", port=8765)
"""

from __future__ import annotations

import asyncio
import json
import threading
from typing import Any

import websockets
import websockets.exceptions

from PySide6.QtCore import QObject, Signal


# ---------------------------------------------------------------------------
# Qt signal bridge — emitted from asyncio thread, delivered on Qt thread
# ---------------------------------------------------------------------------

class CursorBridge(QObject):
    """
    Qt signal hub connecting the asyncio WebSocket server to the Qt overlay.

    All signals are emitted from the asyncio daemon thread. PySide6 detects
    the cross-thread emission and automatically delivers the signal via a
    queued connection, meaning the connected slots execute safely on the
    Qt main thread.

    Signals:
        cursor_moved(participant_id, x, y, color, name)
            Maps to overlay.set_cursor_position(...)

        cursor_clicked(participant_id, x, y, color)
            Maps to overlay.add_click_ripple(...)

        cursor_removed(participant_id)
            Maps to overlay.remove_cursor(...)
    """

    cursor_moved   = Signal(str, int, int, str, str)   # id, x, y, color, name
    cursor_clicked = Signal(str, int, int, str)         # id, x, y, color
    cursor_removed = Signal(str)                         # id


# ---------------------------------------------------------------------------
# WebSocket protocol handler
# ---------------------------------------------------------------------------

def _make_handler(bridge: CursorBridge):
    """
    Returns an async WebSocket connection handler closed over `bridge`.
    Using a closure avoids module-level globals.
    """

    async def _handle_client(websocket) -> None:
        addr = websocket.remote_address
        print(f"[Agent] Client connected: {addr}", flush=True)

        try:
            async for raw_message in websocket:
                _dispatch(bridge, raw_message, addr)

        except websockets.exceptions.ConnectionClosedOK:
            pass  # clean disconnect
        except websockets.exceptions.ConnectionClosedError as exc:
            print(f"[Agent] Client {addr} disconnected with error: {exc}", flush=True)
        except Exception as exc:  # noqa: BLE001
            print(f"[Agent] Unexpected error from {addr}: {exc}", flush=True)
        finally:
            print(f"[Agent] Client disconnected: {addr}", flush=True)

    return _handle_client


def _dispatch(bridge: CursorBridge, raw: str, addr: Any) -> None:
    """
    Parse one raw WebSocket message and emit the appropriate bridge signal.
    Invalid or unknown messages are logged and silently dropped — they never
    raise or crash the agent.
    """
    # ── Parse JSON ────────────────────────────────────────────────────────
    try:
        msg: dict = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        print(f"[Agent] Invalid JSON from {addr}: {raw!r}", flush=True)
        return

    if not isinstance(msg, dict):
        print(f"[Agent] Expected JSON object, got {type(msg).__name__!r} from {addr}", flush=True)
        return

    event = msg.get("event")

    # ── cursor_move ───────────────────────────────────────────────────────
    if event == "cursor_move":
        try:
            pid   = str(msg["participantId"])
            x     = int(msg["x"])
            y     = int(msg["y"])
            color = str(msg.get("color", "#ff2222"))
            name  = str(msg.get("name", "Unknown"))
        except (KeyError, TypeError, ValueError) as exc:
            print(f"[Agent] Malformed cursor_move from {addr}: {exc}", flush=True)
            return
        print(f"[Agent] cursor_move received: {pid!r} @ ({x}, {y})", flush=True)
        bridge.cursor_moved.emit(pid, x, y, color, name)

    # ── cursor_click ──────────────────────────────────────────────────────
    elif event == "cursor_click":
        try:
            pid   = str(msg["participantId"])
            x     = int(msg["x"])
            y     = int(msg["y"])
            color = str(msg.get("color", "#ff2222"))
        except (KeyError, TypeError, ValueError) as exc:
            print(f"[Agent] Malformed cursor_click from {addr}: {exc}", flush=True)
            return
        print(f"[Agent] cursor_click received: {pid!r} @ ({x}, {y})", flush=True)
        bridge.cursor_clicked.emit(pid, x, y, color)

    # ── cursor_remove ─────────────────────────────────────────────────────
    elif event == "cursor_remove":
        try:
            pid = str(msg["participantId"])
        except (KeyError, TypeError) as exc:
            print(f"[Agent] Malformed cursor_remove from {addr}: {exc}", flush=True)
            return
        print(f"[Agent] cursor_remove received: {pid!r}", flush=True)
        bridge.cursor_removed.emit(pid)

    # ── Unknown event ─────────────────────────────────────────────────────
    else:
        print(f"[Agent] Unknown event ignored: {event!r} from {addr}", flush=True)


# ---------------------------------------------------------------------------
# asyncio server entrypoint
# ---------------------------------------------------------------------------

async def _server_main(bridge: CursorBridge, host: str, port: int) -> None:
    handler = _make_handler(bridge)
    async with websockets.serve(handler, host, port):
        print(f"[Agent] WebSocket server started on ws://{host}:{port}", flush=True)
        await asyncio.Future()   # run forever until the thread is killed


# ---------------------------------------------------------------------------
# Public: launch server on a daemon thread
# ---------------------------------------------------------------------------

def start_websocket_server(
    bridge: CursorBridge,
    host: str = "localhost",
    port: int = 8765,
) -> threading.Thread:
    """
    Start the WebSocket server on a background daemon thread.

    The thread is daemonized so it exits automatically when the Qt main
    thread (and therefore the process) exits — no manual cleanup required.

    Args:
        bridge: The CursorBridge whose signals will be emitted on events.
        host:   Bind address (default: "localhost").
        port:   TCP port (default: 8765).

    Returns:
        The started Thread object (rarely needed by callers).
    """
    def _thread_target() -> None:
        asyncio.run(_server_main(bridge, host, port))

    thread = threading.Thread(
        target=_thread_target,
        name="ws-server",
        daemon=True,          # exits when main Qt thread exits
    )
    thread.start()
    return thread
