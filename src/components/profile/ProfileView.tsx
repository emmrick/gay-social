import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileStats } from '@/hooks/useProfileStats';
import { useIsAdmin } from '@/hooks/useAdmin';
import { useUserFavorites } from '@/hooks/useUserFavorites';
import { shouldShowOnlineIndicator } from '@/hooks/useOnlineStatus';
import { getZodiacSign, isBirthdayToday, formatBirthday } from '@/lib/zodiac';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileEditDialog from './ProfileEditDialog';
import ProfileSettingsDrawer from './ProfileSettingsDrawer';
import ProfileAlbumsSection from './ProfileAlbumsSection';
import ProfileReactions from './ProfileReactions';
import ChatBotProfileCard from '@/components/chatbot/ChatBotProfileCard';
import ProfileHeroCard from './ProfileHeroCard';
import ProfileInfoCards from './ProfileInfoCards';
import ProfileStatsGrid from './ProfileStatsGrid';

const POSITION_LABELS: Record<string, string> = {
  'actif': '🔝 Actif', 'passif': '🔽 Passif', 'versatile': '↕️ Versatile',
  'vers_top': '↕️🔝 Vers. Top', 'vers_bottom': '↕️🔽 Vers. Bottom',
  'side': '🤝 Side', 'no_answer': 'Non précisé',
};
const LOOKING_FOR_LABELS: Record<string, string> = {
  'plan_cul': '🔥 Plan cul', 'plan_regulier': '🔄 Régulier', 'relation': '❤️ Relation',
  'amitie': '🤝 Amitié', 'discussion': '💬 Discussion', 'webcam': '📹 Webcam', 'groupe': '👥 Groupe',
};
const BODY_TYPE_LABELS: Record<string, string> = {
  'mince': 'Mince', 'moyen': 'Moyen', 'muscle': 'Musclé',
  'costaud': 'Costaud', 'gros': 'Gros', 'sportif': 'Sportif',
};
const ETHNICITY_LABELS: Record<string, string> = {
  'europeen': 'Européen', 'africain': 'Africain', 'maghrebin': 'Maghrébin',
  'asiatique': 'Asiatique', 'latino': 'Latino', 'metis': 'Métis', 'autre': 'Autre',
};
const HIV_STATUS_LABELS: Record<string, string> = {
  'negative': '🟢 Négatif', 'negative_prep': '💊 PrEP',
  'positive_undetectable': '🔵 Indétectable', 'positive': '🟣 Positif', 'no_answer': 'Non précisé',
};

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

  return (
    <div className="animate-fade-in pb-24 bg-background min-h-screen">
      <ProfileEditDialog open={showEditDialog} onOpenChange={setShowEditDialog} />

      {/* Hero Card */}
      <ProfileHeroCard
        profile={profile}
        isAdminUser={isAdminUser}
        isModerator={isModerator}
        isAdmin={isAdmin}
        positionLabels={POSITION_LABELS}
        onEdit={() => setShowEditDialog(true)}
        settingsDrawer={
          <ProfileSettingsDrawer
            isAdmin={isAdmin}
            isModerator={isModerator}
            onNavigateToAdmin={onNavigateToAdmin}
            onNavigateToCredits={onNavigateToCredits}
            onContactAdmin={onContactAdmin}
            onSignOut={onSignOut}
          />
        }
      />

      <div className="px-4 space-y-4 mt-4 relative z-10">
        {/* Stats */}
        <ProfileStatsGrid
          stats={stats}
          statsLoading={statsLoading}
          favoritesCount={favorites.length}
        />

        {/* Info Cards */}
        <ProfileInfoCards
          profile={profile}
          lookingForLabels={LOOKING_FOR_LABELS}
          bodyTypeLabels={BODY_TYPE_LABELS}
          ethnicityLabels={ETHNICITY_LABELS}
          hivStatusLabels={HIV_STATUS_LABELS}
        />

        {/* Albums */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <ProfileAlbumsSection />
        </motion.div>

        {/* ChatBot */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
          <ChatBotProfileCard onOpen={() => onNavigateToChatbot?.()} />
        </motion.div>

        {/* Reactions */}
        {profile.user_id && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <div className="bg-card rounded-2xl border border-border/50 p-4">
              <p className="text-xs text-muted-foreground mb-3 text-center font-semibold uppercase tracking-wider">
                ✨ Réactions sur ton profil
              </p>
              <ProfileReactions profileUserId={profile.user_id} className="justify-center" />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ProfileView;
