import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Wallet,
  TrendingUp,
  Clock,
  Euro,
  ArrowUpRight,
  History,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  useModeratorWallet,
  useModeratorEarnings,
  useWithdrawalRequests,
  useRequestWithdrawal,
  useTaskRates,
  useEarningsStats,
  formatCents,
  getTaskLabel,
  ModeratorTaskType,
} from '@/hooks/useModeratorEarnings';

const MIN_WITHDRAWAL_CENTS = 5000; // 50€

const TaskIcon = ({ type }: { type: ModeratorTaskType }) => {
  switch (type) {
    case 'identity_verification':
      return <span className="text-blue-500">🪪</span>;
    case 'report_response':
      return <span className="text-orange-500">🚨</span>;
    case 'user_suspension':
      return <span className="text-red-500">🔒</span>;
    case 'private_message_response':
      return <span className="text-green-500">💬</span>;
    default:
      return <span>📋</span>;
  }
};

const ModeratorWalletPanel = () => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [withdrawalsOpen, setWithdrawalsOpen] = useState(false);

  const { data: wallet, isLoading: walletLoading } = useModeratorWallet();
  const { data: earnings } = useModeratorEarnings(20);
  const { data: withdrawals } = useWithdrawalRequests();
  const { data: taskRates } = useTaskRates();
  const { data: stats } = useEarningsStats();
  const requestWithdrawal = useRequestWithdrawal();

  const balance = wallet?.balance_cents || 0;
  const canWithdraw = balance >= MIN_WITHDRAWAL_CENTS;
  const progressToWithdraw = Math.min((balance / MIN_WITHDRAWAL_CENTS) * 100, 100);
  const pendingWithdrawal = withdrawals?.find(w => w.status === 'pending');

  if (walletLoading) {
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
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Mon portefeuille</h2>
          <p className="text-sm text-muted-foreground">
            Rémunération à la tâche
          </p>
        </div>
      </div>

      {/* Balance Card */}
      <div className="glass-card rounded-2xl p-6 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Solde disponible</p>
            <p className="font-display text-4xl font-bold text-primary">
              {formatCents(balance)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total gagné</p>
            <p className="font-semibold text-green-500">
              {formatCents(wallet?.total_earned_cents || 0)}
            </p>
          </div>
        </div>

        {/* Progress to withdrawal */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progression vers retrait</span>
            <span className="font-medium">{formatCents(balance)} / 50,00 €</span>
          </div>
          <Progress value={progressToWithdraw} className="h-3" />
        </div>

        {/* Withdrawal button */}
        <div className="mt-4">
          {pendingWithdrawal ? (
            <div className="flex items-center gap-2 text-orange-500 bg-orange-500/10 rounded-lg p-3">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                Demande de retrait en cours ({formatCents(pendingWithdrawal.amount_cents)})
              </span>
            </div>
          ) : canWithdraw ? (
            <Button
              variant="hero"
              className="w-full"
              onClick={() => requestWithdrawal.mutate()}
              disabled={requestWithdrawal.isPending}
            >
              {requestWithdrawal.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowUpRight className="w-4 h-4 mr-2" />
              )}
              Demander un retrait
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground bg-secondary/50 rounded-lg p-3">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                Minimum 50€ requis pour effectuer un retrait
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Task Rates */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Euro className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Tarifs par tâche</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {taskRates?.map((rate) => (
            <div key={rate.id} className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
              <TaskIcon type={rate.task_type} />
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate">{getTaskLabel(rate.task_type)}</p>
                <p className="font-semibold text-primary">{formatCents(rate.rate_cents)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Mes statistiques</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-secondary/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-primary">{stats.totalTasks}</p>
              <p className="text-xs text-muted-foreground">Tâches effectuées</p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-500">{formatCents(stats.totalEarned)}</p>
              <p className="text-xs text-muted-foreground">Total gagné</p>
            </div>
          </div>
          
          {Object.entries(stats.byType).length > 0 && (
            <div className="mt-4 space-y-2">
              {Object.entries(stats.byType).map(([type, data]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <TaskIcon type={type as ModeratorTaskType} />
                    {getTaskLabel(type as ModeratorTaskType)}
                  </span>
                  <span className="text-muted-foreground">
                    {data.count}x = <span className="text-primary font-medium">{formatCents(data.total)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Earnings History */}
      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Historique des gains
            </span>
            {historyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <ScrollArea className="h-64">
            {earnings && earnings.length > 0 ? (
              <div className="space-y-2">
                {earnings.map((earning) => (
                  <div 
                    key={earning.id}
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <TaskIcon type={earning.task_type} />
                      <div>
                        <p className="text-sm font-medium">{getTaskLabel(earning.task_type)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(earning.created_at), { addSuffix: true, locale: fr })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-green-500">
                      +{formatCents(earning.amount_cents)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun gain enregistré</p>
              </div>
            )}
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>

      {/* Withdrawal History */}
      <Collapsible open={withdrawalsOpen} onOpenChange={setWithdrawalsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4" />
              Demandes de retrait
            </span>
            {withdrawalsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <ScrollArea className="h-48">
            {withdrawals && withdrawals.length > 0 ? (
              <div className="space-y-2">
                {withdrawals.map((withdrawal) => (
                  <div 
                    key={withdrawal.id}
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{formatCents(withdrawal.amount_cents)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(withdrawal.requested_at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        withdrawal.status === 'completed' ? 'default' :
                        withdrawal.status === 'pending' ? 'secondary' :
                        withdrawal.status === 'rejected' ? 'destructive' : 'outline'
                      }
                      className="flex items-center gap-1"
                    >
                      {withdrawal.status === 'pending' && <Clock className="w-3 h-3" />}
                      {withdrawal.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                      {withdrawal.status === 'rejected' && <XCircle className="w-3 h-3" />}
                      {withdrawal.status === 'pending' && 'En attente'}
                      {withdrawal.status === 'approved' && 'Approuvé'}
                      {withdrawal.status === 'completed' && 'Payé'}
                      {withdrawal.status === 'rejected' && 'Refusé'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ArrowUpRight className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune demande de retrait</p>
              </div>
            )}
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default ModeratorWalletPanel;
