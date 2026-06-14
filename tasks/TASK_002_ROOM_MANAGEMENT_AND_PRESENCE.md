# Task 002 - Room Management and Presence

Read PROJECT_RULES.md before making any changes.

## Objective

Implement the first functional collaboration milestone.

Users must be able to:

* Create a room
* Join a room using a room code
* Join using a display name
* See participants join and leave in real time
* See a live participant list

This task establishes the room lifecycle and WebSocket infrastructure that future chat, WebRTC, cursor sharing, and collaboration features will build upon.

---

## Existing Foundation

Already available:

* React frontend
* FastAPI backend
* MongoDB Atlas connection
* Centralized database module
* Routing
* Page shells
* Reusable UI components

Use the existing architecture.

Do not create alternative implementations.

---

## Room Requirements

### Room Creation

Create a backend API:

```http
POST /api/rooms
```

Requirements:

* Generate a unique 6-character room code
* Use uppercase letters and numbers
* Example:

K7P4XQ

* Room creator becomes the host
* Room is marked active
* Room data should be stored in memory

Response:

```json
{
  "roomCode": "K7P4XQ"
}
```

---

### Room Lookup

Create:

```http
GET /api/rooms/{roomCode}
```

Response should indicate:

* Room exists
* Room active status
* Current participant count

If room does not exist:

Return appropriate error response.

---

## Room Storage

For this milestone:

Store rooms in memory.

Example structure:

```python
rooms = {
    "K7P4XQ": {
        "roomCode": "K7P4XQ",
        "hostId": "...",
        "participants": [],
        "createdAt": "...",
        "active": True
    }
}
```

Do not persist rooms to MongoDB yet.

Rooms remain temporary.

---

## Presence System

Implement participant tracking.

Each participant must have:

```json
{
  "socketId": "...",
  "displayName": "Girish",
  "joinedAt": "..."
}
```

Track:

* Join
* Leave
* Disconnect

Maintain participant list per room.

---

## WebSocket Infrastructure

Implement room-aware WebSocket support.

Users connect immediately after joining a room.

WebSocket connection should support:

* Joining room
* Leaving room
* Presence updates

Do not implement chat yet.

---

## WebSocket Events

### Client → Server

Join Room

```json
{
  "event": "join_room",
  "roomCode": "K7P4XQ",
  "displayName": "Girish"
}
```

Leave Room

```json
{
  "event": "leave_room"
}
```

---

### Server → Client

Room Joined

```json
{
  "event": "room_joined",
  "roomCode": "K7P4XQ",
  "isHost": false,
  "participants": []
}
```

Participant Joined

```json
{
  "event": "participant_joined",
  "participant": {}
}
```

Participant Left

```json
{
  "event": "participant_left",
  "participantId": "..."
}
```

Participant List Updated

```json
{
  "event": "participants_updated",
  "participants": []
}
```

---

## Host Assignment

Room creator becomes host.

Store host information.

Future host transfer logic will be implemented later.

For now:

* Track host
* Display host in participant list

Do not implement host transfer yet.

---

## Frontend Requirements

### Dashboard

Create Room button must:

* Call Create Room API
* Receive room code
* Navigate to room page

---

### Room Page

Implement:

* Join room flow
* Display name entry
* Participant list
* Presence updates

Use existing participant panel.

Use live WebSocket data.

Remove mock participant data where appropriate.

---

## UI Requirements

Show:

* Host badge
* Participant count
* Online participants

Use the existing Stitch-based design system.

Maintain visual consistency.

---

## Do Not Implement Yet

Do not implement:

* Chat
* Message history
* WebRTC
* Screen sharing
* Cursor sharing
* Click indicators
* Host transfer
* Recording
* AI assistant functionality

These belong to future tasks.

---

## Success Criteria

The following scenario must work:

1. Open browser tab A
2. Create room
3. Open browser tab B
4. Join room
5. Open browser tab C
6. Join room

Expected result:

* All participants appear in the participant list
* Join events appear immediately
* Leave events appear immediately
* Participant count updates in real time
* No page refresh required

---

## Deliverables

Provide:

1. Created files
2. Modified files
3. New API routes
4. New WebSocket events
5. Verification steps
6. Any assumptions made

Implementation should be production-quality and aligned with PROJECT_RULES.md.
