import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Clock, Shield, MessageCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import BlockedUserSupportChat from '@/components/support/BlockedUserSupportChat';

const SuspendedUserScreen = () => {
  const { user, signOut } = useAuth();

  const { data: blockInfo } = useQuery({
    queryKey: ['user-block-info', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isPermanent = blockInfo?.suspension_type === 'permanent';
  const endsAt = blockInfo?.suspension_ends_at;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-orange-500/20 flex items-center justify-center mb-4">
            <Shield className="w-10 h-10 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Compte temporairement suspendu</h1>
          <p className="text-muted-foreground">
            Cher utilisateur, votre compte est temporairement en pause suite à un
            signalement d'un utilisateur.
          </p>
        </div>

        <Alert variant="destructive" className="border-orange-500/50 bg-orange-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Signalement en cours d'analyse</AlertTitle>
          <AlertDescription className="mt-2">
            Un agent humain reviendra dans les plus brefs délais pour analyser et
            débloquer votre compte rapidement, si vous n'avez commis aucune infraction
            sur le site.
          </AlertDescription>
        </Alert>

        {!isPermanent && endsAt && (
          <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              Suspension prévue jusqu'à:{' '}
              {formatDistanceToNow(new Date(endsAt), {
                addSuffix: true,
                locale: fr,
              })}
            </span>
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h3 className="font-medium">Que se passe-t-il ?</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Notre système IA a détecté un signalement vous concernant
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Par mesure de précaution, votre compte a été temporairement suspendu
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Un modérateur humain examine actuellement la situation
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Vous serez notifié dès que la situation sera clarifiée
            </li>
          </ul>
        </div>

        {/* Support contact info */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
          <div className="flex items-center gap-2 justify-center mb-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium text-foreground">Contactez le support</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Cliquez sur le bouton en bas à droite pour discuter avec un agent et demander des explications ou un déblocage.
          </p>
        </div>

        <button
          onClick={signOut}
          className="w-full text-sm text-muted-foreground hover:text-foreground underline"
        >
          Se déconnecter
        </button>
      </div>

      {/* Support chat widget */}
      <BlockedUserSupportChat />
    </div>
  );
};

export default SuspendedUserScreen;
