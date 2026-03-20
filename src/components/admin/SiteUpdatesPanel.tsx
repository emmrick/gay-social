import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Plus, Trash2, Send, Sparkles, Bug, Zap, Pin, Loader2, Rocket } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type UpdateCategory = 'feature' | 'improvement' | 'bugfix' | 'other';

const categoryConfig: Record<UpdateCategory, { label: string; emoji: string; color: string; icon: React.ElementType }> = {
  feature: { label: 'Nouvelle fonctionnalité', emoji: '✨', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: Sparkles },
  improvement: { label: 'Amélioration', emoji: '⚡', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Zap },
  bugfix: { label: 'Correction de bug', emoji: '🐛', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Bug },
  other: { label: 'Autre', emoji: '📌', color: 'bg-muted text-muted-foreground border-border', icon: Pin },
};

const SiteUpdatesPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<UpdateCategory>('feature');

  const { data: updates = [], isLoading } = useQuery({
    queryKey: ['site-updates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_updates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const addUpdate = useMutation({
    mutationFn: async () => {
      if (!user?.id || !title.trim()) return;
      const { error } = await supabase.from('site_updates').insert({
        title: title.trim(),
        description: description.trim() || null,
        category,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setCategory('feature');
      queryClient.invalidateQueries({ queryKey: ['site-updates'] });
      toast.success('Mise à jour ajoutée');
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const deleteUpdate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('site_updates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-updates'] });
      toast.success('Mise à jour supprimée');
    },
  });

  const publishNow = useMutation({
    mutationFn: async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/post-daily-updates`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Erreur');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['site-updates'] });
      toast.success(`${data.updates_count} mise(s) à jour publiée(s) sur le canal !`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const unpublishedCount = updates.filter((u) => !u.is_published).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Mises à jour du site</h2>
        </div>
        {unpublishedCount > 0 && (
          <Button
            onClick={() => publishNow.mutate()}
            disabled={publishNow.isPending}
            className="gap-2"
            size="sm"
          >
            {publishNow.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publier maintenant ({unpublishedCount})
          </Button>
        )}
      </div>

      {/* Add form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Ajouter une mise à jour</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Select value={category} onValueChange={(v) => setCategory(v as UpdateCategory)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.emoji} {cfg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la mise à jour..."
              className="flex-1"
            />
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description détaillée (optionnel)..."
            rows={2}
          />
          <Button
            onClick={() => addUpdate.mutate()}
            disabled={!title.trim() || addUpdate.isPending}
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Updates list */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Historique des mises à jour
        </h3>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : updates.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">
            Aucune mise à jour enregistrée
          </p>
        ) : (
          updates.map((update) => {
            const cfg = categoryConfig[update.category as UpdateCategory] || categoryConfig.other;
            const Icon = cfg.icon;
            return (
              <Card key={update.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${cfg.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{update.title}</span>
                        {update.is_published ? (
                          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            Publié
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                            En attente
                          </Badge>
                        )}
                      </div>
                      {update.description && (
                        <p className="text-xs text-muted-foreground mt-1">{update.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(update.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                        {update.published_at && ` • Publié le ${format(new Date(update.published_at), 'd MMM', { locale: fr })}`}
                      </p>
                    </div>
                    {!update.is_published && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteUpdate.mutate(update.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SiteUpdatesPanel;
