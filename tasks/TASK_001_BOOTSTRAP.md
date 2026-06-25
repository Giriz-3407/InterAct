# Task 001 - Project Bootstrap

Read PROJECT_RULES.md before making any changes.

---

## Create Project Structure

Create:

project-root/
├── PROJECT_RULES.md
├── frontend/
└── backend/

---

## Frontend Setup

Initialize:

* React
* TypeScript
* Vite
* Tailwind CSS

Create:

frontend/src/
├── assets/
├── components/
├── layouts/
├── pages/
├── routes/
├── hooks/
├── services/
├── types/
├── features/
│   ├── rooms/
│   ├── chat/
│   ├── participants/
│   └── collaboration/
└── App.tsx

Use Montserrat as the default font.

---

## Backend Setup

Initialize:

* FastAPI
* Python virtual environment
* requirements.txt

Create:

backend/
└── app/
├── api/
├── websocket/
├── rooms/
├── chat/
├── signaling/
├── database/
├── models/
├── services/
└── main.py

---

## Frontend Pages

Create UI shells only.

No real business logic yet.

Create:

* Landing Page
* Dashboard
* Room Collaboration Workspace
* Room History Page
* Host Control Page

Use the Stitch designs as references.

Implement:

* Layouts
* Sidebars
* Navigation
* Toolbars
* Page structure
* Mock data

The application should look and feel similar to the Stitch designs.

---

## Backend Shell

Create:

* FastAPI application
* Health endpoint
* Environment configuration
* MongoDB connection placeholder
* WebSocket placeholder

Do not implement business logic yet.

---

## Do Not Implement Yet

Do not implement:

* Authentication
* Chat
* WebRTC
* Screen sharing
* MongoDB persistence
* Cursor synchronization
* Click indicators
* AI assistant
* Recording

These will be implemented in future tasks.

---

## Success Criteria

The project must:

* Compile successfully
* Run successfully
* Have no TypeScript errors
* Have no Python import errors

Frontend should display all page shells.

Backend should start successfully.

Return a summary of:

* Created folders
* Created files
* Installed dependencies
* Available routes

when the task is complete.
