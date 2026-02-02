import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileStats } from '@/hooks/useProfileStats';
import { useIsAdmin } from '@/hooks/useAdmin';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserFavorites } from '@/hooks/useUserFavorites';
import { shouldShowOnlineIndicator } from '@/hooks/useOnlineStatus';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, Calendar, LogOut, Edit2, Shield, Bell, Moon, HelpCircle, 
  ChevronRight, Loader2, Crown, Sparkles, FolderLock, Star, Heart,
  MessageCircle, Users, Zap, Camera
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ProfileEditDialog from './ProfileEditDialog';
import SettingsDialog from './SettingsDialog';
import AlbumManager from '@/components/albums/AlbumManager';
import ProfileReactions from './ProfileReactions';
import { motion } from 'framer-motion';

// Labels
const POSITION_LABELS: Record<string, string> = {
  'actif': '🔝 Actif (Top)',
  'passif': '🔽 Passif (Bottom)',
  'versatile': '↕️ Versatile',
  'vers_top': '↕️🔝 Versatile Top',
  'vers_bottom': '↕️🔽 Versatile Bottom',
  'side': '🤝 Side',
  'no_answer': 'Non précisé',
};

const POSITION_DETAIL_LABELS: Record<string, string> = {
  'strict': 'Strict',
  'flexible': 'Flexible',
  'depends': 'Selon l\'affinité',
};

const ENDOWMENT_LABELS: Record<string, string> = {
  'small': 'Petit',
  'average': 'Moyen',
  'large': 'Grand',
  'xl': 'XL',
  'no_answer': 'Non précisé',
};

const HIV_STATUS_LABELS: Record<string, string> = {
  'negative': '🟢 Négatif',
  'negative_prep': '💊 Négatif sous PrEP',
  'positive_undetectable': '🔵 Positif indétectable',
  'positive': '🟣 Positif',
  'no_answer': 'Non précisé',
};

const LOOKING_FOR_LABELS: Record<string, string> = {
  'plan_cul': '🔥 Plan cul',
  'plan_regulier': '🔄 Plan régulier',
  'relation': '❤️ Relation',
  'amitie': '🤝 Amitié',
  'discussion': '💬 Discussion',
  'webcam': '📹 Webcam',
  'groupe': '👥 Plan à plusieurs',
};

const BODY_TYPE_LABELS: Record<string, string> = {
  'mince': 'Mince',
  'moyen': 'Moyen',
  'muscle': 'Musclé',
  'costaud': 'Costaud',
  'gros': 'Gros',
  'sportif': 'Sportif',
};

const ETHNICITY_LABELS: Record<string, string> = {
  'europeen': 'Européen',
  'africain': 'Africain',
  'maghrebin': 'Maghrébin',
  'asiatique': 'Asiatique',
  'latino': 'Latino',
  'metis': 'Métis',
  'autre': 'Autre',
};

const getPositionLabel = (position: string) => POSITION_LABELS[position] || position;
const getLookingForLabel = (item: string) => LOOKING_FOR_LABELS[item] || item;
const getBodyTypeLabel = (type: string) => BODY_TYPE_LABELS[type] || type;
const getEthnicityLabel = (eth: string) => ETHNICITY_LABELS[eth] || eth;

interface ProfileViewProps {
  onSignOut: () => void;
  onNavigateToAdmin?: () => void;
  onNavigateToPremium?: () => void;
  onContactAdmin?: () => void;
  isAdmin?: boolean;
}

type SettingsType = 'notifications' | 'appearance' | 'privacy' | 'help';

