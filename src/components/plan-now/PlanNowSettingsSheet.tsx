import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { usePlanNowAutoReplies } from '@/hooks/usePlanNowAutoReplies';
import { toast } from 'sonner';

const MAX = 280;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const Field = ({
  label,
  hint,
  value,
  onChange,
}: { label: string; hint: string; value: string; onChange: (v: string) => void }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-semibold">{label}</Label>
    <p className="text-xs text-muted-foreground">{hint}</p>
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value.slice(0, MAX))}
      rows={2}
      placeholder="Ta réponse type..."
      className="resize-none text-sm"
    />
    <p className="text-[10px] text-muted-foreground text-right">{value.length}/{MAX}</p>
  </div>
);

const PlanNowSettingsSheet = ({ open, onOpenChange }: Props) => {
  const { data, isLoading, save, isSaving } = usePlanNowAutoReplies();
  const [lookingFor, setLookingFor] = useState('');
  const [availableNow, setAvailableNow] = useState('');
  const [photoExchange, setPhotoExchange] = useState('');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLookingFor(data.looking_for ?? '');
    setAvailableNow(data.available_now ?? '');
    setPhotoExchange(data.photo_exchange ?? '');
    setEnabled(data.enabled);
  }, [open, data.looking_for, data.available_now, data.photo_exchange, data.enabled]);

  const handleSave = async () => {
    try {
      await save({
        looking_for: lookingFor.trim(),
        available_now: availableNow.trim(),
        photo_exchange: photoExchange.trim(),
        enabled,
      });
      toast.success('Réponses automatiques enregistrées');
      onOpenChange(false);
    } catch {
      /* handled in hook */
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[88vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <span className="inline-flex w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </span>
            Réponses automatiques
          </SheetTitle>
          <SheetDescription>
            Pendant ta session Plan Now, ces réponses seront envoyées automatiquement aux questions fréquentes.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="mt-5 space-y-5">
            <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
              <div>
                <p className="text-sm font-semibold">Auto-réponses actives</p>
                <p className="text-xs text-muted-foreground">Désactive pour répondre toujours manuellement.</p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <Field
              label="Tu recherches quoi ?"
              hint="Réponse envoyée si on te demande ce que tu cherches."
              value={lookingFor}
              onChange={setLookingFor}
            />
            <Field
              label="Tu es dispo quand ?"
              hint="Réponse pour les questions sur ta disponibilité."
              value={availableNow}
              onChange={setAvailableNow}
            />
            <Field
              label="Échange de photos ?"
              hint="Réponse pour les demandes de photos."
              value={photoExchange}
              onChange={setPhotoExchange}
            />
          </div>
        )}

        <SheetFooter className="mt-6 flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default PlanNowSettingsSheet;
