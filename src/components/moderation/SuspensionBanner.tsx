import { ShieldX, Shield, Clock, MessageCircle } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useBlockedUserContext } from '@/components/BlockedUserGuard';
import BlockedUserSupportChat from '@/components/support/BlockedUserSupportChat';

const SuspensionBanner = () => {
  const { isRestricted, isBlocked, isSuspendedByAI, blockInfo } = useBlockedUserContext();

  if (!isRestricted) return null;

  const isPermanent = isBlocked;
  const reason = blockInfo?.reason;
  const blockedAt = blockInfo?.blocked_at;
  const endsAt = blockInfo?.suspension_ends_at;

  return (
    <>
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          {isPermanent ? (
            <ShieldX className="w-5 h-5 text-destructive shrink-0" />
          ) : (
            <Shield className="w-5 h-5 text-orange-500 shrink-0" />
          )}
          <h3 className="font-semibold text-sm text-foreground">
            {isPermanent ? 'Compte banni définitivement' : 'Compte temporairement suspendu'}
          </h3>
        </div>

        {reason && (
          <p className="text-xs text-foreground/80 pl-7">
            <span className="font-medium">Raison :</span> {reason}
          </p>
        )}

        {isPermanent && blockedAt && (
          <p className="text-xs text-muted-foreground pl-7">
            Depuis le {format(new Date(blockedAt), 'dd MMMM yyyy', { locale: fr })}
          </p>
        )}

        {!isPermanent && endsAt && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-7">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Fin prévue {formatDistanceToNow(new Date(endsAt), { addSuffix: true, locale: fr })}
            </span>
          </div>
        )}

        <p className="text-xs text-muted-foreground pl-7">
          {isPermanent
            ? 'Vous pouvez uniquement consulter et modifier votre profil. Contactez le support pour plus d\'informations.'
            : 'Votre compte est en cours de vérification. Vous pouvez consulter et modifier votre profil en attendant.'}
        </p>

        <div className="flex items-center gap-1.5 text-xs text-primary pl-7">
          <MessageCircle className="w-3.5 h-3.5" />
          <span>Cliquez sur le bouton en bas à droite pour contacter le support</span>
        </div>
      </div>

      <BlockedUserSupportChat />
    </>
  );
};

export default SuspensionBanner;
