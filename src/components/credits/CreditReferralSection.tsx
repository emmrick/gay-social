import { useState } from 'react';
import { 
  Users, 
  Copy, 
  CheckCircle, 
  Clock, 
  Share2,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useReferral } from '@/hooks/useReferral';
import { useDynamicCreditCosts } from '@/hooks/useDynamicCreditCosts';

const CreditReferralSection = () => {
  const { 
    referralCode, 
    stats, 
    referrals, 
    isLoading, 
    copyReferralLink, 
    shareReferralLink 
  } = useReferral();
  const { data: costs } = useDynamicCreditCosts();
  const referralReward = costs?.referral_reward ?? 30;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyReferralLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const verifiedCount = stats?.successful_referrals || 0;
  const pendingCount = (stats?.total_referrals || 0) - verifiedCount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Parrainage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* How it works */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium">Comment ça marche ?</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs">1</span>
              Partagez votre lien d'invitation
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs">2</span>
              Votre ami s'inscrit et vérifie son identité
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs">3</span>
              Vous recevez chacun <span className="font-bold text-green-500">{referralReward} crédits</span> !
            </li>
          </ul>
        </div>

        {/* Referral Code */}
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : referralCode ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 rounded-lg bg-muted font-mono text-sm truncate">
                {referralCode}
              </div>
              <Button size="icon" variant="outline" onClick={handleCopy}>
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            <Button 
              className="w-full" 
              onClick={shareReferralLink}
              variant="outline"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Partager mon lien
            </Button>
          </div>
        ) : null}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
            <p className="text-2xl font-bold text-green-500">{verifiedCount}</p>
            <p className="text-xs text-muted-foreground">Vérifiés</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
            <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </div>
        </div>

        {/* Referrals list */}
        {referrals.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Mes filleuls</p>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {referrals.map((referral) => (
                  <div 
                    key={referral.id}
                    className="flex items-center justify-between p-2 rounded-lg border"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>
                          {referral.username?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {referral.username || 'Utilisateur'}
                      </span>
                    </div>
                    {referral.referrer_reward_applied ? (
                      <Badge className="bg-green-500 text-xs">
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
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CreditReferralSection;
