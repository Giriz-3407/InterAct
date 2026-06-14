# Task 003 - Chat and Message History

Read PROJECT_RULES.md before making any changes.

## Objective

Implement realtime room chat and persistent message history.

Users inside a room must be able to:

* Send messages
* Receive messages instantly
* View previous room messages
* Use emojis
* Keep chat history while the room exists

This task builds on the completed Room Management and Presence system.

---

## Existing Foundation

Already available:

* Room creation
* Room joining
* Participant presence
* WebSocket infrastructure
* MongoDB Atlas connection
* Centralized MongoDB module

Use the existing architecture.

Do not create alternative implementations.

---

## Chat Requirements

Support:

* Text messages
* Emojis

Examples:

Hello 👋

Can everyone see my screen? 👀

Looks good 🚀

---

## Not Supported

Do not implement:

* Images
* GIFs
* Files
* Voice notes
* Message reactions
* Message editing
* Message deletion

---

## MongoDB Collection

Create:

messages

Document structure:

```json
{
  "roomCode": "K7P4XQ",
  "sender": "Girish",
  "message": "Hello 👋",
  "timestamp": "..."
}
```

Create appropriate indexes if necessary.

---

## WebSocket Events

### Client → Server

```json
{
  "event": "chat_message",
  "message": "Hello 👋"
}
```

---

### Server → Client

```json
{
  "event": "chat_message",
  "sender": "Girish",
  "message": "Hello 👋",
  "timestamp": "..."
}
```

Broadcast to all room participants.

---

## Message History

When a participant joins a room:

Load previous room messages.

Create:

```http
GET /api/rooms/{roomCode}/messages
```

Return messages ordered by timestamp.

The frontend should load history automatically.

---

## Frontend Requirements

Connect the existing chat panel to live backend data.

Replace mock chat messages.

Implement:

* Message list
* Message input
* Send button
* Enter key support
* Auto-scroll to latest message

---

## UI Requirements

Display:

* Sender name
* Message content
* Timestamp

Maintain consistency with the Stitch design system.

---

## Validation

Prevent:

* Empty messages
* Whitespace-only messages

Trim input before sending.

---

## Success Criteria

Scenario:

1. Open Tab A
2. Create room
3. Open Tab B
4. Join room
5. Send message from Tab A

Expected:

* Tab B receives instantly

Then:

1. Open Tab C
2. Join same room

Expected:

* Previous messages load automatically
* New messages arrive instantly

No page refresh required.

---

## Deliverables

Provide:

1. Created files
2. Modified files
3. MongoDB collections used
4. API routes added
5. WebSocket events added
6. Verification steps
7. Any assumptions made

Implementation should be production-quality and aligned with PROJECT_RULES.md.
