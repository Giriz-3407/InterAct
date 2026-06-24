// Routing path constants
export const ROUTES = {
  LANDING: '/',
  DASHBOARD: '/dashboard',
  ROOM: '/room/:roomId',
  HISTORY: '/history',
  SPEECH_TEST: '/speech-test',
} as const;

export type RouteType = typeof ROUTES[keyof typeof ROUTES];
