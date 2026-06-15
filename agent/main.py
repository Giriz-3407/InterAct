"""
main.py — InterAct Desktop Agent, RC1 entry point.

Launches the transparent fullscreen overlay and a local WebSocket server
that accepts cursor events from external clients.

Changes from Phase 3:
  - Configuration loaded from env var / agent.cfg / defaults (config.py)
  - WebSocket server sends agent_info handshake on every client connection
  - Structured logging to file (%LOCALAPPDATA%/InterAct/logs/) and stderr
  - File logging enables console=False PyInstaller builds (no terminal needed)
  - Graceful Ctrl+C shutdown (unchanged)

Architecture:
  Browser ↔ ws://127.0.0.1:<port> ↔ Desktop Agent EXE (this process)

Usage:
    python main.py                         # start agent (reads agent.cfg)
    INTERACT_AGENT_PORT=9000 python main.py   # override port via env
    python test_client.py                  # single-cursor demo
    python test_client.py --multi          # two simultaneous cursors
    python test_client.py --remove         # cursor removal demo
"""

import logging
import os
import signal
import sys
from pathlib import Path

from PySide6.QtWidgets import QApplication
from PySide6.QtCore import QTimer

from overlay import LaserPointerOverlay
from ws_server import CursorBridge, start_websocket_server
from config import load_config
from agent_version import AGENT_VERSION, PROTOCOL_VERSION


# ---------------------------------------------------------------------------
# Logging setup — file + stderr, no console window required
# ---------------------------------------------------------------------------

def _setup_logging() -> Path:
    """
    Configure the root logger to write to both a rotating file and stderr.

    Log file location (in priority order):
      1. Frozen EXE: %LOCALAPPDATA%/InterAct/logs/interact-agent.log
      2. Dev run   : ./logs/interact-agent.log  (relative to this file)

    Returns the resolved log file path for startup reporting.
    """
    import logging.handlers

    # ── Resolve log directory ─────────────────────────────────────────────
    if getattr(sys, "frozen", False):
        local_app_data = os.environ.get("LOCALAPPDATA", os.path.expanduser("~"))
        log_dir = Path(local_app_data) / "InterAct" / "logs"
    else:
        log_dir = Path(__file__).parent / "logs"

    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "interact-agent.log"

    # ── Formatter — structured single-line format ─────────────────────────
    fmt = logging.Formatter(
        "%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )

    # ── File handler — 5 MB max, keep 3 rotated files ────────────────────
    file_handler = logging.handlers.RotatingFileHandler(
        log_file,
        maxBytes=5 * 1024 * 1024,
        backupCount=3,
        encoding="utf-8",
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(fmt)

    # ── Console handler — INFO and above (visible during dev) ─────────────
    console_handler = logging.StreamHandler(sys.stderr)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(fmt)

    # ── Root logger ───────────────────────────────────────────────────────
    root = logging.getLogger()
    root.setLevel(logging.DEBUG)   # file gets DEBUG, console gets INFO
    root.addHandler(file_handler)
    root.addHandler(console_handler)

    return log_file


log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> int:
    log_file = _setup_logging()

    # ── Load configuration ─────────────────────────────────────────────────
    cfg = load_config()
    log.info(
        "InterAct Agent %s starting (protocol_version=%d)",
        AGENT_VERSION,
        PROTOCOL_VERSION,
    )
    log.info("Config resolved: %s", cfg)
    log.info("Log file: %s", log_file)

    # ── Qt application ─────────────────────────────────────────────────────
    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(True)

    # ── Allow Ctrl+C from the terminal to terminate cleanly ────────────────
    # Qt blocks Python signal handlers while its event loop runs.
    # We install a short-interval timer that lets Python's signal handling
    # machinery run, so Ctrl+C (SIGINT) is honoured even in frozen builds.
    def _handle_sigint(*_):
        log.info("Received SIGINT — shutting down cleanly.")
        app.quit()

    signal.signal(signal.SIGINT, _handle_sigint)

    _sigint_timer = QTimer()
    _sigint_timer.setInterval(250)          # check every 250 ms
    _sigint_timer.timeout.connect(lambda: None)  # no-op wakes the event loop
    _sigint_timer.start()

    # ── Overlay ────────────────────────────────────────────────────────────
    overlay = LaserPointerOverlay()

    # ── WebSocket cursor bridge ────────────────────────────────────────────
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
    bridge.annotation_updated.connect(overlay.set_annotation)
    bridge.annotation_cleared.connect(overlay.clear_annotations)
    bridge.spotlight_updated.connect(overlay.set_spotlight)
    bridge.client_disconnected.connect(overlay.clear_spotlight_on_disconnect)

    start_websocket_server(bridge, host=cfg.host, port=cfg.port)

    overlay.show()

    log.info(
        "Overlay started — geometry=%s  WebSocket=ws://%s:%d",
        overlay.geometry(),
        cfg.host,
        cfg.port,
    )

    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
