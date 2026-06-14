import type { Room, Participant, ChatMessage, Activity, PastSession } from '../types';

export const MOCK_PARTICIPANTS: Participant[] = [
  { id: '1', name: 'Girish K', role: 'host', status: 'active', micOn: true, screenSharing: false, avatarColor: 'bg-indigo-500' },
  { id: '2', name: 'Alex Smith', role: 'viewer', status: 'active', micOn: false, screenSharing: false, avatarColor: 'bg-emerald-500' },
  { id: '3', name: 'Sarah Johnson', role: 'viewer', status: 'active', micOn: true, screenSharing: false, avatarColor: 'bg-rose-500' },
  { id: '4', name: 'Marco Rossi', role: 'viewer', status: 'idle', micOn: false, screenSharing: false, avatarColor: 'bg-amber-500' },
];

export const MOCK_ROOMS: Room[] = [
  {
    id: 'ABC-123',
    name: 'Design Review: Mobile App',
    status: 'live',
    hostId: '1',
    hostName: 'Girish K',
    durationSeconds: 2700, // 45 min
    participants: MOCK_PARTICIPANTS,
    maxParticipants: 16,
  },
  {
    id: 'XYZ-789',
    name: 'Weekly Tech Sync',
    status: 'live',
    hostId: '3',
    hostName: 'Sarah Johnson',
    durationSeconds: 720, // 12 min
    participants: [MOCK_PARTICIPANTS[2], MOCK_PARTICIPANTS[3]],
    maxParticipants: 16,
  },
];

export const MOCK_ACTIVITIES: Activity[] = [
  { id: 'a1', type: 'chat_message', description: 'Alex mentioned you in Design Review: "Verify if the spacing is correct"', timestamp: '2 min ago' },
  { id: 'a2', type: 'screen_shared', description: 'Weekly Tech Sync recording is now available', timestamp: '1 hour ago' },
  { id: 'a3', type: 'chat_message', description: 'Marco commented on auth_controller.go', timestamp: '3 hours ago' },
  { id: 'a4', type: 'room_created', description: 'Sarah created a new room: API Integration Debugging', timestamp: 'Yesterday' },
];

export const MOCK_PAST_SESSIONS: PastSession[] = [
  { id: 's1', roomName: 'Q3 Strategy Alignment', dateString: 'Oct 24, 2023 • 10:00 AM', durationString: '1h 12m', participantsCount: 7, hostName: 'Alex Smith', status: 'completed' },
  { id: 's2', roomName: 'Design Critique: CollabOS v2', dateString: 'Oct 23, 2023 • 02:30 PM', durationString: '45m 00s', participantsCount: 4, hostName: 'Girish K', status: 'ended' },
  { id: 's3', roomName: 'API Integration Debugging', dateString: 'Oct 22, 2023 • 11:15 AM', durationString: '2h 05m', participantsCount: 2, hostName: 'Marco Rossi', status: 'completed' },
  { id: 's4', roomName: 'Marketing Launch Sync', dateString: 'Oct 21, 2023 • 09:00 AM', durationString: '30m 12s', participantsCount: 13, hostName: 'Sarah Johnson', status: 'completed' },
];

export const MOCK_MESSAGES: ChatMessage[] = [
  { id: 'm1', roomId: 'ABC-123', senderId: '2', senderName: 'Alex Smith', message: 'Check out line 10 in the auth_controller.go file.', timestamp: '10:45 AM' },
  { id: 'm2', roomId: 'ABC-123', senderId: '1', senderName: 'Girish K', message: 'Got it. I will review the ShouldBindJSON call.', timestamp: '10:46 AM' },
];