const ProfileView = ({ onSignOut, onNavigateToAdmin, onNavigateToPremium, onContactAdmin, isAdmin }: ProfileViewProps) => {
  const { profile } = useAuth();
  const { data: stats, isLoading: statsLoading } = useProfileStats();
  const { data: isAdminUser } = useIsAdmin();
  const { isPremium, subscriptionEnd, openCustomerPortal } = useSubscription();
  const { favorites } = useUserFavorites();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [settingsType, setSettingsType] = useState<SettingsType | null>(null);
  const [showAlbumManager, setShowAlbumManager] = useState(false);

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const menuItems = [
    { icon: Edit2, label: 'Modifier le profil', action: () => setShowEditDialog(true), color: 'text-primary' },
    { icon: FolderLock, label: 'Albums privés', action: () => setShowAlbumManager(true), color: 'text-violet-500' },
    { icon: Bell, label: 'Notifications', action: () => setSettingsType('notifications'), color: 'text-blue-500' },
    { icon: Moon, label: 'Apparence', action: () => setSettingsType('appearance'), color: 'text-indigo-500' },
    { icon: Shield, label: 'Confidentialité', action: () => setSettingsType('privacy'), color: 'text-green-500' },
    { icon: HelpCircle, label: 'Aide & Support', action: () => setSettingsType('help'), color: 'text-orange-500' },
  ];

  return (
    <div className="animate-fade-in pb-8">
      <ProfileEditDialog open={showEditDialog} onOpenChange={setShowEditDialog} />
      <AlbumManager isOpen={showAlbumManager} onClose={() => setShowAlbumManager(false)} />
      
      {settingsType && (
        <SettingsDialog 
          open={!!settingsType} 
          onOpenChange={(open) => !open && setSettingsType(null)}
          type={settingsType}
          onContactAdmin={onContactAdmin}
        />
      )}

      {/* Profile Header - Modern gradient banner */}
      <div className="relative">
        {/* Banner gradient with pattern overlay */}
        <div className="h-40 bg-gradient-to-br from-primary via-primary/80 to-accent relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJWMTZoMnYxOHpNMjYgMzRoLTJWMTZoMnYxOHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        </div>
        
        {/* Profile info overlay */}
        <div className="px-4 -mt-20">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col items-center"
          >
            {/* Avatar with Premium golden ring */}
            <div className="relative">
              <div className={isPremium ? "p-1.5 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 shadow-xl shadow-amber-500/30" : "p-1 rounded-full bg-background shadow-xl"}>
                <Avatar className="w-32 h-32 border-4 border-background">
                  <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-accent text-white font-bold">
                    {profile.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              {/* Edit photo button */}
              <button
                onClick={() => setShowEditDialog(true)}
                className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                <Camera className="w-4 h-4" />
              </button>
              
              {/* Online status */}
              <Badge 
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 shadow-lg"
                variant={shouldShowOnlineIndicator(profile) ? "default" : "secondary"}
              >
                <span className={`w-2 h-2 rounded-full mr-1.5 ${shouldShowOnlineIndicator(profile) ? 'bg-green-400 animate-pulse' : 'bg-muted-foreground'}`} />
                {shouldShowOnlineIndicator(profile) ? 'En ligne' : 'Hors ligne'}
              </Badge>
            </div>

            {/* Name & info */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mt-6 text-center"
            >
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold font-display">
                  {profile.username}
                  {profile.age && <span className="text-muted-foreground font-normal ml-1">, {profile.age} ans</span>}
                </h1>
              </div>
              
              {/* Role badges */}
              <div className="flex items-center justify-center gap-2 mt-2">
                {isAdminUser && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg">
                    <Crown className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                )}
                {isPremium && !isAdminUser && (
                  <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 shadow-lg">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </div>
              
              {/* Position badge */}
              {(profile as any).sexual_position && (profile as any).sexual_position !== 'no_answer' && (
                <Badge variant="secondary" className="mt-2">
                  {getPositionLabel((profile as any).sexual_position)}
                  {(profile as any).position_detail && POSITION_DETAIL_LABELS[(profile as any).position_detail] && (
                    <span className="ml-1 opacity-80">({POSITION_DETAIL_LABELS[(profile as any).position_detail]})</span>
                  )}
                </Badge>
              )}
              
              <div className="flex items-center justify-center gap-2 mt-3 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{profile.region}</span>
              </div>
              
              {/* Physical stats */}
              {((profile as any).height || (profile as any).weight) && (
                <div className="flex items-center justify-center gap-3 mt-1 text-muted-foreground text-sm">
                  {(profile as any).height && <span>{(profile as any).height} cm</span>}
                  {(profile as any).height && (profile as any).weight && <span>•</span>}
                  {(profile as any).weight && <span>{(profile as any).weight} kg</span>}
                </div>
              )}
              
              {profile.created_at && (
                <div className="flex items-center justify-center gap-2 mt-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    Membre depuis {format(new Date(profile.created_at), 'MMMM yyyy', { locale: fr })}
                  </span>
                </div>
              )}
            </motion.div>

            {/* Looking for badges */}
            {(profile as any).looking_for && (profile as any).looking_for.length > 0 && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="flex flex-wrap justify-center gap-1.5 mt-4"
              >
                {(profile as any).looking_for.map((item: string) => (
                  <Badge key={item} variant="outline" className="text-xs">
                    {getLookingForLabel(item)}
                  </Badge>
                ))}
              </motion.div>
            )}

            {/* Additional info badges */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap justify-center gap-1.5 mt-2"
            >
              {(profile as any).body_type && (
                <Badge variant="secondary" className="text-xs">
                  {getBodyTypeLabel((profile as any).body_type)}
                </Badge>
              )}
              {(profile as any).endowment && (profile as any).endowment !== 'no_answer' && (
                <Badge variant="secondary" className="text-xs">
                  🍆 {ENDOWMENT_LABELS[(profile as any).endowment] || (profile as any).endowment}
                </Badge>
              )}
              {(profile as any).ethnicity && (
                <Badge variant="secondary" className="text-xs">
                  {getEthnicityLabel((profile as any).ethnicity)}
                </Badge>
              )}
              {(profile as any).hiv_status && (profile as any).hiv_status !== 'no_answer' && (
                <Badge variant="secondary" className="text-xs">
                  {HIV_STATUS_LABELS[(profile as any).hiv_status] || (profile as any).hiv_status}
                </Badge>
              )}
            </motion.div>

            {/* Profile Reactions */}
            {profile.user_id && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="mt-5 w-full max-w-sm"
              >
                <p className="text-xs text-muted-foreground mb-2 text-center font-medium uppercase tracking-wider flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Réactions sur ton profil
                </p>
                <ProfileReactions profileUserId={profile.user_id} className="justify-center" />
              </motion.div>
            )}

            {/* Bio */}
            {profile.bio && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4 p-4 rounded-2xl bg-secondary/50 max-w-sm w-full"
              >
                <p className="text-center text-muted-foreground text-sm leading-relaxed">
                  {profile.bio}
                </p>
              </motion.div>
            )}

            {/* Quick edit button */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4 gap-2 rounded-xl"
                onClick={() => setShowEditDialog(true)}
              >
                <Edit2 className="w-4 h-4" />
                Modifier le profil
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Stats cards */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-4 gap-2 px-4 mt-6"
      >
        {[
          { value: stats?.messagesCount || 0, label: 'Messages', color: 'text-primary', icon: MessageCircle },
          { value: stats?.conversationsCount || 0, label: 'Convs', color: 'text-blue-500', icon: Users },
          { value: favorites.length, label: 'Favoris', color: 'text-amber-500', icon: Star },
          { value: stats?.reactionsCount || 0, label: 'Réactions', color: 'text-pink-500', icon: Heart },
        ].map((stat, index) => (
          <Card key={stat.label} className="bg-secondary/50 overflow-hidden">
            <CardContent className="p-3 text-center">
              {statsLoading && index !== 2 ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto text-primary" />
              ) : (
                <div className="flex flex-col items-center">
                  <stat.icon className={`w-4 h-4 ${stat.color} mb-1`} />
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Menu items */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="px-4 mt-6 space-y-2"
      >
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Shield className="w-3 h-3" />
          Paramètres
        </h3>
        
        {menuItems.map((item, index) => (
          <motion.button
            key={index}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 + index * 0.05 }}
            onClick={item.action}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className={`w-10 h-10 rounded-xl bg-secondary flex items-center justify-center`}>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <span className="flex-1 text-left font-medium">{item.label}</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        ))}

        {/* Premium status */}
        {isPremium ? (
          <motion.button
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            onClick={openCustomerPortal}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 transition-all border border-amber-500/30"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="font-medium text-amber-500">Premium actif</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              {subscriptionEnd && (
                <span className="text-xs text-muted-foreground">
                  Renouvellement le {format(new Date(subscriptionEnd), 'dd MMM yyyy', { locale: fr })}
                </span>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-amber-500" />
          </motion.button>
        ) : (
          <motion.button
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            onClick={onNavigateToPremium}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 transition-all border border-amber-500/30 group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/30">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="font-medium text-amber-500">Passer à Premium</span>
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-xs text-muted-foreground">4,50 €/mois • Débloquez tout</p>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-500 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        )}

        {/* Admin button */}
        {isAdmin && onNavigateToAdmin && (
          <motion.button
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.85 }}
            onClick={onNavigateToAdmin}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-500" />
            </div>
            <span className="flex-1 text-left font-medium text-amber-500">Administration</span>
            <ChevronRight className="w-5 h-5 text-amber-500" />
          </motion.button>
        )}

        <Separator className="my-4" />

        {/* Sign out */}
        <motion.button
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
          onClick={onSignOut}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-destructive/10 hover:bg-destructive/20 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-destructive" />
          </div>
          <span className="flex-1 text-left font-medium text-destructive">Se déconnecter</span>
        </motion.button>
      </motion.div>
    </div>
  );
};

export default ProfileView;