import { useState } from 'react';
import { Gift, Copy, Share2, Users, CheckCircle, Clock, Loader2, Lightbulb, MessageCircle, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useReferral } from '@/hooks/useReferral';
import { useDynamicCreditCosts } from '@/hooks/useDynamicCreditCosts';

const ReferralSection = () => {
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

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
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
              Gagnez {referralReward} crédits pour chaque filleul vérifié
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Explication */}
        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" />
            Comment ça marche ?
          </h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Partagez votre lien de parrainage</li>
            <li>Votre ami s'inscrit sur GayConnect</li>
            <li>Il vérifie son identité</li>
            <li><span className="text-primary font-medium">Vous recevez tous les deux {referralReward} crédits !</span></li>
          </ol>
        </div>

        {/* Conseils pour inviter */}
        <div className="p-4 rounded-lg border border-accent/30 bg-accent/5 space-y-3">
          <h4 className="font-medium flex items-center gap-2 text-sm">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Astuces pour inviter facilement
          </h4>
          <ul className="text-xs text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <MessageCircle className="w-3.5 h-3.5 mt-0.5 text-primary flex-shrink-0" />
              <span><strong>Envoyez le lien en privé</strong> — un message perso sur WhatsApp, Telegram ou Instagram est plus efficace qu'un post public.</span>
            </li>
            <li className="flex items-start gap-2">
              <Heart className="w-3.5 h-3.5 mt-0.5 text-pink-500 flex-shrink-0" />
              <span><strong>Parlez de votre expérience</strong> — dites ce que vous aimez sur GayConnect, ça donne envie de rejoindre.</span>
            </li>
            <li className="flex items-start gap-2">
              <Gift className="w-3.5 h-3.5 mt-0.5 text-green-500 flex-shrink-0" />
              <span><strong>Mentionnez la récompense</strong> — « On gagne {referralReward} crédits chacun ! » ça motive tout de suite.</span>
            </li>
            <li className="flex items-start gap-2">
              <Users className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
              <span><strong>Ciblez vos amis célibataires</strong> — pensez à ceux qui cherchent à faire des rencontres, c'est pour eux !</span>
            </li>
            <li className="flex items-start gap-2">
              <Share2 className="w-3.5 h-3.5 mt-0.5 text-violet-500 flex-shrink-0" />
              <span><strong>Partagez dans vos stories</strong> — ajoutez votre lien dans une story Instagram ou Snapchat pour toucher plus de monde.</span>
            </li>
          </ul>
        </div>

        {/* Code et lien */}
        {referralCode && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-background border flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Votre code</p>
                <p className="font-mono font-bold text-lg">{referralCode}</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {stats?.total_referrals || 0} filleul{(stats?.total_referrals || 0) !== 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCopy} variant="outline" className="flex-1">
                {copied ? (
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                Copier le lien
              </Button>
              <Button onClick={() => shareReferralLink(referralReward)} className="flex-1">
                <Share2 className="w-4 h-4 mr-2" />
                Partager
              </Button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <p className="text-2xl font-bold">{stats?.total_referrals || 0}</p>
            <p className="text-xs text-muted-foreground">Filleuls inscrits</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 text-center">
            <p className="text-2xl font-bold text-primary">{stats?.successful_referrals || 0}</p>
            <p className="text-xs text-muted-foreground">Récompenses gagnées</p>
          </div>
        </div>

        {/* Liste des filleuls */}
        {referrals.length > 0 && (
          <div className="pt-2">
            <h4 className="text-sm font-medium mb-2">Vos filleuls</h4>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {referrals.map((referral) => (
                  <div 
                    key={referral.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {referral.username?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {referral.username || 'Utilisateur'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {referral.referrer_reward_applied ? (
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
