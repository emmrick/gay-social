import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { BookmarkPlus, MessageSquareText, Trash2, Plus, X, Edit2, Check } from 'lucide-react';
import { useModeratorSavedReplies, SavedReply } from '@/hooks/useModeratorSavedReplies';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SavedRepliesSheetProps {
  onSelect: (content: string) => void;
}

const SavedRepliesSheet = ({ onSelect }: SavedRepliesSheetProps) => {
  const { replies, addReply, deleteReply, updateReply } = useModeratorSavedReplies();
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editContent, setEditContent] = useState('');

  const handleAdd = () => {
    if (!newContent.trim()) return;
    addReply.mutate({ content: newContent.trim(), label: newLabel.trim() || undefined });
    setNewLabel('');
    setNewContent('');
    setShowAdd(false);
  };

  const handleSelect = (content: string) => {
    onSelect(content);
    setOpen(false);
  };

  const startEdit = (reply: SavedReply) => {
    setEditingId(reply.id);
    setEditLabel(reply.label || '');
    setEditContent(reply.content);
  };

  const handleUpdate = () => {
    if (!editingId || !editContent.trim()) return;
    updateReply.mutate({ id: editingId, content: editContent.trim(), label: editLabel.trim() || undefined });
    setEditingId(null);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0 rounded-full">
          <MessageSquareText className="w-5 h-5 text-muted-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2 text-base">
            <BookmarkPlus className="w-5 h-5 text-primary" />
            Réponses enregistrées
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(70vh-120px)]">
          <div className="space-y-2 pr-2">
            {replies.length === 0 && !showAdd && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                <MessageSquareText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Aucune réponse enregistrée</p>
                <p className="text-xs mt-1">Créez des modèles pour répondre plus rapidement.</p>
              </div>
            )}

            {replies.map((reply) => (
              <div key={reply.id} className="rounded-lg border border-border bg-card p-3 space-y-1.5">
                {editingId === reply.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="Libellé (optionnel)"
                      className="text-xs h-8"
                    />
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="text-sm min-h-[60px]"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="text-xs h-7">
                        <X className="w-3 h-3 mr-1" /> Annuler
                      </Button>
                      <Button size="sm" onClick={handleUpdate} className="text-xs h-7" disabled={updateReply.isPending}>
                        <Check className="w-3 h-3 mr-1" /> Enregistrer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {reply.label && (
                          <Badge variant="secondary" className="text-[10px] mb-1">{reply.label}</Badge>
                        )}
                        <p className="text-sm text-foreground line-clamp-3">{reply.content}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(reply)}>
                          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => deleteReply.mutate(reply.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-7 mt-1"
                      onClick={() => handleSelect(reply.content)}
                    >
                      Utiliser cette réponse
                    </Button>
                  </>
                )}
              </div>
            ))}

            {/* Add new reply form */}
            {showAdd ? (
              <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-3 space-y-2">
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Libellé (ex: Salutation, Clôture...)"
                  className="text-xs h-8"
                />
                <Textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Contenu de la réponse..."
                  className="text-sm min-h-[80px]"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => { setShowAdd(false); setNewContent(''); setNewLabel(''); }} className="text-xs h-7">
                    <X className="w-3 h-3 mr-1" /> Annuler
                  </Button>
                  <Button size="sm" onClick={handleAdd} className="text-xs h-7" disabled={!newContent.trim() || addReply.isPending}>
                    <Plus className="w-3 h-3 mr-1" /> Ajouter
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full border-dashed text-xs h-9"
                onClick={() => setShowAdd(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Nouvelle réponse
              </Button>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default SavedRepliesSheet;
