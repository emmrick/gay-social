import { useProfileVisits } from '@/hooks/useProfileVisits';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Eye, Clock, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

interface VisitsTabProps {
  onViewProfile?: (userId: string) => void;
}

const VisitsTab = ({ onViewProfile }: VisitsTabProps) => {
  const { data: visits, isLoading } = useProfileVisits();

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

  if (!visits || visits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Eye className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Aucune visite</h3>
        <p className="text-sm text-muted-foreground max-w-[240px]">
          Les membres qui consultent votre profil apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-1">
      <p className="text-xs text-muted-foreground px-1 mb-3">
        {visits.length} visite{visits.length > 1 ? 's' : ''} sur votre profil
      </p>
      {visits.map((visit) => {
        const visitDate = new Date(visit.visited_at);
        return (
          <button
            key={visit.id}
            onClick={() => onViewProfile?.(visit.visitor_user_id)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:bg-accent/50 transition-colors text-left"
          >
            <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-primary/20 flex-shrink-0">
              {visit.visitor_avatar ? (
                <img src={visit.visitor_avatar} alt={visit.visitor_username} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground truncate">
                {visit.visitor_username}
                {visit.visitor_age && (
                  <span className="text-muted-foreground font-normal ml-1">{visit.visitor_age} ans</span>
                )}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <Clock className="w-3 h-3" />
                <span>
                  {format(visitDate, "d MMM yyyy 'à' HH:mm", { locale: fr })}
                </span>
              </div>
            </div>
            <Eye className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
};

export default VisitsTab;
