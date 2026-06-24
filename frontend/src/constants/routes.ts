// Routing path constants
export const ROUTES = {
  LANDING: '/',
  DASHBOARD: '/dashboard',
  ROOM: '/room/:roomId',
  HISTORY: '/history',
} as const;

export type RouteType = typeof ROUTES[keyof typeof ROUTES];
