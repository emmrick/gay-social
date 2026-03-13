import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Plus, Minus, RefreshCw, AlertCircle
} from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface ClientDossierPanelProps {
  userId: string;
  ticketId?: string;
  onClose?: () => void;
}

const ClientDossierPanel = ({ userId, ticketId, onClose }: ClientDossierPanelProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [otpId, setOtpId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpExpiry, setOtpExpiry] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [sendingPhoneNotif, setSendingPhoneNotif] = useState(false);

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (!otpExpiry) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((otpExpiry.getTime() - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [otpExpiry]);

  // Fetch user profile (basic info always visible)
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

  // Fetch user email from auth (only when verified)
  const { data: userEmail } = useQuery({
    queryKey: ['client-dossier-email', userId, isVerified],
    queryFn: async () => {
      return null;
    },
    enabled: isVerified,
  });

  // Fetch credit balance (only when verified) - with short staleTime for freshness
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

  // Fetch credit transactions (only when verified)
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

  // Realtime subscription for credit changes - auto-refresh dossier when credits change
  useEffect(() => {
    if (!isVerified || !userId) return;

    const channel = supabase
      .channel(`dossier-credits-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_transactions',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Invalidate both credits balance and transactions when any change occurs
          queryClient.invalidateQueries({ queryKey: ['client-dossier-credits', userId, isVerified] });
          queryClient.invalidateQueries({ queryKey: ['client-dossier-credit-transactions', userId, isVerified] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_credits',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['client-dossier-credits', userId, isVerified] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const hasPhoneNumber = !!profile?.phone_number;

  // Send notification to ask user to add phone number
  const handleSendPhoneNotification = async () => {
    setSendingPhoneNotif(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'system',
          title: '📱 Numéro de téléphone requis',
          message: 'Pour assurer la sécurité de ton compte et te permettre de bénéficier d\'une assistance personnalisée, merci d\'ajouter ton numéro de téléphone dans les paramètres de ton profil. Cette information est indispensable pour que notre équipe puisse vérifier ton identité lors de demandes de support.',
          action_url: '/?tab=profile&editProfile=true',
          is_read: false,
        });
      if (error) throw error;

      // Also send push notification
      const { sendPushNotification } = await import('@/services/pushNotificationService');
      await sendPushNotification({
        userId,
        title: '📱 Numéro de téléphone requis',
        body: 'Ajoute ton numéro de téléphone dans ton profil pour sécuriser ton compte.',
        url: '/?tab=profile&editProfile=true',
        tag: 'phone-required',
        notificationType: 'system',
      });

      toast.success('Notification envoyée au client');
    } catch (err: any) {
      toast.error('Erreur lors de l\'envoi de la notification');
    } finally {
      setSendingPhoneNotif(false);
    }
  };

  // Send OTP
  const handleSendOTP = async () => {
    if (!profile?.phone_number) {
      toast.error('Ce membre n\'a pas de numéro de téléphone enregistré');
      return;
    }
    setOtpSending(true);
    try {
      const response = await supabase.functions.invoke('send-otp-sms', {
        body: {
          action: 'send',
          target_user_id: userId,
          ticket_id: ticketId,
          phone_number: profile.phone_number,
        },
      });

      if (response.error) throw new Error(response.error.message);
      const result = response.data;
      if (result.success) {
        setOtpId(result.otp_id);
        setOtpExpiry(new Date(result.expires_at));
        toast.success('Code envoyé par SMS au client');
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur envoi SMS');
    } finally {
      setOtpSending(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    if (!otpId || otpCode.length !== 6) return;
    setOtpVerifying(true);
    try {
      const response = await supabase.functions.invoke('send-otp-sms', {
        body: { action: 'verify', otp_id: otpId, code: otpCode },
      });

      if (response.error) throw new Error(response.error.message);
      const result = response.data;
      if (result.verified) {
        setIsVerified(true);
        toast.success('Accès au dossier client autorisé');
      } else {
        throw new Error(result.error || 'Code incorrect');
      }
    } catch (err: any) {
      toast.error(err.message || 'Vérification échouée');
    } finally {
      setOtpVerifying(false);
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

  // Locked tab content overlay
  const LockedOverlay = () => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-xl">
      <Lock className="w-10 h-10 text-muted-foreground/50 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">Accès verrouillé</p>
      <p className="text-xs text-muted-foreground/70 mt-1 text-center max-w-[240px]">
        Le client doit d'abord ajouter son numéro de téléphone, puis valider un code OTP.
      </p>
    </div>
  );

  // Determine if sections should be locked (no phone = locked except identity verification)
  const isSectionLocked = !hasPhoneNumber || !isVerified;

  return (
    <div className="space-y-4">
      {/* Header: basic profile info (always visible) */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground">{profile.username}</h3>
                {profile.is_verified && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <ShieldCheck className="w-3 h-3" /> Vérifié
                  </Badge>
                )}
                {blockedStatus?.isBlocked && (
                  <Badge variant="destructive" className="text-[10px]">Bloqué</Badge>
                )}
                {blockedStatus?.isSuspended && (
                  <Badge variant="destructive" className="text-[10px]">Suspendu</Badge>
                )}
                {!hasPhoneNumber && (
                  <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/50 text-amber-600">
                    <Phone className="w-3 h-3" /> Pas de téléphone
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {profile.first_name} {profile.last_name} · {profile.age ? `${profile.age} ans` : 'Âge inconnu'}
              </p>
              <p className="text-xs text-muted-foreground">
                Inscrit le {formatDate(profile.created_at)} · Région : {profile.region}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No phone number: show notification button + identity verification only */}
      {!hasPhoneNumber && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Lock className="w-4 h-4" />
              Dossier verrouillé — Numéro de téléphone manquant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ce client n'a pas encore renseigné de numéro de téléphone. Toutes les actions sont verrouillées 
              sauf la <strong>vérification d'identité</strong>. Vous pouvez lui envoyer une notification 
              pour lui demander d'ajouter son numéro.
            </p>
            <Button 
              onClick={handleSendPhoneNotification} 
              disabled={sendingPhoneNotif}
              variant="outline"
              className="w-full gap-2 border-amber-500/30 hover:bg-amber-500/10"
            >
              {sendingPhoneNotif ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bell className="w-4 h-4 text-amber-600" />
              )}
              Demander l'ajout du numéro de téléphone
            </Button>
          </CardContent>
        </Card>
      )}

      {/* OTP Verification Gate (only when phone exists but not yet verified) */}
      {hasPhoneNumber && !isVerified && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              Vérification requise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pour accéder au dossier complet de ce client et effectuer des modifications, 
              un <strong>code à 6 chiffres</strong> doit être envoyé par SMS au client. 
              Le code est valable <strong>5 minutes</strong>.
            </p>

            <div className="flex items-center gap-2 text-sm bg-secondary/50 rounded-lg p-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>SMS sera envoyé au : <strong>{profile.phone_number?.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 ** ** ** $5')}</strong></span>
            </div>

            {!otpId ? (
              <Button onClick={handleSendOTP} disabled={otpSending} className="w-full gap-2">
                {otpSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Envoyer le code de vérification
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">Entrez le code communiqué par le client</p>
                  {countdown > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Expire dans : <span className="font-mono text-primary">{Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</span>
                    </p>
                  )}
                  {countdown === 0 && otpExpiry && (
                    <p className="text-xs text-destructive">Code expiré</p>
                  )}
                </div>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleSendOTP} 
                    disabled={otpSending || countdown > 240}
                    className="flex-1"
                    size="sm"
                  >
                    Renvoyer
                  </Button>
                  <Button 
                    onClick={handleVerifyOTP} 
                    disabled={otpCode.length !== 6 || otpVerifying || countdown === 0}
                    className="flex-1 gap-1"
                    size="sm"
                  >
                    {otpVerifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <KeyRound className="w-3 h-3" />}
                    Vérifier
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs: always visible but locked sections show padlock overlay */}
      <Tabs defaultValue={!hasPhoneNumber ? "verification" : "info"} className="w-full">
        <TabsList className="w-full grid grid-cols-6">
          <TabsTrigger value="verification" className="text-xs gap-1">
            <Shield className="w-3 h-3" /> Identité
          </TabsTrigger>
          <TabsTrigger value="info" className="text-xs gap-1 relative">
            <User className="w-3 h-3" /> Infos
            {isSectionLocked && <Lock className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-muted-foreground/60" />}
          </TabsTrigger>
          <TabsTrigger value="credits" className="text-xs gap-1 relative">
            <CreditCard className="w-3 h-3" /> Crédits
            {isSectionLocked && <Lock className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-muted-foreground/60" />}
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs gap-1 relative">
            <AlertTriangle className="w-3 h-3" /> Signalements
            {isSectionLocked && <Lock className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-muted-foreground/60" />}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1 relative">
            <History className="w-3 h-3" /> Historique
            {isSectionLocked && <Lock className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-muted-foreground/60" />}
          </TabsTrigger>
          <TabsTrigger value="actions" className="text-xs gap-1 relative">
            <Shield className="w-3 h-3" /> Actions
            {isSectionLocked && <Lock className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-muted-foreground/60" />}
          </TabsTrigger>
        </TabsList>

        {/* Identity Verification Tab (always accessible) */}
        <TabsContent value="verification" className="mt-3 space-y-3">
          <VerificationSection userId={userId} verification={verification} profile={profile} />
        </TabsContent>

        {/* Info Tab */}
        <TabsContent value="info" className="mt-3 space-y-3">
          <div className="relative">
            {isSectionLocked && <LockedOverlay />}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Informations personnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground text-xs">Prénom</span>
                    <p className="font-medium">{profile.first_name || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Nom</span>
                    <p className="font-medium">{profile.last_name || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Date de naissance</span>
                    <p className="font-medium">{formatDate(profile.birth_date)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Âge</span>
                    <p className="font-medium">{profile.age ? `${profile.age} ans` : '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Téléphone</span>
                    <p className="font-medium">{profile.phone_number || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Région</span>
                    <p className="font-medium">{profile.region}</p>
                  </div>
                </div>
                <Separator className="my-3" />
                <div>
                  <span className="text-muted-foreground text-xs">Identité vérifiée</span>
                  <div className="flex items-center gap-2 mt-1">
                    {verification?.status === 'approved' ? (
                      <Badge className="bg-green-500/10 text-green-600 gap-1">
                        <CheckCircle className="w-3 h-3" /> Approuvée
                      </Badge>
                    ) : verification?.status === 'pending' ? (
                      <Badge variant="secondary" className="gap-1">
                        <Loader2 className="w-3 h-3" /> En attente
                      </Badge>
                    ) : verification?.status === 'rejected' ? (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="w-3 h-3" /> Rejetée
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Non soumise</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Credits Tab */}
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
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-secondary/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold text-primary">{credits.total_credits}</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">Quotidiens</p>
                      <p className="text-lg font-bold">{credits.daily_credits}</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">Bonus</p>
                      <p className="text-lg font-bold">{credits.bonus_credits}</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">Achetés</p>
                      <p className="text-lg font-bold">{credits.purchased_credits}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Chargement...</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Dernières transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {creditTransactions.map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between text-xs border-b border-border/50 pb-2">
                        <div>
                          <p className="font-medium">{tx.description || tx.transaction_type}</p>
                          <p className="text-muted-foreground">{formatDate(tx.created_at)}</p>
                        </div>
                        <span className={tx.amount > 0 ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </span>
                      </div>
                    ))}
                    {creditTransactions.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">Aucune transaction</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-3 space-y-3">
          <div className="relative">
            {isSectionLocked && <LockedOverlay />}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Signalements ({reports.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {reports.map((r: any) => (
                      <div key={r.id} className="bg-secondary/30 rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant={r.status === 'resolved' ? 'default' : r.status === 'pending' ? 'secondary' : 'destructive'} className="text-[10px]">
                            {r.status}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{formatDate(r.created_at)}</span>
                        </div>
                        <p className="text-xs">{r.reason}</p>
                        {r.details && <p className="text-[11px] text-muted-foreground">{r.details}</p>}
                      </div>
                    ))}
                    {reports.length === 0 && (
                      <p className="text-center text-muted-foreground py-6">Aucun signalement</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-3 space-y-3">
          <div className="relative">
            {isSectionLocked && <LockedOverlay />}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="w-4 h-4" /> Actions de modération
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {moderationActions.map((a: any) => (
                      <div key={a.id} className="bg-secondary/30 rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[10px]">{a.action_type}</Badge>
                          <span className="text-[10px] text-muted-foreground">{formatDate(a.created_at)}</span>
                        </div>
                        {a.details && <p className="text-xs text-muted-foreground">{a.details}</p>}
                      </div>
                    ))}
                    {moderationActions.length === 0 && (
                      <p className="text-center text-muted-foreground py-6">Aucune action</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="mt-3 space-y-3">
          <div className="relative">
            {isSectionLocked && <LockedOverlay />}
            <ActionsSection userId={userId} blockedStatus={blockedStatus} queryClient={queryClient} verification={verification} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ---- Verification Section (always accessible) ----
interface VerificationSectionProps {
  userId: string;
  verification: any;
  profile: any;
}

const VerificationSection = ({ userId, verification, profile }: VerificationSectionProps) => {
  const queryClient = useQueryClient();
  const [signedUrls, setSignedUrls] = useState<{ selfie: string | null; idFront: string | null; idBack: string | null }>({
    selfie: null, idFront: null, idBack: null,
  });
  const [hasViewed, setHasViewed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  // Identity confirmation fields
  const [confirmedFirstName, setConfirmedFirstName] = useState('');
  const [confirmedLastName, setConfirmedLastName] = useState('');
  const [confirmedBirthDate, setConfirmedBirthDate] = useState('');

  const isPending = verification?.status === 'pending' && verification?.submitted_at;

  // Calculate age from confirmed birth date
  const calculateAge = (dateStr: string): number | null => {
    if (!dateStr) return null;
    const birth = new Date(dateStr);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const confirmedAge = calculateAge(confirmedBirthDate);
  const isAdult = confirmedAge !== null && confirmedAge >= 18;
  const isMinor = confirmedAge !== null && confirmedAge < 18;

  // Load signed URLs when pending
  const loadSignedUrls = async () => {
    if (!verification) return;
    try {
      const getSignedUrl = async (path: string | null) => {
        if (!path) return null;
        const filePath = path.includes('/') ? path.split('/').slice(-2).join('/') : path;
        const { data } = await supabase.storage
          .from('identity-documents')
          .createSignedUrl(filePath, 300);
        return data?.signedUrl || null;
      };
      const [selfie, idFront, idBack] = await Promise.all([
        getSignedUrl(verification.selfie_url),
        getSignedUrl(verification.id_front_url),
        getSignedUrl(verification.id_back_url),
      ]);
      setSignedUrls({ selfie, idFront, idBack });
    } catch (err) {
      console.error('Error getting signed URLs:', err);
    }
  };

  const handleApprove = async () => {
    if (!verification || !confirmedFirstName.trim() || !confirmedLastName.trim() || !confirmedBirthDate || !isAdult) {
      toast.error('Veuillez confirmer le nom, prénom et la date de naissance (≥ 18 ans)');
      return;
    }

    setIsProcessing(true);
    try {
      // Update profile with confirmed identity info
      await supabase
        .from('profiles')
        .update({
          first_name: confirmedFirstName.trim(),
          last_name: confirmedLastName.trim(),
          birth_date: confirmedBirthDate,
          age: confirmedAge,
          is_verified: true,
        })
        .eq('user_id', userId);

      // Update verification status
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      await supabase
        .from('identity_verifications')
        .update({
          status: 'approved' as any,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminUser?.id,
          documents_deleted: true,
          selfie_url: null,
          id_front_url: null,
          id_back_url: null,
        })
        .eq('id', verification.id);

      // Delete documents from storage
      const { data: files } = await supabase.storage
        .from('identity-documents')
        .list(userId);
      if (files && files.length > 0) {
        const filePaths = files.map((f: any) => `${userId}/${f.name}`);
        await supabase.storage.from('identity-documents').remove(filePaths);
      }

      queryClient.invalidateQueries({ queryKey: ['client-dossier-verification'] });
      queryClient.invalidateQueries({ queryKey: ['client-dossier-profile'] });
      queryClient.invalidateQueries({ queryKey: ['admin-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['pending-verifications-count'] });
      toast.success('Identité vérifiée et confirmée');
    } catch (err) {
      toast.error('Erreur lors de l\'approbation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!verification || !rejectReason.trim()) {
      toast.error('Veuillez indiquer une raison de refus');
      return;
    }
    setIsProcessing(true);
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();

      // Delete documents
      const { data: files } = await supabase.storage
        .from('identity-documents')
        .list(userId);
      if (files && files.length > 0) {
        const filePaths = files.map((f: any) => `${userId}/${f.name}`);
        await supabase.storage.from('identity-documents').remove(filePaths);
      }

      await supabase
        .from('identity_verifications')
        .update({
          status: 'rejected' as any,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminUser?.id,
          rejection_reason: rejectReason,
          documents_deleted: true,
          selfie_url: null,
          id_front_url: null,
          id_back_url: null,
        })
        .eq('id', verification.id);

      queryClient.invalidateQueries({ queryKey: ['client-dossier-verification'] });
      queryClient.invalidateQueries({ queryKey: ['admin-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['pending-verifications-count'] });
      toast.success('Vérification refusée');
      setShowRejectInput(false);
      setRejectReason('');
    } catch (err) {
      toast.error('Erreur lors du refus');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestNewVerification = async () => {
    setIsProcessing(true);
    try {
      // Reset verification status so user can resubmit
      if (verification) {
        await supabase
          .from('identity_verifications')
          .update({
            status: 'pending' as any,
            submitted_at: null,
            rejection_reason: null,
            reviewed_at: null,
            reviewed_by: null,
            selfie_url: null,
            id_front_url: null,
            id_back_url: null,
          })
          .eq('id', verification.id);
      } else {
        await supabase
          .from('identity_verifications')
          .insert({
            user_id: userId,
            status: 'pending' as any,
          });
      }

      // Notify user
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'verification_required',
        title: '🔄 Nouvelle vérification requise',
        message: 'L\'équipe de modération vous demande de soumettre à nouveau vos documents d\'identité. Rendez-vous dans votre profil pour compléter la vérification.',
        is_read: false,
      });

      queryClient.invalidateQueries({ queryKey: ['client-dossier-verification'] });
      toast.success('Demande de re-vérification envoyée au client');
    } catch (err) {
      toast.error('Erreur lors de la demande');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!verification || !isPending) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-4">
          <div className="text-muted-foreground">
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {verification?.status === 'approved'
                ? 'Identité déjà vérifiée ✅'
                : verification?.status === 'rejected'
                ? 'Dernière vérification refusée. En attente d\'une nouvelle soumission.'
                : 'Aucune demande de vérification en attente.'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRequestNewVerification}
            disabled={isProcessing}
            className="gap-2"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Demander une (re)vérification d'identité
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Documents soumis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasViewed ? (
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={() => {
                setHasViewed(true);
                loadSignedUrls();
                // Mark as viewed
                supabase
                  .from('identity_verifications')
                  .update({ admin_viewed_at: new Date().toISOString() })
                  .eq('id', verification.id)
                  .then(() => {});
              }}
            >
              <Eye className="w-4 h-4" />
              Afficher les documents
            </Button>
          ) : (
            <div className="space-y-4 select-none" onContextMenu={(e) => e.preventDefault()}>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Selfie', url: signedUrls.selfie },
                  { label: 'Recto ID', url: signedUrls.idFront },
                  { label: 'Verso ID', url: signedUrls.idBack },
                ].map((doc) => (
                  <div key={doc.label} className="space-y-1">
                    <p className="text-xs font-medium text-center">{doc.label}</p>
                    <div className="aspect-square bg-secondary rounded-lg overflow-hidden">
                      {doc.url ? (
                        <img src={doc.url} alt={doc.label} className="w-full h-full object-cover pointer-events-none" draggable={false} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Identity Confirmation Fields */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Confirmation d'identité
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Saisissez les informations telles qu'elles apparaissent sur la pièce d'identité
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Prénom</label>
                      <Input
                        placeholder="Prénom sur la pièce d'identité"
                        value={confirmedFirstName}
                        onChange={(e) => setConfirmedFirstName(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Nom</label>
                      <Input
                        placeholder="Nom sur la pièce d'identité"
                        value={confirmedLastName}
                        onChange={(e) => setConfirmedLastName(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Date de naissance</label>
                    <Input
                      type="date"
                      value={confirmedBirthDate}
                      onChange={(e) => setConfirmedBirthDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="text-sm"
                    />
                  </div>

                  {/* Visual age detection */}
                  {confirmedBirthDate && (
                    <div className={`rounded-lg p-3 flex items-center gap-3 ${
                      isMinor 
                        ? 'bg-destructive/10 border border-destructive/30' 
                        : isAdult 
                        ? 'bg-green-500/10 border border-green-500/30' 
                        : 'bg-secondary'
                    }`}>
                      <Calendar className={`w-5 h-5 flex-shrink-0 ${
                        isMinor ? 'text-destructive' : isAdult ? 'text-green-600' : 'text-muted-foreground'
                      }`} />
                      <div>
                        <p className={`text-sm font-semibold ${
                          isMinor ? 'text-destructive' : isAdult ? 'text-green-600' : 'text-foreground'
                        }`}>
                          {confirmedAge !== null ? `${confirmedAge} ans` : 'Date invalide'}
                        </p>
                        {isMinor && (
                          <p className="text-xs text-destructive font-medium">
                            ⚠️ MINEUR — Vérification impossible, refusez la demande
                          </p>
                        )}
                        {isAdult && (
                          <p className="text-xs text-green-600">
                            ✅ Majeur — Éligible à la vérification
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Profile comparison */}
                  {(profile.first_name || profile.last_name || profile.birth_date) && (
                    <div className="bg-secondary/50 rounded-lg p-3 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Données déclarées par l'utilisateur :</p>
                      <div className="text-xs space-y-0.5">
                        {profile.first_name && (
                          <p>
                            Prénom : <span className={confirmedFirstName && confirmedFirstName.toLowerCase() !== profile.first_name?.toLowerCase() ? 'text-amber-600 font-medium' : ''}>{profile.first_name}</span>
                            {confirmedFirstName && confirmedFirstName.toLowerCase() !== profile.first_name?.toLowerCase() && (
                              <span className="text-amber-600 ml-1">≠ pièce d'identité</span>
                            )}
                          </p>
                        )}
                        {profile.last_name && (
                          <p>
                            Nom : <span className={confirmedLastName && confirmedLastName.toLowerCase() !== profile.last_name?.toLowerCase() ? 'text-amber-600 font-medium' : ''}>{profile.last_name}</span>
                            {confirmedLastName && confirmedLastName.toLowerCase() !== profile.last_name?.toLowerCase() && (
                              <span className="text-amber-600 ml-1">≠ pièce d'identité</span>
                            )}
                          </p>
                        )}
                        {profile.birth_date && (
                          <p>
                            Naissance : {new Date(profile.birth_date).toLocaleDateString('fr-FR')}
                            {confirmedBirthDate && confirmedBirthDate !== profile.birth_date && (
                              <span className="text-amber-600 ml-1">≠ pièce d'identité</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              {showRejectInput ? (
                <div className="space-y-2">
                  <Input
                    placeholder="Raison du refus (ex: Photo floue, document illisible...)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowRejectInput(false)}>
                      Annuler
                    </Button>
                    <Button variant="destructive" size="sm" className="flex-1" onClick={handleReject} disabled={isProcessing || !rejectReason.trim()}>
                      {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirmer le refus'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-1" 
                    onClick={() => setShowRejectInput(true)}
                    disabled={isProcessing}
                    size="sm"
                  >
                    <XCircle className="w-4 h-4" /> Refuser
                  </Button>
                  <Button 
                    variant="hero" 
                    className="flex-1 gap-1"
                    onClick={handleApprove}
                    disabled={isProcessing || !confirmedFirstName.trim() || !confirmedLastName.trim() || !confirmedBirthDate || !isAdult}
                    size="sm"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" /> Approuver
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ---- Actions Section ----
interface ActionsSectionProps {
  userId: string;
  blockedStatus: any;
  queryClient: any;
  verification: any;
}

const ActionsSection = ({ userId, blockedStatus, queryClient, verification }: ActionsSectionProps) => {
  const [creditAmount, setCreditAmount] = useState('');
  const [creditType, setCreditType] = useState<'bonus' | 'purchased' | 'daily'>('bonus');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreditAdd, setShowCreditAdd] = useState(false);
  const [showCreditRemove, setShowCreditRemove] = useState(false);

  const handleAddCredits = async () => {
    const amount = parseFloat(creditAmount);
    if (!amount || amount <= 0 || amount > 10000) {
      toast.error('Montant invalide (1 - 10 000)');
      return;
    }
    setActionLoading('add-credits');
    try {
      const { data, error } = await supabase.rpc('add_credits', {
        _user_id: userId,
        _amount: amount,
        _credit_type: creditType,
        _transaction_type: 'admin_adjustment',
        _description: `Ajout admin : +${amount} crédits (${creditType})`,
      });
      if (error) throw error;
      const result = data as any;
      if (result?.success === false) throw new Error(result.error);

      // Log moderation action
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      await supabase.from('moderation_actions').insert({
        performed_by: adminUser?.id || '',
        target_user_id: userId,
        action_type: 'credit_adjustment' as any,
        details: `Ajout de ${amount} crédits (${creditType})`,
      });

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
        // Deactivate all active blocks
        await supabase.from('user_blocks')
          .update({ is_active: false, unblocked_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('is_active', true);
        await supabase.from('moderation_actions').insert({
          performed_by: adminUser?.id || '',
          target_user_id: userId,
          action_type: 'unblock' as any,
          details: 'Déblocage du compte',
        });
        toast.success('Utilisateur débloqué');
      } else {
        await supabase.from('user_blocks').insert({
          user_id: userId,
          blocked_by: adminUser?.id,
          reason: 'Bloqué par un administrateur',
          is_active: true,
          suspension_type: 'permanent',
        });
        await supabase.from('moderation_actions').insert({
          performed_by: adminUser?.id || '',
          target_user_id: userId,
          action_type: 'block' as any,
          details: 'Blocage du compte',
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
        // Remove suspension blocks
        await supabase.from('user_blocks')
          .update({ is_active: false, unblocked_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('is_active', true);
      } else {
        await supabase.from('user_blocks').insert({
          user_id: userId,
          blocked_by: adminUser?.id,
          reason: 'Suspendu par un administrateur',
          is_active: true,
          suspension_type: 'temporary',
          suspension_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      await supabase.from('moderation_actions').insert({
        performed_by: adminUser?.id || '',
        target_user_id: userId,
        action_type: (isCurrentlySuspended ? 'unsuspend' : 'suspend') as any,
        details: isCurrentlySuspended ? 'Réactivation du compte' : 'Suspension du compte (30 jours)',
      });

      // Notify user
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'system',
        title: isCurrentlySuspended ? '✅ Compte réactivé' : '⚠️ Compte suspendu',
        message: isCurrentlySuspended 
          ? 'Votre compte a été réactivé par l\'équipe de modération.'
          : 'Votre compte a été suspendu par l\'équipe de modération. Contactez le support pour plus d\'informations.',
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
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1.5 text-xs h-auto py-3"
              onClick={() => { setShowCreditAdd(!showCreditAdd); setShowCreditRemove(false); setCreditAmount(''); }}
            >
              <Plus className="w-3.5 h-3.5 text-green-600" />
              Ajouter crédits
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1.5 text-xs h-auto py-3"
              onClick={() => { setShowCreditRemove(!showCreditRemove); setShowCreditAdd(false); setCreditAmount(''); }}
            >
              <Minus className="w-3.5 h-3.5 text-destructive" />
              Retirer crédits
            </Button>
          </div>

          {showCreditAdd && (
            <div className="space-y-2 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  max="10000"
                  placeholder="Montant"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="flex-1 text-sm"
                />
                <Select value={creditType} onValueChange={(v) => setCreditType(v as any)}>
                  <SelectTrigger className="w-[120px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bonus">Bonus</SelectItem>
                    <SelectItem value="purchased">Achetés</SelectItem>
                    <SelectItem value="daily">Quotidiens</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                {[5, 10, 25, 50, 100].map(v => (
                  <Button key={v} variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setCreditAmount(String(v))}>
                    {v}
                  </Button>
                ))}
              </div>
              <Button 
                onClick={handleAddCredits} 
                disabled={actionLoading === 'add-credits' || !creditAmount}
                className="w-full gap-2 text-xs"
                size="sm"
              >
                {actionLoading === 'add-credits' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Ajouter {creditAmount ? `${creditAmount} crédits` : ''}
              </Button>
            </div>
          )}

          {showCreditRemove && (
            <div className="space-y-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <Input
                type="number"
                min="1"
                max="10000"
                placeholder="Montant à retirer"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="text-sm"
              />
              <div className="flex gap-2">
                {[5, 10, 25, 50].map(v => (
                  <Button key={v} variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setCreditAmount(String(v))}>
                    {v}
                  </Button>
                ))}
              </div>
              <Button 
                variant="destructive"
                onClick={handleRemoveCredits} 
                disabled={actionLoading === 'remove-credits' || !creditAmount}
                className="w-full gap-2 text-xs"
                size="sm"
              >
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
            <Button 
              variant="outline" 
              size="sm" 
              className={`gap-1.5 text-xs h-auto py-3 ${blockedStatus?.isBlocked ? 'border-green-500/30 text-green-600 hover:text-green-600' : 'text-destructive hover:text-destructive'}`}
              onClick={handleToggleBlock}
              disabled={actionLoading === 'block'}
            >
              {actionLoading === 'block' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : blockedStatus?.isBlocked ? (
                <Unlock className="w-3.5 h-3.5" />
              ) : (
                <Ban className="w-3.5 h-3.5" />
              )}
              {blockedStatus?.isBlocked ? 'Débloquer' : 'Bloquer'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className={`gap-1.5 text-xs h-auto py-3 ${blockedStatus?.isSuspended ? 'border-green-500/30 text-green-600 hover:text-green-600' : 'text-destructive hover:text-destructive'}`}
              onClick={handleToggleSuspend}
              disabled={actionLoading === 'suspend'}
            >
              {actionLoading === 'suspend' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : blockedStatus?.isSuspended ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              {blockedStatus?.isSuspended ? 'Réactiver' : 'Suspendre'}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Toutes les actions sont journalisées dans l'historique de modération.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDossierPanel;
