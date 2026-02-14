import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Flag, MapPin, Ruler, Weight, Heart, Calendar, User, Shield, Star, Loader2, Ban, Sparkles, Info, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfiles';
import { useProfilePhotos } from '@/hooks/useProfilePhotos';
import { useUserFavorites } from '@/hooks/useUserFavorites';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { getDetailedLastSeenText, isUserTrulyOnline } from '@/hooks/useOnlineStatus';
import { useRealtimeUserOnlineStatus } from '@/hooks/useRealtimeOnlineStatus';
import ProfilePhotoCarousel from '@/components/chat/ProfilePhotoCarousel';
import ReportUserDialog from '@/components/chat/ReportUserDialog';
import ProfileReactions from '@/components/profile/ProfileReactions';
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useMobileNavigation } from '@/hooks/useMobileNavigation';
// Premium user check removed - premium badges no longer shown on other profiles
import { useUserSuspensionStatus } from '@/hooks/useUserSuspensionStatus';
import { motion } from 'framer-motion';
import { useProfileViewCheck, useRecordProfileView, CREDIT_COSTS, deductCredits, checkSufficientCredits } from '@/hooks/useCredits';
import { useCreditCheck } from '@/hooks/useCreditCheck';
import { toast } from 'sonner';
import { useChatbotConfig } from '@/hooks/useChatbotConfig';
import ChatBotDialog from '@/components/chatbot/ChatBotDialog';

// Labels for profile fields
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

