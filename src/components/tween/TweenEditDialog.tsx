import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Pencil } from 'lucide-react';
import { useUpdateTween, type Tween } from '@/hooks/useTweens';

interface TweenEditDialogProps {
  tween: Tween;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TweenEditDialog = ({ tween, open, onOpenChange }: TweenEditDialogProps) => {
  const [content, setContent] = useState(tween.content);
  const updateTween = useUpdateTween();

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed || trimmed === tween.content) {
      onOpenChange(false);
      return;
    }
    await updateTween.mutateAsync({ tweenId: tween.id, content: trimmed });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !updateTween.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary" />
            Modifier le Tween
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={300}
            rows={5}
            className="w-full rounded-xl border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            disabled={updateTween.isPending}
            autoFocus
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Astuce : utilisez **texte** pour mettre en gras.</span>
            <span className={content.length > 280 ? 'text-destructive font-semibold' : ''}>
              {content.length}/300
            </span>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={updateTween.isPending}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateTween.isPending || !content.trim() || content.length > 300}
            className="rounded-full"
          >
            {updateTween.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TweenEditDialog;
