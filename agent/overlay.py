"""
overlay.py — InterAct Desktop Agent, Phase 1

Provides a transparent, frameless, always-on-top, click-through overlay
spanning the full virtual desktop (multi-monitor aware). Renders laser
pointer cursors for remote participants using a 60 FPS QTimer render loop.

Public API (future-proof for Phase 2+):
    overlay.set_cursor_position(participant_id: str, x: int, y: int) -> None
    overlay.remove_cursor(participant_id: str) -> None
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional

from PySide6.QtCore import Qt, QTimer, QRect, QPoint, QRectF
from PySide6.QtGui import (
    QColor,
    QPainter,
    QPainterPath,
    QRadialGradient,
    QGuiApplication,
    QFont,
    QFontMetrics,
    QPen,
)
from PySide6.QtWidgets import QWidget, QApplication


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class CursorEntry:
    """Represents one remote participant's laser pointer state."""

    participant_id: str
    x: int
    y: int
    color: str = "#ff2222"
    name: str = "Unknown"


@dataclass
class RippleEntry:
    """Represents one click ripple animation state."""

    id: str
    x: int
    y: int
    color: str
    radius: float = 0.0
    opacity: float = 1.0
    tick: int = 0


# ---------------------------------------------------------------------------
# Overlay widget
# ---------------------------------------------------------------------------

