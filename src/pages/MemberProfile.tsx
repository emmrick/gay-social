import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MessageCircle, Flag, MapPin, Ruler, Weight, Heart, Calendar, User, Shield, Star, Loader2, Ban, Sparkles, Info, Bot, Cake } from 'lucide-react';
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
import { useUserSuspensionStatus } from '@/hooks/useUserSuspensionStatus';
import { motion } from 'framer-motion';
import { useProfileViewCheck, useRecordProfileView, CREDIT_COSTS, deductCredits, checkSufficientCredits, getDynamicCreditCost } from '@/hooks/useCredits';
import { useCreditCheck } from '@/hooks/useCreditCheck';
import { toast } from 'sonner';
import { useRecordProfileVisit } from '@/hooks/useProfileVisits';
import { useChatbotConfig } from '@/hooks/useChatbotConfig';
import ChatBotDialog from '@/components/chatbot/ChatBotDialog';
import { getZodiacSign, isBirthdayToday, formatBirthday } from '@/lib/zodiac';
import BirthdayGiftButton from '@/components/profile/BirthdayGiftButton';
import MemberProfileAlbumsSection from '@/components/albums/MemberProfileAlbumsSection';
import AlbumPreviewBlocks from '@/components/albums/AlbumPreviewBlocks';
import { useAlbums } from '@/hooks/useAlbums';
import type { AlbumSlide } from '@/components/chat/ProfilePhotoCarousel';

