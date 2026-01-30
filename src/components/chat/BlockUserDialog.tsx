import { useState } from 'react';
import { Ban, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBlockUserAction } from '@/hooks/useUserBlock';

interface BlockUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  username: string;
  onBlocked?: () => void;
}

const BlockUserDialog = ({
  open,
  onOpenChange,
  userId,
  username,
  onBlocked,
}: BlockUserDialogProps) => {
  const blockUser = useBlockUserAction();

  const handleBlock = async () => {
    await blockUser.mutateAsync(userId);
    onOpenChange(false);
    onBlocked?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-destructive" />
            Bloquer {username} ?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              En bloquant cet utilisateur :
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Vous ne recevrez plus ses messages</li>
              <li>Il ne pourra plus vous envoyer de messages</li>
              <li>Il ne vous verra plus dans les profils à proximité</li>
              <li>Vous pourrez le débloquer à tout moment</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={blockUser.isPending}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleBlock}
            disabled={blockUser.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {blockUser.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Blocage...
              </>
            ) : (
              <>
                <Ban className="w-4 h-4 mr-2" />
                Bloquer
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BlockUserDialog;
