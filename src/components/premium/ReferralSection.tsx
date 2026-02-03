import { useState } from 'react';
import { Gift, Copy, Share2, Users, CheckCircle, Clock, Coins, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CREDIT_REWARDS } from '@/hooks/useCredits';

interface ReferralInfo {
  id: string;
  referred_user_id: string;
  status: string;
  referrer_reward_applied: boolean;
  created_at: string;
  referred_profile?: {
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

const ReferralSection = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  // Get or create referral code
  const { data: referralCode, isLoading: codeLoading } = useQuery({
    queryKey: ['referral-code', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase.rpc('get_or_create_referral_code', {
        _user_id: user.id,
      });

      if (error) throw error;
      return data as string;
    },
    enabled: !!user?.id,
  });

  // Get referrals stats
  const { data: stats } = useQuery({
    queryKey: ['referral-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { total: 0, successful: 0 };

      const { data } = await supabase
        .from('referral_codes')
        .select('total_referrals, successful_referrals')
        .eq('user_id', user.id)
        .single();

      return {
        total: data?.total_referrals || 0,
        successful: data?.successful_referrals || 0,
      };
    },
    enabled: !!user?.id,
  });

  // Get referrals for this user
  const { data: referrals = [], isLoading: referralsLoading } = useQuery({
    queryKey: ['my-referrals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('referrals')
        .select(`
          id,
          referred_user_id,
          status,
          referrer_reward_applied,
          created_at
        `)
        .eq('referrer_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get profiles for referred users
      const referredIds = data.map(r => r.referred_user_id);
      if (referredIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, is_verified')
        .in('user_id', referredIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      return data.map(r => ({
        ...r,
        referred_profile: profileMap.get(r.referred_user_id),
      })) as ReferralInfo[];
    },
    enabled: !!user?.id,
  });

  const shareUrl = referralCode 
    ? `${window.location.origin}/auth?ref=${referralCode}` 
    : '';

  const copyToClipboard = async () => {
    if (!referralCode) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erreur lors de la copie');
    }
  };

  const shareLink = async () => {
    if (!referralCode) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Rejoins GayConnect !',
          text: `Inscris-toi sur GayConnect avec mon lien et gagne ${CREDIT_REWARDS.referral_success} crédits gratuits après vérification de ton identité !`,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  if (codeLoading) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">Parrainez vos amis</CardTitle>
            <CardDescription>
              Gagnez {CREDIT_REWARDS.referral_success} crédits pour chaque filleul vérifié
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Explication de l'offre */}
        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" />
            Comment ça marche ?
          </h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Partagez votre lien de parrainage</li>
            <li>Votre ami s'inscrit sur GayConnect</li>
            <li>Il vérifie son identité</li>
            <li><span className="text-primary font-medium">Vous recevez tous les deux {CREDIT_REWARDS.referral_success} crédits !</span></li>
          </ol>
        </div>

        {/* Code et lien de parrainage */}
        {referralCode && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-background border flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Votre code</p>
                <p className="font-mono font-bold text-lg">{referralCode}</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {stats?.total || 0} filleul{(stats?.total || 0) !== 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={copyToClipboard} 
                variant="outline" 
                className="flex-1"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                Copier le lien
              </Button>
              <Button 
                onClick={shareLink}
                className="flex-1"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Partager
              </Button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <p className="text-2xl font-bold">{stats?.total || 0}</p>
            <p className="text-xs text-muted-foreground">Filleuls inscrits</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 text-center">
            <p className="text-2xl font-bold text-primary">{stats?.successful || 0}</p>
            <p className="text-xs text-muted-foreground">Récompenses gagnées</p>
          </div>
        </div>

        {/* Liste des filleuls */}
        {referrals.length > 0 && (
          <div className="pt-2">
            <h4 className="text-sm font-medium mb-2">Vos filleuls</h4>
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {referrals.map((referral) => (
                  <div 
                    key={referral.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        {referral.referred_profile?.avatar_url ? (
                          <AvatarImage src={referral.referred_profile.avatar_url} />
                        ) : (
                          <AvatarFallback className="text-xs">
                            {referral.referred_profile?.username?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="text-sm font-medium">
                        {referral.referred_profile?.username || 'Utilisateur'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {referral.referred_profile?.is_verified ? (
                        <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Vérifié
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          En attente
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralSection;
