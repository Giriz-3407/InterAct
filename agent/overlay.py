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

from PySide6.QtCore import Qt, QTimer, QRect, QPoint, QRectF, QPointF, QObject, Signal
from PySide6.QtGui import (
    QColor,
    QPainter,
    QPainterPath,
    QRadialGradient,
    QGuiApplication,
    QFont,
    QFontMetrics,
    QPen,
    QCursor,
)
from PySide6.QtWidgets import QWidget, QApplication


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class CursorEntry:
    """Represents one remote participant's laser pointer state."""

    participant_id: str
    targetX: float
    targetY: float
    renderX: float
    renderY: float
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


@dataclass
class AnnotationEntry:
    """Represents a screen annotation created by a participant."""

    participant_id: str
    annotation_id: str
    type: str  # "rect" or "arrow"
    startX: float
    startY: float
    endX: float
    endY: float
    color: str
    name: str


# ---------------------------------------------------------------------------
# Global Input Capture (Phase 10B Spike)
# ---------------------------------------------------------------------------

class KeyboardHookBridge(QObject):
    annotation_mode_toggled = Signal()
    spotlight_double_tapped = Signal()


class GlobalInputTracker:
    def __init__(self, bridge: KeyboardHookBridge):
        from pynput import keyboard
        import time

        self.bridge = bridge
        self.last_ctrl_time = 0.0
        self.last_alt_time = 0.0
        self.ctrl_held = False
        self.alt_held = False
        
        self.listener = keyboard.Listener(
            on_press=self._on_press,
            on_release=self._on_release
        )
        self.listener.daemon = True
        self.listener.start()

    def _on_press(self, key):
        from pynput import keyboard
        import time

        if key == keyboard.Key.ctrl_l:
            if not self.ctrl_held:
                self.ctrl_held = True
                now = time.time()
                diff = now - self.last_ctrl_time
                if 0.05 < diff < 0.35:
                    self.bridge.annotation_mode_toggled.emit()
                    self.last_ctrl_time = 0.0
                else:
                    self.last_ctrl_time = now
        elif key == keyboard.Key.alt_l:
            if not self.alt_held:
                self.alt_held = True
                now = time.time()
                diff = now - self.last_alt_time
                if 0.05 < diff < 0.35:
                    self.bridge.spotlight_double_tapped.emit()
                    self.last_alt_time = 0.0
                else:
                    self.last_alt_time = now

    def _on_release(self, key):
        from pynput import keyboard

        if key == keyboard.Key.ctrl_l:
            self.ctrl_held = False
        elif key == keyboard.Key.alt_l:
            self.alt_held = False


class MouseHookBridge(QObject):
    mouse_down = Signal(float, float)
    mouse_dragged = Signal(float, float)
    mouse_up = Signal(float, float)


