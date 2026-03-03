import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileStats } from '@/hooks/useProfileStats';
import { useIsAdmin } from '@/hooks/useAdmin';
import { useUserFavorites } from '@/hooks/useUserFavorites';
import { shouldShowOnlineIndicator } from '@/hooks/useOnlineStatus';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  MapPin, Calendar, Edit2, Sparkles, Star, Heart,
  MessageCircle, Users, Camera, Verified
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ProfileEditDialog from './ProfileEditDialog';
import ProfileReactions from './ProfileReactions';
import ProfileSettingsDrawer from './ProfileSettingsDrawer';
import ProfileAlbumsSection from './ProfileAlbumsSection';
import ChatBotProfileCard from '@/components/chatbot/ChatBotProfileCard';
import { motion } from 'framer-motion';

// Labels
const POSITION_LABELS: Record<string, string> = {
  'actif': '🔝 Actif',
  'passif': '🔽 Passif',
  'versatile': '↕️ Versatile',
  'vers_top': '↕️🔝 Vers. Top',
  'vers_bottom': '↕️🔽 Vers. Bottom',
  'side': '🤝 Side',
  'no_answer': 'Non précisé',
};

const LOOKING_FOR_LABELS: Record<string, string> = {
  'plan_cul': '🔥 Plan cul',
  'plan_regulier': '🔄 Régulier',
  'relation': '❤️ Relation',
  'amitie': '🤝 Amitié',
  'discussion': '💬 Discussion',
  'webcam': '📹 Webcam',
  'groupe': '👥 Groupe',
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

const HIV_STATUS_LABELS: Record<string, string> = {
  'negative': '🟢 Négatif',
  'negative_prep': '💊 PrEP',
  'positive_undetectable': '🔵 Indétectable',
  'positive': '🟣 Positif',
  'no_answer': 'Non précisé',
};

const getPositionLabel = (position: string) => POSITION_LABELS[position] || position;
const getLookingForLabel = (item: string) => LOOKING_FOR_LABELS[item] || item;
const getBodyTypeLabel = (type: string) => BODY_TYPE_LABELS[type] || type;
const getEthnicityLabel = (eth: string) => ETHNICITY_LABELS[eth] || eth;

interface ProfileViewProps {
  onSignOut: () => void;
  onNavigateToAdmin?: () => void;
  onNavigateToCredits?: () => void;
  onContactAdmin?: () => void;
  onNavigateToChatbot?: () => void;
  isAdmin?: boolean;
  isModerator?: boolean;
}

const ProfileView = ({ onSignOut, onNavigateToAdmin, onNavigateToCredits, onContactAdmin, onNavigateToChatbot, isAdmin, isModerator }: ProfileViewProps) => {
  const { profile } = useAuth();
  const { data: stats, isLoading: statsLoading } = useProfileStats();
  const { data: isAdminUser } = useIsAdmin();
  const { favorites } = useUserFavorites();
  const [showEditDialog, setShowEditDialog] = useState(false);

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statItems = [
    { value: stats?.messagesCount || 0, label: 'Messages', color: 'text-primary', bgColor: 'bg-primary/10', icon: MessageCircle },
    { value: stats?.conversationsCount || 0, label: 'Convs', color: 'text-blue-500', bgColor: 'bg-blue-500/10', icon: Users },
    { value: favorites.length, label: 'Favoris', color: 'text-amber-500', bgColor: 'bg-amber-500/10', icon: Star },
    { value: stats?.reactionsCount || 0, label: 'Réactions', color: 'text-pink-500', bgColor: 'bg-pink-500/10', icon: Heart },
  ];

  return (
    <div className="animate-fade-in pb-8 bg-background min-h-screen">
      <ProfileEditDialog open={showEditDialog} onOpenChange={setShowEditDialog} />
      
      {/* New Layout: Side-by-side design */}
      <div className="px-4 pt-4">
        {/* Main Profile Card - Horizontal Layout */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-card rounded-3xl shadow-lg border border-border/50 overflow-hidden"
        >
          <div className="flex">
            {/* Left: Avatar Section */}
            <div className="relative flex-shrink-0 p-4">
              <div className="p-0.5 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30">
                <Avatar className="w-32 h-40 rounded-xl border-2 border-card">
                  <AvatarImage src={profile.avatar_url || undefined} className="object-cover rounded-xl" />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-accent text-white font-bold rounded-xl">
                    {profile.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              {/* Edit photo button */}
              <button
                onClick={() => setShowEditDialog(true)}
                className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform border-2 border-card"
              >
                <Camera className="w-4 h-4" />
              </button>
              
              {/* Online indicator */}
              {shouldShowOnlineIndicator(profile) && (
                <span className="absolute top-6 left-6 w-4 h-4 rounded-full bg-emerald-500 border-2 border-card shadow-lg animate-pulse" />
              )}
            </div>

            {/* Right: Info Section */}
            <div className="flex-1 py-4 pr-4 flex flex-col justify-between">
              {/* Settings button - top right */}
              <div className="flex justify-between items-start">
                <div>
                  {/* Name & Age */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold leading-tight">
                      {profile.username}
                    </h1>
                    {profile.is_verified && (
                      <Verified className="w-5 h-5 text-blue-500 fill-blue-500" />
                    )}
                  </div>
                  {profile.age && (
                    <p className="text-lg text-muted-foreground">{profile.age} ans</p>
                  )}
                </div>
                <ProfileSettingsDrawer
                  isAdmin={isAdmin}
                  isModerator={isModerator}
                  onNavigateToAdmin={onNavigateToAdmin}
                  onNavigateToCredits={onNavigateToCredits}
                  onContactAdmin={onContactAdmin}
                  onSignOut={onSignOut}
                />
              </div>

              {/* Role badges */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {isAdminUser && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-sm text-xs">
                    ⚡ Admin
                  </Badge>
                )}
                {!isAdminUser && isModerator && (
                  <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-sm text-xs">
                    🛡️ Modérateur
                  </Badge>
                )}
                {/* Removed Premium badge - credits system is now used */}
                {(profile as any).sexual_position && (profile as any).sexual_position !== 'no_answer' && (
                  <Badge variant="outline" className="bg-secondary/50 text-xs">
                    {getPositionLabel((profile as any).sexual_position)}
                  </Badge>
                )}
              </div>

              {/* Quick info row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {profile.region}
                </span>
                {((profile as any).height || (profile as any).weight) && (
                  <span>
                    {(profile as any).height && `${(profile as any).height}cm`}
                    {(profile as any).height && (profile as any).weight && ' • '}
                    {(profile as any).weight && `${(profile as any).weight}kg`}
                  </span>
                )}
                {profile.created_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(profile.created_at), 'MMM yyyy', { locale: fr })}
                  </span>
                )}
              </div>

              {/* Edit button */}
              <Button 
                variant="default" 
                size="sm" 
                className="mt-3 gap-1.5 rounded-xl shadow-sm self-start text-xs h-8"
                onClick={() => setShowEditDialog(true)}
              >
                <Edit2 className="w-3.5 h-3.5" />
                Modifier le profil
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Bio Section */}
        {profile.bio && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="mt-3"
          >
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
              <CardContent className="p-3">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {profile.bio}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Looking for & Additional info */}
        {((profile as any).looking_for?.length > 0 || (profile as any).body_type || (profile as any).ethnicity) && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.08 }}
            className="mt-3"
          >
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
              <CardContent className="p-3">
                {/* Looking for badges */}
                {(profile as any).looking_for && (profile as any).looking_for.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(profile as any).looking_for.map((item: string) => (
                      <Badge key={item} variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                        {getLookingForLabel(item)}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Additional info */}
                <div className="flex flex-wrap gap-1.5">
                  {(profile as any).body_type && (
                    <Badge variant="outline" className="text-xs">
                      {getBodyTypeLabel((profile as any).body_type)}
                    </Badge>
                  )}
                  {(profile as any).ethnicity && (
                    <Badge variant="outline" className="text-xs">
                      {getEthnicityLabel((profile as any).ethnicity)}
                    </Badge>
                  )}
                  {(profile as any).hiv_status && (profile as any).hiv_status !== 'no_answer' && (
                    <Badge variant="outline" className="text-xs">
                      {HIV_STATUS_LABELS[(profile as any).hiv_status]}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Albums Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-3"
        >
          <ProfileAlbumsSection />
        </motion.div>

        {/* ChatBot Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="mt-3"
        >
          <ChatBotProfileCard onOpen={() => onNavigateToChatbot?.()} />
        </motion.div>
      </div>

      {/* Stats Grid */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-4 gap-2 px-4 mt-4"
      >
        {statItems.map((stat) => (
          <Card key={stat.label} className="bg-card/80 backdrop-blur-sm border-border/50 overflow-hidden">
            <CardContent className="p-3 text-center">
              <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center mx-auto mb-1.5`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className={`text-xl font-bold ${stat.color}`}>
                {statsLoading && stat.label !== 'Favoris' ? '...' : stat.value}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Reactions Section */}
      {profile.user_id && (
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="px-4 mt-4"
        >
          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-3 text-center font-medium uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Réactions sur ton profil
              </p>
              <ProfileReactions profileUserId={profile.user_id} className="justify-center" />
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default ProfileView;
