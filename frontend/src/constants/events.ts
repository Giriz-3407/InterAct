// WebSocket and WebRTC signal events
// These must match the event strings used by the backend connection manager.
export const WS_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',

  // Room lifecycle
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  ROOM_JOINED: 'room_joined',
  PARTICIPANT_JOINED: 'participant_joined',
  PARTICIPANT_LEFT: 'participant_left',
  PARTICIPANTS_UPDATED: 'participants_updated',

  // Chat
  CHAT_MESSAGE: 'chat_message',

  // WebRTC signaling (relayed through the server, not processed)
  WEBRTC_OFFER: 'webrtc_offer',
  WEBRTC_ANSWER: 'webrtc_answer',
  ICE_CANDIDATE: 'ice_candidate',

  // Screen share lifecycle
  HOST_STOP_SHARE: 'host_stop_share',

  // System
  ERROR: 'system:error',
} as const;

export type WSEvent = typeof WS_EVENTS[keyof typeof WS_EVENTS];