class GlobalMouseTracker:
    def __init__(self, bridge: MouseHookBridge):
        from pynput import mouse

        self.bridge = bridge
        self.listener = mouse.Listener(
            on_click=self._on_click,
            on_move=self._on_move
        )
        self.listener.daemon = True
        self.listener.start()

    def _on_click(self, x, y, button, pressed):
        from pynput import mouse

        if button == mouse.Button.left:
            if pressed:
                self.bridge.mouse_down.emit(float(x), float(y))
            else:
                self.bridge.mouse_up.emit(float(x), float(y))

    def _on_move(self, x, y):
        self.bridge.mouse_dragged.emit(float(x), float(y))


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

    # Smoothing configuration
    _SMOOTHING_FACTOR = 0.25
    _SNAP_THRESHOLD = 0.5

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

    _SPOTLIGHT_RADIUS = 180.0
    _SPOTLIGHT_DIM_ALPHA = 160

    def __init__(self, parent: Optional[QWidget] = None) -> None:
        super().__init__(parent)

        # ── Startup Diagnostics ──────────────────────────────────────────
        print("[Smoothing] enabled", flush=True)

        # ── Cursor, Ripple & Annotation collections ──────────────────────
        self._cursors: dict[str, CursorEntry] = {}
        self._ripples: list[RippleEntry] = []
        self._annotations: dict[str, dict[str, AnnotationEntry]] = {}
        self._spotlight_participant_id: Optional[str] = None

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

        # ── Spike Diagnostics & State ─────────────────────────────────────
        print("[GlobalInput] spike enabled", flush=True)
        self._spike_annotation_mode_active = False
        self._drawing_annotation = False
        self._spike_spotlight_active = False

        # Keyboard hook setup
        self._hook_bridge = KeyboardHookBridge()
        self._hook_bridge.annotation_mode_toggled.connect(self._on_spike_annotation_mode_toggled)
        self._hook_bridge.spotlight_double_tapped.connect(self._on_spike_spotlight_double_tapped)
        self._global_tracker = GlobalInputTracker(self._hook_bridge)

        # Mouse hook setup
        self._mouse_bridge = MouseHookBridge()
        self._mouse_bridge.mouse_down.connect(self._on_global_mouse_down)
        self._mouse_bridge.mouse_dragged.connect(self._on_global_mouse_move)
        self._mouse_bridge.mouse_up.connect(self._on_global_mouse_up)
        self._global_mouse_tracker = GlobalMouseTracker(self._mouse_bridge)

    def _on_spike_annotation_mode_toggled(self) -> None:
        self._spike_annotation_mode_active = not self._spike_annotation_mode_active
        if self._spike_annotation_mode_active:
            print("[GlobalInput] annotation mode on", flush=True)
        else:
            print("[GlobalInput] annotation mode off", flush=True)
            self._drawing_annotation = False

    def _on_spike_spotlight_double_tapped(self) -> None:
        self._spike_spotlight_active = not self._spike_spotlight_active
        if self._spike_spotlight_active:
            print("[GlobalInput] spotlight on", flush=True)
            self._spotlight_participant_id = "**host_spike**"
        else:
            print("[GlobalInput] spotlight off", flush=True)
            if self._spotlight_participant_id == "**host_spike**":
                self._spotlight_participant_id = None

    def _on_global_mouse_down(self, x: float, y: float) -> None:
        import time
        if self._spike_annotation_mode_active:
            self._drawing_annotation = True
            self._annotation_start_x = x
            self._annotation_start_y = y
            self._current_annotation_id = f"host-annot-{int(time.time()*1000)}"
            self.set_annotation(
                "**host_spike**",
                self._current_annotation_id,
                "rect",
                x,
                y,
                x,
                y,
                "#ff2222",
                "Presenter"
            )

    def _on_global_mouse_move(self, x: float, y: float) -> None:
        if self._spike_annotation_mode_active and self._drawing_annotation:
            self.set_annotation(
                "**host_spike**",
                self._current_annotation_id,
                "rect",
                self._annotation_start_x,
                self._annotation_start_y,
                x,
                y,
                "#ff2222",
                "Presenter"
            )

    def _on_global_mouse_up(self, x: float, y: float) -> None:
        if self._spike_annotation_mode_active and self._drawing_annotation:
            self.set_annotation(
                "**host_spike**",
                self._current_annotation_id,
                "rect",
                self._annotation_start_x,
                self._annotation_start_y,
                x,
                y,
                "#ff2222",
                "Presenter"
            )
            self._drawing_annotation = False
            self._spike_annotation_mode_active = False
            print("[GlobalInput] annotation mode off", flush=True)

    # ------------------------------------------------------------------
    # Multi-monitor support
    # ------------------------------------------------------------------

    def _cover_virtual_desktop(self) -> None:
        """
        Compute the union bounding rectangle of all connected screens and
        resize this widget to cover the full virtual desktop.

        Uses QGuiApplication.screens() so it works with any number of
        monitors in any arrangement (left/right/above/below, mixed DPR).
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
            existing.targetX = float(x)
            existing.targetY = float(y)
            existing.color = color
            existing.name = name
        else:
            self._cursors[participant_id] = CursorEntry(
                participant_id=participant_id,
                targetX=float(x),
                targetY=float(y),
                renderX=float(x),
                renderY=float(y),
                color=color,
                name=name,
            )

    def remove_cursor(self, participant_id: str) -> None:
        """
        Remove a participant's cursor from the overlay.
        """
        self._cursors.pop(participant_id, None)
        if self._spotlight_participant_id == participant_id:
            self._spotlight_participant_id = None

    def set_annotation(
        self,
        participant_id: str,
        annotation_id: str,
        atype: str,
        sx: float,
        sy: float,
        ex: float,
        ey: float,
        color: str = "#ff2222",
        name: str = "Unknown",
    ) -> None:
        """
        Create or update a participant's screen annotation.
        """
        if participant_id not in self._annotations:
            self._annotations[participant_id] = {}

        # 50 annotations per participant limit check
        if annotation_id not in self._annotations[participant_id]:
            if len(self._annotations[participant_id]) >= 50:
                oldest_id = next(iter(self._annotations[participant_id]))
                self._annotations[participant_id].pop(oldest_id)

        self._annotations[participant_id][annotation_id] = AnnotationEntry(
            participant_id=participant_id,
            annotation_id=annotation_id,
            type=atype,
            startX=sx,
            startY=sy,
            endX=ex,
            endY=ey,
            color=color,
            name=name,
        )
        print(f"[Annotation] overlay updated {annotation_id}", flush=True)

    def clear_annotations(self, participant_id: str) -> None:
        """
        Remove all annotations created by a participant.
        """
        self._annotations.pop(participant_id, None)

    def set_spotlight(self, participant_id: str, active: bool) -> None:
        """
        Set or clear the active spotlight owner.
        At most one spotlight can exist.
        """
        if active:
            self._spotlight_participant_id = participant_id
        elif self._spotlight_participant_id == participant_id:
            self._spotlight_participant_id = None
        self.update()

    def clear_spotlight_on_disconnect(self) -> None:
        """
        Clear spotlight ownership when the browser client disconnects.
        """
        self._spotlight_participant_id = None
        self.update()

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
        # --- Phase 10B Spike Global Mouse Tracking for Spotlight ---
        if self._spike_spotlight_active:
            pos = QCursor.pos()
            self.set_cursor_position(
                "**host_spike**",
                pos.x(),
                pos.y(),
                "#ff2222",
                "Presenter"
            )
            self._spotlight_participant_id = "**host_spike**"
        else:
            self.remove_cursor("**host_spike**")

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

        # Smooth remote participant cursors
        for cursor in self._cursors.values():
            # Exponential smoothing formula
            cursor.renderX += (cursor.targetX - cursor.renderX) * self._SMOOTHING_FACTOR
            cursor.renderY += (cursor.targetY - cursor.renderY) * self._SMOOTHING_FACTOR

            # Snap-to-target threshold
            if abs(cursor.targetX - cursor.renderX) < self._SNAP_THRESHOLD:
                cursor.renderX = cursor.targetX
            if abs(cursor.targetY - cursor.renderY) < self._SNAP_THRESHOLD:
                cursor.renderY = cursor.targetY

    # ------------------------------------------------------------------
    # Rendering
    # ------------------------------------------------------------------

    def paintEvent(self, event) -> None:  # noqa: N802 — Qt convention
        """
        Render spotlight overlay, active annotations, click ripples, and cursors.
        """
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        offset = self.geometry().topLeft()

        # 1. Draw spotlight (under everything else)
        self._draw_spotlight(painter, offset)

        # 2. Draw annotations first (under ripples and cursors)
        for participant_annots in self._annotations.values():
            for annot in participant_annots.values():
                self._draw_annotation(painter, annot, offset)

        # 3. Draw ripples (underneath the cursor)
        for ripple in self._ripples:
            local_x = ripple.x - offset.x()
            local_y = ripple.y - offset.y()
            self._draw_ripple(painter, local_x, local_y, ripple)

        # 4. Draw cursors on top
        for cursor in self._cursors.values():
            if cursor.participant_id == "**host_spike**":
                continue
            local_x = cursor.renderX - offset.x()
            local_y = cursor.renderY - offset.y()
            self._draw_cursor(painter, local_x, local_y, cursor)

        painter.end()

    def _draw_spotlight(self, painter: QPainter, offset: QPoint) -> None:
        """
        If a spotlight is active, dim the screen and clear a transparent cutout
        centered around the owner's smoothed coordinates.
        """
        pid = self._spotlight_participant_id
        if not pid or pid not in self._cursors:
            return

        cursor = self._cursors[pid]
        local_x = cursor.renderX - offset.x()
        local_y = cursor.renderY - offset.y()

        painter.save()

        # 1. Draw dimming background
        painter.fillRect(self.rect(), QColor(0, 0, 0, self._SPOTLIGHT_DIM_ALPHA))

        # 2. Clear circular area
        painter.setCompositionMode(QPainter.CompositionMode.CompositionMode_Clear)
        painter.setBrush(Qt.BrushStyle.SolidPattern)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawEllipse(QPointF(local_x, local_y), self._SPOTLIGHT_RADIUS, self._SPOTLIGHT_RADIUS)

        painter.restore()

    def _draw_annotation(
        self, painter: QPainter, annot: AnnotationEntry, offset: QPoint
    ) -> None:
        """Draw a single rectangle or arrow annotation in participant color."""
        local_sx = annot.startX - offset.x()
        local_sy = annot.startY - offset.y()
        local_ex = annot.endX - offset.x()
        local_ey = annot.endY - offset.y()

        color = QColor(annot.color)
        pen = QPen(color, 3.0)
        painter.setPen(pen)
        painter.setBrush(Qt.BrushStyle.NoBrush)

        if annot.type == "rect":
            x1 = min(local_sx, local_ex)
            y1 = min(local_sy, local_ey)
            x2 = max(local_sx, local_ex)
            y2 = max(local_sy, local_ey)
            rect = QRectF(x1, y1, x2 - x1, y2 - y1)
            painter.drawRect(rect)
        elif annot.type == "arrow":
            self._draw_arrow(painter, local_sx, local_sy, local_ex, local_ey, color)

    def _draw_arrow(
        self, painter: QPainter, sx: float, sy: float, ex: float, ey: float, color: QColor
    ) -> None:
        """Draw an arrow shaft and head pointing to (ex, ey) in color."""
        pen = QPen(color, 3.0)
        painter.setPen(pen)
        painter.drawLine(QPointF(sx, sy), QPointF(ex, ey))

        dx = ex - sx
        dy = ey - sy
        length = math.hypot(dx, dy)
        if length < 5.0:
            return

        ux = dx / length
        uy = dy / length

        arrow_len = 15.0
        angle = math.pi / 6.0  # 30 degrees

        p1_x = ex - arrow_len * (ux * math.cos(angle) - uy * math.sin(angle))
        p1_y = ey - arrow_len * (ux * math.sin(angle) + uy * math.cos(angle))

        p2_x = ex - arrow_len * (ux * math.cos(-angle) - uy * math.sin(-angle))
        p2_y = ey - arrow_len * (ux * math.sin(-angle) + uy * math.cos(-angle))

        path = QPainterPath()
        path.moveTo(ex, ey)
        path.lineTo(p1_x, p1_y)
        path.lineTo(p2_x, p2_y)
        path.closeSubpath()

        painter.setBrush(color)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawPath(path)
        painter.setBrush(Qt.BrushStyle.NoBrush)  # restore

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
        self, painter: QPainter, x: float, y: float, cursor: CursorEntry
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
        x: float,
        y: float,
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
