import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Bell, Moon, Shield, HelpCircle, MessageSquare,
  Volume2, VolumeX, Eye, EyeOff, Palette, Sparkles, ChevronRight, ChevronLeft,
  Globe, Lock, Check, BellRing, BellOff, Settings2, User, Camera, Headphones,
  Coins, Gift, CreditCard, BadgeCheck, Users, Flag, Heart, UserCheck,
  Vibrate, MoonStar, Type, LayoutGrid, Languages, Bot, BookOpen,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useLocalSettings, type AccentColor, type TextSize, type Density, type ChatBackground } from '@/hooks/useLocalSettings';
import { openOnboardingTour } from '@/hooks/useOnboarding';
import NotificationPreferencesSection from './NotificationPreferencesSection';
import LocationHideCard from './LocationHideCard';

type SettingsType = 'notifications' | 'appearance' | 'privacy' | 'help' | 'language';

interface SettingsInlineContentProps {
  type: SettingsType;
  onBack: () => void;
  onContactAdmin?: () => void;
  onClose: () => void;
}

interface SettingItemProps {
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

const SettingItem = ({ icon: Icon, iconColor = "text-primary", iconBg = "bg-primary/10", title, description, checked, onCheckedChange, disabled }: SettingItemProps) => (
  <div className="flex items-center gap-3 min-h-[56px] p-3 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors border border-border/20">
    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", iconBg, iconColor)}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1 min-w-0">
      <Label className="font-medium text-[15px] block leading-tight text-foreground">{title}</Label>
      <p className="text-[13px] text-muted-foreground truncate mt-0.5">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} className="flex-shrink-0" />
  </div>
);

const ACCENT_OPTIONS: { value: AccentColor; label: string; class: string }[] = [
  { value: 'violet',  label: 'Violet',  class: 'bg-[hsl(250_75%_55%)]' },
  { value: 'rose',    label: 'Rose',    class: 'bg-[hsl(340_82%_58%)]' },
  { value: 'sky',     label: 'Bleu',    class: 'bg-[hsl(210_90%_55%)]' },
  { value: 'emerald', label: 'Émeraude',class: 'bg-[hsl(158_70%_42%)]' },
  { value: 'amber',   label: 'Ambre',   class: 'bg-[hsl(35_92%_52%)]'  },
  { value: 'red',     label: 'Rouge',   class: 'bg-[hsl(0_78%_55%)]'   },
];

