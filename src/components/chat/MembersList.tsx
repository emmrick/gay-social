import { User } from '@/types';
import { mockUsers } from '@/data/mockData';
import { MessageCircle, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MembersListProps {
  regionCode: string;
  onStartPrivateChat: (userId: string) => void;
}

const MembersList = ({ regionCode, onStartPrivateChat }: MembersListProps) => {
  const regionMembers = mockUsers.filter(user => user.region === regionCode || Math.random() > 0.5);
  
  return (
    <div className="p-4">
      <h2 className="font-display font-semibold text-lg mb-4">Membres en ligne</h2>
      
      <div className="space-y-2">
        {regionMembers.map((user) => (
          <MemberCard 
            key={user.id} 
            user={user} 
            onStartChat={() => onStartPrivateChat(user.id)} 
          />
        ))}
      </div>
    </div>
  );
};

const MemberCard = ({ user, onStartChat }: { user: User; onStartChat: () => void }) => {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-secondary/50 transition-colors group">
      {/* Avatar */}
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold">
          {user.username.charAt(0).toUpperCase()}
        </div>
        {user.isOnline && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-card" />
        )}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground truncate">{user.username}</h3>
        <p className="text-sm text-muted-foreground">
          {user.isOnline ? (
            <span className="text-green-500">En ligne</span>
          ) : user.lastSeen ? (
            `Vu ${formatDistanceToNow(user.lastSeen, { addSuffix: true, locale: fr })}`
          ) : (
            'Hors ligne'
          )}
        </p>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" onClick={onStartChat}>
          <MessageCircle className="w-5 h-5 text-primary" />
        </Button>
        <Button variant="ghost" size="icon">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default MembersList;
