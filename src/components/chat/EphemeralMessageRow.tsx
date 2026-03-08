import { ReactNode } from 'react';
import { useEphemeralMedia } from '@/hooks/useEphemeralMedia';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, Shield } from 'lucide-react';

interface EphemeralMessageRowProps {
  messageId: string;
  senderId: string;
  children: ReactNode;
}

/**
 * Wrapper that hides entire message row for viewed ephemeral media.
 * Exception: shows a red investigation banner if screenshot was detected.
 */
const EphemeralMessageRow = ({ messageId, senderId, children }: EphemeralMessageRowProps) => {
  const { user } = useAuth();
  const { media, isLoading } = useEphemeralMedia(messageId);
  const isOwn = senderId === user?.id;
  const isUnlimited = media?.view_duration === 0;

  // Still loading - show children (EphemeralMessage handles its own loading state)
  if (isLoading || !media) return <>{children}</>;

  // Not yet viewed - show normally
  if (!media.is_viewed) return <>{children}</>;

  // Unlimited duration - always visible
  if (isUnlimited) return <>{children}</>;

  // Screenshot detected = investigation mode → show red banner
  if (media.screenshot_detected) {
    return (
      <div className="flex justify-center my-3">
        <div className="max-w-[90%] bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
            <span className="text-xs font-bold text-destructive">
              {isOwn ? '⚠️ Contenu sous surveillance' : '⚠️ Capture d\'écran détectée'}
            </span>
          </div>
          {isOwn ? (
            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Le destinataire a effectué une capture d'écran de votre média éphémère. Ce contenu a été conservé pour l'équipe de modération.
              </p>
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-destructive/20">
                <Shield className="w-3 h-3 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground italic">
                  La modération enquête sur le comportement du membre. Vos données restent confidentielles.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-[11px] text-destructive/80 leading-relaxed">
                Vous avez fait une capture d'écran d'un contenu éphémère. Cette infraction a été notée dans votre dossier.
              </p>
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-destructive/20">
                <Shield className="w-3 h-3 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground italic">
                  Ce contenu est visible par la modération uniquement dans le cadre de l'enquête. Votre vie privée reste notre priorité.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Viewed + no investigation → hide entirely from history
  return null;
};

export default EphemeralMessageRow;
