import { useState } from 'react';
import { Coins, Save, Loader2, Search, Tag, History, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminCreditCosts, useUpdateCreditCost, useCreditCostAuditLog } from '@/hooks/useDynamicCreditCosts';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const categoryLabels: Record<string, string> = {
  messages: '💬 Messages',
  albums: '📸 Albums',
  profil: '👤 Profil',
  proximité: '📍 Proximité',
  swipe: '❤️ Swipe',
  groupes: '👥 Groupes',
  chatbot: '🤖 ChatBot',
  parrainage: '🎁 Parrainage',
};

const categoryColors: Record<string, string> = {
  messages: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  albums: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  profil: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  proximité: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  swipe: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  groupes: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  chatbot: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  parrainage: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
};

const CreditCostsPanel = () => {
  const { data: costs, isLoading } = useAdminCreditCosts();
  const { data: auditLog, isLoading: auditLoading } = useCreditCostAuditLog();
  const updateCost = useUpdateCreditCost();
  const isMobile = useIsMobile();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [search, setSearch] = useState('');

  const startEdit = (id: string, currentValue: number) => {
    setEditingId(id);
    setEditValue(String(currentValue));
  };

  const saveEdit = (id: string, cost_key: string, old_value: number) => {
    const val = parseFloat(editValue);
    if (isNaN(val) || val < 0) return;
    updateCost.mutate({ id, cost_key, old_value, cost_value: val });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Tarifs des crédits</h2>
        </div>
        <div className="grid gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const filteredCosts = (costs || []).filter(
    (c) =>
      c.label.toLowerCase().includes(search.toLowerCase()) ||
      c.cost_key.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filteredCosts.reduce((acc, cost) => {
    if (!acc[cost.category]) acc[cost.category] = [];
    acc[cost.category].push(cost);
    return acc;
  }, {} as Record<string, typeof filteredCosts>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Tarifs des crédits</h2>
          <Badge variant="secondary" className="text-xs">
            {costs?.length || 0} tarifs
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="tarifs" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="tarifs" className="flex-1 gap-1.5">
            <Tag className="w-3.5 h-3.5" /> Tarifs
          </TabsTrigger>
          <TabsTrigger value="historique" className="flex-1 gap-1.5">
            <History className="w-3.5 h-3.5" /> Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tarifs" className="mt-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un tarif..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          <ScrollArea className={isMobile ? 'h-[calc(100vh-380px)]' : 'h-[calc(100vh-340px)]'}>
            <div className="space-y-5 pr-2">
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <Badge
                      variant="outline"
                      className={cn('text-xs font-semibold border', categoryColors[category] || 'bg-muted')}
                    >
                      {categoryLabels[category] || category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{items.length} éléments</span>
                  </div>

                  <div className={cn('grid gap-2', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
                    {items.map((cost) => (
                      <Card
                        key={cost.id}
                        className={cn(
                          'overflow-hidden transition-all',
                          editingId === cost.id && 'ring-2 ring-primary/50'
                        )}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{cost.label}</p>
                              <p className="text-[10px] text-muted-foreground font-mono truncate">
                                {cost.cost_key}
                              </p>
                            </div>

                            {editingId === cost.id ? (
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-20 h-8 text-sm text-right"
                                  step="0.1"
                                  min="0"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEdit(cost.id, cost.cost_key, cost.cost_value);
                                    if (e.key === 'Escape') cancelEdit();
                                  }}
                                />
                                <Button
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => saveEdit(cost.id, cost.cost_key, cost.cost_value)}
                                  disabled={updateCost.isPending}
                                >
                                  {updateCost.isPending ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Save className="w-3.5 h-3.5" />
                                  )}
                                </Button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEdit(cost.id, cost.cost_value)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors group"
                              >
                                <Tag className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="text-sm font-bold text-primary">
                                  {cost.cost_value}
                                </span>
                              </button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}

              {filteredCosts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Coins className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucun tarif trouvé</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="historique" className="mt-3">
          <ScrollArea className={isMobile ? 'h-[calc(100vh-340px)]' : 'h-[calc(100vh-300px)]'}>
            <div className="space-y-2 pr-2">
              {auditLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))
              ) : !auditLog?.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucune modification enregistrée</p>
                </div>
              ) : (
                auditLog.map((entry) => (
                  <Card key={entry.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium font-mono truncate">{entry.cost_key}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(entry.changed_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm shrink-0">
                          <span className="text-muted-foreground line-through">{entry.old_value}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className="font-bold text-primary">{entry.new_value}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CreditCostsPanel;
