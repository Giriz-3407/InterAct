# WebRTC Audio Architecture

## Overview

This document describes the WebRTC audio architecture for the InterAct live collaboration platform. Audio flows are managed through a single `useWebRTC` hook at `frontend/src/hooks/useWebRTC.ts`.

## Peer Connection Ownership

- **Host**: Creates one `RTCPeerConnection` per connected viewer, keyed by `viewerId`.
- **Viewer**: Creates one `RTCPeerConnection` connected to the host.
- All peer connections are stored in `pcsRef` (`Map<string, RTCPeerConnection>`).
- On viewer disconnect, the host removes the corresponding PC via a cleanup effect.

## Upload Slot Design

Each viewer needs a dedicated audio transceiver to upload their microphone track to the host. This is called an **upload slot**.

### Slot Allocation

1. The host's `syncTracks` function checks if a `recvonly` audio transceiver exists on the peer connection.
2. If not, one is added via `pc.addTransceiver('audio', { direction: 'recvonly' })`.
3. The slot is identified by: no `sender.track` AND direction `recvonly` or `currentDirection` `recvonly`.
4. When the viewer unmutes, their mic track is attached to this slot via `attachViewerMicToPC`.

### Slot Reuse

- The recvonly slot **must be reused**, not replaced.
- Previously the code checked `!t.receiver.track` (whether a track was already attached). This caused duplicate slots when a viewer muted/unmuted because the slot already had a receiver track.
- The correct check is `!t.sender.track` — identifying the slot by its role (upload slot), not by whether it's currently carrying a track.

## Relay Design

When a viewer speaks, the host receives their audio track on the upload slot. The host then **relays** this track to all other viewers:

1. `ontrack` fires on the host for the viewer's audio.
2. The host iterates over `otherViewers` (all viewers except the source).
3. For each other viewer, `sendOfferToViewerRef.current(otherViewerId)` is called.
4. `syncTracks` on that viewer's PC includes the relayed mic track in the active tracks list.
5. The relayed track is sent as a standard `sendrecv` m-line (same as any other outgoing track).

## Audio Negotiation Flow

All negotiation paths converge at `syncAllViewers` (for host-initiated) or `sendOfferToViewer` (for viewer-initiated).

### 1. Host Mic Enable

```
Host unmutes
  → syncMic effect
    → getUserMedia (if first time)
      → syncAllViewersRef.current()
        → sendOfferToViewer(viewer) for each viewer
          → syncTracks (adds host mic + recvonly slot)
          → createOffer → setLocalDescription
          → webrtc_offer → viewer receives
            → createAnswer → setLocalDescription
            → webrtc_answer → host applies
            → ICE candidates exchanged → connected
```

### 2. Viewer Mic Enable

```
Viewer unmutes
  → syncMic effect
    → getUserMedia (if first time)
      → requestViewerMicPublish()
        → wsClient.send('audio_publish_request', { targetId: hostSocketId })
          → Host receives audio_publish_request
            → sendOfferToViewer(viewer)
              → syncTracks (adds recvonly slot if needed)
              → createOffer → setLocalDescription
              → webrtc_offer → viewer receives
                → attachViewerMicToPC (replaces track on upload slot)
                → createAnswer → setLocalDescription
                → webrtc_answer → host applies
                → ICE candidates → connected
```

### 3. Screen Share Start

```
Host clicks share
  → getDisplayMedia (with audio: true)
    → syncAllViewers()
      → sendOfferToViewer(viewer) for each viewer
        → syncTracks (adds display audio + video)
        → offer/answer cycle
```

### 4. Screen Share Stop

```
Host stops sharing
  → stopSharing()
    → syncAllViewers()
      → syncTracks removes display tracks
      → offer/answer cycle
```

### 5. Viewer Join (Late Joiner)

```
Viewer connects
  → participants_updated
    → late-joiner effect triggers
      → if any media source is active (display, mic, relayed mics)
        → sendOfferToViewer(newViewer) for each unconnected viewer
```

### 6. Viewer Leave

```
Viewer disconnects
  → participants_updated
    → viewer-cleanup effect
      → if viewer had a relayed mic track
        → syncAllViewers (removes departed viewer's relayed track from all remaining viewers)
```

## Stabilization Patterns

### Ref Pattern for Effect Dependencies

To break dependency chains that would cause unnecessary renegotiation:

```typescript
const syncAllViewersRef = useRef(syncAllViewers);
useEffect(() => {
  syncAllViewersRef.current = syncAllViewers;
}, [syncAllViewers]);
```

The `syncMic` effect uses `syncAllViewersRef.current()` instead of `syncAllViewers`, avoiding `viewerIds` in its dependency array. UI-only renders (opening drawers, chat, participants panel) no longer trigger renegotiation.

### Memoized Viewer Arrays

```typescript
const viewerIds = useMemo(
  () => participants.filter(p => p.role !== 'host').map(p => p.socketId),
  [participants]
);
```

Prevents new array references from being created on every render.

## Health Assertions

Runtime guards in `[WEBRTC_GUARD]` prefix:

| Guard | Location | Condition |
|---|---|---|
| Transceiver growth | `syncTracks` | Audio transceiver count > 10 |
| Duplicate PC | `createPeerConnection` | Replacing existing peer connection |
| Closed connection | `sendOfferToViewer` | PC connection state is `closed` |
| Ended sender track | `syncTracks` | Sender track readyState is `ended` |
| Duplicate upload slots | `syncTracks` | More than 1 recvonly audio slot per PC |

## Known Constraints

1. **No simulcast**: Audio tracks are not simulcast. Each viewer gets a single m-line per audio source.
2. **Relay latency**: Relayed viewer mic tracks pass through the host as a middlebox, adding one network hop.
3. **Single host architecture**: Only the host manages peer connections. Viewer-to-viewer audio always passes through the host.
4. **No renegotiation throttling**: Successive rapid mute/unmute cycles trigger one renegotiation per cycle. The ref pattern prevents accumulation but does not debounce.
5. **Firefox compatibility**: The `setStreams` method on `RTCRtpSender` is not available in Firefox. The code guards with `if (micSlot.sender.setStreams)`.