class LaserPointerOverlay(QWidget):
    """
    Full virtual-desktop transparent overlay that renders remote participant
    laser pointers and click ripples.

    Window characteristics:
      - Frameless, no taskbar entry, always on top
      - Fully transparent background
      - Click-through: never captures mouse or keyboard input
      - Spans the union bounding rect of all connected monitors

    Render loop:
      - QTimer fires every ~16 ms (~60 FPS)
      - Triggers _on_timer_tick() -> updates animation states and calls update()
    """

    # Visual constants for cursor
    _GLOW_RADIUS = 28          # outer soft glow radius (px)
    _BORDER_RADIUS = 17        # white border circle radius (px)
    _CORE_RADIUS = 11          # solid colour fill radius (px)
    _HIGHLIGHT_RADIUS = 4      # bright specular highlight radius (px)

    _LABEL_FONT_SIZE = 11      # px — participant name label
    _LABEL_OFFSET_X = 20       # px to the right of cursor centre
    _LABEL_OFFSET_Y = -28      # px above cursor centre
    _LABEL_PADDING_X = 8
    _LABEL_PADDING_Y = 4
    _LABEL_MAX_WIDTH = 160

    # Click ripple constants
    _RIPPLE_MAX_TICKS = 35     # ~0.58 seconds duration at 60 FPS
    _RIPPLE_MAX_RADIUS = 50.0  # final expanded radius (px)

    _TIMER_INTERVAL_MS = 16    # ~60 FPS

    def __init__(self, parent: Optional[QWidget] = None) -> None:
        super().__init__(parent)

        # ── Cursor & Ripple collections ──────────────────────────────────
        self._cursors: dict[str, CursorEntry] = {}
        self._ripples: list[RippleEntry] = []

        # ── Window flags & attributes ────────────────────────────────────
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint          # no title bar / border
            | Qt.WindowType.WindowStaysOnTopHint       # always above other apps
            | Qt.WindowType.Tool                       # excluded from taskbar & Alt-Tab
            | Qt.WindowType.WindowTransparentForInput  # OS-level: pass input events through
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents, True)
        self.setAttribute(Qt.WidgetAttribute.WA_NoSystemBackground, True)
        self.setAttribute(Qt.WidgetAttribute.WA_OpaquePaintEvent, False)

        # ── Multi-monitor geometry ───────────────────────────────────────
        self._cover_virtual_desktop()

        # ── Render loop ──────────────────────────────────────────────────
        self._timer = QTimer(self)
        self._timer.setInterval(self._TIMER_INTERVAL_MS)
        self._timer.timeout.connect(self._on_timer_tick)
        self._timer.start()

    # ------------------------------------------------------------------
    # Multi-monitor support
    # ------------------------------------------------------------------

    def _cover_virtual_desktop(self) -> None:
        """
        Compute the union bounding rectangle of all connected screens and
        resize this widget to cover the full virtual desktop.

        Uses QGuiApplication.screens() so it works with any number of
        monitors in any arrangement (left/right/above/below, mixed DPI).
        """
        screens = QGuiApplication.screens()
        if not screens:
            self.setGeometry(0, 0, 1920, 1080)
            return

        union_rect: QRect = screens[0].geometry()
        for screen in screens[1:]:
            union_rect = union_rect.united(screen.geometry())

        self.setGeometry(union_rect)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def set_cursor_position(
        self,
        participant_id: str,
        x: int,
        y: int,
        color: str = "#ff2222",
        name: str = "Unknown",
    ) -> None:
        """
        Create or update a participant's laser pointer cursor.
        """
        existing = self._cursors.get(participant_id)
        if existing is not None:
            existing.x = x
            existing.y = y
            existing.color = color
            existing.name = name
        else:
            self._cursors[participant_id] = CursorEntry(
                participant_id=participant_id,
                x=x,
                y=y,
                color=color,
                name=name,
            )

    def remove_cursor(self, participant_id: str) -> None:
        """
        Remove a participant's cursor from the overlay.
        """
        self._cursors.pop(participant_id, None)

    def add_click_ripple(
        self,
        participant_id: str,
        x: int,
        y: int,
        color: str = "#ff2222",
    ) -> None:
        """
        Create a new expanding, fading click ripple indicator at (x, y).
        Multiple ripples can coexist and will animate independently.
        """
        import uuid
        ripple_id = f"{participant_id}-{uuid.uuid4().hex}"
        self._ripples.append(
            RippleEntry(
                id=ripple_id,
                x=x,
                y=y,
                color=color,
            )
        )

    # ------------------------------------------------------------------
    # Animation and Timer
    # ------------------------------------------------------------------

    def _on_timer_tick(self) -> None:
        """
        Fires at ~60 FPS. Updates all active animation frames (e.g. click ripples)
        and calls update() to schedule a paint event.
        """
        self._update_animations()
        self.update()

    def _update_animations(self) -> None:
        """
        Advance animation state of all active click ripples and automatically
        prune completed ones to prevent memory growth.
        """
        active_ripples: list[RippleEntry] = []
        for ripple in self._ripples:
            ripple.tick += 1
            if ripple.tick <= self._RIPPLE_MAX_TICKS:
                progress = ripple.tick / self._RIPPLE_MAX_TICKS
                # Linear or ease-out expansion for radius
                ripple.radius = progress * self._RIPPLE_MAX_RADIUS
                # Fade out opacity
                ripple.opacity = 1.0 - progress
                active_ripples.append(ripple)

        self._ripples = active_ripples

    # ------------------------------------------------------------------
    # Rendering
    # ------------------------------------------------------------------

    def paintEvent(self, event) -> None:  # noqa: N802 — Qt convention
        """
        Render all active click ripples and cursors.
        """
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        offset = self.geometry().topLeft()

        # 1. Draw ripples first (underneath the cursor)
        for ripple in self._ripples:
            local_x = ripple.x - offset.x()
            local_y = ripple.y - offset.y()
            self._draw_ripple(painter, local_x, local_y, ripple)

        # 2. Draw cursors on top
        for cursor in self._cursors.values():
            local_x = cursor.x - offset.x()
            local_y = cursor.y - offset.y()
            self._draw_cursor(painter, local_x, local_y, cursor)

        painter.end()

    def _draw_ripple(
        self, painter: QPainter, x: float, y: float, ripple: RippleEntry
    ) -> None:
        """Draw a single expanding, semi-transparent click ripple ring."""
        base_color = QColor(ripple.color)
        alpha = int(ripple.opacity * 255)
        if alpha <= 0 or ripple.radius <= 0:
            return

        # Outer expanding ring outline
        pen_color = QColor(base_color)
        pen_color.setAlpha(alpha)
        painter.setPen(QPen(pen_color, 2.0))

        # Soft inner fill
        fill_color = QColor(base_color)
        fill_color.setAlpha(int(alpha * 0.15))
        painter.setBrush(fill_color)

        painter.drawEllipse(
            QRectF(
                x - ripple.radius,
                y - ripple.radius,
                ripple.radius * 2.0,
                ripple.radius * 2.0,
            )
        )

    def _draw_cursor(
        self, painter: QPainter, x: int, y: int, cursor: CursorEntry
    ) -> None:
        """Draw one laser pointer cursor at widget-local coordinates (x, y)."""
        base_color = QColor(cursor.color)

        # ── 1. Outer soft glow ───────────────────────────────────────────
        glow_gradient = QRadialGradient(x, y, self._GLOW_RADIUS)
        glow_color_center = QColor(base_color)
        glow_color_center.setAlpha(90)
        glow_color_edge = QColor(base_color)
        glow_color_edge.setAlpha(0)
        glow_gradient.setColorAt(0.0, glow_color_center)
        glow_gradient.setColorAt(1.0, glow_color_edge)

        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(glow_gradient)
        painter.drawEllipse(
            QRectF(
                x - self._GLOW_RADIUS,
                y - self._GLOW_RADIUS,
                self._GLOW_RADIUS * 2,
                self._GLOW_RADIUS * 2,
            )
        )

        # ── 2. White border circle ───────────────────────────────────────
        painter.setBrush(QColor(255, 255, 255, 230))
        painter.drawEllipse(
            QRectF(
                x - self._BORDER_RADIUS,
                y - self._BORDER_RADIUS,
                self._BORDER_RADIUS * 2,
                self._BORDER_RADIUS * 2,
            )
        )

        # ── 3. Solid colour core ─────────────────────────────────────────
        painter.setBrush(base_color)
        painter.drawEllipse(
            QRectF(
                x - self._CORE_RADIUS,
                y - self._CORE_RADIUS,
                self._CORE_RADIUS * 2,
                self._CORE_RADIUS * 2,
            )
        )

        # ── 4. Specular highlight ────────────────────────────────────────
        highlight_gradient = QRadialGradient(
            x - self._CORE_RADIUS * 0.3,
            y - self._CORE_RADIUS * 0.3,
            self._HIGHLIGHT_RADIUS,
        )
        highlight_gradient.setColorAt(0.0, QColor(255, 255, 255, 220))
        highlight_gradient.setColorAt(1.0, QColor(255, 255, 255, 0))
        painter.setBrush(highlight_gradient)
        painter.drawEllipse(
            QRectF(
                x - self._CORE_RADIUS * 0.3 - self._HIGHLIGHT_RADIUS,
                y - self._CORE_RADIUS * 0.3 - self._HIGHLIGHT_RADIUS,
                self._HIGHLIGHT_RADIUS * 2,
                self._HIGHLIGHT_RADIUS * 2,
            )
        )

        # ── 5. Participant name label ────────────────────────────────────
        self._draw_label(painter, x, y, cursor.name, base_color)

    def _draw_label(
        self,
        painter: QPainter,
        x: int,
        y: int,
        name: str,
        accent: QColor,
    ) -> None:
        """Draw a pill-shaped name label above the cursor."""
        font = QFont("Segoe UI", self._LABEL_FONT_SIZE)
        font.setWeight(QFont.Weight.Medium)
        painter.setFont(font)

        fm = QFontMetrics(font)
        display_name = fm.elidedText(
            name,
            Qt.TextElideMode.ElideRight,
            self._LABEL_MAX_WIDTH,
        )
        text_rect = fm.boundingRect(display_name)
        text_w = text_rect.width()
        text_h = fm.height()

        pill_w = text_w + self._LABEL_PADDING_X * 2
        pill_h = text_h + self._LABEL_PADDING_Y * 2
        pill_x = x + self._LABEL_OFFSET_X
        pill_y = y + self._LABEL_OFFSET_Y - pill_h
        margin = 8
        pill_x = max(margin, min(pill_x, self.width() - pill_w - margin))
        pill_y = max(margin, min(pill_y, self.height() - pill_h - margin))

        # Pill background — uses accent colour at 85% opacity
        bg_color = QColor(18, 18, 22, 225)
        painter.setBrush(bg_color)
        border_color = QColor(accent)
        border_color.setAlpha(230)
        painter.setPen(QPen(border_color, 1.2))
        painter.drawRoundedRect(
            QRectF(pill_x, pill_y, pill_w, pill_h),
            pill_h / 2,
            pill_h / 2,
        )
        stripe_color = QColor(accent)
        stripe_color.setAlpha(245)
        painter.setBrush(stripe_color)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawRoundedRect(
            QRectF(pill_x + 4, pill_y + 4, 4, pill_h - 8),
            2,
            2,
        )

        # Label text — white
        painter.setPen(QColor(255, 255, 255, 255))
        painter.drawText(
            QRectF(pill_x + 4, pill_y, pill_w, pill_h),
            Qt.AlignmentFlag.AlignCenter,
            display_name,
        )
