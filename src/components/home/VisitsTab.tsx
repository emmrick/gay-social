import { useProfileVisits } from '@/hooks/useProfileVisits';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Eye, Clock, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

interface VisitsTabProps {
  onViewProfile?: (userId: string) => void;
}

const VisitsTab = ({ onViewProfile }: VisitsTabProps) => {
  const { data: visits, isLoading } = useProfileVisits();

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

  if (!visits || visits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center mb-4">
          <Eye className="w-8 h-8 text-primary/40" />
        </div>
        <h3 className="font-bold text-foreground mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>Aucune visite</h3>
        <p className="text-sm text-muted-foreground max-w-[240px]">
          Les membres qui consultent votre profil apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-1">
      <div className="flex items-center gap-2 px-1 mb-3">
        <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
          <Eye className="w-3 h-3 text-primary" />
        </div>
        <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
          {visits.length} visite{visits.length > 1 ? 's' : ''}
        </span>
      </div>
      {visits.map((visit, index) => {
        const visitDate = new Date(visit.visited_at);
        return (
          <motion.button
            key={visit.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => onViewProfile?.(visit.visitor_user_id)}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/30 hover:border-primary/20 hover:shadow-sm transition-all text-left group"
          >
            <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center overflow-hidden border-2 border-primary/10 group-hover:border-primary/25 flex-shrink-0 transition-colors">
              {visit.visitor_avatar ? (
                <img src={visit.visitor_avatar} alt={visit.visitor_username} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground truncate">
                {visit.visitor_username}
                {visit.visitor_age && (
                  <span className="text-muted-foreground font-normal ml-1.5">{visit.visitor_age} ans</span>
                )}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 mt-0.5">
                <Clock className="w-3 h-3" />
                <span>
                  {format(visitDate, "d MMM yyyy 'à' HH:mm", { locale: fr })}
                </span>
              </div>
            </div>
            <Eye className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/50 flex-shrink-0 transition-colors" />
          </motion.button>
        );
      })}
    </div>
  );
};

export default VisitsTab;
