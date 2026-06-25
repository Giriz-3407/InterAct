# InterAct Project Rules

## Project Goal

Build a modern collaborative screen-sharing platform where:

* Users create temporary rooms
* Users join via shareable links
* A single host shares their screen
* Participants watch the shared screen
* Participants can chat
* Participants can use live cursors
* Participants can send click indicators
* Rooms are temporary and automatically deleted when empty

---

## Current MVP Scope

### Implement

* Room creation
* Room joining
* Temporary rooms
* Participant presence
* Participant list
* Chat (text + emojis)
* WebSocket communication
* WebRTC signaling
* Screen sharing
* Live participant cursors
* Click indicators
* Host transfer
* Auto room cleanup

### Do Not Implement Yet

* Authentication
* User accounts
* Authorization
* AI assistant
* Recording
* File uploads
* Images
* GIFs
* Notifications
* Analytics
* Mobile app
* TURN server
* Payment systems
* Persistent rooms

Unless explicitly requested.

---

## Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS

### Backend

* FastAPI
* Python 3.12+

### Database

* MongoDB Atlas

### Realtime

* WebSockets

### Media

* WebRTC

### STUN

* Google STUN

---

## Frontend Rules

Use:

* Functional components
* React hooks
* TypeScript everywhere

Create reusable components.

Avoid giant page files.

Prefer:

* features/
* components/
* layouts/

over monolithic structures.

Use Geist for headings and UI labels, Inter for body text, and Geist Mono for code, technical labels, and metadata as the typography system. Do NOT use Montserrat.

Keep styling in Tailwind CSS.

Avoid inline styles.

Keep pages responsive.

Allow and use:
* constants/
* lib/
as approved architecture directories for route/application constants, event names, utility functions, and client library wraps.

---

## Backend Rules

Use:

* FastAPI
* Pydantic models
* Modular architecture

Keep code separated into:

* routes
* services
* websocket handlers
* models
* database layer

Avoid putting business logic inside main.py.

---

## Architecture Principles

* Keep code modular
* Keep components reusable
* Avoid duplication
* Build incrementally
* Keep concerns separated
* Prefer simple solutions

---

## Development Workflow

Always ensure:

1. Project builds successfully
2. Project runs successfully
3. Features are tested
4. Existing functionality is not broken

before moving to the next milestone.

Do not over-engineer.

Prefer working functionality over premature optimization.

---

## UI Philosophy

Prioritize:

* Correct layouts
* Correct navigation
* Correct component structure

before visual polish.

Styling can be improved later.

Component architecture should be correct from the beginning.

---

## Current Product Decisions

* Temporary rooms
* No authentication
* Join via room link
* Display name only
* Single active presenter
* Host creates room
* Host transfer when host leaves
* Screen sharing stops when host leaves
* Chat retained while room exists
* Live cursors fade when inactive
* Click indicators enabled
* Room auto-deletes when empty

These decisions should be treated as requirements unless explicitly changed.
