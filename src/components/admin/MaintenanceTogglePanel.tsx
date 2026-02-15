import { useState, useEffect } from 'react';
import { Wrench, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useMaintenanceMode, useToggleMaintenance } from '@/hooks/useMaintenanceMode';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const MaintenanceTogglePanel = () => {
  const { data: maintenance, isLoading } = useMaintenanceMode();
  const toggleMutation = useToggleMaintenance();
  const [message, setMessage] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingState, setPendingState] = useState(false);

  useEffect(() => {
    if (maintenance?.message) {
      setMessage(maintenance.message);
    }
    if (maintenance?.estimated_end_at) {
      const diff = new Date(maintenance.estimated_end_at).getTime() - Date.now();
      if (diff > 0) {
        setEstimatedHours(String(Math.round(diff / (1000 * 60 * 60) * 10) / 10));
      }
    }
  }, [maintenance?.message, maintenance?.estimated_end_at]);

  const getEstimatedEndAt = () => {
    const hours = parseFloat(estimatedHours);
    if (!hours || hours <= 0) return null;
    return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  };

  const handleToggle = (checked: boolean) => {
    if (checked) {
      setPendingState(true);
      setShowConfirm(true);
    } else {
      toggleMutation.mutate({ isActive: false, message, estimatedEndAt: null });
    }
  };

  const confirmActivation = () => {
    toggleMutation.mutate({ isActive: true, message, estimatedEndAt: getEstimatedEndAt() });
    setShowConfirm(false);
  };

  if (isLoading) return null;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Mode Maintenance</h2>
          {maintenance?.is_active && (
            <Badge variant="destructive">Actif</Badge>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Activer la maintenance</span>
              <Switch
                checked={maintenance?.is_active ?? false}
                onCheckedChange={handleToggle}
                disabled={toggleMutation.isPending}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {maintenance?.is_active && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">
                  Le site est actuellement inaccessible pour tous les membres. Seuls les administrateurs et modérateurs peuvent y accéder.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="maintenance-message">Message affiché</Label>
              <Textarea
                id="maintenance-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Le site est en maintenance..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated-hours" className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Durée estimée (heures)
              </Label>
              <Input
                id="estimated-hours"
                type="number"
                min="0.5"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="Ex: 2"
                className="max-w-[200px]"
              />
              <p className="text-xs text-muted-foreground">
                Laissez vide pour ne pas afficher de compteur
              </p>
            </div>

            {maintenance?.is_active && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleMutation.mutate({ isActive: true, message, estimatedEndAt: getEstimatedEndAt() })}
                disabled={toggleMutation.isPending}
              >
                Mettre à jour
              </Button>
            )}

            {maintenance?.activated_at && maintenance.is_active && (
              <p className="text-xs text-muted-foreground">
                Activé le {new Date(maintenance.activated_at).toLocaleString('fr-FR')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activer le mode maintenance ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tous les membres seront temporairement bloqués et verront un écran de maintenance. Seuls les administrateurs et modérateurs pourront accéder au site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmActivation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Activer la maintenance
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MaintenanceTogglePanel;
