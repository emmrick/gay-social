import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserBlock, useUnblockUser } from '@/hooks/useAdmin';

interface BlockedUserCardProps {
  block: UserBlock;
}

const BlockedUserCard = ({ block }: BlockedUserCardProps) => {
  const unblockUser = useUnblockUser();

  const isTemporary = block.suspension_type === 'temporary';
  const suspensionEnded = isTemporary && block.suspension_ends_at && new Date(block.suspension_ends_at) < new Date();

  return (
    <div className={`p-4 rounded-lg border ${suspensionEnded ? 'border-muted' : 'border-destructive/30'} ${suspensionEnded ? 'bg-muted/20' : 'bg-destructive/5'}`}>
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-destructive to-destructive/60 flex items-center justify-center text-white font-semibold flex-shrink-0">
          {block.user?.avatar_url ? (
            <img
              src={block.user.avatar_url}
              alt={block.user.username}
              className="w-full h-full rounded-full object-cover"
              loading="lazy"
            />
          ) : (
            block.user?.username?.charAt(0).toUpperCase() || '?'
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium">{block.user?.username || 'Utilisateur inconnu'}</p>
            <Badge variant={isTemporary ? 'outline' : 'destructive'} className="text-xs">
              {block.suspension_type === 'permanent' ? 'Permanent' : 'Temporaire'}
            </Badge>
            {suspensionEnded && (
              <Badge variant="secondary" className="text-xs">Expiré</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Bloqué le {format(new Date(block.blocked_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
          </p>
          {isTemporary && block.suspension_ends_at && (
            <p className={`text-sm ${suspensionEnded ? 'text-muted-foreground' : 'text-orange-500'}`}>
              {suspensionEnded ? 'Terminé le' : 'Jusqu\'au'} {format(new Date(block.suspension_ends_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
            </p>
          )}
          {block.reason && (
            <p className="text-sm text-destructive mt-1 truncate">
              Raison: {block.reason}
            </p>
          )}
        </div>

        {/* Unblock button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => unblockUser.mutate(block.user_id)}
          disabled={unblockUser.isPending}
        >
          {unblockUser.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <ShieldOff className="w-4 h-4 mr-1" />
              Débloquer
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default BlockedUserCard;
