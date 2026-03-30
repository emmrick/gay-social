import { Ban, Loader2, UserX, Unlock } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { SecureAvatar } from '@/components/ui/secure-avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBlockedUsers, useUnblockUserAction } from '@/hooks/useUserBlock';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BlockedUsersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BlockedUsersSheet = ({ open, onOpenChange }: BlockedUsersSheetProps) => {
  const { data: blockedUsers, isLoading } = useBlockedUsers();
  const unblockUser = useUnblockUserAction();

  const handleUnblock = async (blockedId: string) => {
    await unblockUser.mutateAsync(blockedId);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-destructive" />
            Utilisateurs bloqués
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(80vh-100px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !blockedUsers || blockedUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <UserX className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">Aucun utilisateur bloqué</p>
              <p className="text-sm text-muted-foreground mt-1">
                Les utilisateurs que vous bloquez apparaîtront ici
              </p>
            </div>
          ) : (
            <div className="space-y-2 px-1">
              <p className="text-xs text-muted-foreground px-2 mb-3">
                {blockedUsers.length} utilisateur{blockedUsers.length > 1 ? 's' : ''} bloqué{blockedUsers.length > 1 ? 's' : ''}
              </p>
              {blockedUsers.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50"
                >
                  <SecureAvatar
                    src={block.profile?.avatar_url}
                    alt={block.profile?.username}
                    fallback={block.profile?.username?.charAt(0).toUpperCase() || '?'}
                    className="w-10 h-10"
                    fallbackClassName="bg-destructive/10 text-destructive"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {block.profile?.username || 'Utilisateur supprimé'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Bloqué {formatDistanceToNow(new Date(block.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnblock(block.blocked_id)}
                    disabled={unblockUser.isPending}
                    className="flex-shrink-0"
                  >
                    {unblockUser.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5 mr-1" />
                        Débloquer
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default BlockedUsersSheet;
