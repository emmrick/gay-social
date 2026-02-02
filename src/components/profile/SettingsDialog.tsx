import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, Moon, Shield, HelpCircle, MessageSquare, 
  Volume2, VolumeX, Eye, EyeOff, Palette, Sparkles, ChevronRight,
  Globe, Lock, Check, Diamond, BellRing, BellOff, Settings2
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
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
  >
    <div className={cn("w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0", iconColor)}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1 min-w-0">
      <Label className="font-medium block">{title}</Label>
      <p className="text-sm text-muted-foreground truncate">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </motion.div>
);

const SettingsDialog = ({ open, onOpenChange, type, onContactAdmin }: SettingsDialogProps) => {
  const { toast } = useToast();
  const { settings: privacySettings, isVip, toggleHideOnlineStatus, toggleHideLastSeen } = usePrivacySettings();
  const { 
    isSupported: pushSupported, 
    isSubscribed: pushSubscribed, 
    permission: pushPermission,
    isLoading: pushLoading,
    toggleSubscription: togglePushSubscription 
  } = usePushNotifications();
  
  // Notifications settings (local)
  const [soundEnabled, setSoundEnabled] = useState(() => 
    localStorage.getItem('notifications_sound') !== 'false'
  );
  const [messageNotifs, setMessageNotifs] = useState(() => 
    localStorage.getItem('notifications_messages') !== 'false'
  );

  // Appearance settings
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

  // Privacy settings are now managed via usePrivacySettings hook

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
            <div className="space-y-3">
              {/* Native Push Notifications */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  pushSubscribed ? "bg-green-500/20 text-green-500" : "bg-primary/10 text-primary"
                )}>
                  {pushSubscribed ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <Label className="font-medium block">Notifications push natives</Label>
                  <p className="text-sm text-muted-foreground truncate">
                    {!pushSupported 
                      ? "Non supporté par ce navigateur" 
                      : pushPermission === 'denied' 
                        ? "Bloquées dans les paramètres du navigateur"
                        : pushSubscribed 
                          ? "Recevoir des alertes même quand l'app est fermée" 
                          : "Activer les alertes en arrière-plan"}
                  </p>
                </div>
                <Switch 
                  checked={pushSubscribed} 
                  onCheckedChange={togglePushSubscription}
                  disabled={!pushSupported || pushPermission === 'denied' || pushLoading}
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
              
              {/* Info about push notifications */}
              {pushSupported && pushPermission !== 'denied' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"
                >
                  <div className="flex gap-3">
                    <Bell className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-500">Notifications push</p>
                      <p className="text-muted-foreground mt-1">
                        {pushSubscribed 
                          ? "Tu recevras des notifications même quand l'app est fermée."
                          : "Active les notifications push pour ne rien rater !"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Notification Preferences Section */}
              {pushSubscribed && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center gap-2 mb-2">
                    <Settings2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Préférences par type</span>
                  </div>
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
            <div className="space-y-3">
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
              
              {/* Theme preview */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-4 rounded-xl border border-border bg-gradient-to-br from-secondary/50 to-secondary/20"
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
            <div className="space-y-3">
              {/* VIP Privacy Features */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Diamond className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-purple-500">Fonctionnalités VIP</span>
                  {!isVip && (
                    <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-500">
                      Abonnement requis
                    </Badge>
                  )}
                </div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl transition-colors",
                    isVip ? "bg-secondary/30 hover:bg-secondary/50" : "bg-purple-500/5 opacity-75"
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", 
                    privacySettings.hideOnlineStatus ? "bg-purple-500/20 text-purple-500" : "bg-primary/10 text-green-500"
                  )}>
                    {privacySettings.hideOnlineStatus ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label className="font-medium block">Masquer le statut en ligne</Label>
                    <p className="text-sm text-muted-foreground truncate">
                      {privacySettings.hideOnlineStatus ? "Personne ne voit si tu es connecté" : "Les autres voient quand tu es en ligne"}
                    </p>
                  </div>
                  <Switch 
                    checked={privacySettings.hideOnlineStatus} 
                    onCheckedChange={toggleHideOnlineStatus}
                    disabled={!isVip}
                  />
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl transition-colors",
                    isVip ? "bg-secondary/30 hover:bg-secondary/50" : "bg-purple-500/5 opacity-75"
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    privacySettings.hideLastSeen ? "bg-purple-500/20 text-purple-500" : "bg-primary/10 text-primary"
                  )}>
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label className="font-medium block">Masquer la dernière connexion</Label>
                    <p className="text-sm text-muted-foreground truncate">
                      {privacySettings.hideLastSeen ? "Ta dernière activité est cachée" : "Les autres voient \"Vu il y a...\""}
                    </p>
                  </div>
                  <Switch 
                    checked={privacySettings.hideLastSeen} 
                    onCheckedChange={toggleHideLastSeen}
                    disabled={!isVip}
                  />
                </motion.div>
              </div>
              
              {/* VIP upgrade prompt */}
              {!isVip && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20"
                >
                  <div className="flex gap-3">
                    <Diamond className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-purple-500">Passez à VIP pour la confidentialité</p>
                      <p className="text-muted-foreground mt-1">
                        Masquez votre statut en ligne et votre dernière connexion pour 15€/mois.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Privacy info */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
              >
                <div className="flex gap-3">
                  <Lock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-500">Tes données sont protégées</p>
                    <p className="text-muted-foreground mt-1">
                      Nous ne partageons jamais tes informations personnelles avec des tiers.
                    </p>
                  </div>
                </div>
              </motion.div>
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
            <div className="space-y-4">
              {/* FAQ Section */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Questions fréquentes
                </h4>
                
                <div className="space-y-2">
                  {[
                    { q: "Comment modifier mon profil ?", a: "Va dans l'onglet Profil et clique sur \"Modifier le profil\"." },
                    { q: "Comment changer ma photo de profil ?", a: "Dans Modifier le profil > Photos, touche une photo puis \"Photo de profil\"." },
                    { q: "Comment démarrer une conversation ?", a: "Clique sur le profil d'un membre ou utilise le bouton + dans Messages." },
                    { q: "Comment signaler un utilisateur ?", a: "Dans une conversation ou sur un profil, utilise l'icône de signalement." },
                  ].map((faq, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <p className="font-medium text-sm">{faq.q}</p>
                      <p className="text-xs text-muted-foreground mt-1">{faq.a}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              {/* Contact Section */}
              <div className="space-y-3">
                <h4 className="font-semibold">Nous contacter</h4>
                <Button 
                  variant="outline" 
                  className="w-full justify-between group"
                  onClick={() => {
                    onOpenChange(false);
                    onContactAdmin?.();
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-primary" />
                    </div>
                    <span>Contacter un administrateur</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </div>
              
              {/* Version info */}
              <div className="text-center pt-4 text-xs text-muted-foreground">
                <p>GayConnect v1.0.0</p>
                <p className="mt-1">© 2025 Tous droits réservés</p>
              </div>
            </div>
          ),
        };
    }
  };

  const dialogContent = getDialogContent();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        {/* Header with gradient */}
        <div className={cn("absolute inset-x-0 top-0 h-32 rounded-t-3xl bg-gradient-to-br opacity-50", dialogContent.gradient)} />
        
        <SheetHeader className="relative z-10 pt-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              {dialogContent.icon}
            </div>
            <div>
              <SheetTitle className="text-xl">{dialogContent.title}</SheetTitle>
              <SheetDescription>{dialogContent.description}</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        
        <div className="relative z-10 py-6 overflow-y-auto max-h-[calc(85vh-180px)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {dialogContent.content}
            </motion.div>
          </AnimatePresence>
        </div>
        
        {type !== 'help' && (
          <div className="relative z-10 flex gap-3 pt-4 border-t border-border">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button 
              className="flex-1 gap-2"
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
