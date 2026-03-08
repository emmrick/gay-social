import { useState } from 'react';
import { Timer, Check, Shield, AlertTriangle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useConversationAutoDelete, AUTO_DELETE_OPTIONS, AutoDeleteMode } from '@/hooks/useConversationAutoDelete';
import { cn } from '@/lib/utils';

interface ConversationAutoDeleteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  username: string;
}

const ConversationAutoDeleteSheet = ({ isOpen, onClose, conversationId, username }: ConversationAutoDeleteSheetProps) => {
  const { currentMode, setAutoDeleteMode } = useConversationAutoDelete(conversationId);
  const [selected, setSelected] = useState<AutoDeleteMode | null>(null);

  const handleSelect = (mode: AutoDeleteMode) => {
    setSelected(mode);
    setAutoDeleteMode.mutate({ conversationId, mode }, {
      onSuccess: () => {
        setSelected(null);
        onClose();
      },
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8 max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left pb-2">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Timer className="w-5 h-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base">Messages éphémères</SheetTitle>
              <SheetDescription className="text-xs">
                Conversation avec {username}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-2 mt-4">
          {AUTO_DELETE_OPTIONS.map((option) => {
            const isActive = currentMode === option.value;
            const isSelecting = selected === option.value && setAutoDeleteMode.isPending;

            return (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                disabled={setAutoDeleteMode.isPending}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left',
                  isActive
                    ? 'bg-primary/10 border border-primary/30'
                    : 'bg-muted/50 border border-transparent hover:bg-muted'
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  isActive ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                )}>
                  {isActive && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium',
                    isActive ? 'text-primary' : 'text-foreground'
                  )}>
                    {option.label}
                    {isSelecting && <span className="ml-2 text-xs text-muted-foreground">...</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Info box */}
        <div className="mt-5 p-3 rounded-xl bg-muted/50 border border-border space-y-2">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Les messages supprimés restent accessibles à l'équipe de modération en cas d'enquête. Ils seront définitivement effacés uniquement si vous supprimez votre compte.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              En cas d'infraction, l'historique complet des échanges et médias sera restauré pour analyse par l'équipe de modération.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ConversationAutoDeleteSheet;