const BODY_TYPE_LABELS: Record<string, string> = {
  'mince': 'Mince',
  'moyen': 'Moyen',
  'muscle': 'Musclé',
  'costaud': 'Costaud',
  'gros': 'Gros',
  'sportif': 'Sportif',
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

const TRIBE_LABELS: Record<string, string> = {
  'bear': '🐻 Bear',
  'twink': '✨ Twink',
  'otter': '🦦 Otter',
  'daddy': '👔 Daddy',
  'jock': '💪 Jock',
  'cub': '🧸 Cub',
  'chub': '🤗 Chub',
  'geek': '🤓 Geek',
  'leather': '🖤 Leather',
  'drag': '👠 Drag',
};

const ETHNICITY_LABELS: Record<string, string> = {
  'asian': 'Asiatique',
  'black': 'Noir',
  'latino': 'Latino',
  'middle_eastern': 'Moyen-Orient',
  'mixed': 'Métis',
  'south_asian': 'Sud-Asiatique',
  'white': 'Blanc',
  'europeen': 'Européen',
  'africain': 'Africain',
  'maghrebin': 'Maghrébin',
  'asiatique': 'Asiatique',
  'metis': 'Métis',
  'autre': 'Autre',
  'other': 'Autre',
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  'single': 'Célibataire',
  'dating': 'En couple ouvert',
  'partnered': 'En couple',
  'married': 'Marié',
  'open': 'Relation ouverte',
};

const MemberProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast: toastHook } = useToast();
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showChatBot, setShowChatBot] = useState(false);

  const { data: profile, isLoading } = useProfile(userId || '');
  const { photos } = useProfilePhotos(userId || '');
  const { isFavorite, toggleFavorite, isToggling } = useUserFavorites();
  // Premium badge removed from other users' profiles
  const { data: suspensionStatus, isLoading: suspensionLoading } = useUserSuspensionStatus(userId);
  const { data: chatbotConfig } = useChatbotConfig(userId);
  const hasChatBot = chatbotConfig?.is_active === true;
  
  // Credit system for profile views
  const { data: alreadyViewed, isLoading: viewCheckLoading } = useProfileViewCheck(userId || '');
  const recordProfileView = useRecordProfileView();
  const { showInsufficientCreditsDialog } = useCreditCheck();
  const [hasChargedView, setHasChargedView] = useState(false);

  // Subscribe to real-time online status changes for this user
  useRealtimeUserOnlineStatus(userId);
  
  // Check if user is blocked or suspended
  const isUserUnavailable = suspensionStatus?.isBlocked || suspensionStatus?.isSuspended;
  
  // Handle profile view credit deduction
  useEffect(() => {
    const chargeProfileView = async () => {
      // Skip if: no user, viewing own profile, already viewed, already charged this session, or still loading
      if (!user?.id || !userId || user.id === userId || alreadyViewed || hasChargedView || viewCheckLoading) {
        return;
      }

      try {
        // Check if user has enough credits
        const hasCredits = await checkSufficientCredits(user.id, CREDIT_COSTS.profile_view);
        if (!hasCredits) {
          showInsufficientCreditsDialog(CREDIT_COSTS.profile_view, 'Voir un profil');
          return;
        }

        // Deduct credits
        const deductResult = await deductCredits(
          user.id,
          CREDIT_COSTS.profile_view,
          'profile_view',
          `Consultation du profil de ${profile?.username || 'membre'}`
        );

        if (deductResult.success) {
          // Record the view to avoid charging again
          await recordProfileView.mutateAsync(userId);
          setHasChargedView(true);
        }
      } catch (error) {
        console.error('Error charging profile view:', error);
      }
    };

    chargeProfileView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, userId, alreadyViewed, hasChargedView, viewCheckLoading]);

  const extendedProfile = profile as any;
  
  // Handle back navigation with swipe gesture support
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Enable swipe-to-go-back gesture on mobile
  useMobileNavigation({ onBack: handleBack, enabled: true });

  // Build photos array
  const allPhotos = photos.length > 0 
    ? photos.map(p => p.photo_url)
    : profile?.avatar_url 
      ? [profile.avatar_url] 
      : [];

  const getLastSeenText = () => getDetailedLastSeenText(profile);
  const isTrulyOnline = isUserTrulyOnline(profile);

  const handleStartChat = async () => {
    if (!user || !userId) return;

    try {
      // Check if conversation exists
      const { data: existing } = await supabase
        .from('private_conversations')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user.id})`)
        .maybeSingle();

      if (!existing) {
        // Create new conversation
        const { error } = await supabase
          .from('private_conversations')
          .insert({
            user1_id: user.id,
            user2_id: userId,
          });

        if (error) throw error;
      }

      // Navigate to home with state to open the conversation
      navigate('/', { state: { openPrivateChat: userId } });
    } catch (error) {
      console.error('Error starting chat:', error);
      toastHook({
        title: 'Erreur',
        description: 'Impossible de démarrer la conversation',
        variant: 'destructive',
      });
    }
  };

  if (isLoading || suspensionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
        <Skeleton className="w-full aspect-square" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  // Show blocked/suspended user screen
  if (isUserUnavailable) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4"
        >
          <Ban className="w-10 h-10 text-destructive" />
        </motion.div>
        <h2 className="text-xl font-semibold mb-2">Profil indisponible</h2>
        <p className="text-muted-foreground mb-4 text-center max-w-xs">
          Ce compte a été suspendu ou désactivé et n'est plus accessible.
        </p>
        <Button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <User className="w-16 h-16 text-muted-foreground mb-4" />
        </motion.div>
        <h2 className="text-xl font-semibold mb-2">Profil non trouvé</h2>
        <p className="text-muted-foreground mb-4">Ce profil n'existe pas ou a été supprimé.</p>
        <Button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </div>
    );
  }

  // Check if there's any detailed info to show
  const hasDetailedInfo = extendedProfile?.height || extendedProfile?.weight || 
    extendedProfile?.body_type || extendedProfile?.ethnicity || 
    extendedProfile?.relationship_status;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header - floating style */}
      <div className="fixed top-0 left-0 right-0 z-20 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between p-4">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <Button 
              variant="secondary" 
              size="icon" 
              className="rounded-full bg-background/80 backdrop-blur-sm shadow-lg"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </motion.div>
          
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-2"
          >
            {profile.is_verified && (
              <Badge variant="secondary" className="bg-green-500/20 text-green-500 backdrop-blur-sm">
                <Shield className="w-3 h-3 mr-1" />
                Vérifié
              </Badge>
            )}
          </motion.div>
        </div>
      </div>

      {/* Photo Carousel - full width */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative"
      >
        <ProfilePhotoCarousel 
          photos={allPhotos} 
          username={profile.username}
          className="aspect-[3/4] max-h-[70vh]"
        />
        
        {/* Gradient overlay at bottom for text readability */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
        
        {/* Online status overlay */}
        {isTrulyOnline && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-20 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/90 text-white text-xs font-medium shadow-lg"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            En ligne
          </motion.div>
        )}

        {/* Position badge - bottom left */}
        {extendedProfile?.sexual_position && POSITION_LABELS[extendedProfile.sexual_position] && extendedProfile.sexual_position !== 'no_answer' && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="absolute bottom-24 left-4 flex flex-col gap-1"
          >
            <Badge variant="secondary" className="bg-primary/90 text-primary-foreground border-0 text-sm px-3 py-1 shadow-lg">
              {POSITION_LABELS[extendedProfile.sexual_position]}
              {extendedProfile.position_detail && POSITION_DETAIL_LABELS[extendedProfile.position_detail] && (
                <span className="ml-1 opacity-80">({POSITION_DETAIL_LABELS[extendedProfile.position_detail]})</span>
              )}
            </Badge>
          </motion.div>
        )}

        {/* Name overlay at bottom of image */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="absolute bottom-4 left-4 right-4"
        >
          <div className="flex items-baseline gap-2 mb-1">
            <h2 className="font-display text-3xl font-bold text-foreground drop-shadow-lg">
              {profile.username}
            </h2>
            {extendedProfile?.age && (
              <span className="text-2xl font-medium text-foreground/80">
                {extendedProfile.age}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span>{profile.region}</span>
            <span className="text-muted-foreground/50">•</span>
            <span className={isTrulyOnline ? 'text-green-500' : ''}>
              {getLastSeenText()}
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Profile Content */}
      <div className="px-4 pt-4 space-y-5">
        {/* Profile Reactions */}
        {userId && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <ProfileReactions profileUserId={userId} />
          </motion.div>
        )}

        {/* Quick info pills */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex flex-wrap gap-2"
        >
          {extendedProfile?.height && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/80 text-sm font-medium">
              <Ruler className="w-4 h-4 text-primary" />
              <span>{extendedProfile.height} cm</span>
            </div>
          )}
          
          {extendedProfile?.weight && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/80 text-sm font-medium">
              <Weight className="w-4 h-4 text-primary" />
              <span>{extendedProfile.weight} kg</span>
            </div>
          )}
          
          {extendedProfile?.body_type && BODY_TYPE_LABELS[extendedProfile.body_type] && (
            <div className="px-3 py-2 rounded-xl bg-secondary/80 text-sm font-medium">
              {BODY_TYPE_LABELS[extendedProfile.body_type]}
            </div>
          )}

          {extendedProfile?.endowment && extendedProfile.endowment !== 'no_answer' && ENDOWMENT_LABELS[extendedProfile.endowment] && (
            <div className="px-3 py-2 rounded-xl bg-secondary/80 text-sm font-medium">
              🍆 {ENDOWMENT_LABELS[extendedProfile.endowment]}
            </div>
          )}

          {extendedProfile?.ethnicity && ETHNICITY_LABELS[extendedProfile.ethnicity] && (
            <div className="px-3 py-2 rounded-xl bg-secondary/80 text-sm font-medium">
              {ETHNICITY_LABELS[extendedProfile.ethnicity]}
            </div>
          )}

          {extendedProfile?.relationship_status && RELATIONSHIP_LABELS[extendedProfile.relationship_status] && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/80 text-sm font-medium">
              <Heart className="w-4 h-4 text-pink-500" />
              <span>{RELATIONSHIP_LABELS[extendedProfile.relationship_status]}</span>
            </div>
          )}

          {extendedProfile?.hiv_status && extendedProfile.hiv_status !== 'no_answer' && HIV_STATUS_LABELS[extendedProfile.hiv_status] && (
            <div className="px-3 py-2 rounded-xl bg-secondary/80 text-sm font-medium">
              {HIV_STATUS_LABELS[extendedProfile.hiv_status]}
            </div>
          )}
        </motion.div>

        {/* Tribes */}
        {extendedProfile?.tribes && extendedProfile.tribes.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Tribus
            </p>
            <div className="flex flex-wrap gap-2">
              {extendedProfile.tribes.map((tribe: string) => (
                <Badge 
                  key={tribe} 
                  variant="outline" 
                  className="text-sm py-1.5 px-3 bg-secondary/50"
                >
                  {TRIBE_LABELS[tribe] || tribe}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}

        {/* Looking for */}
        {extendedProfile?.looking_for && extendedProfile.looking_for.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Heart className="w-3 h-3 text-pink-500" />
              Recherche
            </p>
            <div className="flex flex-wrap gap-2">
              {extendedProfile.looking_for.map((item: string) => (
                <Badge 
                  key={item} 
                  className="bg-primary text-primary-foreground border-0 text-sm py-1.5 px-3 shadow-sm"
                >
                  {LOOKING_FOR_LABELS[item] || item}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}

        {/* Bio */}
        {profile.bio && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3 h-3" />
              À propos
            </p>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-secondary/80 to-secondary/40 border border-border/50">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {profile.bio}
              </p>
            </div>
          </motion.div>
        )}

        {/* Member since */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="flex items-center gap-2 text-sm text-muted-foreground pt-4"
        >
          <Calendar className="w-4 h-4" />
          <span>
            Membre depuis {new Date(profile.created_at).toLocaleDateString('fr-FR', {
              month: 'long',
              year: 'numeric'
            })}
          </span>
        </motion.div>
      </div>

      {/* Fixed bottom actions - glass effect */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-background/80 backdrop-blur-xl border-t border-border/50"
      >
        <div className="flex gap-2 max-w-lg mx-auto">
          <Button
            variant="outline"
            size="icon"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0 rounded-xl h-12 w-12"
            onClick={() => setShowReportDialog(true)}
          >
            <Flag className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "flex-shrink-0 transition-all rounded-xl h-12 w-12",
              isFavorite(userId || '') && "bg-amber-500/20 border-amber-500 text-amber-500 hover:bg-amber-500/30 hover:text-amber-600 scale-110"
            )}
            onClick={() => userId && toggleFavorite(userId)}
            disabled={isToggling}
          >
            {isToggling ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Star className={cn("w-5 h-5", isFavorite(userId || '') && "fill-current")} />
            )}
          </Button>
          {hasChatBot && (
            <Button
              variant="outline"
              size="icon"
              className="flex-shrink-0 rounded-xl h-12 w-12 text-blue-500 border-blue-500/30 hover:bg-blue-500/10"
              onClick={() => setShowChatBot(true)}
            >
              <Bot className="w-5 h-5" />
            </Button>
          )}
          <Button
            className="flex-1 h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-base font-semibold rounded-xl shadow-lg shadow-primary/30"
            onClick={handleStartChat}
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Message
          </Button>
        </div>
      </motion.div>

      {/* Report Dialog */}
      <ReportUserDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        userId={userId || ''}
        username={profile.username}
      />

      {/* ChatBot Dialog */}
      {userId && (
        <ChatBotDialog
          profileUserId={userId}
          profileUsername={profile.username}
          open={showChatBot}
          onOpenChange={setShowChatBot}
        />
      )}
    </div>
  );
};

export default MemberProfile;