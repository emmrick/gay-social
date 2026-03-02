import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Star, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const SupportRatingsPanel = () => {
  const { user } = useAuth();

  const { data: ratings = [], isLoading } = useQuery({
    queryKey: ['my-support-ratings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('support_tickets' as any)
        .select('id, ticket_number, rating_emoji, rating_comment, rated_at, user_id, closed_at')
        .eq('assigned_to', user.id)
        .not('rating_emoji', 'is', null)
        .order('rated_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Array<{
        id: string;
        ticket_number: string;
        rating_emoji: string;
        rating_comment: string | null;
        rated_at: string;
        user_id: string;
        closed_at: string | null;
      }>;
    },
    enabled: !!user?.id,
  });

  // Fetch user profiles for rated tickets
  const userIds = [...new Set(ratings.map(r => r.user_id))];
  const { data: profiles } = useQuery({
    queryKey: ['rating-user-profiles', userIds.join(',')],
    queryFn: async () => {
      if (userIds.length === 0) return {};
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds);
      const map: Record<string, string> = {};
      data?.forEach(p => { map[p.user_id] = p.username; });
      return map;
    },
    enabled: userIds.length > 0,
  });

  // Stats
  const emojiOrder = ['😡', '😕', '😐', '😊', '🤩'];
  const emojiCounts = emojiOrder.map(e => ({
    emoji: e,
    count: ratings.filter(r => r.rating_emoji === e).length,
  }));
  const avgScore = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + emojiOrder.indexOf(r.rating_emoji) + 1, 0) / ratings.length).toFixed(1)
    : '—';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          Mes avis d'assistance
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Consultez les avis laissés par les clients après vos conversations de support.
        </p>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{ratings.length}</p>
          <p className="text-xs text-muted-foreground">Avis reçus</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{avgScore}</p>
          <p className="text-xs text-muted-foreground">Score moyen /5</p>
        </Card>
        {emojiCounts.map(({ emoji, count }) => (
          <Card key={emoji} className="p-3 text-center">
            <p className="text-xl">{emoji}</p>
            <p className="text-sm font-bold">{count}</p>
          </Card>
        ))}
      </div>

      {/* Ratings list */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
          ) : ratings.length === 0 ? (
            <div className="text-center py-12">
              <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucun avis reçu pour le moment.</p>
            </div>
          ) : (
            ratings.map((rating) => (
              <Card key={rating.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{rating.rating_emoji}</span>
                      <div>
                        <p className="text-sm font-medium">
                          {profiles?.[rating.user_id] || 'Utilisateur'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Ticket #{rating.ticket_number} • {format(new Date(rating.rated_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    {rating.rating_comment && (
                      <div className="mt-2 flex items-start gap-2 bg-muted/50 rounded-xl px-3 py-2">
                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">{rating.rating_comment}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default SupportRatingsPanel;
