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
import { Badge } from '@/components/ui/badge';
import { useSavedMessages, SAVED_MESSAGE_COSTS } from '@/hooks/useSavedMessages';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
    totalCredits 
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
      toast.success('Message enregistré (-3.5 crédits)');
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
      toast.success('Message modifié (-2.0 crédits)');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectMessage = (id: string, content: string) => {
    if (editingMessage) return;
    setSelectedMessage({ id, content });
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
    if (selectedMessage?.id === id) {
      setSelectedMessage(null);
    }
    if (editingMessage?.id === id) {
      setEditingMessage(null);
    }
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-primary flex-shrink-0 h-10 w-10"
        >
          <ClipboardList className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Messages enregistrés</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {savedMessages.length} message{savedMessages.length > 1 ? 's' : ''} • Solde: {totalCredits.toFixed(1)} crédits
                </p>
              </div>
            </div>
            {!showNewForm && !editingMessage && (
              <Button
                variant={canCreate ? "default" : "secondary"}
                size="sm"
                onClick={handleShowNewForm}
                disabled={!canCreate}
                className="gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Nouveau
                <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0">
                  {SAVED_MESSAGE_COSTS.create}
                </Badge>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Cost info banner */}
        <div className="px-6 py-3 bg-muted/30 border-b border-border/30">
          <div className="flex items-center justify-center gap-6 text-xs">
            <div className="flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-muted-foreground">Créer:</span>
              <span className="font-medium text-foreground">{SAVED_MESSAGE_COSTS.create} crédits</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-muted-foreground">Modifier:</span>
              <span className="font-medium text-foreground">{SAVED_MESSAGE_COSTS.update} crédits</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* New message form */}
          {showNewForm && (
            <div className="p-4 bg-gradient-to-b from-primary/5 to-transparent border-b border-border/30">
              <div className="space-y-3">
                <Textarea
                  value={newMessageContent}
                  onChange={(e) => setNewMessageContent(e.target.value)}
                  placeholder="Écris ton message à enregistrer..."
                  className="min-h-[100px] resize-none bg-background/80 backdrop-blur-sm border-primary/20 focus:border-primary/50"
                  autoFocus
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Coins className="w-3.5 h-3.5" />
                    <span>Coût: {SAVED_MESSAGE_COSTS.create} crédits</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowNewForm(false);
                        setNewMessageContent('');
                      }}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Annuler
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleAddMessage}
                      disabled={isSaving || !newMessageContent.trim()}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-1" />
                      )}
                      Enregistrer
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Selected message preview */}
          {selectedMessage && !editingMessage && (
            <div className="p-4 bg-gradient-to-b from-accent/10 to-transparent border-b border-border/30">
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-background/80 backdrop-blur-sm border border-accent/20">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedMessage.content}
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMessage(null)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Annuler
                  </Button>
                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={handleConfirmSend}
                    className="gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    Envoyer ce message
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Messages list */}
          <ScrollArea className="flex-1 px-4 py-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : savedMessages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <ClipboardList className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-foreground">Aucun message enregistré</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
                  Crée ton premier message pour l'envoyer rapidement plus tard
                </p>
                {canCreate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShowNewForm}
                    className="mt-4 gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Créer un message
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {savedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg.id, msg.content)}
                    className={`group relative rounded-xl transition-all duration-200 ${
                      editingMessage?.id === msg.id
                        ? 'ring-2 ring-blue-500/50 bg-blue-500/5'
                        : selectedMessage?.id === msg.id
                        ? 'ring-2 ring-primary/50 bg-primary/5'
                        : 'bg-secondary/50 hover:bg-secondary/80 cursor-pointer hover:shadow-md'
                    }`}
                  >
                    {editingMessage?.id === msg.id ? (
                      <div className="p-4 space-y-3">
                        <Textarea
                          value={editingMessage.content}
                          onChange={(e) => setEditingMessage({ ...editingMessage, content: e.target.value })}
                          className="min-h-[80px] resize-none"
                          autoFocus
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Coins className="w-3.5 h-3.5" />
                            <span>Coût: {SAVED_MESSAGE_COSTS.update} crédits</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingMessage(null)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Annuler
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={handleUpdateMessage}
                              disabled={isSaving || !editingMessage.content.trim()}
                            >
                              {isSaving ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4 mr-1" />
                              )}
                              Sauvegarder
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground line-clamp-3 leading-relaxed">
                              {msg.content}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-2">
                              {format(new Date(msg.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                              onClick={(e) => handleStartEdit(msg.id, msg.content, e)}
                              disabled={!canEdit}
                              title={canEdit ? "Modifier (2.0 crédits)" : "Crédits insuffisants"}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => handleDeleteMessage(msg.id, e)}
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Footer */}
        {savedMessages.length > 0 && !showNewForm && !editingMessage && !selectedMessage && (
          <div className="px-6 py-3 border-t border-border/50 bg-muted/20">
            <p className="text-[11px] text-center text-muted-foreground">
              Clique sur un message pour l'envoyer • Utilise les icônes pour modifier ou supprimer
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SavedMessagesDialog;
