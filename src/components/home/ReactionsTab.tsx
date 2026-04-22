import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Heart, Clock, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { getSignedAvatarUrl } from '@/hooks/useAvatarUrl';

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

      const results = await Promise.all((data as any[]).map(async reaction => {
        const profile = profileMap.get(reaction.reactor_user_id);
        const signedAvatar = profile?.avatar_url ? await getSignedAvatarUrl(profile.avatar_url) : null;
        return {
          id: reaction.id,
          reactor_user_id: reaction.reactor_user_id,
          emoji: reaction.emoji,
          created_at: reaction.created_at,
          is_seen: reaction.is_seen,
          reactor_username: profile?.username || 'Anonyme',
          reactor_avatar: signedAvatar,
        };
      }));
      return results;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-2.5 px-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/30">
            <Skeleton className="w-11 h-11 rounded-2xl" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-28 rounded-lg" />
              <Skeleton className="h-3 w-36 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!reactions || reactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center mb-4">
          <Heart className="w-8 h-8 text-primary/40" />
        </div>
        <h3 className="font-bold text-foreground mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>Aucune réaction</h3>
        <p className="text-sm text-muted-foreground max-w-[240px]">
          Les réactions reçues sur votre profil s'afficheront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-1">
      <div className="flex items-center gap-2 px-1 mb-3">
        <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
          <Heart className="w-3 h-3 text-primary" />
        </div>
        <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
          {reactions.length} réaction{reactions.length > 1 ? 's' : ''}
        </span>
      </div>
      {reactions.map((reaction, index) => {
        const date = new Date(reaction.created_at);
        return (
          <motion.button
            key={reaction.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => {
              if (!reaction.is_seen) markAsSeen(reaction.id);
              onViewProfile?.(reaction.reactor_user_id);
            }}
            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl bg-card border transition-all text-left group ${
              !reaction.is_seen
                ? 'border-primary/25 bg-primary/5 shadow-sm shadow-primary/5'
                : 'border-border/30 hover:border-primary/20 hover:shadow-sm'
            }`}
          >
            <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center overflow-hidden border-2 border-primary/10 group-hover:border-primary/25 flex-shrink-0 transition-colors">
              {reaction.reactor_avatar ? (
                <img src={reaction.reactor_avatar} alt={reaction.reactor_username} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground truncate">
                {reaction.reactor_username}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 mt-0.5">
                <Clock className="w-3 h-3" />
                <span>
                  {format(date, "d MMM yyyy 'à' HH:mm", { locale: fr })}
                </span>
              </div>
            </div>
            <span className="text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">{reaction.emoji}</span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default ReactionsTab;
