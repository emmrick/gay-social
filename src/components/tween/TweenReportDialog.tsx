import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Flag } from 'lucide-react';
import { useReportTween, type Tween } from '@/hooks/useTweens';
import { cn } from '@/lib/utils';

interface TweenReportDialogProps {
  tween: Tween;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Reason = 'harassment' | 'inappropriate_content' | 'spam' | 'fake_profile' | 'underage' | 'other';

const REASONS: { value: Reason; label: string; emoji: string }[] = [
  { value: 'inappropriate_content', label: 'Contenu inapproprié', emoji: '🚫' },
  { value: 'harassment', label: 'Harcèlement / haine', emoji: '😡' },
  { value: 'spam', label: 'Spam / publicité', emoji: '📣' },
  { value: 'fake_profile', label: 'Faux profil / arnaque', emoji: '🎭' },
  { value: 'underage', label: 'Mineur impliqué', emoji: '⚠️' },
  { value: 'other', label: 'Autre', emoji: '❓' },
];

const TweenReportDialog = ({ tween, open, onOpenChange }: TweenReportDialogProps) => {
  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState('');
  const report = useReportTween();

  const handleSubmit = async () => {
    if (!reason) return;
    await report.mutateAsync({
      tweenId: tween.id,
      tweenOwnerId: tween.user_id,
      reason,
      description: details.trim() || undefined,
    });
    setReason(null);
    setDetails('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !report.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-destructive" />
            Signaler ce Tween
          </DialogTitle>
          <DialogDescription>
            Sélectionnez un motif. Notre équipe de modération examinera ce contenu rapidement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {REASONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setReason(r.value)}
              disabled={report.isPending}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition-all',
                reason === r.value
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-primary/5',
              )}
            >
              <span className="text-lg">{r.emoji}</span>
              <span className="font-medium">{r.label}</span>
            </button>
          ))}
        </div>

        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Détails complémentaires (facultatif)…"
          maxLength={500}
          rows={3}
          disabled={report.isPending}
          className="w-full rounded-xl border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={report.isPending}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason || report.isPending}
            variant="destructive"
            className="rounded-full"
          >
            {report.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Envoyer le signalement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TweenReportDialog;
