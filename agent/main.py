"""
main.py — InterAct Desktop Agent, Phase 3 entry point.

Launches the transparent fullscreen overlay and a local WebSocket server
that accepts cursor events from external clients.

Phase 3 additions:
  - Local WebSocket server on ws://localhost:8765
  - cursor_move  → overlay.set_cursor_position(...)
  - cursor_click → overlay.add_click_ripple(...)
  - cursor_remove → overlay.remove_cursor(...)
  - Thread-safe Qt signal bridge (asyncio thread → Qt main thread)
  - Graceful Ctrl+C shutdown

Usage:
    python main.py                         # start agent
    python test_client.py                  # single-cursor demo
    python test_client.py --multi          # two simultaneous cursors
    python test_client.py --remove         # cursor removal demo
"""

import signal
import sys

from PySide6.QtWidgets import QApplication
from PySide6.QtCore import QTimer

from overlay import LaserPointerOverlay
from ws_server import CursorBridge, start_websocket_server

WS_HOST = "localhost"
WS_PORT = 8765


def main() -> int:
    # ── Qt application ───────────────────────────────────────────────────
    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(True)

    # ── Allow Ctrl+C from the terminal to terminate cleanly ──────────────
    # Qt blocks Python signal handlers while its event loop runs.
    # We install a short-interval timer that lets Python's signal
    # handling machinery run, so Ctrl+C (SIGINT) is honoured.
    def _handle_sigint(*_):
        print("\n[InterAct Agent] Received SIGINT — shutting down.", flush=True)
        app.quit()

    signal.signal(signal.SIGINT, _handle_sigint)

    _sigint_timer = QTimer()
    _sigint_timer.setInterval(250)          # check every 250 ms
    _sigint_timer.timeout.connect(lambda: None)  # no-op wakes the event loop
    _sigint_timer.start()

    # ── Overlay ──────────────────────────────────────────────────────────
    overlay = LaserPointerOverlay()

    # ── Phase 3: WebSocket cursor bridge ─────────────────────────────────
    #
    # CursorBridge is a QObject whose signals are emitted from the asyncio
    # daemon thread.  PySide6 detects the cross-thread emission and
    # automatically delivers each signal via a Qt queued connection, so
    # the overlay slots execute safely on this (Qt main) thread.
    #
    # Signal → Slot mapping:
    #   cursor_moved(id, x, y, color, name) → overlay.set_cursor_position
    #   cursor_clicked(id, x, y, color)     → overlay.add_click_ripple
    #   cursor_removed(id)                  → overlay.remove_cursor
    bridge = CursorBridge()
    bridge.cursor_moved.connect(overlay.set_cursor_position)
    bridge.cursor_clicked.connect(overlay.add_click_ripple)
    bridge.cursor_removed.connect(overlay.remove_cursor)

    start_websocket_server(bridge, host=WS_HOST, port=WS_PORT)

    overlay.show()

    print(
        "[InterAct Agent] Phase 3 overlay started.\n"
        f"  Geometry       : {overlay.geometry()}\n"
        f"  WebSocket      : ws://{WS_HOST}:{WS_PORT}\n"
        "  Test client    : python test_client.py\n"
        "  Multi-cursor   : python test_client.py --multi\n"
        "  Press Ctrl+C to quit.",
        flush=True,
    )

    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
