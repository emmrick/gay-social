/**
 * Single rating card — reused by RatingsBoard.
 */
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { SupportRatingRow } from '@/services/admin/tasksApi';

interface RatingCardProps {
  rating: SupportRatingRow;
  username?: string;
}

const RatingCard = ({ rating, username }: RatingCardProps) => (
  <Card className="p-4">
    <div className="flex items-start gap-3">
      <span className="text-2xl shrink-0">{rating.rating_emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{username || 'Utilisateur'}</p>
        <p className="text-[11px] text-muted-foreground">
          Ticket #{rating.ticket_number} • {format(new Date(rating.rated_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
        </p>
        {rating.rating_comment && (
          <div className="mt-2 flex items-start gap-2 bg-muted/50 rounded-xl px-3 py-2">
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{rating.rating_comment}</p>
          </div>
        )}
      </div>
    </div>
  </Card>
);

export default RatingCard;
