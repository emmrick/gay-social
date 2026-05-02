import { motion } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  MessageSquare, 
  Users, 
  Star, 
  Heart, 
  Image, 
  Volume2, 
  VolumeX,
  Loader2,
  Play,
  Sparkles,
  AtSign,
  Coins,
  ShieldCheck,
  Megaphone,
  Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useWeeklyDigestPreference } from '@/hooks/useWeeklyDigestPreference';
import { useNotificationSound, NOTIFICATION_SOUNDS, NotificationSoundType } from '@/hooks/useNotificationSound';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { WeeklyDigestStatus } from './WeeklyDigestStatus';

interface PreferenceItemProps {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: () => void;
  disabled?: boolean;
}

const PreferenceItem = ({ 
  icon: Icon, 
  iconColor, 
  title, 
  description, 
  checked, 
  onCheckedChange,
  disabled 
}: PreferenceItemProps) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
  >
    <div className={cn(
      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
      checked ? "bg-primary/20" : "bg-muted"
    )}>
      <Icon className={cn("w-5 h-5", checked ? iconColor : "text-muted-foreground")} />
    </div>
    <div className="flex-1 min-w-0">
      <Label className="font-medium block">{title}</Label>
      <p className="text-sm text-muted-foreground truncate">{description}</p>
    </div>
    <Switch 
      checked={checked} 
      onCheckedChange={onCheckedChange}
      disabled={disabled}
    />
  </motion.div>
);

