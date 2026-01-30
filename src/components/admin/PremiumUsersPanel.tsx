import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Crown, Search, Loader2, User, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface PremiumUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  is_premium: boolean;
  is_online: boolean;
  last_seen: string | null;
  created_at: string;
  region: string;
}

const PremiumUsersPanel = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: premiumUsers, isLoading } = useQuery({
    queryKey: ['admin-premium-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, is_premium, is_online, last_seen, created_at, region')
        .eq('is_premium', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PremiumUser[];
    },
  });

  const filteredUsers = premiumUsers?.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold">Membres Premium</h3>
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">
            {premiumUsers?.length || 0}
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par pseudo ou région..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users List */}
      <ScrollArea className="h-[500px]">
        {!filteredUsers?.length ? (
          <div className="text-center py-12 text-muted-foreground">
            <Crown className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucun membre premium trouvé</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <PremiumUserCard key={user.user_id} user={user} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

const PremiumUserCard = ({ user }: { user: PremiumUser }) => {
  const memberSince = formatDistanceToNow(new Date(user.created_at), {
    addSuffix: true,
    locale: fr,
  });

  return (
    <div className="p-4 rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative">
          <Avatar className="w-12 h-12 ring-2 ring-amber-500/50">
            {user.avatar_url ? (
              <AvatarImage src={user.avatar_url} alt={user.username} />
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                {user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          {/* Online indicator */}
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background ${
              user.is_online ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium truncate">{user.username}</p>
            <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 text-xs">
              <Crown className="w-3 h-3 mr-1" />
              Premium
            </Badge>
          </div>
          
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {user.region}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Inscrit {memberSince}
            </span>
          </div>

          {!user.is_online && user.last_seen && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Vu {formatDistanceToNow(new Date(user.last_seen), { addSuffix: true, locale: fr })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PremiumUsersPanel;
