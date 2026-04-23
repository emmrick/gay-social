import { useState, useEffect } from 'react';
import AdBanner from '@/components/ads/AdBanner';
import { useFeatureFlags } from '@/hooks/useFeatureToggles';
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
import SuggestionDialog from './SuggestionDialog';
import { Lightbulb } from 'lucide-react';

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
  openEditProfile?: boolean;
  onEditProfileHandled?: () => void;
}

const ProfileView = ({ onSignOut, onNavigateToAdmin, onNavigateToCredits, onContactAdmin, onNavigateToChatbot, isAdmin, isModerator, openEditProfile, onEditProfileHandled }: ProfileViewProps) => {
  const { profile } = useAuth();
  const { data: stats, isLoading: statsLoading } = useProfileStats();
  const { data: isAdminUser } = useIsAdmin();
  const { favorites } = useUserFavorites();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSuggestionDialog, setShowSuggestionDialog] = useState(false);
  const featureFlags = useFeatureFlags();

  // Open edit dialog when triggered from notification redirect
  useEffect(() => {
    if (openEditProfile) {
      setShowEditDialog(true);
      onEditProfileHandled?.();
    }
  }, [openEditProfile, onEditProfileHandled]);

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
      <SuggestionDialog open={showSuggestionDialog} onOpenChange={setShowSuggestionDialog} />

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

        {/* Ad */}
        <AdBanner placement="compact" />

        {/* Albums */}
        {featureFlags['albums'] !== false && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <ProfileAlbumsSection />
          </motion.div>
        )}

        {/* ChatBot */}
        {featureFlags['personal_chatbot'] !== false && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
            <ChatBotProfileCard onOpen={() => onNavigateToChatbot?.()} />
          </motion.div>
        )}

        {/* Suggestion d'amélioration */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.28 }}
          onClick={() => setShowSuggestionDialog(true)}
          className="w-full bg-gradient-to-br from-yellow-500/10 via-primary/5 to-yellow-500/10 hover:from-yellow-500/20 hover:to-yellow-500/20 transition-all rounded-2xl border border-yellow-500/20 p-4 text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">💡 Proposer une amélioration</p>
              <p className="text-xs text-muted-foreground">Partage ton idée et gagne <span className="font-semibold text-yellow-600 dark:text-yellow-400">+30 crédits</span> si approuvée</p>
            </div>
          </div>
        </motion.button>

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
