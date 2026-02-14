import { useState } from 'react';
import { ClipboardList, Plus, Trash2, Send, X, Check, Loader2, Coins, Pencil, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useSavedMessages, SAVED_MESSAGE_COSTS } from '@/hooks/useSavedMessages';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SavedMessagesDialogProps {
  onSelectMessage: (content: string) => void;
}

const SavedMessagesDialog = ({ onSelectMessage }: SavedMessagesDialogProps) => {
  const { 
    savedMessages, 
    isLoading, 
    addMessage, 
    deleteMessage, 
    updateMessage,
    canAddMore, 
    canAffordCreate,
    canAffordUpdate,
    totalCredits,
    nextCreateCost,
  } = useSavedMessages();
  
  const [open, setOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<{ id: string; content: string } | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddMessage = async () => {
    if (!newMessageContent.trim()) {
      toast.error('Le message ne peut pas être vide');
      return;
    }
    
    setIsSaving(true);
    try {
      await addMessage(newMessageContent);
      setNewMessageContent('');
      setShowNewForm(false);
      if (nextCreateCost === 0) {
        toast.success('Message enregistré (gratuit)');
      } else {
        toast.success(`Message enregistré (-${nextCreateCost.toFixed(1)} crédits)`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateMessage = async () => {
    if (!editingMessage || !editingMessage.content.trim()) {
      toast.error('Le message ne peut pas être vide');
      return;
    }
    
    setIsSaving(true);
    try {
      await updateMessage(editingMessage.id, editingMessage.content);
      setEditingMessage(null);
      toast.success(`Message modifié (-${SAVED_MESSAGE_COSTS.update.toFixed(1)} crédits)`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectMessage = (id: string, content: string) => {
    if (editingMessage) return;
    setSelectedMessage(prev => prev?.id === id ? null : { id, content });
  };

  const handleConfirmSend = () => {
    if (selectedMessage) {
      onSelectMessage(selectedMessage.content);
      setSelectedMessage(null);
      setOpen(false);
      toast.success('Message envoyé');
    }
  };

  const handleDeleteMessage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMessage(id);
    if (selectedMessage?.id === id) setSelectedMessage(null);
    if (editingMessage?.id === id) setEditingMessage(null);
    toast.success('Message supprimé');
  };

  const handleStartEdit = (id: string, content: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMessage({ id, content });
    setSelectedMessage(null);
  };

  const handleShowNewForm = () => {
    if (!canAddMore) {
      toast.error('Limite de messages atteinte');
      return;
    }
    setShowNewForm(true);
    setEditingMessage(null);
    setSelectedMessage(null);
  };

  const canCreate = canAddMore && canAffordCreate;
  const canEdit = canAffordUpdate;

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) {
        setShowNewForm(false);
        setSelectedMessage(null);
        setEditingMessage(null);
        setNewMessageContent('');
      }
    }}>
      <DialogTrigger asChild>
        <button className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
          <ClipboardList className="w-6 h-6 text-primary" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl [&>button.absolute]:hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/40 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Messages enregistrés</DialogTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {savedMessages.length}/20 • {totalCredits.toFixed(1)} crédits
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {!showNewForm && !editingMessage && (
                <Button
                  variant={canCreate ? "default" : "secondary"}
                  size="sm"
                  onClick={handleShowNewForm}
                  disabled={!canCreate}
                  className="gap-1 h-8 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nouveau
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* New message form */}
        {showNewForm && (
          <div className="px-4 py-3 border-b border-border/30 bg-muted/20 flex-shrink-0">
            <Textarea
              value={newMessageContent}
              onChange={(e) => setNewMessageContent(e.target.value)}
              placeholder="Écris ton message à enregistrer..."
              className="min-h-[140px] max-h-[200px] resize-none bg-background border-border/50 focus:border-primary/50 text-sm"
              autoFocus
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Coins className="w-3 h-3" />
                {nextCreateCost === 0 ? 'Gratuit' : `${nextCreateCost.toFixed(1)} crédits`}
              </span>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setShowNewForm(false); setNewMessageContent(''); }}>
                  Annuler
                </Button>
                <Button size="sm" className="h-7 text-xs" onClick={handleAddMessage} disabled={isSaving || !newMessageContent.trim()}>
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Selected message send bar */}
        {selectedMessage && !editingMessage && (
          <div className="px-4 py-2.5 border-b border-primary/20 bg-primary/5 flex items-center gap-2 flex-shrink-0">
            <p className="text-xs text-foreground flex-1 truncate">
              Envoyer : <span className="text-muted-foreground">{selectedMessage.content.slice(0, 50)}{selectedMessage.content.length > 50 ? '…' : ''}</span>
            </p>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setSelectedMessage(null)}>
              <X className="w-3.5 h-3.5" />
            </Button>
            <Button variant="gradient" size="sm" className="h-7 text-xs gap-1 px-3" onClick={handleConfirmSend}>
              <Send className="w-3.5 h-3.5" />
              Envoyer
            </Button>
          </div>
        )}

        {/* Messages list - scrollable area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                  ))}
                </div>
              ) : savedMessages.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <ClipboardList className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Aucun message</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
                    Crée des messages pour les envoyer rapidement
                  </p>
                  {canCreate && (
                    <Button variant="outline" size="sm" onClick={handleShowNewForm} className="mt-3 gap-1 text-xs">
                      <Plus className="w-3.5 h-3.5" />
                      Créer un message {nextCreateCost === 0 ? '(gratuit)' : ''}
                    </Button>
                  )}
                </div>
              ) : (
                savedMessages.map((msg) => {
                  const isSelected = selectedMessage?.id === msg.id;
                  const isEditing = editingMessage?.id === msg.id;

                  if (isEditing) {
                    return (
                      <div key={msg.id} className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3">
                        <Textarea
                          value={editingMessage.content}
                          onChange={(e) => setEditingMessage({ ...editingMessage, content: e.target.value })}
                          className="min-h-[140px] max-h-[200px] resize-none text-sm bg-background"
                          autoFocus
                        />
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Coins className="w-3 h-3" />
                            {SAVED_MESSAGE_COSTS.update.toFixed(1)} crédits
                          </span>
                          <div className="flex gap-1.5">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingMessage(null)}>
                              Annuler
                            </Button>
                            <Button size="sm" className="h-7 text-xs" onClick={handleUpdateMessage} disabled={isSaving || !editingMessage.content.trim()}>
                              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                              Sauvegarder
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      onClick={() => handleSelectMessage(msg.id, msg.content)}
                      className={cn(
                        "group rounded-xl p-3 cursor-pointer transition-all duration-150 border",
                        isSelected
                          ? "border-primary/40 bg-primary/5 shadow-sm"
                          : "border-transparent bg-secondary/40 hover:bg-secondary/70 hover:border-border/50"
                      )}
                    >
                      <div className="flex gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                            {msg.content}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            {format(new Date(msg.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors disabled:opacity-30"
                            onClick={(e) => handleStartEdit(msg.id, msg.content, e)}
                            disabled={!canEdit}
                            title="Modifier"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            onClick={(e) => handleDeleteMessage(msg.id, e)}
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer with pricing info */}
        {savedMessages.length > 0 && !showNewForm && !editingMessage && !selectedMessage && (
          <div className="px-4 py-2 border-t border-border/30 flex-shrink-0">
            <p className="text-[10px] text-center text-muted-foreground">
              Appuie sur un message pour l'envoyer • Prochain : {nextCreateCost === 0 ? 'gratuit' : `${nextCreateCost.toFixed(1)} crédits`}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SavedMessagesDialog;
