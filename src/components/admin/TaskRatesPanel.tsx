import { useState } from 'react';
import { 
  Euro, 
  Edit2, 
  Save, 
  X, 
  Loader2,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  useAllTaskRates,
  useUpdateTaskRate,
  formatCents,
  getTaskLabel,
  ModeratorTaskType,
} from '@/hooks/useModeratorEarnings';

const TaskIcon = ({ type }: { type: ModeratorTaskType }) => {
  switch (type) {
    case 'identity_verification':
      return <span className="text-lg">🪪</span>;
    case 'report_response':
      return <span className="text-lg">🚨</span>;
    case 'user_suspension':
      return <span className="text-lg">🔒</span>;
    case 'private_message_response':
      return <span className="text-lg">💬</span>;
    default:
      return <span className="text-lg">📋</span>;
  }
};

interface TaskRateEditData {
  id: string;
  task_type: ModeratorTaskType;
  rate_cents: number;
  description: string | null;
  is_active: boolean;
}

const TaskRatesPanel = () => {
  const [editingRate, setEditingRate] = useState<TaskRateEditData | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [newRate, setNewRate] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIsActive, setNewIsActive] = useState(true);

  const { data: taskRates, isLoading } = useAllTaskRates();
  const updateRate = useUpdateTaskRate();

  const openEditDialog = (rate: TaskRateEditData) => {
    setEditingRate(rate);
    setNewRate((rate.rate_cents / 100).toFixed(2));
    setNewDescription(rate.description || '');
    setNewIsActive(rate.is_active);
    setEditDialog(true);
  };

  const handleSave = async () => {
    if (!editingRate) return;

    const rateCents = Math.round(parseFloat(newRate.replace(',', '.')) * 100);
    
    if (isNaN(rateCents) || rateCents < 0) {
      return;
    }

    await updateRate.mutateAsync({
      id: editingRate.id,
      rate_cents: rateCents,
      description: newDescription || null,
      is_active: newIsActive,
    });

    setEditDialog(false);
    setEditingRate(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Settings2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Tarifs des tâches</h2>
          <p className="text-sm text-muted-foreground">
            Configurez la rémunération par type de tâche
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="glass-card rounded-xl p-4 bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <Euro className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium text-sm">Rémunération à la tâche</p>
            <p className="text-sm text-muted-foreground">
              Les modérateurs sont rémunérés pour chaque action effectuée. 
              Modifiez les tarifs ci-dessous pour ajuster la rémunération.
            </p>
          </div>
        </div>
      </div>

      {/* Rates Table */}
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead className="w-[300px]">Type de tâche</TableHead>
              <TableHead>Tarif</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {taskRates?.map((rate) => (
              <TableRow key={rate.id} className={!rate.is_active ? 'opacity-50' : ''}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <TaskIcon type={rate.task_type} />
                    <span className="font-medium">{getTaskLabel(rate.task_type)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-semibold text-primary text-lg">
                    {formatCents(rate.rate_cents)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={rate.is_active ? 'default' : 'secondary'}>
                    {rate.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                    {rate.description || '-'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(rate)}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Modifier
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {taskRates?.map((rate) => (
          <div 
            key={rate.id}
            className={`p-4 rounded-xl border ${rate.is_active ? 'bg-secondary/30' : 'bg-muted/30 opacity-60'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <TaskIcon type={rate.task_type} />
              <span className="text-xs font-medium truncate">{getTaskLabel(rate.task_type)}</span>
            </div>
            <p className="text-2xl font-bold text-primary">{formatCents(rate.rate_cents)}</p>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingRate && <TaskIcon type={editingRate.task_type} />}
              Modifier le tarif
            </DialogTitle>
            <DialogDescription>
              {editingRate && getTaskLabel(editingRate.task_type)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rate">Tarif (en euros)</Label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="rate"
                  type="text"
                  inputMode="decimal"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="pl-10"
                  placeholder="0,50"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Utilisez un point ou une virgule pour les décimales
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optionnelle)</Label>
              <Textarea
                id="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description de la tâche..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div>
                <Label htmlFor="is_active" className="cursor-pointer">Activer ce tarif</Label>
                <p className="text-xs text-muted-foreground">
                  Si désactivé, les modérateurs ne seront pas rémunérés pour cette tâche
                </p>
              </div>
              <Switch
                id="is_active"
                checked={newIsActive}
                onCheckedChange={setNewIsActive}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              <X className="w-4 h-4 mr-1" />
              Annuler
            </Button>
            <Button 
              onClick={handleSave}
              disabled={updateRate.isPending}
            >
              {updateRate.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskRatesPanel;
