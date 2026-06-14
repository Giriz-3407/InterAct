// WebSocket and WebRTC signal events
export const WS_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  
  // Room events
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  USER_JOINED: 'user:joined',
  USER_LEFT: 'user:left',
  
  // Chat events
  CHAT_MESSAGE: 'chat:message',
  
  // RTC signaling
  SIGNAL_OFFER: 'signal:offer',
  SIGNAL_ANSWER: 'signal:answer',
  SIGNAL_ICE: 'signal:ice',
  
  // Interaction synchronization
  CURSOR_MOVE: 'cursor:move',
  CURSOR_CLICK: 'cursor:click',
  
  // Host transfers
  HOST_TRANSFER: 'host:transfer',
  HOST_STOP_SHARE: 'host:stop_share',
  
  // System alerts
  ERROR: 'system:error',
} as const;
