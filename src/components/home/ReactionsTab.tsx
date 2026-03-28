import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Heart, Clock, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ReactionItem {
  id: string;
  reactor_user_id: string;
  emoji: string;
  created_at: string;
  is_seen: boolean;
  reactor_username: string;
  reactor_avatar: string | null;
}

interface ReactionsTabProps {
  onViewProfile?: (userId: string) => void;
}

const ReactionsTab = ({ onViewProfile }: ReactionsTabProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const markAsSeen = async (reactionId: string) => {
    await supabase
      .from('profile_reactions' as any)
      .update({ is_seen: true } as any)
      .eq('id', reactionId);
    queryClient.invalidateQueries({ queryKey: ['profile-reactions-count'] });
  };

  const { data: reactions, isLoading } = useQuery({
    queryKey: ['profile-reactions-list', user?.id],
    queryFn: async (): Promise<ReactionItem[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('profile_reactions' as any)
        .select('id, reactor_user_id, emoji, created_at, is_seen')
        .eq('profile_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !data) return [];

      const reactorIds = (data as any[]).map(r => r.reactor_user_id);
      if (reactorIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', reactorIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      return (data as any[]).map(reaction => {
        const profile = profileMap.get(reaction.reactor_user_id);
        return {
          id: reaction.id,
          reactor_user_id: reaction.reactor_user_id,
          emoji: reaction.emoji,
          created_at: reaction.created_at,
          is_seen: reaction.is_seen,
          reactor_username: profile?.username || 'Anonyme',
          reactor_avatar: profile?.avatar_url || null,
        };
      });
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 px-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
            <Skeleton className="w-11 h-11 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!reactions || reactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Heart className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Aucune réaction</h3>
        <p className="text-sm text-muted-foreground max-w-[240px]">
          Les réactions reçues sur votre profil s'afficheront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-1">
      <p className="text-xs text-muted-foreground px-1 mb-3">
        {reactions.length} réaction{reactions.length > 1 ? 's' : ''} reçue{reactions.length > 1 ? 's' : ''}
      </p>
      {reactions.map((reaction) => {
        const date = new Date(reaction.created_at);
        return (
          <button
            key={reaction.id}
            onClick={() => {
              if (!reaction.is_seen) markAsSeen(reaction.id);
              onViewProfile?.(reaction.reactor_user_id);
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:bg-accent/50 transition-colors text-left"
          >
            <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-primary/20 flex-shrink-0">
              {reaction.reactor_avatar ? (
                <img src={reaction.reactor_avatar} alt={reaction.reactor_username} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground truncate">
                {reaction.reactor_username}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <Clock className="w-3 h-3" />
                <span>
                  {format(date, "d MMM yyyy 'à' HH:mm", { locale: fr })}
                </span>
              </div>
            </div>
            <span className="text-2xl flex-shrink-0">{reaction.emoji}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ReactionsTab;