const SettingsInlineContent = ({ type, onBack, onContactAdmin, onClose }: SettingsInlineContentProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { settings: privacySettings, isAdmin: isAdminUser, toggleHideOnlineStatus, toggleHideLastSeen } = usePrivacySettings();
  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    permission: pushPermission,
    isLoading: pushLoading,
    toggleSubscription: togglePushSubscription,
  } = usePushNotifications();

  const { settings: local, set: setLocal } = useLocalSettings();

  // Dark mode is global to next-themes too — keep DOM in sync
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    setLocal('darkMode', darkMode);
  }, [darkMode, setLocal]);

  const handleSave = () => {
    toast({ title: '✓ Paramètres enregistrés', description: 'Vos préférences ont été mises à jour.' });
    onBack();
  };

  const getHeaderInfo = () => {
    switch (type) {
      case 'notifications': return { title: 'Notifications', description: 'Personnalise tes alertes', icon: Bell, color: 'text-blue-500', bgColor: 'bg-blue-500/15' };
      case 'appearance':    return { title: 'Apparence',     description: 'Personnalise le look',   icon: Palette, color: 'text-indigo-500', bgColor: 'bg-indigo-500/15' };
      case 'privacy':       return { title: 'Confidentialité', description: 'Contrôle ta visibilité', icon: Shield, color: 'text-emerald-500', bgColor: 'bg-emerald-500/15' };
      case 'help':          return { title: 'Aide & Support', description: 'On est là pour toi',     icon: HelpCircle, color: 'text-orange-500', bgColor: 'bg-orange-500/15' };
      case 'language':      return { title: 'Langue & Région', description: 'Choisis ta langue',     icon: Languages, color: 'text-cyan-500', bgColor: 'bg-cyan-500/15' };
    }
  };

  const header = getHeaderInfo();
  const HeaderIcon = header.icon;

  const renderContent = () => {
    switch (type) {
      // ============ NOTIFICATIONS ============
      case 'notifications':
        return (
          <div className="space-y-2">
            {/* Push native */}
            <div className="flex items-center gap-3 min-h-[56px] p-3 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors border border-border/20">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                pushSubscribed ? "bg-green-500/15 text-green-500" : "bg-primary/10 text-primary"
              )}>
                {pushSubscribed ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <Label className="font-medium text-[15px] block leading-tight text-foreground">Notifications push natives</Label>
                <p className="text-[13px] text-muted-foreground truncate mt-0.5">
                  {!pushSupported ? "Non supporté par ce navigateur"
                    : pushPermission === 'denied' ? "Bloquées dans les paramètres"
                    : pushSubscribed ? "Alertes même quand l'app est fermée"
                    : "Activer les alertes en arrière-plan"}
                </p>
              </div>
              <Switch
                checked={pushSubscribed}
                onCheckedChange={togglePushSubscription}
                disabled={!pushSupported || pushPermission === 'denied' || pushLoading}
                className="flex-shrink-0"
              />
            </div>

            {/* Sound + Vibration */}
            <SettingItem
              icon={local.soundEnabled ? Volume2 : VolumeX}
              iconColor={local.soundEnabled ? "text-green-500" : "text-muted-foreground"}
              iconBg={local.soundEnabled ? "bg-green-500/15" : "bg-muted"}
              title="Sons de notification"
              description="Jouer un son pour chaque alerte"
              checked={local.soundEnabled}
              onCheckedChange={(v) => setLocal('soundEnabled', v)}
            />
            <SettingItem
              icon={Vibrate}
              iconColor="text-fuchsia-500"
              iconBg="bg-fuchsia-500/15"
              title="Vibrations"
              description="Vibrer à la réception (mobile)"
              checked={local.vibrationEnabled}
              onCheckedChange={(v) => setLocal('vibrationEnabled', v)}
            />

            {/* Per-type alerts */}
            <Separator className="my-3 opacity-30" />
            <div className="flex items-center gap-2 px-1 mb-2">
              <Settings2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Types d'alertes</span>
            </div>
            <SettingItem
              icon={MessageSquare}
              iconColor="text-blue-500"
              iconBg="bg-blue-500/15"
              title="Nouveaux messages"
              description="Messages privés et de groupe"
              checked={local.messageNotifs}
              onCheckedChange={(v) => setLocal('messageNotifs', v)}
            />
            <SettingItem
              icon={Heart}
              iconColor="text-pink-500"
              iconBg="bg-pink-500/15"
              title="J'aime / Likes"
              description="Quand on aime ton profil"
              checked={local.likeNotifs}
              onCheckedChange={(v) => setLocal('likeNotifs', v)}
            />
            <SettingItem
              icon={Eye}
              iconColor="text-violet-500"
              iconBg="bg-violet-500/15"
              title="Visites de profil"
              description="Quand un membre consulte ton profil"
              checked={local.visitNotifs}
              onCheckedChange={(v) => setLocal('visitNotifs', v)}
            />
            <SettingItem
              icon={Sparkles}
              iconColor="text-amber-500"
              iconBg="bg-amber-500/15"
              title="Réactions emoji"
              description="🔥 😍 👋 sur ton profil"
              checked={local.reactionNotifs}
              onCheckedChange={(v) => setLocal('reactionNotifs', v)}
            />

            {/* Do Not Disturb */}
            <Separator className="my-3 opacity-30" />
            <div className="flex items-center gap-2 px-1 mb-2">
              <MoonStar className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-medium text-foreground">Ne pas déranger</span>
            </div>
            <SettingItem
              icon={MoonStar}
              iconColor="text-indigo-500"
              iconBg="bg-indigo-500/15"
              title="Mode nocturne"
              description={local.dndEnabled ? `De ${local.dndStart} à ${local.dndEnd}` : "Désactivé"}
              checked={local.dndEnabled}
              onCheckedChange={(v) => setLocal('dndEnabled', v)}
            />
            {local.dndEnabled && (
              <div className="grid grid-cols-2 gap-2 px-1 pt-1">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Début</span>
                  <input
                    type="time"
                    value={local.dndStart}
                    onChange={(e) => setLocal('dndStart', e.target.value)}
                    className="h-10 rounded-lg bg-muted/60 border border-border/30 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Fin</span>
                  <input
                    type="time"
                    value={local.dndEnd}
                    onChange={(e) => setLocal('dndEnd', e.target.value)}
                    className="h-10 rounded-lg bg-muted/60 border border-border/30 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>
              </div>
            )}

            {/* Push help banner */}
            {pushSupported && pushPermission !== 'denied' && (
              <div className="mt-4 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex gap-3">
                  <Bell className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-500">Notifications push</p>
                    <p className="text-muted-foreground mt-0.5 text-[13px]">
                      {pushSubscribed ? "Tu recevras des notifications même quand l'app est fermée." : "Active les notifications push pour ne rien rater !"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {pushSubscribed && (
              <>
                <Separator className="my-4 opacity-30" />
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Settings2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Préférences avancées</span>
                </div>
                <NotificationPreferencesSection />
              </>
            )}
          </div>
        );

      // ============ APPEARANCE ============
      case 'appearance':
        return (
          <div className="space-y-3">
            <SettingItem
              icon={Moon}
              iconColor={darkMode ? "text-indigo-400" : "text-amber-500"}
              iconBg={darkMode ? "bg-indigo-500/15" : "bg-amber-500/15"}
              title="Mode sombre"
              description={darkMode ? "Thème sombre activé" : "Thème clair activé"}
              checked={darkMode}
              onCheckedChange={setDarkMode}
            />
            <SettingItem
              icon={Sparkles}
              iconColor="text-violet-500"
              iconBg="bg-violet-500/15"
              title="Réduire les animations"
              description="Améliore l'accessibilité"
              checked={local.reducedMotion}
              onCheckedChange={(v) => setLocal('reducedMotion', v)}
            />

            {/* Accent color */}
            <div className="mt-2 p-3.5 rounded-xl border border-border/30 bg-muted/40 space-y-3">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Couleur d'accent</p>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {ACCENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLocal('accent', opt.value)}
                    title={opt.label}
                    className={cn(
                      "relative h-11 rounded-xl transition-all active:scale-95",
                      opt.class,
                      local.accent === opt.value ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "opacity-70 hover:opacity-100"
                    )}
                  >
                    {local.accent === opt.value && (
                      <Check className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Text size */}
            <div className="mt-2 p-3.5 rounded-xl border border-border/30 bg-muted/40 space-y-3">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Taille du texte</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { v: 'sm' as TextSize, label: 'Petit', size: 'text-xs' },
                  { v: 'md' as TextSize, label: 'Normal', size: 'text-sm' },
                  { v: 'lg' as TextSize, label: 'Grand', size: 'text-base' },
                ]).map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setLocal('textSize', opt.v)}
                    className={cn(
                      "h-12 rounded-xl border transition-all active:scale-95 font-medium",
                      opt.size,
                      local.textSize === opt.v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border/30 text-foreground hover:bg-muted/60"
                    )}
                  >
                    Aa
                  </button>
                ))}
              </div>
            </div>

            {/* Density */}
            <div className="mt-2 p-3.5 rounded-xl border border-border/30 bg-muted/40 space-y-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Densité d'affichage</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { v: 'comfortable' as Density, label: 'Confortable' },
                  { v: 'compact' as Density, label: 'Compact' },
                ]).map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setLocal('density', opt.v)}
                    className={cn(
                      "h-11 rounded-xl border transition-all active:scale-95 text-sm font-medium",
                      local.density === opt.v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border/30 text-foreground hover:bg-muted/60"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat background */}
            <div className="mt-2 p-3.5 rounded-xl border border-border/30 bg-muted/40 space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Fond des conversations</p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {([
                  { v: 'default' as ChatBackground, label: 'Défaut', preview: 'bg-background' },
                  { v: 'aurora'  as ChatBackground, label: 'Aurore', preview: 'bg-gradient-to-br from-primary/30 to-accent/30' },
                  { v: 'mesh'    as ChatBackground, label: 'Grille', preview: 'bg-[linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] bg-[length:8px_8px]' },
                  { v: 'solid'   as ChatBackground, label: 'Sobre',  preview: 'bg-muted' },
                ]).map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setLocal('chatBackground', opt.v)}
                    className={cn(
                      "h-16 rounded-xl border-2 transition-all active:scale-95 flex flex-col overflow-hidden",
                      local.chatBackground === opt.v ? "border-primary" : "border-border/30 hover:border-border/60"
                    )}
                  >
                    <div className={cn("flex-1", opt.preview)} />
                    <span className="text-[10px] py-1 bg-card text-foreground font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      // ============ PRIVACY ============
      case 'privacy':
        return (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex gap-3">
                <Lock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-500">Tes données sont protégées</p>
                  <p className="text-muted-foreground mt-0.5 text-[13px]">
                    Nous ne partageons jamais tes informations personnelles avec des tiers.
                  </p>
                </div>
              </div>
            </div>

            {/* Local-only privacy controls (available to everyone) */}
            <SettingItem
              icon={Check}
              iconColor="text-emerald-500"
              iconBg="bg-emerald-500/15"
              title="Accusés de lecture"
              description={local.readReceipts ? "Tes contacts voient quand tu lis" : "Désactivés sur cet appareil"}
              checked={local.readReceipts}
              onCheckedChange={(v) => setLocal('readReceipts', v)}
            />
            <SettingItem
              icon={MessageSquare}
              iconColor="text-blue-500"
              iconBg="bg-blue-500/15"
              title="Indicateur « écrit… »"
              description={local.typingIndicator ? "Tes contacts voient ta frappe" : "Caché sur cet appareil"}
              checked={local.typingIndicator}
              onCheckedChange={(v) => setLocal('typingIndicator', v)}
            />

            {/* Location hiding (paid feature) */}
            <Separator className="my-2 opacity-30" />
            <div className="flex items-center gap-2 mb-2 px-1">
              <Shield className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-foreground">Localisation</span>
            </div>
            <LocationHideCard />

            {/* Quick links to dedicated tools */}
            <Separator className="my-2 opacity-30" />
            <div className="flex items-center gap-2 mb-2 px-1">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-foreground">Outils de confidentialité</span>
            </div>
            <button
              onClick={() => { onClose(); navigate('/blocked'); }}
              className="w-full flex items-center gap-3 min-h-[52px] p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors border border-border/20 active:scale-[0.99]"
            >
              <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex-1 text-left">
                <span className="font-medium text-sm block text-foreground">Utilisateurs bloqués</span>
                <span className="text-[12px] text-muted-foreground">Gérer ta liste de bloqués</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
            </button>

            {isAdminUser && (
              <div className="space-y-2 mt-3">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Options administrateur</span>
                </div>
                <SettingItem
                  icon={privacySettings.hideOnlineStatus ? EyeOff : Eye}
                  iconColor={privacySettings.hideOnlineStatus ? "text-purple-500" : "text-green-500"}
                  iconBg={privacySettings.hideOnlineStatus ? "bg-purple-500/15" : "bg-green-500/15"}
                  title="Masquer le statut en ligne"
                  description={privacySettings.hideOnlineStatus ? "Personne ne voit si tu es connecté" : "Les autres voient quand tu es en ligne"}
                  checked={privacySettings.hideOnlineStatus}
                  onCheckedChange={toggleHideOnlineStatus}
                />
                <SettingItem
                  icon={Globe}
                  iconColor={privacySettings.hideLastSeen ? "text-purple-500" : "text-primary"}
                  iconBg={privacySettings.hideLastSeen ? "bg-purple-500/15" : "bg-primary/10"}
                  title="Masquer la dernière connexion"
                  description={privacySettings.hideLastSeen ? "Ta dernière activité est cachée" : "Les autres voient « Vu il y a… »"}
                  checked={privacySettings.hideLastSeen}
                  onCheckedChange={toggleHideLastSeen}
                />
              </div>
            )}
          </div>
        );

      // ============ HELP ============
      case 'help':
        return (
          <div className="space-y-4">
            {/* Primary CTA: Revoir le guide d'onboarding */}
            <button
              onClick={() => { onClose(); openOnboardingTour(); }}
              className="w-full relative overflow-hidden flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/8 to-transparent border border-primary/30 hover:from-primary/25 active:scale-[0.99] transition-all"
            >
              <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-primary/20 blur-2xl" />
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30">
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="relative flex-1 text-left">
                <p className="font-bold text-[15px] text-foreground leading-tight">📖 Revoir le guide d'utilisation</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">Redécouvre les fonctionnalités étape par étape</p>
              </div>
              <ChevronRight className="relative w-5 h-5 text-primary/60 flex-shrink-0" />
            </button>

            {/* Secondary CTA: ChatBot d'assistance */}
            <button
              onClick={() => { onClose(); navigate('/help'); }}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-muted/40 hover:bg-muted/60 active:scale-[0.99] transition-all border border-border/30"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-violet-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-[14.5px] text-foreground">Assistant Gay Social</p>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">Réponses instantanées par chatbot</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
            </button>

            <button
              onClick={() => { onClose(); navigate('/aide'); }}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-muted/40 hover:bg-muted/60 active:scale-[0.99] transition-all border border-border/30"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-[14.5px] text-foreground">Centre d'aide complet</p>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">Articles & guides détaillés</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
            </button>

            {/* Quick FAQ */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Sparkles className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm text-foreground">Questions rapides</h4>
              </div>
              <Accordion type="single" collapsible className="space-y-1.5">
                {[
                  { icon: <Coins className="w-4 h-4" />, q: "Comment fonctionnent les crédits ?", a: "Les crédits sont utilisés pour chaque action : envoyer un message (0.1), partager un média (0.2-0.5), consulter un profil (0.1). Tu peux réclamer 5 crédits gratuits chaque jour !", color: "text-amber-500 bg-amber-500/10" },
                  { icon: <Gift className="w-4 h-4" />, q: "Comment obtenir des crédits gratuits ?", a: "Tu reçois 15 crédits à l'inscription, 30 après la vérification d'identité, 5 crédits quotidiens (max 7j/mois), et 10 crédits par parrainage réussi !", color: "text-emerald-500 bg-emerald-500/10" },
                  { icon: <CreditCard className="w-4 h-4" />, q: "Comment acheter des crédits ?", a: "Va dans l'onglet Crédits et clique sur « Acheter des crédits ». 100 crédits = 5,99 €. Pas d'abonnement.", color: "text-blue-500 bg-blue-500/10" },
                  { icon: <BadgeCheck className="w-4 h-4" />, q: "Pourquoi vérifier mon identité ?", a: "La vérification garantit un espace sûr réservé aux adultes. Elle te donne aussi 30 crédits bonus et le badge vérifié !", color: "text-cyan-500 bg-cyan-500/10" },
                  { icon: <Shield className="w-4 h-4" />, q: "La vérification est-elle sécurisée ?", a: "Tes documents sont chiffrés et supprimés automatiquement après validation.", color: "text-indigo-500 bg-indigo-500/10" },
                  { icon: <User className="w-4 h-4" />, q: "Comment modifier mon profil ?", a: "Onglet Profil > icône paramètres en haut à droite > « Modifier le profil ».", color: "text-violet-500 bg-violet-500/10" },
                  { icon: <Camera className="w-4 h-4" />, q: "Comment changer ma photo de profil ?", a: "Modifier le profil > Photos > touche une photo > « Définir comme photo principale ».", color: "text-purple-500 bg-purple-500/10" },
                  { icon: <Users className="w-4 h-4" />, q: "Comment parrainer un ami ?", a: "Onglet Crédits > partage ton code. Vous recevez tous les deux 10 crédits dès vérification du filleul !", color: "text-pink-500 bg-pink-500/10" },
                  { icon: <Flag className="w-4 h-4" />, q: "Comment signaler un utilisateur ?", a: "Sur le profil ou dans la conversation, utilise l'icône drapeau pour nous alerter.", color: "text-red-500 bg-red-500/10" },
                ].map((faq, i) => (
                  <AccordionItem key={i} value={`item-${i}`} className="border border-border/30 rounded-xl px-3 bg-muted/30 hover:bg-muted/50 transition-colors data-[state=open]:bg-muted/60">
                    <AccordionTrigger className="py-3 hover:no-underline gap-3">
                      <div className="flex items-center gap-3 text-left">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${faq.color}`}>
                          {faq.icon}
                        </div>
                        <span className="font-medium text-[13px] leading-snug text-foreground">{faq.q}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-3 pl-11 pr-2">
                      <p className="text-[13px] text-muted-foreground leading-relaxed">{faq.a}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <Separator className="opacity-30" />

            {/* Contact support */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2 px-1 text-foreground">
                <Headphones className="w-4 h-4 text-muted-foreground" />
                Toujours pas trouvé ?
              </h4>
              <Button
                variant="outline"
                className="w-full justify-between group border-primary/20 hover:border-primary/30 hover:bg-primary/5 min-h-[56px] rounded-xl"
                onClick={() => { onClose(); onContactAdmin?.(); }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <span className="font-medium text-[15px] block text-foreground">Contacter un agent</span>
                    <span className="text-[12px] text-muted-foreground">Réponse sous 24h</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </Button>
            </div>

            <Separator className="opacity-30" />

            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2 px-1 text-foreground">
                <Shield className="w-4 h-4 text-muted-foreground" />
                Informations légales
              </h4>
              <button
                onClick={() => { onClose(); navigate('/legal'); }}
                className="w-full flex items-center gap-3 min-h-[52px] p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group cursor-pointer border border-border/20"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-500/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-medium text-sm block text-foreground">CGU, RGPD & Mentions légales</span>
                  <span className="text-[12px] text-muted-foreground">Consulter le règlement complet</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
              </button>
            </div>

            <div className="text-center pt-4 border-t border-border/30">
              <p className="text-[11px] text-muted-foreground/50">Gay Social v1.0.0 • © 2025</p>
            </div>
          </div>
        );

      // ============ LANGUAGE ============
      case 'language':
        return (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <div className="flex gap-3">
                <Languages className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-cyan-500">Bientôt multilingue</p>
                  <p className="text-muted-foreground mt-0.5 text-[13px]">
                    L'application est actuellement en français. D'autres langues arrivent !
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {([
                { v: 'fr' as const, label: 'Français', flag: '🇫🇷', enabled: true },
                { v: 'en' as const, label: 'English',  flag: '🇬🇧', enabled: false },
                { v: 'es' as const, label: 'Español',  flag: '🇪🇸', enabled: false },
              ]).map((opt) => (
                <button
                  key={opt.v}
                  disabled={!opt.enabled}
                  onClick={() => opt.enabled && setLocal('language', opt.v)}
                  className={cn(
                    "w-full flex items-center gap-3 min-h-[56px] p-3 rounded-xl border transition-all active:scale-[0.99]",
                    local.language === opt.v
                      ? "bg-primary/10 border-primary/40"
                      : "bg-muted/40 border-border/30 hover:bg-muted/60",
                    !opt.enabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span className="text-2xl">{opt.flag}</span>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-[15px] text-foreground">{opt.label}</p>
                    {!opt.enabled && (
                      <p className="text-[11px] text-muted-foreground">Bientôt disponible</p>
                    )}
                  </div>
                  {local.language === opt.v && opt.enabled && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {/* Header with back button */}
      <div className="px-5 pb-4 flex-shrink-0 border-b border-border/10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-muted/60 hover:bg-muted flex items-center justify-center flex-shrink-0 transition-colors active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className={`w-10 h-10 rounded-xl ${header.bgColor} flex items-center justify-center flex-shrink-0`}>
            <HeaderIcon className={`w-5 h-5 ${header.color}`} />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-foreground">{header.title}</h2>
            <p className="text-[12px] text-muted-foreground">{header.description}</p>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-4">
        {renderContent()}
      </div>

      {/* Sticky Footer for save actions (not for help/language) */}
      {(type !== 'help' && type !== 'language') && (
        <div className="flex gap-3 px-4 py-3 border-t border-border/15 bg-card/95 backdrop-blur-sm flex-shrink-0">
          <Button variant="outline" className="flex-1 min-h-[44px] rounded-xl" onClick={onBack}>
            Annuler
          </Button>
          <Button className="flex-1 gap-2 min-h-[44px] rounded-xl" onClick={handleSave}>
            <Check className="w-4 h-4" />
            Enregistrer
          </Button>
        </div>
      )}
    </>
  );
};

export default SettingsInlineContent;
