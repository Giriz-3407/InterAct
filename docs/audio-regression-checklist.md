# Audio Regression Checklist

Run through this checklist before every release to verify WebRTC audio stability.

## Prerequisites

- Two browser tabs: one as Host, one as Viewer
- Microphone permissions granted
- Screen share permissions granted

## Checklist

### 1. Host can speak

1. Host unmutes mic
2. Viewer hears host's audio
3. Audio is clear (no excessive noise/distortion)

### 2. Viewer can speak

1. Viewer unmutes mic
2. Host hears viewer's audio
3. Audio is clear

### 3. Host and viewer can speak simultaneously

1. Both unmute
2. Both hear each other
3. No echo or feedback

### 4. Mute/unmute works

1. Host mutes → Viewer stops hearing host
2. Host unmutes → Viewer hears host again
3. Viewer mutes → Host stops hearing viewer
4. Viewer unmutes → Host hears viewer again

### 5. Host refresh and reconnect

1. Host refreshes the page
2. Host rejoins the room
3. Host unmutes mic
4. Viewer hears host again
5. Viewer can still speak

### 6. Viewer refresh and reconnect

1. Viewer refreshes the page
2. Viewer rejoins the room
3. Viewer unmutes mic
4. Host hears viewer again
5. Host can still speak

### 7. Screen share + audio works

1. Host starts screen share (with audio)
2. Viewer sees the shared screen
3. Host unmutes mic
4. Viewer hears both screen audio and mic audio
5. Host stops screen share
6. Audio continues working

### 8. Multiple mute/unmute cycles (stability test)

1. Mute/unmute at least 10 times on both host and viewer
2. Audio still works after each cycle
3. No transceiver growth (check browser console for `[WEBRTC_GUARD]` warnings)

### 9. Multiple viewers

1. Open 3+ viewer tabs
2. All viewers hear host's mic
3. All viewers can speak and be heard by host
4. Each viewer's mic is relayed to all other viewers

### 10. Long session

1. Keep audio active for 30+ minutes
2. Periodically mute/unmute
3. Screen share for a few minutes
4. Verify audio still works at the end
5. Check transceiver count remains stable

## Troubleshooting

If any test fails, check browser console for:

- `[WEBRTC_GUARD]` — health assertion violations
- `[WebRTC]` — normal WebRTC signaling log
- `[VoiceNegotiation]` — voice negotiation state transitions

## Transceiver Count Reference

| Scenario | Expected Audio Transceivers |
|---|---|
| Room created, no media | 0 |
| Host unmutes (no viewers) | 0 |
| Host unmutes (1 viewer) | 2–3 |
| Viewer unmutes | 2–3 |
| Both muted | 1–2 |
| Screen sharing + voice | 2–3 |
| After 10 mute/unmute cycles | 2–3 (no growth) |