const POSITION_LABELS: Record<string, string> = {
  'actif': '🔝 Actif (Top)', 'passif': '🔽 Passif (Bottom)', 'versatile': '↕️ Versatile',
  'vers_top': '↕️🔝 Versatile Top', 'vers_bottom': '↕️🔽 Versatile Bottom',
  'side': '🤝 Side', 'no_answer': 'Non précisé',
};
const POSITION_DETAIL_LABELS: Record<string, string> = {
  'strict': 'Strict', 'flexible': 'Flexible', 'depends': 'Selon l\'affinité',
};
const ENDOWMENT_LABELS: Record<string, string> = {
  'small': 'Petit', 'average': 'Moyen', 'large': 'Grand', 'xl': 'XL', 'no_answer': 'Non précisé',
};
const HIV_STATUS_LABELS: Record<string, string> = {
  'negative': '🟢 Négatif', 'negative_prep': '💊 Négatif sous PrEP',
  'positive_undetectable': '🔵 Positif indétectable', 'positive': '🟣 Positif', 'no_answer': 'Non précisé',
};
const BODY_TYPE_LABELS: Record<string, string> = {
  'mince': 'Mince', 'moyen': 'Moyen', 'muscle': 'Musclé', 'costaud': 'Costaud', 'gros': 'Gros', 'sportif': 'Sportif',
};
const LOOKING_FOR_LABELS: Record<string, string> = {
  'plan_cul': '🔥 Plan cul', 'plan_regulier': '🔄 Plan régulier', 'relation': '❤️ Relation',
  'amitie': '🤝 Amitié', 'discussion': '💬 Discussion', 'webcam': '📹 Webcam', 'groupe': '👥 Plan à plusieurs',
};
const TRIBE_LABELS: Record<string, string> = {
  'bear': '🐻 Bear', 'twink': '✨ Twink', 'otter': '🦦 Otter', 'daddy': '👔 Daddy',
  'jock': '💪 Jock', 'cub': '🧸 Cub', 'chub': '🤗 Chub', 'geek': '🤓 Geek',
  'leather': '🖤 Leather', 'drag': '👠 Drag',
};
const ETHNICITY_LABELS: Record<string, string> = {
  'asian': 'Asiatique', 'black': 'Noir', 'latino': 'Latino', 'middle_eastern': 'Moyen-Orient',
  'mixed': 'Métis', 'south_asian': 'Sud-Asiatique', 'white': 'Blanc',
  'europeen': 'Européen', 'africain': 'Africain', 'maghrebin': 'Maghrébin',
  'asiatique': 'Asiatique', 'metis': 'Métis', 'autre': 'Autre', 'other': 'Autre',
};
const RELATIONSHIP_LABELS: Record<string, string> = {
  'single': 'Célibataire', 'dating': 'En couple ouvert', 'partnered': 'En couple',
  'married': 'Marié', 'open': 'Relation ouverte',
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
  const { data: suspensionStatus, isLoading: suspensionLoading } = useUserSuspensionStatus(userId);
  const { data: chatbotConfig } = useChatbotConfig(userId);
  const hasChatBot = chatbotConfig?.is_active === true;

  const { albums: userAlbums, useAlbumMedia } = useAlbums(userId || undefined);
  
  const { data: alreadyViewed, isLoading: viewCheckLoading } = useProfileViewCheck(userId || '');
  const recordProfileView = useRecordProfileView();
  const recordVisit = useRecordProfileVisit();
  const { showInsufficientCreditsDialog } = useCreditCheck();
  const [hasChargedView, setHasChargedView] = useState(false);

  useRealtimeUserOnlineStatus(userId);
  
  const isUserUnavailable = suspensionStatus?.isBlocked || suspensionStatus?.isSuspended;
  
  useEffect(() => {
    const chargeProfileView = async () => {
      if (!user?.id || !userId || user.id === userId || alreadyViewed || hasChargedView || viewCheckLoading) return;
      try {
        const dynamicCost = await getDynamicCreditCost('profile_view');
        if (dynamicCost <= 0) {
          await recordProfileView.mutateAsync(userId);
          await recordVisit.mutateAsync(userId);
          setHasChargedView(true);
          return;
        }
        const hasCredits = await checkSufficientCredits(user.id, dynamicCost);
        if (!hasCredits) {
          showInsufficientCreditsDialog(dynamicCost, 'Voir un profil');
          return;
        }
        const deductResult = await deductCredits(user.id, dynamicCost, 'profile_view', `Consultation du profil de ${profile?.username || 'membre'}`);
        if (deductResult.success) {
          await recordProfileView.mutateAsync(userId);
          await recordVisit.mutateAsync(userId);
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
  
  const handleBack = useCallback(() => {
    navigate('/', { replace: true });
  }, [navigate]);

  useMobileNavigation({ onBack: handleBack, enabled: true, enableSwipeBack: true });

  const allPhotos = photos.length > 0 
    ? photos.map(p => p.photo_url)
    : profile?.avatar_url ? [profile.avatar_url] : [];

  const isOtherUser = user?.id && userId && user.id !== userId;
  const { data: albumCovers = [] } = useQuery({
    queryKey: ['album-covers', userId],
    queryFn: async () => {
      if (!userId) return [];
      const albumIds = userAlbums.map(a => a.id);
      if (albumIds.length === 0) return [];
      const { data } = await supabase
        .from('album_media')
        .select('album_id, media_url')
        .in('album_id', albumIds)
        .order('created_at', { ascending: true });
      return data || [];
    },
    enabled: !!isOtherUser && userAlbums.length > 0,
  });

  const albumSlides: AlbumSlide[] = isOtherUser ? userAlbums.map(album => {
    const cover = albumCovers.find(m => m.album_id === album.id);
    const count = albumCovers.filter(m => m.album_id === album.id).length;
    return { id: album.id, name: album.name, is_private: album.is_private, coverUrl: cover?.media_url, mediaCount: count };
  }) : [];

  const getLastSeenText = () => getDetailedLastSeenText(profile);
  const isTrulyOnline = isUserTrulyOnline(profile);

  const handleStartChat = async () => {
    if (!user || !userId) return;
    try {
      const { data: existing } = await supabase
        .from('private_conversations')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user.id})`)
        .maybeSingle();
      if (!existing) {
        const { error } = await supabase.from('private_conversations').insert({ user1_id: user.id, user2_id: userId });
        if (error) throw error;
      }
      navigate(`/messages/${userId}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      toastHook({ title: 'Erreur', description: 'Impossible de démarrer la conversation', variant: 'destructive' });
    }
  };

  if (isLoading || suspensionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/30 p-4">
          <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full">
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

  if (isUserUnavailable) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <Ban className="w-10 h-10 text-destructive" />
        </motion.div>
        <h2 className="text-xl font-display font-semibold mb-2">Profil indisponible</h2>
        <p className="text-muted-foreground mb-4 text-center max-w-xs">Ce compte a été suspendu ou désactivé.</p>
        <Button onClick={handleBack} className="rounded-xl"><ArrowLeft className="w-4 h-4 mr-2" />Retour</Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <User className="w-16 h-16 text-muted-foreground mb-4" />
        </motion.div>
        <h2 className="text-xl font-display font-semibold mb-2">Profil non trouvé</h2>
        <p className="text-muted-foreground mb-4">Ce profil n'existe pas ou a été supprimé.</p>
        <Button onClick={handleBack} className="rounded-xl"><ArrowLeft className="w-4 h-4 mr-2" />Retour</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Floating header */}
      <div className="fixed top-0 left-0 right-0 z-20 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between p-4">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <Button variant="secondary" size="icon"
              className="rounded-full bg-card/70 backdrop-blur-xl shadow-lg border border-border/30 hover:bg-card"
              onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </motion.div>
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-center gap-2">
            {profile.is_verified && (
              <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-500 backdrop-blur-xl border border-emerald-500/20">
                <Shield className="w-3 h-3 mr-1" />
                Vérifié
              </Badge>
            )}
          </motion.div>
        </div>
      </div>

      {/* Photo Carousel */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
        <ProfilePhotoCarousel 
          photos={allPhotos} username={profile.username}
          className="aspect-[3/4] max-h-[70vh]"
          albumSlides={albumSlides}
          onAlbumClick={() => {
            document.getElementById('albums-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-background via-background/85 to-transparent pointer-events-none" />
        
        {isTrulyOnline && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="absolute top-20 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/85 backdrop-blur-sm text-white text-xs font-medium shadow-lg border border-emerald-400/20">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            En ligne
          </motion.div>
        )}

        {extendedProfile?.sexual_position && POSITION_LABELS[extendedProfile.sexual_position] && extendedProfile.sexual_position !== 'no_answer' && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="absolute bottom-28 left-4">
            <Badge className="bg-primary/85 backdrop-blur-sm text-primary-foreground border-0 text-sm px-3 py-1.5 shadow-lg">
              {POSITION_LABELS[extendedProfile.sexual_position]}
              {extendedProfile.position_detail && POSITION_DETAIL_LABELS[extendedProfile.position_detail] && (
                <span className="ml-1 opacity-80">({POSITION_DETAIL_LABELS[extendedProfile.position_detail]})</span>
              )}
            </Badge>
          </motion.div>
        )}

        {/* Name overlay */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="absolute bottom-4 left-4 right-4">
          <div className="flex items-baseline gap-2 mb-1">
            <h2 className="font-display text-3xl font-bold text-foreground drop-shadow-lg">{profile.username}</h2>
            {extendedProfile?.age && (
              <span className="text-2xl font-medium text-foreground/80">{extendedProfile.age}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 text-primary/60" />
            <span>{profile.region}</span>
            {extendedProfile?.birth_date && (() => {
              const zodiac = getZodiacSign(extendedProfile.birth_date);
              return zodiac ? (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span title={zodiac.label}>{zodiac.emoji} {zodiac.label}</span>
                </>
              ) : null;
            })()}
            {extendedProfile?.birth_date && extendedProfile?.show_birthday && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <Cake className="w-3.5 h-3.5 text-pink-500/60" />
                <span>{formatBirthday(extendedProfile.birth_date)}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
            <span className={isTrulyOnline ? 'text-emerald-500' : ''}>{getLastSeenText()}</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Content */}
      <div className="px-4 pt-4 space-y-4">
        {/* Birthday */}
        {extendedProfile?.birth_date && extendedProfile?.show_birthday && isBirthdayToday(extendedProfile.birth_date) && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-500/15 via-rose-500/15 to-amber-500/15 border border-pink-500/20 backdrop-blur-sm p-4 text-center">
            <div className="absolute inset-0 flex items-center justify-around opacity-20 text-4xl pointer-events-none">
              <span className="animate-bounce" style={{ animationDelay: '0s' }}>🎂</span>
              <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>🎉</span>
              <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>🎈</span>
              <span className="animate-bounce" style={{ animationDelay: '0.6s' }}>🎁</span>
            </div>
            <div className="relative">
              <p className="text-lg font-display font-bold">🎂 C'est son anniversaire ! 🎉</p>
              <p className="text-sm text-muted-foreground mt-1">Souhaite-lui un joyeux anniversaire</p>
              <div className="mt-3 flex justify-center">
                <BirthdayGiftButton recipientId={userId!} recipientUsername={profile.username} />
              </div>
            </div>
          </motion.div>
        )}

        {/* Reactions */}
        {userId && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <ProfileReactions profileUserId={userId} />
          </motion.div>
        )}

        {/* Quick info pills */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
          className="flex flex-wrap gap-2">
          {extendedProfile?.height && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card/70 backdrop-blur-sm border border-border/30 text-sm font-medium">
              <Ruler className="w-4 h-4 text-primary/70" />
              <span>{extendedProfile.height} cm</span>
            </div>
          )}
          {extendedProfile?.weight && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card/70 backdrop-blur-sm border border-border/30 text-sm font-medium">
              <Weight className="w-4 h-4 text-primary/70" />
              <span>{extendedProfile.weight} kg</span>
            </div>
          )}
          {extendedProfile?.body_type && BODY_TYPE_LABELS[extendedProfile.body_type] && (
            <div className="px-3 py-2 rounded-xl bg-card/70 backdrop-blur-sm border border-border/30 text-sm font-medium">
              {BODY_TYPE_LABELS[extendedProfile.body_type]}
            </div>
          )}
          {extendedProfile?.endowment && extendedProfile.endowment !== 'no_answer' && ENDOWMENT_LABELS[extendedProfile.endowment] && (
            <div className="px-3 py-2 rounded-xl bg-card/70 backdrop-blur-sm border border-border/30 text-sm font-medium">
              🍆 {ENDOWMENT_LABELS[extendedProfile.endowment]}
            </div>
          )}
          {extendedProfile?.ethnicity && ETHNICITY_LABELS[extendedProfile.ethnicity] && (
            <div className="px-3 py-2 rounded-xl bg-card/70 backdrop-blur-sm border border-border/30 text-sm font-medium">
              {ETHNICITY_LABELS[extendedProfile.ethnicity]}
            </div>
          )}
          {extendedProfile?.relationship_status && RELATIONSHIP_LABELS[extendedProfile.relationship_status] && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card/70 backdrop-blur-sm border border-border/30 text-sm font-medium">
              <Heart className="w-4 h-4 text-pink-500/70" />
              <span>{RELATIONSHIP_LABELS[extendedProfile.relationship_status]}</span>
            </div>
          )}
          {extendedProfile?.hiv_status && extendedProfile.hiv_status !== 'no_answer' && HIV_STATUS_LABELS[extendedProfile.hiv_status] && (
            <div className="px-3 py-2 rounded-xl bg-card/70 backdrop-blur-sm border border-border/30 text-sm font-medium">
              {HIV_STATUS_LABELS[extendedProfile.hiv_status]}
            </div>
          )}
        </motion.div>

        {/* Tribes */}
        {extendedProfile?.tribes && extendedProfile.tribes.length > 0 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-accent/60" />
              Tribus
            </p>
            <div className="flex flex-wrap gap-2">
              {extendedProfile.tribes.map((tribe: string) => (
                <Badge key={tribe} variant="outline" className="text-sm py-1.5 px-3 bg-card/50 backdrop-blur-sm border-border/30">
                  {TRIBE_LABELS[tribe] || tribe}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}

        {/* Looking for */}
        {extendedProfile?.looking_for && extendedProfile.looking_for.length > 0 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Heart className="w-3 h-3 text-pink-500/60" />
              Recherche
            </p>
            <div className="flex flex-wrap gap-2">
              {extendedProfile.looking_for.map((item: string) => (
                <Badge key={item} className="bg-primary/90 text-primary-foreground border-0 text-sm py-1.5 px-3 shadow-sm">
                  {LOOKING_FOR_LABELS[item] || item}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}

        {/* Bio */}
        {profile.bio && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3 h-3" />
              À propos
            </p>
            <div className="p-4 rounded-2xl bg-card/70 backdrop-blur-sm border border-border/30">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
            </div>
          </motion.div>
        )}

        {/* Member since */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
          className="flex items-center gap-2 text-sm text-muted-foreground pt-4">
          <Calendar className="w-4 h-4 text-muted-foreground/60" />
          <span>Membre depuis {new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
        </motion.div>
      </div>

      {/* Fixed bottom actions - glassmorphism */}
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-card/70 backdrop-blur-xl border-t border-border/30 shadow-[0_-4px_24px_hsl(var(--primary)/0.05)]">
        <div className="flex gap-2 max-w-lg mx-auto">
          <Button variant="outline" size="icon"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0 rounded-xl h-12 w-12 border-border/40"
            onClick={() => setShowReportDialog(true)}>
            <Flag className="w-5 h-5" />
          </Button>
          <Button variant="outline" size="icon"
            className={cn(
              "flex-shrink-0 transition-all rounded-xl h-12 w-12 border-border/40",
              isFavorite(userId || '') && "bg-amber-500/15 border-amber-500/40 text-amber-500 hover:bg-amber-500/25 scale-110"
            )}
            onClick={() => userId && toggleFavorite(userId)} disabled={isToggling}>
            {isToggling ? <Loader2 className="w-5 h-5 animate-spin" /> : <Star className={cn("w-5 h-5", isFavorite(userId || '') && "fill-current")} />}
          </Button>
          {hasChatBot && (
            <Button variant="outline" size="icon"
              className="flex-shrink-0 rounded-xl h-12 w-12 text-blue-500 border-blue-500/25 hover:bg-blue-500/10"
              onClick={() => setShowChatBot(true)}>
              <Bot className="w-5 h-5" />
            </Button>
          )}
          <Button
            className="flex-1 h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-base font-display font-semibold rounded-xl shadow-[0_4px_16px_hsl(var(--primary)/0.3)]"
            onClick={handleStartChat}>
            <MessageCircle className="w-5 h-5 mr-2" />
            Message
          </Button>
        </div>
      </motion.div>

      <ReportUserDialog open={showReportDialog} onOpenChange={setShowReportDialog} userId={userId || ''} username={profile.username} />
      {userId && <ChatBotDialog profileUserId={userId} profileUsername={profile.username} open={showChatBot} onOpenChange={setShowChatBot} />}
    </div>
  );
};

export default MemberProfile;
