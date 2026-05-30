import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sparkles, Loader2, Plus, Trash2, Lock, Globe, Check, Zap } from 'lucide-react';
import {
  usePlanNowAutoReplies,
  type CustomQA,
  type MediaTier,
  type PlanNowPreset,
} from '@/hooks/usePlanNowAutoReplies';
import { useAlbums } from '@/hooks/useAlbums';
import { toast } from 'sonner';

const MAX = 280;
const MAX_QA = 8;
const MAX_TIERS = 3;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const TextField = ({
  label, hint, value, onChange, rows = 2,
}: { label: string; hint?: string; value: string; onChange: (v: string) => void; rows?: number }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-semibold">{label}</Label>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value.slice(0, MAX))}
      rows={rows}
      placeholder="Ta réponse type..."
      className="resize-none text-sm"
    />
    <p className="text-[10px] text-muted-foreground text-right">{value.length}/{MAX}</p>
  </div>
);

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const PlanNowSettingsSheet = ({ open, onOpenChange }: Props) => {
  const { data, isLoading, save, isSaving } = usePlanNowAutoReplies();
  const { albums } = useAlbums();

  const [enabled, setEnabled] = useState(true);
  const [lookingFor, setLookingFor] = useState('');
  const [availableNow, setAvailableNow] = useState('');
  const [photoExchange, setPhotoExchange] = useState('');
  const [customQa, setCustomQa] = useState<CustomQA[]>([]);
  const [mediaTiers, setMediaTiers] = useState<MediaTier[]>([]);
  const [presets, setPresets] = useState<PlanNowPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEnabled(data.enabled);
    setLookingFor(data.looking_for ?? '');
    setAvailableNow(data.available_now ?? '');
    setPhotoExchange(data.photo_exchange ?? '');
    setCustomQa(data.custom_qa ?? []);
    setMediaTiers(data.media_tiers ?? []);
    setPresets(data.presets ?? []);
    setActivePresetId(data.active_preset_id ?? null);
  }, [open, data]);

  const applyPreset = (p: PlanNowPreset) => {
    setLookingFor(p.looking_for);
    setAvailableNow(p.available_now);
    setPhotoExchange(p.photo_exchange);
    setCustomQa(p.custom_qa ?? []);
    setMediaTiers(p.media_tiers ?? []);
    setActivePresetId(p.id);
    toast.success(`Préréglage « ${p.name} » appliqué`);
  };

  const saveCurrentAsPreset = (id: string) => {
    setPresets((prev) => prev.map((p) => (
      p.id === id
        ? { ...p, looking_for: lookingFor, available_now: availableNow, photo_exchange: photoExchange, custom_qa: customQa, media_tiers: mediaTiers }
        : p
    )));
    toast.success('Préréglage mis à jour');
  };

  const addQA = () => {
    if (customQa.length >= MAX_QA) return;
    setCustomQa([...customQa, { id: newId(), question: '', answer: '', keywords: [] }]);
  };
  const updateQA = (id: string, patch: Partial<CustomQA>) =>
    setCustomQa(customQa.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const removeQA = (id: string) => setCustomQa(customQa.filter((q) => q.id !== id));

  const addTier = () => {
    if (mediaTiers.length >= MAX_TIERS) return;
    setMediaTiers([
      ...mediaTiers,
      { id: newId(), label: `Niveau ${mediaTiers.length + 1}`, album_id: '', threshold: (mediaTiers.length + 1) * 5 },
    ]);
  };
  const updateTier = (id: string, patch: Partial<MediaTier>) =>
    setMediaTiers(mediaTiers.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const removeTier = (id: string) => setMediaTiers(mediaTiers.filter((t) => t.id !== id));

  const handleSave = async () => {
    try {
      await save({
        enabled,
        looking_for: lookingFor.trim(),
        available_now: availableNow.trim(),
        photo_exchange: photoExchange.trim(),
        custom_qa: customQa.filter((q) => q.question.trim() && q.answer.trim()),
        media_tiers: mediaTiers.filter((t) => t.album_id),
        presets,
        active_preset_id: activePresetId,
      });
      toast.success('Personnalisation enregistrée');
      onOpenChange(false);
    } catch { /* handled in hook */ }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[88vh] overflow-y-auto p-0 flex flex-col">
        <div className="px-6 pt-6">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <span className="inline-flex w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </span>
              Personnaliser Plan Now
            </SheetTitle>
            <SheetDescription>
              Préréglages, questions/réponses et déblocage progressif des albums.
            </SheetDescription>
          </SheetHeader>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Tabs defaultValue="presets" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-3 mx-6 mt-4">
              <TabsTrigger value="presets">Préréglages</TabsTrigger>
              <TabsTrigger value="qa">Q / R</TabsTrigger>
              <TabsTrigger value="media">Médias</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto px-6 pt-4 pb-2 space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
                <div>
                  <p className="text-sm font-semibold">Auto-réponses actives</p>
                  <p className="text-xs text-muted-foreground">Désactive pour répondre toujours manuellement.</p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>

              <TabsContent value="presets" className="mt-0 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Active un préréglage en un tap. Tu peux écraser un préréglage avec ta configuration actuelle.
                </p>
                {presets.map((p) => {
                  const isActive = activePresetId === p.id;
                  return (
                    <div key={p.id} className={`rounded-2xl border p-3 ${isActive ? 'border-amber-500 bg-amber-500/5' : 'border-border'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-xl">
                          {p.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Input
                            value={p.name}
                            onChange={(e) => setPresets(presets.map((x) => x.id === p.id ? { ...x, name: e.target.value.slice(0, 30) } : x))}
                            className="h-8 text-sm font-semibold border-0 px-0 focus-visible:ring-0"
                          />
                          <p className="text-[11px] text-muted-foreground truncate">{p.looking_for || 'Aucune réponse type'}</p>
                        </div>
                        {isActive && <Check className="w-5 h-5 text-amber-500 flex-shrink-0" />}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="secondary" className="flex-1 h-8 text-xs" onClick={() => applyPreset(p)}>Appliquer</Button>
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => saveCurrentAsPreset(p.id)}>Enregistrer ici</Button>
                      </div>
                    </div>
                  );
                })}
              </TabsContent>

              <TabsContent value="qa" className="mt-0 space-y-4">
                <div className="space-y-4 rounded-2xl border border-border/50 p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Réponses rapides</p>
                  <TextField label="Tu recherches quoi ?" value={lookingFor} onChange={setLookingFor} />
                  <TextField label="Tu es dispo quand ?" value={availableNow} onChange={setAvailableNow} />
                  <TextField label="Échange de photos ?" value={photoExchange} onChange={setPhotoExchange} />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Questions personnalisées</p>
                      <p className="text-xs text-muted-foreground">Jusqu'à {MAX_QA}. Déclenché par mots-clés.</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={addQA} disabled={customQa.length >= MAX_QA}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter
                    </Button>
                  </div>
                  {customQa.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Aucune question personnalisée.</p>
                  )}
                  {customQa.map((q, i) => (
                    <div key={q.id} className="rounded-2xl border border-border/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground">Question {i + 1}</span>
                        <button onClick={() => removeQA(q.id)} className="text-destructive hover:opacity-70">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <Input
                        value={q.question}
                        onChange={(e) => updateQA(q.id, { question: e.target.value.slice(0, 80) })}
                        placeholder="Ex: T'es plutôt actif ou passif ?"
                        className="text-sm"
                      />
                      <Textarea
                        value={q.answer}
                        onChange={(e) => updateQA(q.id, { answer: e.target.value.slice(0, MAX) })}
                        placeholder="Ta réponse..."
                        rows={2}
                        className="resize-none text-sm"
                      />
                      <Input
                        value={q.keywords.join(', ')}
                        onChange={(e) => updateQA(q.id, { keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean).slice(0, 8) })}
                        placeholder="Mots-clés séparés par virgule (actif, passif, vers)"
                        className="text-xs h-8"
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="media" className="mt-0 space-y-3">
                <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3">
                  <p className="text-xs text-foreground/80">
                    Définis jusqu'à {MAX_TIERS} paliers. Chaque palier débloque automatiquement un album après le nombre de messages indiqué.
                  </p>
                </div>

                {mediaTiers.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Aucun palier configuré.</p>
                )}

                {mediaTiers.map((t, i) => (
                  <div key={t.id} className="rounded-2xl border border-border/50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground">Palier {i + 1}</span>
                      <button onClick={() => removeTier(t.id)} className="text-destructive hover:opacity-70">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <Input
                      value={t.label}
                      onChange={(e) => updateTier(t.id, { label: e.target.value.slice(0, 30) })}
                      placeholder="Ex: Soft, Hot, Privé"
                      className="text-sm"
                    />
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Album</Label>
                      <select
                        value={t.album_id}
                        onChange={(e) => {
                          const album = albums.find((a) => a.id === e.target.value);
                          updateTier(t.id, { album_id: e.target.value, album_name: album?.name });
                        }}
                        className="w-full mt-1 h-9 px-2 rounded-md border border-input bg-background text-sm"
                      >
                        <option value="">— Sélectionner —</option>
                        {albums.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.is_private ? '🔒 ' : '🌐 '}{a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">
                        Débloquer après {t.threshold} messages échangés
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={t.threshold}
                        onChange={(e) => updateTier(t.id, { threshold: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)) })}
                        className="h-8 text-sm mt-1"
                      />
                    </div>
                  </div>
                ))}

                <Button variant="outline" className="w-full" onClick={addTier} disabled={mediaTiers.length >= MAX_TIERS}>
                  <Plus className="w-4 h-4 mr-1" /> Ajouter un palier ({mediaTiers.length}/{MAX_TIERS})
                </Button>
              </TabsContent>
            </div>
          </Tabs>
        )}

        <SheetFooter className="flex-row gap-2 px-6 pb-6 pt-3 border-t bg-background sticky bottom-0">
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
