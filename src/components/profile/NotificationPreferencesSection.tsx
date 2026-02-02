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
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

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
    isUpdating 
  } = useNotificationPreferences();

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

      <div className="pt-2 border-t border-border">
        <PreferenceItem
          icon={preferences.sound_enabled ? Volume2 : VolumeX}
          iconColor="text-primary"
          title="Son de notification"
          description={preferences.sound_enabled ? "Jouer un son à chaque notification" : "Notifications silencieuses"}
          checked={preferences.sound_enabled}
          onCheckedChange={() => togglePreference('sound_enabled')}
          disabled={isUpdating}
        />
      </div>
    </div>
  );
};

export default NotificationPreferencesSection;
