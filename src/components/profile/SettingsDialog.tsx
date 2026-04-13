import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, Moon, Shield, HelpCircle, MessageSquare, 
  Volume2, VolumeX, Eye, EyeOff, Palette, Sparkles, ChevronRight,
  Globe, Lock, Check, BellRing, BellOff, Settings2, User, Camera, Headphones,
  Coins, Gift, CreditCard, BadgeCheck, Users, Flag
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Badge } from '@/components/ui/badge';
import NotificationPreferencesSection from './NotificationPreferencesSection';

type SettingsType = 'notifications' | 'appearance' | 'privacy' | 'help';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: SettingsType;
  onContactAdmin?: () => void;
}

interface SettingItemProps {
  icon: React.ElementType;
  iconColor?: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const SettingItem = ({ icon: Icon, iconColor = "text-primary", title, description, checked, onCheckedChange }: SettingItemProps) => (
  <motion.div 
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-3 min-h-[56px] p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
  >
    <div className={cn("w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0", iconColor)}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1 min-w-0">
      <Label className="font-medium text-[15px] block leading-tight">{title}</Label>
      <p className="text-[13px] text-muted-foreground/80 truncate mt-0.5">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} className="flex-shrink-0" />
  </motion.div>
);

const SettingsDialog = ({ open, onOpenChange, type, onContactAdmin }: SettingsDialogProps) => {
  const { toast } = useToast();
  const { settings: privacySettings, isAdmin: isAdminUser, toggleHideOnlineStatus, toggleHideLastSeen } = usePrivacySettings();
  const { 
    isSupported: pushSupported, 
    isSubscribed: pushSubscribed, 
    permission: pushPermission,
    isLoading: pushLoading,
    toggleSubscription: togglePushSubscription 
  } = usePushNotifications();
  
  const [soundEnabled, setSoundEnabled] = useState(() => 
    localStorage.getItem('notifications_sound') !== 'false'
  );
  const [messageNotifs, setMessageNotifs] = useState(() => 
    localStorage.getItem('notifications_messages') !== 'false'
  );

  const [darkMode, setDarkMode] = useState(() => 
    document.documentElement.classList.contains('dark')
  );
  const [reducedMotion, setReducedMotion] = useState(() => 
    localStorage.getItem('reduced_motion') === 'true'
  );

  useEffect(() => {
    localStorage.setItem('notifications_sound', String(soundEnabled));
    localStorage.setItem('notifications_messages', String(messageNotifs));
  }, [soundEnabled, messageNotifs]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('reduced_motion', String(reducedMotion));
  }, [reducedMotion]);

  const handleSave = () => {
    toast({
      title: '✓ Paramètres enregistrés',
      description: 'Vos préférences ont été mises à jour.',
    });
    onOpenChange(false);
  };

  const getDialogContent = () => {
    switch (type) {
      case 'notifications':
        return {
          title: 'Notifications',
          description: 'Personnalise tes alertes et notifications',
          icon: <Bell className="w-6 h-6 text-primary" />,
          gradient: 'from-blue-500/20 to-cyan-500/20',
          content: (
            <div className="space-y-2">
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 min-h-[56px] p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  pushSubscribed ? "bg-green-500/15 text-green-500" : "bg-primary/10 text-primary"
                )}>
                  {pushSubscribed ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <Label className="font-medium text-[15px] block leading-tight">Notifications push natives</Label>
                  <p className="text-[13px] text-muted-foreground/80 truncate mt-0.5">
                    {!pushSupported 
                      ? "Non supporté par ce navigateur" 
                      : pushPermission === 'denied' 
                        ? "Bloquées dans les paramètres"
                        : pushSubscribed 
                          ? "Recevoir des alertes même quand l'app est fermée" 
                          : "Activer les alertes en arrière-plan"}
                  </p>
                </div>
                <Switch 
                  checked={pushSubscribed} 
                  onCheckedChange={togglePushSubscription}
                  disabled={!pushSupported || pushPermission === 'denied' || pushLoading}
                  className="flex-shrink-0"
                />
              </motion.div>
              
              <SettingItem
                icon={soundEnabled ? Volume2 : VolumeX}
                iconColor={soundEnabled ? "text-green-500" : "text-muted-foreground"}
                title="Sons de notification"
                description="Jouer un son pour chaque notification"
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />
              <SettingItem
                icon={MessageSquare}
                title="Nouveaux messages"
                description="Être alerté des messages privés"
                checked={messageNotifs}
                onCheckedChange={setMessageNotifs}
              />
              
              {pushSupported && pushPermission !== 'denied' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-3.5 rounded-xl bg-blue-500/8 border border-blue-500/15"
                >
                  <div className="flex gap-3">
                    <Bell className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-500">Notifications push</p>
                      <p className="text-muted-foreground/80 mt-0.5 text-[13px]">
                        {pushSubscribed 
                          ? "Tu recevras des notifications même quand l'app est fermée."
                          : "Active les notifications push pour ne rien rater !"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {pushSubscribed && (
                <>
                  <Separator className="my-4 opacity-30" />
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <Settings2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Préférences par type</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground/60 px-1 mb-3">
                    Choisis les notifications que tu souhaites recevoir
                  </p>
                  <NotificationPreferencesSection />
                </>
              )}
            </div>
          ),
        };

      case 'appearance':
        return {
          title: 'Apparence',
          description: 'Personnalise le look de l\'application',
          icon: <Palette className="w-6 h-6 text-primary" />,
          gradient: 'from-purple-500/20 to-pink-500/20',
          content: (
            <div className="space-y-2">
              <SettingItem
                icon={Moon}
                iconColor={darkMode ? "text-indigo-400" : "text-amber-500"}
                title="Mode sombre"
                description={darkMode ? "Thème sombre activé" : "Thème clair activé"}
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
              <SettingItem
                icon={Sparkles}
                title="Réduire les animations"
                description="Pour une meilleure accessibilité"
                checked={reducedMotion}
                onCheckedChange={setReducedMotion}
              />
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-3.5 rounded-xl border border-border/50 bg-gradient-to-br from-secondary/50 to-secondary/20"
              >
                <p className="text-sm font-medium mb-2">Aperçu du thème</p>
                <div className="grid grid-cols-4 gap-2">
                  <div className="h-8 rounded-lg bg-primary" title="Primary" />
                  <div className="h-8 rounded-lg bg-secondary" title="Secondary" />
                  <div className="h-8 rounded-lg bg-accent" title="Accent" />
                  <div className="h-8 rounded-lg bg-muted" title="Muted" />
                </div>
              </motion.div>
            </div>
          ),
        };

      case 'privacy':
        return {
          title: 'Confidentialité',
          description: 'Contrôle qui peut voir tes informations',
          icon: <Shield className="w-6 h-6 text-primary" />,
          gradient: 'from-purple-500/20 to-purple-600/20',
          content: (
            <div className="space-y-2">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3.5 rounded-xl bg-amber-500/8 border border-amber-500/15"
              >
                <div className="flex gap-3">
                  <Lock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-500">Tes données sont protégées</p>
                    <p className="text-muted-foreground/80 mt-0.5 text-[13px]">
                      Nous ne partageons jamais tes informations personnelles avec des tiers.
                    </p>
                  </div>
                </div>
              </motion.div>
              
              {isAdminUser && (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Options administrateur</span>
                  </div>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 min-h-[56px] p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", 
                      privacySettings.hideOnlineStatus ? "bg-purple-500/15 text-purple-500" : "bg-primary/10 text-green-500"
                    )}>
                      {privacySettings.hideOnlineStatus ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label className="font-medium text-[15px] block leading-tight">Masquer le statut en ligne</Label>
                      <p className="text-[13px] text-muted-foreground/80 truncate mt-0.5">
                        {privacySettings.hideOnlineStatus ? "Personne ne voit si tu es connecté" : "Les autres voient quand tu es en ligne"}
                      </p>
                    </div>
                    <Switch 
                      checked={privacySettings.hideOnlineStatus} 
                      onCheckedChange={toggleHideOnlineStatus}
                      className="flex-shrink-0"
                    />
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="flex items-center gap-3 min-h-[56px] p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      privacySettings.hideLastSeen ? "bg-purple-500/15 text-purple-500" : "bg-primary/10 text-primary"
                    )}>
                      <Globe className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label className="font-medium text-[15px] block leading-tight">Masquer la dernière connexion</Label>
                      <p className="text-[13px] text-muted-foreground/80 truncate mt-0.5">
                        {privacySettings.hideLastSeen ? "Ta dernière activité est cachée" : "Les autres voient \"Vu il y a...\""}
                      </p>
                    </div>
                    <Switch 
                      checked={privacySettings.hideLastSeen} 
                      onCheckedChange={toggleHideLastSeen}
                      className="flex-shrink-0"
                    />
                  </motion.div>
                </div>
              )}
            </div>
          ),
        };

      case 'help':
        return {
          title: 'Aide & Support',
          description: 'Besoin d\'aide ? On est là pour toi',
          icon: <HelpCircle className="w-6 h-6 text-primary" />,
          gradient: 'from-orange-500/20 to-red-500/20',
          content: (
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Questions fréquentes</h4>
                    <p className="text-xs text-muted-foreground/70">Trouve rapidement des réponses</p>
                  </div>
                </div>
                
                <Accordion type="single" collapsible className="space-y-1.5">
                  {[
                    { icon: <Coins className="w-4 h-4" />, q: "Comment fonctionnent les crédits ?", a: "Les crédits sont utilisés pour chaque action : envoyer un message (0.1), partager un média (0.2-0.5), consulter un profil (0.1), etc. Tu peux réclamer 5 crédits gratuits chaque jour !", color: "text-amber-500 bg-amber-500/10" },
                    { icon: <Gift className="w-4 h-4" />, q: "Comment obtenir des crédits gratuits ?", a: "Tu reçois 15 crédits à l'inscription, 30 après la vérification d'identité, 5 crédits quotidiens (max 7j/mois), et 10 crédits pour chaque parrainage réussi !", color: "text-emerald-500 bg-emerald-500/10" },
                    { icon: <CreditCard className="w-4 h-4" />, q: "Comment acheter des crédits ?", a: "Va dans l'onglet Crédits et clique sur \"Acheter des crédits\". 100 crédits coûtent 5,99 €. Pas d'abonnement, tu paies uniquement ce dont tu as besoin.", color: "text-blue-500 bg-blue-500/10" },
                    { icon: <BadgeCheck className="w-4 h-4" />, q: "Pourquoi vérifier mon identité ?", a: "La vérification garantit un espace sûr réservé aux adultes. Elle te donne aussi 30 crédits bonus et le badge vérifié sur ton profil !", color: "text-cyan-500 bg-cyan-500/10" },
                    { icon: <Shield className="w-4 h-4" />, q: "La vérification est-elle sécurisée ?", a: "Tes documents sont chiffrés et supprimés automatiquement après validation. Seuls nos modérateurs y ont accès temporairement pour la vérification.", color: "text-indigo-500 bg-indigo-500/10" },
                    { icon: <User className="w-4 h-4" />, q: "Comment modifier mon profil ?", a: "Va dans l'onglet Profil et clique sur l'icône des paramètres en haut à droite, puis sélectionne \"Modifier le profil\".", color: "text-violet-500 bg-violet-500/10" },
                    { icon: <Camera className="w-4 h-4" />, q: "Comment changer ma photo de profil ?", a: "Dans Modifier le profil > Photos, touche une photo puis sélectionne \"Définir comme photo principale\".", color: "text-purple-500 bg-purple-500/10" },
                    { icon: <MessageSquare className="w-4 h-4" />, q: "Comment démarrer une conversation ?", a: "Clique sur le profil d'un membre pour voir son profil, puis utilise le bouton \"Message\" pour lui écrire.", color: "text-green-500 bg-green-500/10" },
                    { icon: <Users className="w-4 h-4" />, q: "Comment parrainer un ami ?", a: "Va dans l'onglet Crédits et partage ton code de parrainage. Vous recevrez tous les deux 10 crédits quand ton filleul aura vérifié son identité !", color: "text-pink-500 bg-pink-500/10" },
                    { icon: <Flag className="w-4 h-4" />, q: "Comment signaler un utilisateur ?", a: "Dans une conversation ou sur un profil, utilise l'icône de signalement (drapeau) pour nous alerter d'un comportement inapproprié.", color: "text-red-500 bg-red-500/10" },
                  ].map((faq, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <AccordionItem 
                        value={`item-${i}`} 
                        className="border border-border/40 rounded-xl px-3 bg-secondary/15 hover:bg-secondary/25 transition-colors data-[state=open]:bg-secondary/35"
                      >
                        <AccordionTrigger className="py-3 hover:no-underline gap-3">
                          <div className="flex items-center gap-3 text-left">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${faq.color}`}>
                              {faq.icon}
                            </div>
                            <span className="font-medium text-[13px] leading-snug">{faq.q}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-3 pl-11 pr-2">
                          <p className="text-[13px] text-muted-foreground/80 leading-relaxed">
                            {faq.a}
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                    </motion.div>
                  ))}
                </Accordion>
              </div>
              
              <Separator className="opacity-30" />
              
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2 px-1">
                  <Headphones className="w-4 h-4 text-muted-foreground" />
                  Besoin d'aide supplémentaire ?
                </h4>
                <Button 
                  variant="outline" 
                  className="w-full justify-between group border-primary/15 hover:border-primary/30 hover:bg-primary/5 min-h-[56px] rounded-xl"
                  onClick={() => {
                    onOpenChange(false);
                    onContactAdmin?.();
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <span className="font-medium text-[15px] block">Contacter le support</span>
                      <span className="text-[12px] text-muted-foreground/70">Réponse sous 24h</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </Button>
              </div>
              
              <Separator className="opacity-30" />
              
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2 px-1">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  Informations légales
                </h4>
                <a 
                  href="/legal"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenChange(false);
                    window.location.href = '/legal';
                  }}
                  className="w-full flex items-center gap-3 min-h-[52px] p-3 rounded-xl bg-secondary/15 hover:bg-secondary/30 transition-colors group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-500/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-medium text-sm block">CGU, RGPD & Mentions légales</span>
                    <span className="text-[12px] text-muted-foreground/60">Consulter le règlement complet</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                </a>
              </div>
              
              <div className="text-center pt-4 border-t border-border/30">
                <p className="text-[11px] text-muted-foreground/50">
                  GaySocial v1.0.0 • © 2025
                </p>
              </div>
            </div>
          ),
        };
    }
  };

  const dialogContent = getDialogContent();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[88vh] rounded-t-[1.5rem] px-0 bg-card/98 backdrop-blur-2xl border-border/20 flex flex-col">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Header gradient background */}
        <div className={cn("absolute inset-x-0 top-0 h-28 rounded-t-[1.5rem] bg-gradient-to-br opacity-40 pointer-events-none", dialogContent.gradient)} />
        
        {/* Fixed Header */}
        <SheetHeader className="relative z-10 px-5 pb-4 flex-shrink-0 border-b border-border/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              {dialogContent.icon}
            </div>
            <div>
              <SheetTitle className="text-xl font-display">{dialogContent.title}</SheetTitle>
              <SheetDescription className="text-[13px] text-muted-foreground/70">{dialogContent.description}</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        
        {/* Scrollable content */}
        <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={type}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
            >
              {dialogContent.content}
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Sticky Footer */}
        {type !== 'help' && (
          <div className="relative z-10 flex gap-3 px-4 py-3 border-t border-border/15 bg-card/95 backdrop-blur-sm flex-shrink-0">
            <Button 
              variant="outline" 
              className="flex-1 min-h-[44px] rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button 
              className="flex-1 gap-2 min-h-[44px] rounded-xl"
              onClick={handleSave}
            >
              <Check className="w-4 h-4" />
              Enregistrer
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default SettingsDialog;
