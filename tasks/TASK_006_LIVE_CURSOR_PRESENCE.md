# Task 006 - Live Cursor Presence and Click Indicators

Read PROJECT_RULES.md.

## Objective

Allow participants in a room to see:

* Other participants' cursors
* Participant names near cursors
* Click indicators/ripples

This is a visual collaboration feature only.

Participants must NOT be able to control another participant's screen.

---

## Scope

Implement:

* Cursor movement synchronization
* Click synchronization
* Participant labels
* Cursor cleanup on disconnect

Do NOT implement:

* Remote control
* Keyboard sharing
* Mouse control
* Screen interaction forwarding

This is presence only.

---

## Behavior

When a participant moves their mouse:

Other participants should see:

* Cursor position
* Display name

Updates should feel realtime and smooth.

---

## Click Indicators

When a participant clicks:

Show:

* Ripple animation
* Temporary visual indicator

The indicator should:

* Appear at click position
* Fade automatically
* Not require manual cleanup

---

## Data Transmission

Use the existing room WebSocket infrastructure.

Create events:

cursor_move

click_indicator

Transmit:

* roomCode
* participantId
* displayName
* x
* y
* timestamp

---

## Coordinate System

Use viewport-relative percentages.

Example:

```json
{
  "x": 42.3,
  "y": 61.8
}
```

Do NOT transmit raw pixels.

This allows different screen sizes to remain aligned.

---

## Performance

Throttle cursor updates.

Target:

* 15–25 updates/sec

Do NOT send every mouse movement.

Use throttling/debouncing.

---

## Cursor Appearance

Each participant should receive:

* Stable color
* Name label

Colors should remain consistent during the session.

---

## Cleanup

When a participant:

* Leaves room
* Disconnects
* Refreshes

Remove their cursor immediately.

No ghost cursors.

---

## Screen Sharing Integration

Cursor overlays should appear above the shared screen.

They must not interfere with:

* Video rendering
* Screen sharing controls
* Chat

---

## Verification

Scenario:

Host + 3 participants.

Expected:

* All participants see each other's cursors.
* Clicks create visible ripple effects.
* Names appear near cursors.
* Disconnect removes cursor.
* No noticeable lag.

---

## Deliverables

Provide:

1. Files modified
2. New WebSocket events
3. Throttling strategy
4. Coordinate strategy
5. Verification steps
6. Known limitations

Do not mark complete until tested with at least 3 simultaneous participants.
