import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Coins, 
  Search, 
  Loader2, 
  User, 
  Plus, 
  Minus,
  History,
  ArrowDown,
  ArrowUp,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Profile {
  user_id: string;
  username: string;
  avatar_url: string | null;
  region: string;
  age: number | null;
}

interface UserCreditsData {
  user_id: string;
  daily_credits: number;
  bonus_credits: number;
  purchased_credits: number;
  daily_claims_used: number;
  last_daily_claim: string | null;
  monthly_reset_date: string;
  profile?: Profile;
}

interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  credit_type: string;
  transaction_type: string;
  description: string | null;
  created_at: string;
}

const CreditsManagementPanel = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserCreditsData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [amount, setAmount] = useState('10');
  const [creditType, setCreditType] = useState<'bonus' | 'purchased'>('bonus');
  const [description, setDescription] = useState('');
  const [isAdd, setIsAdd] = useState(true);
  const queryClient = useQueryClient();

  // Fetch all users with credits
  const { data: usersWithCredits = [], isLoading } = useQuery({
    queryKey: ['admin-user-credits'],
    queryFn: async () => {
      // First get all credit records
      const { data: credits, error: creditsError } = await supabase
        .from('user_credits')
        .select('*')
        .order('updated_at', { ascending: false });

      if (creditsError) throw creditsError;

      // Get profiles for these users
      const userIds = credits?.map(c => c.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, region, age')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      return credits?.map(c => ({
        ...c,
        profile: profileMap.get(c.user_id),
      })) as UserCreditsData[];
    },
  });

  // Fetch transactions for selected user
  const { data: userTransactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['admin-user-transactions', selectedUser?.user_id],
    queryFn: async () => {
      if (!selectedUser?.user_id) return [];

      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', selectedUser.user_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as CreditTransaction[];
    },
    enabled: !!selectedUser?.user_id,
  });

  // Add/Remove credits mutation
  const creditsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser?.user_id) throw new Error('No user selected');

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Invalid amount');
      }

      if (isAdd) {
        // Add credits
        const { error } = await supabase.rpc('add_credits', {
          _user_id: selectedUser.user_id,
          _amount: numAmount,
          _credit_type: creditType,
          _transaction_type: 'admin_adjustment',
          _description: description || `Ajout manuel par admin`,
        });
        if (error) throw error;
      } else {
        // Deduct credits
        const { data, error } = await supabase.rpc('deduct_credits', {
          _user_id: selectedUser.user_id,
          _amount: numAmount,
          _transaction_type: 'admin_adjustment',
          _description: description || `Retrait manuel par admin`,
        });
        if (error) throw error;
        if (!(data as any).success) {
          throw new Error((data as any).error || 'Crédits insuffisants');
        }
      }
    },
    onSuccess: () => {
      toast.success(isAdd ? 'Crédits ajoutés !' : 'Crédits retirés !');
      queryClient.invalidateQueries({ queryKey: ['admin-user-credits'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-transactions', selectedUser?.user_id] });
      setIsDialogOpen(false);
      setAmount('10');
      setDescription('');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de l\'opération');
    },
  });

  const filteredUsers = usersWithCredits.filter(user =>
    user.profile?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.profile?.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCredits = usersWithCredits.reduce((sum, u) => 
    sum + (u.daily_credits || 0) + (u.bonus_credits || 0) + (u.purchased_credits || 0), 0
  );

  const openDialog = (user: UserCreditsData, add: boolean) => {
    setSelectedUser(user);
    setIsAdd(add);
    setAmount('10');
    setDescription('');
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Coins className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{totalCredits.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Crédits en circulation</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <User className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{usersWithCredits.length}</p>
            <p className="text-xs text-muted-foreground">Utilisateurs</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4 mt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un utilisateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[400px]">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Coins className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun utilisateur avec des crédits</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <UserCreditCard 
                    key={user.user_id} 
                    user={user} 
                    onAdd={() => openDialog(user, true)}
                    onRemove={() => openDialog(user, false)}
                    onViewHistory={() => setSelectedUser(user)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          {selectedUser ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    {selectedUser.profile?.avatar_url ? (
                      <AvatarImage src={selectedUser.profile.avatar_url} />
                    ) : (
                      <AvatarFallback>
                        {selectedUser.profile?.username?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className="font-medium">{selectedUser.profile?.username}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                  Changer
                </Button>
              </div>

              <ScrollArea className="h-[350px]">
                {transactionsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 rounded-lg" />
                    ))}
                  </div>
                ) : userTransactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune transaction</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {userTransactions.map((tx) => (
                      <TransactionItem key={tx.id} transaction={tx} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Sélectionnez un utilisateur pour voir son historique</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Remove Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isAdd ? (
                <>
                  <Plus className="w-5 h-5 text-green-500" />
                  Ajouter des crédits
                </>
              ) : (
                <>
                  <Minus className="w-5 h-5 text-red-500" />
                  Retirer des crédits
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isAdd ? 'Ajouter' : 'Retirer'} des crédits pour {selectedUser?.profile?.username}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Montant</Label>
              <Input
                type="number"
                min="0.1"
                step="0.1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10"
              />
            </div>

            {isAdd && (
              <div className="space-y-2">
                <Label>Type de crédit</Label>
                <Select value={creditType} onValueChange={(v) => setCreditType(v as 'bonus' | 'purchased')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bonus">Bonus (bleu foncé)</SelectItem>
                    <SelectItem value="purchased">Achetés (bleu clair)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Raison (optionnel)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Compensation, Achat vérifié..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={() => creditsMutation.mutate()}
              disabled={creditsMutation.isPending}
              className={isAdd 
                ? "bg-green-500 hover:bg-green-600" 
                : "bg-red-500 hover:bg-red-600"
              }
            >
              {creditsMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : isAdd ? (
                <Plus className="w-4 h-4 mr-2" />
              ) : (
                <Minus className="w-4 h-4 mr-2" />
              )}
              {isAdd ? 'Ajouter' : 'Retirer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface UserCreditCardProps {
  user: UserCreditsData;
  onAdd: () => void;
  onRemove: () => void;
  onViewHistory: () => void;
}

const UserCreditCard = ({ user, onAdd, onRemove, onViewHistory }: UserCreditCardProps) => {
  const total = (user.daily_credits || 0) + (user.bonus_credits || 0) + (user.purchased_credits || 0);

  // Extract department code from region (e.g., "75 - Paris" -> "75")
  const departmentCode = user.profile?.region?.split(' ')[0] || user.profile?.region || '-';

  return (
    <div className="p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            {user.profile?.avatar_url ? (
              <AvatarImage src={user.profile.avatar_url} alt={user.profile.username} />
            ) : (
              <AvatarFallback>
                {user.profile?.username?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <p className="font-medium text-sm text-foreground">{user.profile?.username || 'Unknown'}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-green-500">{user.daily_credits?.toFixed(1) || 0} Q</span>
              <span className="text-blue-700">{user.bonus_credits?.toFixed(1) || 0} B</span>
              <span className="text-sky-400">{user.purchased_credits?.toFixed(1) || 0} A</span>
            </div>
            {/* Age and Department info */}
            <div className="flex items-center gap-2 text-xs mt-1">
              {user.profile?.age && (
                <Badge variant="outline" className="text-xs py-0 px-1">
                  {user.profile.age} ans
                </Badge>
              )}
              <Badge variant="outline" className="text-xs py-0 px-1">
                Dép. {departmentCode}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-amber-500">{total.toFixed(1)}</Badge>
          <Button size="icon" variant="ghost" onClick={onViewHistory}>
            <History className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="text-green-500" onClick={onAdd}>
            <Plus className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="text-red-500" onClick={onRemove}>
            <Minus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

interface TransactionItemProps {
  transaction: CreditTransaction;
}

const TransactionItem = ({ transaction }: TransactionItemProps) => {
  const isPositive = transaction.amount > 0;

  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
          isPositive ? 'bg-green-500/10' : 'bg-red-500/10'
        }`}>
          {isPositive ? (
            <ArrowDown className="w-3 h-3 text-green-500" />
          ) : (
            <ArrowUp className="w-3 h-3 text-red-500" />
          )}
        </div>
        <div>
          <p className="text-xs font-medium">{transaction.transaction_type}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(transaction.created_at), 'dd/MM à HH:mm', { locale: fr })}
          </p>
        </div>
      </div>
      <span className={`text-sm font-semibold ${
        isPositive ? 'text-green-500' : 'text-red-500'
      }`}>
        {isPositive ? '+' : ''}{transaction.amount.toFixed(2)}
      </span>
    </div>
  );
};

export default CreditsManagementPanel;
