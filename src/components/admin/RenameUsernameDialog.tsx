import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, PencilLine } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useLogModerationAction } from '@/hooks/useModerationActions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentUsername: string;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_\-. ]{2,30}$/;

const RenameUsernameDialog = ({ open, onOpenChange, userId, currentUsername }: Props) => {
  const [value, setValue] = useState(currentUsername);
  const queryClient = useQueryClient();
  const logAction = useLogModerationAction();

  useEffect(() => {
    if (open) setValue(currentUsername);
  }, [open, currentUsername]);

  const mutation = useMutation({
    mutationFn: async (newUsername: string) => {
      const trimmed = newUsername.trim();
      if (trimmed === currentUsername) {
        throw new Error('Le surnom est identique au surnom actuel');
      }
      if (!USERNAME_REGEX.test(trimmed)) {
        throw new Error("Surnom invalide (2-30 caractères, lettres/chiffres/_-. uniquement)");
      }

      // Check uniqueness (case-insensitive)
      const { data: existing, error: checkError } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('username', trimmed)
        .neq('user_id', userId)
        .maybeSingle();
      if (checkError) throw checkError;
      if (existing) throw new Error('Ce surnom est déjà utilisé');

      const { error } = await supabase
        .from('profiles')
        .update({ username: trimmed })
        .eq('user_id', userId);
      if (error) throw error;

      await logAction.mutateAsync({
        targetUserId: userId,
        actionType: 'username_changed',
        details: `Surnom modifié : « ${currentUsername} » → « ${trimmed} »`,
        metadata: { field: 'username', old: currentUsername, new: trimmed },
      });

      return trimmed;
    },
    onSuccess: (newUsername) => {
      toast.success(`Surnom modifié : ${newUsername}`);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast.error(e?.message ?? 'Erreur lors de la modification du surnom');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PencilLine className="w-4 h-4" />
            Modifier le surnom
          </DialogTitle>
          <DialogDescription>
            Corrige un surnom affiché publiquement (ex : adresse e-mail saisie par erreur). L'action est journalisée.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Surnom actuel</Label>
            <p className="text-sm font-medium px-3 py-2 rounded-md bg-muted/50 break-all">
              {currentUsername}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-username">Nouveau surnom</Label>
            <Input
              id="new-username"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={30}
              placeholder="ex: Alex75"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              2 à 30 caractères. Lettres, chiffres, _ - . et espaces autorisés.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Annuler
          </Button>
          <Button onClick={() => mutation.mutate(value)} disabled={mutation.isPending || !value.trim()}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PencilLine className="w-4 h-4 mr-2" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RenameUsernameDialog;
