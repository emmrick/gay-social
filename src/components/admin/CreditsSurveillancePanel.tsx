import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow, subHours, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Activity, 
  Search, 
  RefreshCw,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Coins,
  Clock,
  Filter,
  Eye,
  User,
  Zap,
  Bug,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface TransactionWithProfile {
  id: string;
  user_id: string;
  amount: number;
  credit_type: string;
  transaction_type: string;
  description: string | null;
  created_at: string;
  username?: string;
  avatar_url?: string | null;
}

interface UserBalance {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_credits: number;
  daily_credits: number;
  bonus_credits: number;
  purchased_credits: number;
  last_activity: string;
}

interface AnomalyAlert {
  type: 'rapid_deduction' | 'zero_balance' | 'high_spending' | 'unusual_pattern';
  severity: 'warning' | 'critical';
  user_id: string;
  username: string;
  message: string;
  timestamp: string;
}

const CreditsSurveillancePanel = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'1h' | '24h' | '7d' | 'all'>('24h');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Fetch all recent transactions with profiles
  const { data: transactions = [], isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ['admin-surveillance-transactions', timeFilter],
    queryFn: async () => {
      let query = supabase
        .from('credit_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      // Apply time filter
      if (timeFilter !== 'all') {
        const now = new Date();
        let fromDate: Date;
        switch (timeFilter) {
          case '1h':
            fromDate = subHours(now, 1);
            break;
          case '24h':
            fromDate = subDays(now, 1);
            break;
          case '7d':
            fromDate = subDays(now, 7);
            break;
          default:
            fromDate = subDays(now, 1);
        }
        query = query.gte('created_at', fromDate.toISOString());
      }

      const { data: txs, error } = await query;
      if (error) throw error;

      // Get unique user IDs
      const userIds = [...new Set(txs?.map(t => t.user_id) || [])];
      
      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      return txs?.map(tx => ({
        ...tx,
        username: profileMap.get(tx.user_id)?.username || 'Unknown',
        avatar_url: profileMap.get(tx.user_id)?.avatar_url,
      })) as TransactionWithProfile[];
    },
    refetchInterval: 120000, // Refresh every 30 seconds
  });

  // Fetch real-time user balances
  const { data: userBalances = [], isLoading: balancesLoading } = useQuery({
    queryKey: ['admin-surveillance-balances'],
    queryFn: async () => {
      const { data: credits, error: creditsError } = await supabase
        .from('user_credits')
        .select('*')
        .order('updated_at', { ascending: false });

      if (creditsError) throw creditsError;

      const userIds = credits?.map(c => c.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      return credits?.map(c => ({
        user_id: c.user_id,
        username: profileMap.get(c.user_id)?.username || 'Unknown',
        avatar_url: profileMap.get(c.user_id)?.avatar_url,
        total_credits: (c.daily_credits || 0) + (c.bonus_credits || 0) + (c.purchased_credits || 0),
        daily_credits: c.daily_credits || 0,
        bonus_credits: c.bonus_credits || 0,
        purchased_credits: c.purchased_credits || 0,
        last_activity: c.updated_at,
      })) as UserBalance[];
    },
    refetchInterval: 120000,
  });

  // Detect anomalies
  const anomalies = useMemo((): AnomalyAlert[] => {
    const alerts: AnomalyAlert[] = [];

    // Users with zero balance
    userBalances
      .filter(u => u.total_credits <= 0)
      .forEach(u => {
        alerts.push({
          type: 'zero_balance',
          severity: 'warning',
          user_id: u.user_id,
          username: u.username,
          message: `${u.username} a un solde de 0 crédits`,
          timestamp: u.last_activity,
        });
      });

    // Rapid deductions (more than 5 deductions in last hour for same user)
    const recentTxByUser = transactions
      .filter(t => t.amount < 0)
      .reduce((acc, t) => {
        if (!acc[t.user_id]) acc[t.user_id] = [];
        acc[t.user_id].push(t);
        return acc;
      }, {} as Record<string, TransactionWithProfile[]>);

    Object.entries(recentTxByUser).forEach(([userId, txs]) => {
      const lastHour = txs.filter(t => 
        new Date(t.created_at) > subHours(new Date(), 1)
      );
      if (lastHour.length >= 10) {
        const user = userBalances.find(u => u.user_id === userId);
        alerts.push({
          type: 'rapid_deduction',
          severity: 'critical',
          user_id: userId,
          username: user?.username || 'Unknown',
          message: `${lastHour.length} déductions en 1h pour ${user?.username}`,
          timestamp: lastHour[0]?.created_at || new Date().toISOString(),
        });
      }
    });

    // High spending (more than 50 credits in 24h)
    Object.entries(recentTxByUser).forEach(([userId, txs]) => {
      const totalSpent = txs
        .filter(t => new Date(t.created_at) > subDays(new Date(), 1))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      if (totalSpent >= 50) {
        const user = userBalances.find(u => u.user_id === userId);
        alerts.push({
          type: 'high_spending',
          severity: 'warning',
          user_id: userId,
          username: user?.username || 'Unknown',
          message: `${totalSpent.toFixed(1)} crédits dépensés en 24h par ${user?.username}`,
          timestamp: txs[0]?.created_at || new Date().toISOString(),
        });
      }
    });

    return alerts.sort((a, b) => 
      a.severity === 'critical' && b.severity !== 'critical' ? -1 : 1
    );
  }, [transactions, userBalances]);

  // Get unique transaction types for filter
  const transactionTypes = useMemo(() => {
    const types = new Set(transactions.map(t => t.transaction_type));
    return Array.from(types).sort();
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = 
        tx.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.transaction_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = transactionTypeFilter === 'all' || tx.transaction_type === transactionTypeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [transactions, searchQuery, transactionTypeFilter]);

  // Stats
  const stats = useMemo(() => {
    const totalIn = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const totalOut = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const activeUsers = new Set(transactions.map(t => t.user_id)).size;
    const zeroBalanceCount = userBalances.filter(u => u.total_credits <= 0).length;

    return { totalIn, totalOut, activeUsers, zeroBalanceCount };
  }, [transactions, userBalances]);

  // Group transactions by user for expanded view
  const transactionsByUser = useMemo(() => {
    return transactions.reduce((acc, tx) => {
      if (!acc[tx.user_id]) {
        acc[tx.user_id] = {
          user_id: tx.user_id,
          username: tx.username || 'Unknown',
          avatar_url: tx.avatar_url,
          transactions: [],
        };
      }
      acc[tx.user_id].transactions.push(tx);
      return acc;
    }, {} as Record<string, { user_id: string; username: string; avatar_url: string | null; transactions: TransactionWithProfile[] }>);
  }, [transactions]);

  if (transactionsLoading && balancesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Surveillance des crédits</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchTransactions()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-green-600">+{stats.totalIn.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Crédits gagnés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingDown className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-red-600">-{stats.totalOut.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Crédits dépensés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <User className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold">{stats.activeUsers}</p>
            <p className="text-xs text-muted-foreground">Utilisateurs actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-amber-600">{stats.zeroBalanceCount}</p>
            <p className="text-xs text-muted-foreground">Solde à zéro</p>
          </CardContent>
        </Card>
      </div>

      {/* Anomaly Alerts */}
      {anomalies.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bug className="w-4 h-4 text-amber-500" />
              Alertes & Anomalies ({anomalies.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <ScrollArea className="max-h-32">
              <div className="space-y-1">
                {anomalies.slice(0, 5).map((alert, idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      "flex items-center justify-between p-2 rounded text-sm",
                      alert.severity === 'critical' 
                        ? "bg-red-500/10 text-red-600 dark:text-red-400" 
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {alert.severity === 'critical' ? (
                        <Zap className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                      <span>{alert.message}</span>
                    </div>
                    <span className="text-xs opacity-70">
                      {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="realtime" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="realtime">Temps réel</TabsTrigger>
          <TabsTrigger value="by-user">Par utilisateur</TabsTrigger>
          <TabsTrigger value="balances">Soldes</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as typeof timeFilter)}>
            <SelectTrigger className="w-32">
              <Clock className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 heure</SelectItem>
              <SelectItem value="24h">24 heures</SelectItem>
              <SelectItem value="7d">7 jours</SelectItem>
              <SelectItem value="all">Tout</SelectItem>
            </SelectContent>
          </Select>
          <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
            <SelectTrigger className="w-44">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {transactionTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="realtime" className="mt-4">
          <ScrollArea className="h-[400px]">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucune transaction trouvée</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredTransactions.map((tx) => (
                  <TransactionRow key={tx.id} transaction={tx} />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="by-user" className="mt-4">
          <ScrollArea className="h-[400px]">
            {Object.values(transactionsByUser).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun utilisateur actif</p>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.values(transactionsByUser)
                  .filter(u => 
                    u.username.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((userData) => (
                    <UserTransactionsGroup 
                      key={userData.user_id}
                      userData={userData}
                      isExpanded={expandedUser === userData.user_id}
                      onToggle={() => setExpandedUser(
                        expandedUser === userData.user_id ? null : userData.user_id
                      )}
                    />
                  ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="balances" className="mt-4">
          <ScrollArea className="h-[400px]">
            {userBalances.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Coins className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun solde trouvé</p>
              </div>
            ) : (
              <div className="space-y-1">
                {userBalances
                  .filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
                  .sort((a, b) => a.total_credits - b.total_credits)
                  .map((user) => (
                    <UserBalanceRow key={user.user_id} user={user} />
                  ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Transaction Row Component
const TransactionRow = ({ transaction }: { transaction: TransactionWithProfile }) => {
  const isPositive = transaction.amount > 0;

  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border">
      <div className="flex items-center gap-3">
        <Avatar className="w-8 h-8">
          {transaction.avatar_url ? (
            <AvatarImage src={transaction.avatar_url} />
          ) : (
            <AvatarFallback className="text-xs">
              {transaction.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{transaction.username}</span>
            <Badge variant="outline" className="text-xs">
              {transaction.transaction_type}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {transaction.description || '-'} • {format(new Date(transaction.created_at), 'dd/MM HH:mm', { locale: fr })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center",
          isPositive ? "bg-green-500/10" : "bg-red-500/10"
        )}>
          {isPositive ? (
            <ArrowDown className="w-3 h-3 text-green-500" />
          ) : (
            <ArrowUp className="w-3 h-3 text-red-500" />
          )}
        </div>
        <span className={cn(
          "font-semibold min-w-[60px] text-right",
          isPositive ? "text-green-500" : "text-red-500"
        )}>
          {isPositive ? '+' : ''}{transaction.amount.toFixed(1)}
        </span>
      </div>
    </div>
  );
};

// User Transactions Group
const UserTransactionsGroup = ({ 
  userData, 
  isExpanded, 
  onToggle 
}: { 
  userData: { user_id: string; username: string; avatar_url: string | null; transactions: TransactionWithProfile[] };
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const totalSpent = userData.transactions
    .filter(t => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalEarned = userData.transactions
    .filter(t => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9">
              {userData.avatar_url ? (
                <AvatarImage src={userData.avatar_url} />
              ) : (
                <AvatarFallback>
                  {userData.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <p className="font-medium text-sm">{userData.username}</p>
              <p className="text-xs text-muted-foreground">
                {userData.transactions.length} transaction(s)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-green-500">+{totalEarned.toFixed(1)}</p>
              <p className="text-xs text-red-500">-{totalSpent.toFixed(1)}</p>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-6 mt-1 space-y-1 border-l-2 border-muted pl-4">
          {userData.transactions.slice(0, 20).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between py-1.5 text-sm">
              <div>
                <Badge variant="outline" className="text-xs mr-2">
                  {tx.transaction_type}
                </Badge>
                <span className="text-muted-foreground text-xs">
                  {tx.description || '-'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={tx.amount > 0 ? "text-green-500" : "text-red-500"}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(tx.created_at), 'HH:mm', { locale: fr })}
                </span>
              </div>
            </div>
          ))}
          {userData.transactions.length > 20 && (
            <p className="text-xs text-muted-foreground py-2">
              ... et {userData.transactions.length - 20} autres
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// User Balance Row
const UserBalanceRow = ({ user }: { user: UserBalance }) => {
  const isLow = user.total_credits < 1;
  const isZero = user.total_credits <= 0;

  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border",
      isZero ? "border-red-500/50 bg-red-500/5" : 
      isLow ? "border-amber-500/50 bg-amber-500/5" : "border-border"
    )}>
      <div className="flex items-center gap-3">
        <Avatar className="w-9 h-9">
          {user.avatar_url ? (
            <AvatarImage src={user.avatar_url} />
          ) : (
            <AvatarFallback>
              {user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{user.username}</p>
            {isZero && <Badge variant="destructive" className="text-xs">0</Badge>}
            {isLow && !isZero && <Badge variant="outline" className="text-xs text-amber-500 border-amber-500">Bas</Badge>}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-green-500">{user.daily_credits.toFixed(1)} Q</span>
            <span className="text-blue-700">{user.bonus_credits.toFixed(1)} B</span>
            <span className="text-sky-400">{user.purchased_credits.toFixed(1)} A</span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className={cn(
          "text-lg font-bold",
          isZero ? "text-red-500" : isLow ? "text-amber-500" : "text-foreground"
        )}>
          {user.total_credits.toFixed(1)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(user.last_activity), { addSuffix: true, locale: fr })}
        </p>
      </div>
    </div>
  );
};

export default CreditsSurveillancePanel;
