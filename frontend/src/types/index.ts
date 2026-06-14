export interface Participant {
  id: string;
  name: string;
  role: 'host' | 'viewer';
  status: 'active' | 'idle' | 'offline';
  micOn: boolean;
  screenSharing: boolean;
  avatarColor: string;
}

export interface Room {
  id: string;
  name: string;
  status: 'live' | 'ended';
  hostId: string;
  hostName: string;
  durationSeconds: number;
  participants: Participant[];
  maxParticipants: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string; // ISO string
}

export interface Activity {
  id: string;
  type: 'room_created' | 'user_joined' | 'user_left' | 'screen_shared' | 'chat_message' | 'host_transfer';
  description: string;
  timestamp: string; // e.g. "2 min ago" or full date
  roomId?: string;
  userName?: string;
}

export interface PastSession {
  id: string;
  roomName: string;
  dateString: string;
  durationString: string;
  participantsCount: number;
  hostName: string;
  status: 'completed' | 'ended';
}
