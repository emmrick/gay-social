import { useFeatureToggles, useToggleFeature, FeatureToggle } from '@/hooks/useFeatureToggles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleLeft, Layers } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_LABELS: Record<string, string> = {
  pages: '📄 Pages',
  features: '⚙️ Fonctionnalités',
  general: '🔧 Général',
};

const FeatureTogglesPanel = () => {
  const { data: toggles, isLoading } = useFeatureToggles();
  const toggleMutation = useToggleFeature();

  const handleToggle = (toggle: FeatureToggle) => {
    const newState = !toggle.is_enabled;
    toggleMutation.mutate(
      { id: toggle.id, is_enabled: newState },
      {
        onSuccess: () => {
          toast.success(
            newState
              ? `${toggle.label} activé pour tous les utilisateurs`
              : `${toggle.label} désactivé pour tous les utilisateurs`
          );
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ToggleLeft className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Fonctionnalités</h2>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  // Group by category
  const grouped = (toggles || []).reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, FeatureToggle[]>);

  const categoryOrder = ['pages', 'features', 'general'];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ToggleLeft className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Gestion des fonctionnalités</h2>
      </div>

      <p className="text-sm text-muted-foreground">
        Activez ou désactivez des fonctionnalités pour <strong>tous les utilisateurs</strong>. 
        Les éléments désactivés disparaissent complètement de l'interface client.
      </p>

      {categoryOrder.map((category) => {
        const items = grouped[category];
        if (!items?.length) return null;

        return (
          <Card key={category} className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                {CATEGORY_LABELS[category] || category}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-3 pt-0">
              {items.map((toggle) => (
                <div
                  key={toggle.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xl flex-shrink-0">{toggle.icon || '⚙️'}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{toggle.label}</span>
                        <Badge
                          variant={toggle.is_enabled ? 'default' : 'secondary'}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {toggle.is_enabled ? 'Actif' : 'Désactivé'}
                        </Badge>
                      </div>
                      {toggle.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {toggle.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={toggle.is_enabled}
                    onCheckedChange={() => handleToggle(toggle)}
                    disabled={toggleMutation.isPending}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default FeatureTogglesPanel;
