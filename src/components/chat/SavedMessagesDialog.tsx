import { useState } from 'react';
import { ClipboardList, Plus, Trash2, Send, X, Check } from 'lucide-react';
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
import { useSavedMessages } from '@/hooks/useSavedMessages';
import { toast } from 'sonner';

interface SavedMessagesDialogProps {
  onSelectMessage: (content: string) => void;
}

const SavedMessagesDialog = ({ onSelectMessage }: SavedMessagesDialogProps) => {
  const { savedMessages, addMessage, deleteMessage } = useSavedMessages();
  const [open, setOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<{ id: string; content: string } | null>(null);

  const handleAddMessage = () => {
    if (!newMessageContent.trim()) {
      toast.error('Le message ne peut pas être vide');
      return;
    }
    addMessage(newMessageContent);
    setNewMessageContent('');
    setShowNewForm(false);
    toast.success('Message enregistré');
  };

  const handleSelectMessage = (id: string, content: string) => {
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
    toast.success('Message supprimé');
  };

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
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Messages enregistrés</span>
            {!showNewForm && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewForm(true)}
                className="h-8 w-8"
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* New message form */}
        {showNewForm && (
          <div className="p-3 bg-secondary rounded-lg space-y-3">
            <Textarea
              value={newMessageContent}
              onChange={(e) => setNewMessageContent(e.target.value)}
              placeholder="Écris ton message à enregistrer..."
              className="min-h-[80px] resize-none"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
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
              >
                <Check className="w-4 h-4 mr-1" />
                Enregistrer
              </Button>
            </div>
          </div>
        )}

        {/* Selected message preview */}
        {selectedMessage && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg space-y-3">
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {selectedMessage.content}
            </p>
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
              >
                <Send className="w-4 h-4 mr-1" />
                Envoyer
              </Button>
            </div>
          </div>
        )}

        {/* Messages list */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {savedMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Aucun message enregistré</p>
              <p className="text-xs mt-1">
                Clique sur + pour créer ton premier message
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {savedMessages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => handleSelectMessage(msg.id, msg.content)}
                  className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedMessage?.id === msg.id
                      ? 'bg-primary/20 border border-primary/30'
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-foreground line-clamp-3 flex-1">
                      {msg.content}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={(e) => handleDeleteMessage(msg.id, e)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SavedMessagesDialog;
