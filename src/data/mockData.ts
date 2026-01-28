import { Region, User, Message, ChatRoom } from '@/types';

export const regions: Region[] = [
  { code: '75', name: 'Paris', memberCount: 1247 },
  { code: '13', name: 'Bouches-du-Rhône', memberCount: 634 },
  { code: '69', name: 'Rhône', memberCount: 521 },
  { code: '31', name: 'Haute-Garonne', memberCount: 412 },
  { code: '33', name: 'Gironde', memberCount: 389 },
  { code: '06', name: 'Alpes-Maritimes', memberCount: 356 },
  { code: '59', name: 'Nord', memberCount: 298 },
  { code: '34', name: 'Hérault', memberCount: 276 },
  { code: '44', name: 'Loire-Atlantique', memberCount: 234 },
  { code: '67', name: 'Bas-Rhin', memberCount: 198 },
  { code: '66', name: 'Pyrénées-Orientales', memberCount: 156 },
  { code: '62', name: 'Pas-de-Calais', memberCount: 143 },
];

export const mockUsers: User[] = [
  { id: '1', username: 'Alex75', region: '75', isOnline: true },
  { id: '2', username: 'Marco13', region: '13', isOnline: true },
  { id: '3', username: 'Lucas69', region: '69', isOnline: false, lastSeen: new Date(Date.now() - 3600000) },
  { id: '4', username: 'Thomas31', region: '31', isOnline: true },
  { id: '5', username: 'Julien33', region: '33', isOnline: false, lastSeen: new Date(Date.now() - 7200000) },
];

export const mockMessages: Message[] = [
  {
    id: '1',
    content: 'Salut tout le monde ! 👋',
    senderId: '1',
    senderName: 'Alex75',
    timestamp: new Date(Date.now() - 300000),
    type: 'text',
  },
  {
    id: '2',
    content: 'Hey ! Bienvenue dans le groupe 😊',
    senderId: '2',
    senderName: 'Marco13',
    timestamp: new Date(Date.now() - 240000),
    type: 'text',
  },
  {
    id: '3',
    content: 'Des plans pour ce weekend ?',
    senderId: '4',
    senderName: 'Thomas31',
    timestamp: new Date(Date.now() - 180000),
    type: 'text',
  },
];

export const mockChatRooms: ChatRoom[] = regions.map(region => ({
  id: `room-${region.code}`,
  name: `Groupe ${region.code} - ${region.name}`,
  region: region.code,
  memberCount: region.memberCount,
  isPrivate: false,
}));