const NotificationPreferencesSection = () => {
  const { 
    preferences, 
    isLoading, 
    togglePreference,
    updatePreferences,
    isUpdating 
  } = useNotificationPreferences();
  
  const { previewSound } = useNotificationSound();
  const weeklyDigest = useWeeklyDigestPreference();

  const handleSoundChange = (value: NotificationSoundType) => {
    // Store in localStorage for immediate access
    localStorage.setItem('notification_sound_type', value);
    // Also update in database
    updatePreferences({ notification_sound: value });
  };

  const handleSoundToggle = () => {
    const newValue = !preferences.sound_enabled;
    // Store in localStorage for immediate reactivity
    localStorage.setItem('notification_sound_enabled', String(newValue));
    togglePreference('sound_enabled');
  };

  const handlePreviewSound = () => {
    const currentSound = (preferences.notification_sound || 'default') as NotificationSoundType;
    previewSound(currentSound);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium text-muted-foreground">
          Choisis les notifications que tu souhaites recevoir
        </span>
      </div>

      <PreferenceItem
        icon={MessageSquare}
        iconColor="text-blue-500"
        title="Messages privés"
        description="Recevoir une alerte pour chaque nouveau message privé"
        checked={preferences.push_private_messages}
        onCheckedChange={() => togglePreference('push_private_messages')}
        disabled={isUpdating}
      />

      <PreferenceItem
        icon={Users}
        iconColor="text-green-500"
        title="Messages de groupe"
        description="Recevoir une alerte pour les messages dans les salons"
        checked={preferences.push_group_messages}
        onCheckedChange={() => togglePreference('push_group_messages')}
        disabled={isUpdating}
      />

      <PreferenceItem
        icon={Star}
        iconColor="text-yellow-500"
        title="Favoris"
        description="Quand quelqu'un t'ajoute en favori"
        checked={preferences.push_favorites}
        onCheckedChange={() => togglePreference('push_favorites')}
        disabled={isUpdating}
      />

      <PreferenceItem
        icon={Heart}
        iconColor="text-red-500"
        title="Réactions"
        description="Quand quelqu'un réagit à ton profil"
        checked={preferences.push_reactions}
        onCheckedChange={() => togglePreference('push_reactions')}
        disabled={isUpdating}
      />

      <PreferenceItem
        icon={Image}
        iconColor="text-purple-500"
        title="Albums partagés"
        description="Quand quelqu'un te partage un album"
        checked={preferences.push_album_shares}
        onCheckedChange={() => togglePreference('push_album_shares')}
        disabled={isUpdating}
      />

      <PreferenceItem
        icon={Sparkles}
        iconColor="text-pink-500"
        title="Matchs"
        description="Quand un like est réciproque (match mutuel)"
        checked={preferences.push_matches}
        onCheckedChange={() => togglePreference('push_matches')}
        disabled={isUpdating}
      />

      <PreferenceItem
        icon={AtSign}
        iconColor="text-cyan-500"
        title="Mentions"
        description="Quand quelqu'un te mentionne dans un groupe"
        checked={preferences.push_mentions}
        onCheckedChange={() => togglePreference('push_mentions')}
        disabled={isUpdating}
      />

      <PreferenceItem
        icon={Coins}
        iconColor="text-emerald-500"
        title="Crédits"
        description="Validation d'achat, bonus et transactions"
        checked={preferences.push_credits}
        onCheckedChange={() => togglePreference('push_credits')}
        disabled={isUpdating}
      />

      <PreferenceItem
        icon={ShieldCheck}
        iconColor="text-orange-500"
        title="Vérification d'identité"
        description="Statut de ta demande de vérification"
        checked={preferences.push_verification}
        onCheckedChange={() => togglePreference('push_verification')}
        disabled={isUpdating}
      />

      <PreferenceItem
        icon={Megaphone}
        iconColor="text-amber-500"
        title="Annonces officielles"
        description="Notifications du canal informations"
        checked={(preferences as any).push_announcements ?? true}
        onCheckedChange={() => togglePreference('push_announcements' as any)}
        disabled={isUpdating}
      />

      <div className="pt-2 border-t border-border space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-muted-foreground">Décisions sur tes idées</span>
        </div>
        <PreferenceItem
          icon={Sparkles}
          iconColor="text-fuchsia-500"
          title="Notification dans l'app"
          description="Recevoir une notification quand une idée est approuvée ou refusée"
          checked={(preferences as any).suggestion_decisions_inapp ?? true}
          onCheckedChange={() => togglePreference('suggestion_decisions_inapp' as any)}
          disabled={isUpdating}
        />
        <PreferenceItem
          icon={Megaphone}
          iconColor="text-fuchsia-500"
          title="Notification push"
          description="Recevoir une notification push sur ton appareil"
          checked={(preferences as any).suggestion_decisions_push ?? true}
          onCheckedChange={() => togglePreference('suggestion_decisions_push' as any)}
          disabled={isUpdating}
        />
        <PreferenceItem
          icon={Mail}
          iconColor="text-fuchsia-500"
          title="E-mail"
          description="Recevoir un e-mail détaillé avec le motif et les crédits"
          checked={(preferences as any).suggestion_decisions_email ?? true}
          onCheckedChange={() => togglePreference('suggestion_decisions_email' as any)}
          disabled={isUpdating}
        />
      </div>

      <div className="pt-2 border-t border-border space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-muted-foreground">E-mails</span>
        </div>
        <PreferenceItem
          icon={Mail}
          iconColor="text-indigo-500"
          title="Récapitulatif hebdomadaire"
          description="Recevoir un e-mail chaque semaine avec ton résumé d'activité"
          checked={weeklyDigest.enabled}
          onCheckedChange={weeklyDigest.toggle}
          disabled={weeklyDigest.isLoading || weeklyDigest.isUpdating}
        />
        <WeeklyDigestStatus
          enabled={weeklyDigest.enabled}
          isPreferenceLoading={weeklyDigest.isLoading}
        />
      </div>

      <div className="pt-2 border-t border-border space-y-3">
        <PreferenceItem
          icon={preferences.sound_enabled ? Volume2 : VolumeX}
          iconColor="text-primary"
          title="Son de notification"
          description={preferences.sound_enabled ? "Jouer un son à chaque notification" : "Notifications silencieuses"}
          checked={preferences.sound_enabled}
          onCheckedChange={handleSoundToggle}
          disabled={isUpdating}
        />

        {preferences.sound_enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-14 space-y-2"
          >
            <Label className="text-sm text-muted-foreground">Choix du son</Label>
            <div className="flex items-center gap-2">
              <Select 
                value={preferences.notification_sound || 'default'} 
                onValueChange={handleSoundChange}
                disabled={isUpdating}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choisir un son" />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_SOUNDS.map((sound) => (
                    <SelectItem key={sound.id} value={sound.id}>
                      <div className="flex flex-col">
                        <span>{sound.name}</span>
                        <span className="text-xs text-muted-foreground">{sound.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="icon"
                onClick={handlePreviewSound}
                disabled={preferences.notification_sound === 'none'}
                title="Écouter le son"
              >
                <Play className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default NotificationPreferencesSection;
