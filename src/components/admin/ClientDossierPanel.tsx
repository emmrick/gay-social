import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  User, Mail, Phone, Calendar, Shield, Lock, Unlock, CreditCard, 
  AlertTriangle, MessageSquare, History, FileText, Send, Loader2,
  CheckCircle, XCircle, Ban, ShieldCheck, Eye, KeyRound, Bell,
  Plus, Minus, RefreshCw, AlertCircle, Search, Clock, Hash,
  Headphones, ChevronDown, ChevronRight
} from 'lucide-react';

interface ClientDossierPanelProps {
  userId: string;
  ticketId?: string;
  onClose?: () => void;
}

const ClientDossierPanel = ({ userId, ticketId, onClose }: ClientDossierPanelProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isVerified, setIsVerified] = useState(false);
  const [accessRequestId, setAccessRequestId] = useState<string | null>(null);
  const [accessRequestPending, setAccessRequestPending] = useState(false);
  const [sendingAccessRequest, setSendingAccessRequest] = useState(false);

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['client-dossier-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch credit balance
  const { data: credits } = useQuery({
    queryKey: ['client-dossier-credits', userId, isVerified],
    queryFn: async () => {
      if (!isVerified) return null;
      const { data, error } = await supabase
        .rpc('get_user_credit_balance', { _user_id: userId });
      if (error) throw error;
      return data as any;
    },
    enabled: isVerified && !!userId,
    staleTime: 5000,
  });

  // Fetch credit transactions
  const { data: creditTransactions = [] } = useQuery({
    queryKey: ['client-dossier-credit-transactions', userId, isVerified],
    queryFn: async () => {
      if (!isVerified) return [];
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: isVerified && !!userId,
    staleTime: 5000,
  });

  // Realtime subscription for credit changes
  useEffect(() => {
    if (!isVerified || !userId) return;
    const channel = supabase
      .channel(`dossier-credits-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_transactions', filter: `user_id=eq.${userId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['client-dossier-credits', userId, isVerified] });
        queryClient.invalidateQueries({ queryKey: ['client-dossier-credit-transactions', userId, isVerified] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_credits', filter: `user_id=eq.${userId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['client-dossier-credits', userId, isVerified] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isVerified, userId, queryClient]);

  // Fetch verification status
  const { data: verification } = useQuery({
    queryKey: ['client-dossier-verification', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('identity_verifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    enabled: !!userId,
  });

  // Fetch reports/infractions
  const { data: reports = [] } = useQuery({
    queryKey: ['client-dossier-reports', userId, isVerified],
    queryFn: async () => {
      if (!isVerified) return [];
      const { data } = await supabase
        .from('reports' as any)
        .select('*')
        .eq('reported_user_id', userId)
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: isVerified && !!userId,
  });

  // Fetch moderation actions
  const { data: moderationActions = [] } = useQuery({
    queryKey: ['client-dossier-moderation', userId, isVerified],
    queryFn: async () => {
      if (!isVerified) return [];
      const { data } = await supabase
        .from('moderation_actions')
        .select('*')
        .eq('target_user_id', userId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isVerified && !!userId,
  });

  // Fetch blocked status
  const { data: blockedStatus } = useQuery({
    queryKey: ['client-dossier-blocked', userId],
    queryFn: async () => {
      const { data: isBlocked } = await supabase.rpc('is_user_blocked', { _user_id: userId });
      const { data: isSuspended } = await supabase.rpc('is_user_suspended', { _user_id: userId });
      return { isBlocked: isBlocked === true, isSuspended: isSuspended === true };
    },
    enabled: !!userId,
  });

  // Fetch support ticket history
  const { data: supportTickets = [] } = useQuery({
    queryKey: ['client-dossier-support-tickets', userId, isVerified],
    queryFn: async () => {
      if (!isVerified) return [];
      const { data } = await supabase
        .from('support_tickets' as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      return (data || []) as any[];
    },
    enabled: isVerified && !!userId,
  });

  // Fetch user blocks (given and received)
  const { data: userBlocks = [] } = useQuery({
    queryKey: ['client-dossier-user-blocks', userId, isVerified],
    queryFn: async () => {
      if (!isVerified) return [];
      const { data } = await supabase
        .from('user_blocks' as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: isVerified && !!userId,
  });

  // Check for existing approved access request
  useEffect(() => {
    if (!user?.id || !userId) return;
    const checkAccess = async () => {
      const { data } = await supabase
        .from('dossier_access_requests' as any)
        .select('*')
        .eq('requester_id', user.id)
        .eq('target_user_id', userId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        setIsVerified(true);
        setAccessRequestId((data[0] as any).id);
      }
    };
    checkAccess();

    const channel = supabase
      .channel(`dossier-access-mod-${userId}-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dossier_access_requests', filter: `requester_id=eq.${user.id}` }, (payload) => {
        const req = payload.new as any;
        if (req.target_user_id === userId) {
          if (req.status === 'approved') {
            setIsVerified(true);
            setAccessRequestId(req.id);
            setAccessRequestPending(false);
            toast.success('Le client a autorisé l\'accès à son dossier');
          } else if (req.status === 'denied') {
            setAccessRequestPending(false);
            toast.error('Le client a refusé l\'accès à son dossier');
          } else if (req.status === 'revoked') {
            setIsVerified(false);
            setAccessRequestId(null);
            toast.info('L\'accès au dossier a été révoqué');
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, userId]);

  const handleRequestAccess = async () => {
    if (!user?.id) return;
    setSendingAccessRequest(true);
    try {
      const { data, error } = await supabase
        .from('dossier_access_requests' as any)
        .insert({ requester_id: user.id, target_user_id: userId, ticket_id: ticketId || null, status: 'pending' } as any)
        .select()
        .single();
      if (error) throw error;
      setAccessRequestPending(true);
      setAccessRequestId((data as any).id);
      toast.success('Demande d\'accès envoyée au client');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'envoi de la demande');
    } finally {
      setSendingAccessRequest(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <User className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p>Profil introuvable</p>
      </div>
    );
  }

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const LockedOverlay = () => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-xl">
      <Lock className="w-10 h-10 text-muted-foreground/50 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">Accès verrouillé</p>
      <p className="text-xs text-muted-foreground/70 mt-1 text-center max-w-[240px]">
        Le client doit autoriser l'accès à son dossier.
      </p>
    </div>
  );

  const isSectionLocked = !isVerified;

  const verificationStatusBadge = () => {
    if (verification?.status === 'approved') return <Badge className="bg-green-500/10 text-green-600 text-[10px] gap-1"><CheckCircle className="w-2.5 h-2.5" /> Vérifié</Badge>;
    if (verification?.status === 'pending' && verification?.submitted_at) return <Badge variant="secondary" className="text-[10px] gap-1"><Loader2 className="w-2.5 h-2.5" /> En attente</Badge>;
    if (verification?.status === 'rejected') return <Badge variant="destructive" className="text-[10px] gap-1"><XCircle className="w-2.5 h-2.5" /> Rejetée</Badge>;
    return <Badge variant="outline" className="text-[10px]">Non vérifiée</Badge>;
  };

  return (
    <div className="space-y-3 p-4">
      {/* ===== HEADER: Profile Summary ===== */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-2xl object-cover" />
              ) : (
                <User className="w-7 h-7 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-foreground">{profile.username}</h3>
                {verificationStatusBadge()}
                {blockedStatus?.isBlocked && <Badge variant="destructive" className="text-[10px]">Bloqué</Badge>}
                {blockedStatus?.isSuspended && <Badge variant="destructive" className="text-[10px]">Suspendu</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {profile.first_name} {profile.last_name} · {profile.age ? `${profile.age} ans` : 'Âge inconnu'}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Inscrit le {formatDate(profile.created_at)}</span>
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {profile.region || '—'}</span>
              </div>
              {profile.birth_date && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Né(e) le {formatDate(profile.birth_date)}
                </p>
              )}
              {profile.phone_number && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {profile.phone_number}
                </p>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            <div className="bg-secondary/50 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Signalements</p>
              <p className="text-sm font-bold text-foreground">{reports.length}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Blocages</p>
              <p className="text-sm font-bold text-foreground">{userBlocks.length}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Tickets</p>
              <p className="text-sm font-bold text-foreground">{supportTickets.length}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Crédits</p>
              <p className="text-sm font-bold text-primary">{credits?.total_credits ?? '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== ACCESS GATE ===== */}
      {!isVerified && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Autorisation requise</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Une notification sera envoyée au client pour qu'il confirme l'accès avec son code secret.
            </p>
            {accessRequestPending ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium">En attente de confirmation...</p>
                  <p className="text-[11px] text-muted-foreground">Le client doit confirmer sur son écran</p>
                </div>
              </div>
            ) : (
              <Button onClick={handleRequestAccess} disabled={sendingAccessRequest} className="w-full gap-2" size="sm">
                {sendingAccessRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Demander l'accès au dossier
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {isVerified && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/5 border border-green-500/20">
          <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
          <p className="text-[11px] text-green-600 font-medium">Accès autorisé par le client</p>
        </div>
      )}

      {/* ===== TABS ===== */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-auto">
          <TabsTrigger value="info" className="text-[10px] gap-0.5 px-1 py-1.5 flex-col sm:flex-row">
            <User className="w-3 h-3" /> <span className="hidden sm:inline">Infos</span>
          </TabsTrigger>
          <TabsTrigger value="credits" className="text-[10px] gap-0.5 px-1 py-1.5 flex-col sm:flex-row relative">
            <CreditCard className="w-3 h-3" /> <span className="hidden sm:inline">Crédits</span>
            {isSectionLocked && <Lock className="w-2 h-2 absolute top-0.5 right-0.5 text-muted-foreground/60" />}
          </TabsTrigger>
          <TabsTrigger value="support" className="text-[10px] gap-0.5 px-1 py-1.5 flex-col sm:flex-row relative">
            <Headphones className="w-3 h-3" /> <span className="hidden sm:inline">Support</span>
            {isSectionLocked && <Lock className="w-2 h-2 absolute top-0.5 right-0.5 text-muted-foreground/60" />}
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-[10px] gap-0.5 px-1 py-1.5 flex-col sm:flex-row relative">
            <AlertTriangle className="w-3 h-3" /> <span className="hidden sm:inline">Signalements</span>
            {isSectionLocked && <Lock className="w-2 h-2 absolute top-0.5 right-0.5 text-muted-foreground/60" />}
          </TabsTrigger>
          <TabsTrigger value="actions" className="text-[10px] gap-0.5 px-1 py-1.5 flex-col sm:flex-row relative">
            <Shield className="w-3 h-3" /> <span className="hidden sm:inline">Actions</span>
            {isSectionLocked && <Lock className="w-2 h-2 absolute top-0.5 right-0.5 text-muted-foreground/60" />}
          </TabsTrigger>
        </TabsList>

        {/* ===== INFO TAB ===== */}
        <TabsContent value="info" className="mt-3 space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" /> Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Prénom" value={profile.first_name} />
                <InfoRow label="Nom" value={profile.last_name} />
                <InfoRow label="Date de naissance" value={formatDate(profile.birth_date)} />
                <InfoRow label="Âge" value={profile.age ? `${profile.age} ans` : null} />
                <InfoRow label="Téléphone" value={profile.phone_number} />
                <InfoRow label="Région" value={profile.region} />
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vérification d'identité</h4>
                <div className="flex items-center gap-2">
                  {verificationStatusBadge()}
                  {verification?.reviewed_at && (
                    <span className="text-[10px] text-muted-foreground">le {formatDate(verification.reviewed_at)}</span>
                  )}
                </div>
                {verification?.rejection_reason && (
                  <p className="text-xs text-destructive bg-destructive/5 rounded-lg p-2">
                    Motif de refus : {verification.rejection_reason}
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Profil détaillé</h4>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Bio" value={profile.bio} />
                  <InfoRow label="Morphologie" value={profile.body_type} />
                  <InfoRow label="Ethnicité" value={profile.ethnicity} />
                  <InfoRow label="Recherche" value={profile.looking_for?.join(', ')} />
                  <InfoRow label="Dernière connexion" value={profile.last_seen ? formatDateTime(profile.last_seen) : null} />
                  
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Moderation History */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="w-4 h-4" /> Historique de modération
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {isSectionLocked && <LockedOverlay />}
                <ScrollArea className="h-[180px]">
                  <div className="space-y-2">
                    {moderationActions.map((a: any) => (
                      <div key={a.id} className="flex items-start justify-between bg-secondary/30 rounded-lg p-2.5 gap-2">
                        <div className="min-w-0">
                          <Badge variant="outline" className="text-[10px] mb-1">{a.action_type}</Badge>
                          {a.details && <p className="text-xs text-muted-foreground truncate">{a.details}</p>}
                        </div>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatDate(a.created_at)}</span>
                      </div>
                    ))}
                    {moderationActions.length === 0 && (
                      <p className="text-center text-muted-foreground py-4 text-xs">Aucune action</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== CREDITS TAB ===== */}
        <TabsContent value="credits" className="mt-3 space-y-3">
          <div className="relative">
            {isSectionLocked && <LockedOverlay />}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Solde de crédits
                </CardTitle>
              </CardHeader>
              <CardContent>
                {credits ? (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <CreditBox label="Total" value={credits.total_credits} highlight />
                    <CreditBox label="Quotidiens" value={credits.daily_credits} />
                    <CreditBox label="Passifs" value={credits.passive_credits} locked={credits.lock_passive} />
                    <CreditBox label="Bonus" value={credits.bonus_credits} locked={credits.lock_bonus} />
                    <CreditBox label="Achetés" value={credits.purchased_credits} locked={credits.lock_purchased} />
                    <div className="bg-secondary/50 rounded-lg p-2.5 text-center">
                      <p className="text-[10px] text-muted-foreground">Recharges restantes</p>
                      <p className="text-sm font-bold">{credits.daily_claims_remaining}/7</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">Chargement...</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Dernières transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-1.5">
                    {creditTransactions.map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between text-xs border-b border-border/30 pb-1.5">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{tx.description || tx.transaction_type}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDateTime(tx.created_at)}</p>
                        </div>
                        <span className={`flex-shrink-0 font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-destructive'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </span>
                      </div>
                    ))}
                    {creditTransactions.length === 0 && (
                      <p className="text-center text-muted-foreground py-4 text-xs">Aucune transaction</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== SUPPORT HISTORY TAB ===== */}
        <TabsContent value="support" className="mt-3 space-y-3">
          <div className="relative">
            {isSectionLocked && <LockedOverlay />}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Headphones className="w-4 h-4" /> Historique des tickets ({supportTickets.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {supportTickets.map((t: any) => {
                      const statusColor = t.status === 'open' ? 'bg-amber-500/10 text-amber-600' :
                        t.status === 'assigned' ? 'bg-green-500/10 text-green-600' :
                        t.status === 'waiting_client' ? 'bg-orange-500/10 text-orange-600' :
                        'bg-muted text-muted-foreground';
                      const statusLabel = t.status === 'open' ? 'Ouvert' : t.status === 'assigned' ? 'En cours' :
                        t.status === 'waiting_client' ? 'En attente' : 'Fermé';
                      return (
                        <div key={t.id} className="bg-secondary/30 rounded-lg p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground">#{t.ticket_number}</span>
                              <Badge className={`text-[10px] ${statusColor}`}>{statusLabel}</Badge>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{formatDate(t.created_at)}</span>
                          </div>
                          <p className="text-xs font-medium">{t.subject || 'Demande d\'assistance'}</p>
                          {t.rating_emoji && (
                            <p className="text-xs text-muted-foreground">
                              Note : {t.rating_emoji} {t.rating_comment ? `— ${t.rating_comment}` : ''}
                            </p>
                          )}
                          {t.closed_at && (
                            <p className="text-[10px] text-muted-foreground">Fermé le {formatDate(t.closed_at)}</p>
                          )}
                        </div>
                      );
                    })}
                    {supportTickets.length === 0 && (
                      <p className="text-center text-muted-foreground py-6 text-xs">Aucun ticket de support</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== REPORTS TAB ===== */}
        <TabsContent value="reports" className="mt-3 space-y-3">
          <div className="relative">
            {isSectionLocked && <LockedOverlay />}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Signalements reçus ({reports.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {reports.map((r: any) => (
                      <div key={r.id} className="bg-secondary/30 rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant={r.status === 'resolved' ? 'default' : r.status === 'pending' ? 'secondary' : 'destructive'} className="text-[10px]">
                            {r.status === 'resolved' ? 'Résolu' : r.status === 'pending' ? 'En attente' : r.status}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{formatDate(r.created_at)}</span>
                        </div>
                        <p className="text-xs font-medium">{r.reason}</p>
                        {r.details && <p className="text-[11px] text-muted-foreground">{r.details}</p>}
                      </div>
                    ))}
                    {reports.length === 0 && (
                      <p className="text-center text-muted-foreground py-6 text-xs">Aucun signalement</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Blocks */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Ban className="w-4 h-4" /> Blocages ({userBlocks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[150px]">
                  <div className="space-y-2">
                    {userBlocks.map((b: any) => (
                      <div key={b.id} className="bg-secondary/30 rounded-lg p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant={b.is_active ? 'destructive' : 'secondary'} className="text-[10px]">
                            {b.is_active ? 'Actif' : 'Levé'}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{formatDate(b.created_at)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{b.reason || 'Aucune raison'}</p>
                        {b.suspension_type === 'temporary' && b.suspension_ends_at && (
                          <p className="text-[10px] text-muted-foreground">Expire le {formatDate(b.suspension_ends_at)}</p>
                        )}
                      </div>
                    ))}
                    {userBlocks.length === 0 && (
                      <p className="text-center text-muted-foreground py-4 text-xs">Aucun blocage</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== ACTIONS TAB ===== */}
        <TabsContent value="actions" className="mt-3 space-y-3">
          <div className="relative">
            {isSectionLocked && <LockedOverlay />}
            <ActionsSection userId={userId} blockedStatus={blockedStatus} queryClient={queryClient} verification={verification} ticketId={ticketId} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ---- Helper Components ----
const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div>
    <span className="text-muted-foreground text-[11px]">{label}</span>
    <p className="font-medium text-sm">{value || '—'}</p>
  </div>
);

const CreditBox = ({ label, value, highlight, locked }: { label: string; value: number; highlight?: boolean; locked?: boolean }) => (
  <div className="bg-secondary/50 rounded-lg p-2.5 text-center relative">
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className={`text-sm font-bold ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</p>
    {locked && (
      <Lock className="w-2.5 h-2.5 text-muted-foreground/50 absolute top-1.5 right-1.5" />
    )}
  </div>
);

// ---- Actions Section ----
interface ActionsSectionProps {
  userId: string;
  blockedStatus: any;
  queryClient: any;
  verification: any;
  ticketId?: string;
}

const ActionsSection = ({ userId, blockedStatus, queryClient, verification, ticketId }: ActionsSectionProps) => {
  const [creditAmount, setCreditAmount] = useState('');
  const [creditType, setCreditType] = useState<'bonus' | 'purchased' | 'daily' | 'passive'>('bonus');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreditAdd, setShowCreditAdd] = useState(false);
  const [showCreditRemove, setShowCreditRemove] = useState(false);

  const logCreditActionToChat = async (description: string) => {
    if (!ticketId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('support_messages' as any)
        .insert({
          ticket_id: ticketId,
          sender_id: user?.id,
          content: description,
          message_type: 'system',
        } as any);
    } catch { /* ignore */ }
  };

  const handleAddCredits = async () => {
    const amount = parseFloat(creditAmount);
    if (!amount || amount <= 0 || amount > 10000) {
      toast.error('Montant invalide (1 - 10 000)');
      return;
    }
    setActionLoading('add-credits');
    try {
      const creditTypeLabels: Record<string, string> = { purchased: 'Achetés', daily: 'Quotidiens', bonus: 'Bonus', passive: 'Passifs' };
      const { data, error } = await supabase.rpc('add_credits', {
        _user_id: userId,
        _amount: amount,
        _credit_type: creditType,
        _transaction_type: 'admin_adjustment',
        _description: `Ajout admin : +${amount} crédits (${creditTypeLabels[creditType]})`,
      });
      if (error) throw error;
      const result = data as any;
      if (result?.success === false) throw new Error(result.error);

      const { data: { user: adminUser } } = await supabase.auth.getUser();
      await supabase.from('moderation_actions').insert({
        performed_by: adminUser?.id || '',
        target_user_id: userId,
        action_type: 'credit_adjustment' as any,
        details: `Ajout de ${amount} crédits (${creditTypeLabels[creditType]})`,
      });

      // Log to support chat
      await logCreditActionToChat(`✅ +${amount} crédits (${creditTypeLabels[creditType]}) attribués au client.`);

      queryClient.invalidateQueries({ queryKey: ['client-dossier-credits'] });
      queryClient.invalidateQueries({ queryKey: ['client-dossier-credit-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['client-dossier-moderation'] });
      toast.success(`${amount} crédits ajoutés`);
      setCreditAmount('');
      setShowCreditAdd(false);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'ajout');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveCredits = async () => {
    const amount = parseFloat(creditAmount);
    if (!amount || amount <= 0 || amount > 10000) {
      toast.error('Montant invalide (1 - 10 000)');
      return;
    }
    setActionLoading('remove-credits');
    try {
      const { data, error } = await supabase.rpc('deduct_credits', {
        _user_id: userId,
        _amount: amount,
        _transaction_type: 'admin_deduction',
        _description: `Retrait admin : -${amount} crédits`,
      });
      if (error) throw error;
      const result = data as any;
      if (result?.success === false) throw new Error(result.error || 'Crédits insuffisants');

      const { data: { user: adminUser } } = await supabase.auth.getUser();
      await supabase.from('moderation_actions').insert({
        performed_by: adminUser?.id || '',
        target_user_id: userId,
        action_type: 'credit_adjustment' as any,
        details: `Retrait de ${amount} crédits`,
      });

      await logCreditActionToChat(`❌ -${amount} crédits retirés du compte client.`);

      queryClient.invalidateQueries({ queryKey: ['client-dossier-credits'] });
      queryClient.invalidateQueries({ queryKey: ['client-dossier-credit-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['client-dossier-moderation'] });
      toast.success(`${amount} crédits retirés`);
      setCreditAmount('');
      setShowCreditRemove(false);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du retrait');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleBlock = async () => {
    const isCurrentlyBlocked = blockedStatus?.isBlocked;
    setActionLoading('block');
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (isCurrentlyBlocked) {
        await supabase.from('user_blocks')
          .update({ is_active: false, unblocked_at: new Date().toISOString() })
          .eq('user_id', userId).eq('is_active', true);
        await supabase.from('moderation_actions').insert({
          performed_by: adminUser?.id || '', target_user_id: userId,
          action_type: 'unblock' as any, details: 'Déblocage du compte',
        });
        toast.success('Utilisateur débloqué');
      } else {
        await supabase.from('user_blocks').insert({
          user_id: userId, blocked_by: adminUser?.id,
          reason: 'Bloqué par un administrateur', is_active: true, suspension_type: 'permanent',
        });
        await supabase.from('moderation_actions').insert({
          performed_by: adminUser?.id || '', target_user_id: userId,
          action_type: 'block' as any, details: 'Blocage du compte',
        });
        toast.success('Utilisateur bloqué');
      }
      queryClient.invalidateQueries({ queryKey: ['client-dossier-blocked'] });
      queryClient.invalidateQueries({ queryKey: ['client-dossier-moderation'] });
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleSuspend = async () => {
    const isCurrentlySuspended = blockedStatus?.isSuspended;
    setActionLoading('suspend');
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (isCurrentlySuspended) {
        await supabase.from('user_blocks')
          .update({ is_active: false, unblocked_at: new Date().toISOString() })
          .eq('user_id', userId).eq('is_active', true);
      } else {
        await supabase.from('user_blocks').insert({
          user_id: userId, blocked_by: adminUser?.id,
          reason: 'Suspendu par un administrateur', is_active: true,
          suspension_type: 'temporary',
          suspension_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
      await supabase.from('moderation_actions').insert({
        performed_by: adminUser?.id || '', target_user_id: userId,
        action_type: (isCurrentlySuspended ? 'unsuspend' : 'suspend') as any,
        details: isCurrentlySuspended ? 'Réactivation du compte' : 'Suspension du compte (30 jours)',
      });
      await supabase.from('notifications').insert({
        user_id: userId, type: 'system',
        title: isCurrentlySuspended ? '✅ Compte réactivé' : '⚠️ Compte suspendu',
        message: isCurrentlySuspended
          ? 'Votre compte a été réactivé par l\'équipe de modération.'
          : 'Votre compte a été suspendu par l\'équipe de modération.',
        is_read: false,
      });
      queryClient.invalidateQueries({ queryKey: ['client-dossier-blocked'] });
      queryClient.invalidateQueries({ queryKey: ['client-dossier-moderation'] });
      queryClient.invalidateQueries({ queryKey: ['client-dossier-profile'] });
      toast.success(isCurrentlySuspended ? 'Compte réactivé' : 'Compte suspendu');
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestNewVerification = async () => {
    setActionLoading('reverify');
    try {
      if (verification) {
        await supabase.from('identity_verifications')
          .update({ status: 'pending' as any, submitted_at: null, rejection_reason: null, reviewed_at: null, reviewed_by: null, selfie_url: null, id_front_url: null, id_back_url: null })
          .eq('id', verification.id);
      } else {
        await supabase.from('identity_verifications')
          .insert({ user_id: userId, status: 'pending' as any });
      }
      await supabase.from('notifications').insert({
        user_id: userId, type: 'verification_required',
        title: '🔄 Nouvelle vérification requise',
        message: 'L\'équipe de modération vous demande de soumettre à nouveau vos documents d\'identité.',
        is_read: false,
      });
      queryClient.invalidateQueries({ queryKey: ['client-dossier-verification'] });
      toast.success('Demande de re-vérification envoyée');
    } catch {
      toast.error('Erreur lors de la demande');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Credit Management */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Gestion des crédits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-auto py-3"
              onClick={() => { setShowCreditAdd(!showCreditAdd); setShowCreditRemove(false); setCreditAmount(''); }}>
              <Plus className="w-3.5 h-3.5 text-green-600" /> Ajouter
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-auto py-3"
              onClick={() => { setShowCreditRemove(!showCreditRemove); setShowCreditAdd(false); setCreditAmount(''); }}>
              <Minus className="w-3.5 h-3.5 text-destructive" /> Retirer
            </Button>
          </div>

          {showCreditAdd && (
            <div className="space-y-2 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
              <div className="flex gap-2">
                <Input type="number" min="1" max="10000" placeholder="Montant" value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)} className="flex-1 text-sm" />
                <Select value={creditType} onValueChange={(v) => setCreditType(v as any)}>
                  <SelectTrigger className="w-[120px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bonus">Bonus</SelectItem>
                    <SelectItem value="purchased">Achetés</SelectItem>
                    <SelectItem value="daily">Quotidiens</SelectItem>
                    <SelectItem value="passive">Passifs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                {[5, 10, 25, 50, 100].map(v => (
                  <Button key={v} variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setCreditAmount(String(v))}>{v}</Button>
                ))}
              </div>
              <Button onClick={handleAddCredits} disabled={actionLoading === 'add-credits' || !creditAmount}
                className="w-full gap-2 text-xs" size="sm">
                {actionLoading === 'add-credits' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Ajouter {creditAmount ? `${creditAmount} crédits` : ''}
              </Button>
            </div>
          )}

          {showCreditRemove && (
            <div className="space-y-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <Input type="number" min="1" max="10000" placeholder="Montant à retirer" value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)} className="text-sm" />
              <div className="flex gap-2">
                {[5, 10, 25, 50].map(v => (
                  <Button key={v} variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setCreditAmount(String(v))}>{v}</Button>
                ))}
              </div>
              <Button variant="destructive" onClick={handleRemoveCredits}
                disabled={actionLoading === 'remove-credits' || !creditAmount} className="w-full gap-2 text-xs" size="sm">
                {actionLoading === 'remove-credits' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Minus className="w-3 h-3" />}
                Retirer {creditAmount ? `${creditAmount} crédits` : ''}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Moderation Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" /> Actions de modération
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm"
              className={`gap-1.5 text-xs h-auto py-3 ${blockedStatus?.isBlocked ? 'border-green-500/30 text-green-600' : 'text-destructive'}`}
              onClick={handleToggleBlock} disabled={actionLoading === 'block'}>
              {actionLoading === 'block' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                blockedStatus?.isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
              {blockedStatus?.isBlocked ? 'Débloquer' : 'Bloquer'}
            </Button>
            <Button variant="outline" size="sm"
              className={`gap-1.5 text-xs h-auto py-3 ${blockedStatus?.isSuspended ? 'border-green-500/30 text-green-600' : 'text-destructive'}`}
              onClick={handleToggleSuspend} disabled={actionLoading === 'suspend'}>
              {actionLoading === 'suspend' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                blockedStatus?.isSuspended ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {blockedStatus?.isSuspended ? 'Réactiver' : 'Suspendre'}
            </Button>
          </div>

          <Separator className="my-2" />

          <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs"
            onClick={handleRequestNewVerification} disabled={actionLoading === 'reverify'}>
            {actionLoading === 'reverify' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Demander une (re)vérification d'identité
          </Button>

          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Toutes les actions sont journalisées.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDossierPanel;
