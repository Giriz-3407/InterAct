# Task 004 - WebRTC Signaling and Screen Sharing

Read PROJECT_RULES.md before making any changes.

## Objective

Implement the first working screen sharing experience.

A host must be able to:

* Start screen sharing
* Broadcast screen to a participant

A participant must be able to:

* Join room
* Receive and view the host's shared screen

This task introduces WebRTC signaling and media streaming.

---

## Existing Foundation

Already available:

* Room creation
* Room joining
* Participant presence
* Chat
* WebSocket infrastructure
* MongoDB integration

Use existing room and participant systems.

---

## Scope

Only support:

* 1 Host
* 1 Viewer

Do not support multiple viewers yet.

Do not optimize for scale.

Goal is proving WebRTC functionality.

---

## Screen Sharing

Host must be able to start screen sharing using:

```javascript
navigator.mediaDevices.getDisplayMedia()
```

Support:

* Entire screen
* Window
* Browser tab

Use browser-native picker.

---

## WebRTC Signaling

Implement signaling using existing WebSocket infrastructure.

### Client → Server

Offer

```json
{
  "event": "webrtc_offer",
  "targetId": "...",
  "offer": {}
}
```

Answer

```json
{
  "event": "webrtc_answer",
  "targetId": "...",
  "answer": {}
}
```

ICE Candidate

```json
{
  "event": "ice_candidate",
  "targetId": "...",
  "candidate": {}
}
```

---

### Server → Client

Relay signaling messages to target participant.

Server must not process media.

Server only forwards signaling payloads.

---

## STUN Configuration

Use:

stun:stun.l.google.com:19302

Do not implement TURN.

Do not implement media servers.

Do not implement SFU.

---

## Frontend Requirements

Host:

* Start Sharing button
* Stop Sharing button
* Sharing status indicator

Viewer:

* Video element for incoming stream
* Connection status indicator

---

## Room Integration

Use existing room participant information.

When a participant joins:

* Establish signaling flow
* Create peer connection
* Exchange offer/answer
* Exchange ICE candidates

---

## Error Handling

Handle:

* User cancels screen picker
* Sharing stops
* Peer disconnects
* Connection failure

Show appropriate UI feedback.

---

## Success Criteria

Scenario:

1. Open Tab A
2. Create room
3. Open Tab B
4. Join room
5. Host starts screen sharing

Expected:

* Viewer receives live screen stream
* Minimal delay
* No page refresh

---

## Do Not Implement Yet

Do not implement:

* Multiple viewers
* Cursor sharing
* Click indicators
* Recording
* Host transfer
* TURN server
* SFU
* Media server

---

## Deliverables

Provide:

1. Created files
2. Modified files
3. New WebSocket events
4. WebRTC architecture summary
5. Verification steps
6. Known limitations

Implementation should be production-quality and aligned with PROJECT_RULES.md.
