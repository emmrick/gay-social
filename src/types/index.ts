export interface User {
  id: string;
  username: string;
  avatar?: string;
  region: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: Date;
  type: 'text' | 'image' | 'video';
  imageUrl?: string;
}

export interface Region {
  code: string;
  name: string;
  memberCount: number;
}

export interface ChatRoom {
  id: string;
  name: string;
  region: string;
  memberCount: number;
  lastMessage?: Message;
  isPrivate: boolean;
}
