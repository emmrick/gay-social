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
import { useLivePresence } from '@/hooks/useLivePresence';
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
import MemberTweenSection from '@/components/tween/MemberTweenSection';

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

  const presence = useLivePresence(profile);
  const getLastSeenText = () => presence.detailedLastSeenText;
  const isTrulyOnline = presence.isOnline;

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

  const zodiac = extendedProfile?.birth_date ? getZodiacSign(extendedProfile.birth_date) : null;
  const isBday = extendedProfile?.birth_date && extendedProfile?.show_birthday && isBirthdayToday(extendedProfile.birth_date);

  return (
    <div className="min-h-[100dvh] bg-background pb-32">
      {/* ===== HERO IMMERSIF ===== */}
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
        {/* Carrousel pleine largeur */}
        <div className="relative">
          <ProfilePhotoCarousel
            photos={allPhotos}
            username={profile.username}
            className="aspect-[3/4] sm:aspect-[4/5] max-h-[78vh]"
            albumSlides={albumSlides}
            onAlbumClick={() => {
              document.getElementById('albums-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
          />

          {/* Gradients éditoriaux */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/55 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-background/85 to-transparent pointer-events-none" />

          {/* Top bar flottante */}
          <div className="absolute top-0 inset-x-0 pt-[env(safe-area-inset-top)] z-20">
            <div className="flex items-center justify-between p-4">
              <motion.button
                initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                onClick={handleBack}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10"
                aria-label="Retour"
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>

              <motion.div initial={{ x: 16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-center gap-2">
                {profile.is_verified && (
                  <Badge className="bg-emerald-500/90 text-white backdrop-blur-md border-0 shadow-lg">
                    <Shield className="w-3 h-3 mr-1" />
                    Vérifié
                  </Badge>
                )}
              </motion.div>
            </div>
          </div>

          {/* Online pill */}
          {isTrulyOnline && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="absolute top-20 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(142_76%_36%)] text-white text-[11px] font-bold uppercase tracking-wider shadow-xl z-10"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              En ligne
            </motion.div>
          )}
        </div>

        {/* ===== HEADLINE ÉDITORIALE — chevauche le bas du hero ===== */}
        <motion.div
          initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="relative -mt-24 px-5 z-10"
        >
          {/* Position badge au-dessus du nom */}
          {extendedProfile?.sexual_position && POSITION_LABELS[extendedProfile.sexual_position] && extendedProfile.sexual_position !== 'no_answer' && (
            <Badge className="mb-3 bg-primary text-primary-foreground border-0 shadow-xl shadow-primary/40 px-3 py-1.5 text-xs font-bold">
              {POSITION_LABELS[extendedProfile.sexual_position]}
              {extendedProfile.position_detail && POSITION_DETAIL_LABELS[extendedProfile.position_detail] && (
                <span className="ml-1.5 opacity-80 font-medium">· {POSITION_DETAIL_LABELS[extendedProfile.position_detail]}</span>
              )}
            </Badge>
          )}

          <h1 className="font-display text-5xl sm:text-6xl font-black tracking-tight text-foreground leading-[0.95] break-words">
            {profile.username}
            {extendedProfile?.age && (
              <span className="ml-3 text-3xl font-bold text-muted-foreground align-middle">{extendedProfile.age}</span>
            )}
          </h1>

          {/* Méta-infos en ligne magazine */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              {profile.region}
            </span>
            {zodiac && (
              <>
                <Dot />
                <span title={zodiac.label} className="font-medium">{zodiac.emoji} {zodiac.label}</span>
              </>
            )}
            {extendedProfile?.birth_date && extendedProfile?.show_birthday && (
              <>
                <Dot />
                <span className="inline-flex items-center gap-1 font-medium">
                  <Cake className="w-3.5 h-3.5 text-pink-500" />
                  {formatBirthday(extendedProfile.birth_date)}
                </span>
              </>
            )}
          </div>

          {/* Statut présence */}
          <p className={cn(
            "mt-1.5 text-xs font-semibold uppercase tracking-wider",
            isTrulyOnline ? "text-[hsl(142_76%_36%)]" : "text-muted-foreground/70"
          )}>
            {getLastSeenText()}
          </p>
        </motion.div>
      </motion.section>

      {/* ===== CONTENU SCROLLABLE ===== */}
      <div className="px-5 pt-8 space-y-8 max-w-2xl mx-auto">
        {/* Anniversaire */}
        {isBday && (
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-500/15 via-rose-500/10 to-amber-500/15 border border-pink-500/25 p-5 text-center"
          >
            <div className="absolute inset-0 flex items-center justify-around opacity-15 text-5xl pointer-events-none">
              <span className="animate-bounce" style={{ animationDelay: '0s' }}>🎂</span>
              <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>🎉</span>
              <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>🎈</span>
              <span className="animate-bounce" style={{ animationDelay: '0.6s' }}>🎁</span>
            </div>
            <div className="relative">
              <p className="font-display text-xl font-black">🎂 C'est son anniversaire !</p>
              <p className="text-sm text-muted-foreground mt-1">Souhaite-lui un joyeux anniversaire</p>
              <div className="mt-3 flex justify-center">
                <BirthdayGiftButton recipientId={userId!} recipientUsername={profile.username} />
              </div>
            </div>
          </motion.div>
        )}

        {/* Bio — citation magazine */}
        {profile.bio && (
          <motion.section
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
          >
            <blockquote className="relative pl-5 border-l-2 border-primary">
              <p className="font-display text-xl sm:text-2xl leading-snug text-foreground italic">
                « {profile.bio} »
              </p>
            </blockquote>
          </motion.section>
        )}

        {/* Réactions */}
        {userId && (
          <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <SectionLabel icon={<Sparkles className="w-3 h-3" />}>Réagir</SectionLabel>
            <ProfileReactions profileUserId={userId} />
          </motion.section>
        )}

        {/* Physique — grid éditoriale */}
        {(extendedProfile?.height || extendedProfile?.weight || extendedProfile?.body_type || extendedProfile?.endowment) && (
          <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
            <SectionLabel>Physique</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {extendedProfile?.height && (
                <StatBlock icon={<Ruler className="w-3.5 h-3.5" />} label="Taille" value={`${extendedProfile.height} cm`} />
              )}
              {extendedProfile?.weight && (
                <StatBlock icon={<Weight className="w-3.5 h-3.5" />} label="Poids" value={`${extendedProfile.weight} kg`} />
              )}
              {extendedProfile?.body_type && BODY_TYPE_LABELS[extendedProfile.body_type] && (
                <StatBlock icon={<User className="w-3.5 h-3.5" />} label="Corps" value={BODY_TYPE_LABELS[extendedProfile.body_type]} />
              )}
              {extendedProfile?.endowment && extendedProfile.endowment !== 'no_answer' && ENDOWMENT_LABELS[extendedProfile.endowment] && (
                <StatBlock icon={<span className="text-xs">🍆</span>} label="Membre" value={ENDOWMENT_LABELS[extendedProfile.endowment]} />
              )}
            </div>
          </motion.section>
        )}

        {/* Identité */}
        {(extendedProfile?.ethnicity || extendedProfile?.relationship_status || (extendedProfile?.hiv_status && extendedProfile.hiv_status !== 'no_answer')) && (
          <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <SectionLabel>Identité</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {extendedProfile?.ethnicity && ETHNICITY_LABELS[extendedProfile.ethnicity] && (
                <Pill>{ETHNICITY_LABELS[extendedProfile.ethnicity]}</Pill>
              )}
              {extendedProfile?.relationship_status && RELATIONSHIP_LABELS[extendedProfile.relationship_status] && (
                <Pill icon={<Heart className="w-3.5 h-3.5 text-pink-500" />}>
                  {RELATIONSHIP_LABELS[extendedProfile.relationship_status]}
                </Pill>
              )}
              {extendedProfile?.hiv_status && extendedProfile.hiv_status !== 'no_answer' && HIV_STATUS_LABELS[extendedProfile.hiv_status] && (
                <Pill>{HIV_STATUS_LABELS[extendedProfile.hiv_status]}</Pill>
              )}
            </div>
          </motion.section>
        )}

        {/* Tribus */}
        {extendedProfile?.tribes && extendedProfile.tribes.length > 0 && (
          <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
            <SectionLabel icon={<Sparkles className="w-3 h-3" />}>Tribus</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {extendedProfile.tribes.map((tribe: string) => (
                <Badge key={tribe} variant="outline" className="text-sm py-1.5 px-3 font-medium border-border/50 bg-card/50">
                  {TRIBE_LABELS[tribe] || tribe}
                </Badge>
              ))}
            </div>
          </motion.section>
        )}

        {/* Recherche */}
        {extendedProfile?.looking_for && extendedProfile.looking_for.length > 0 && (
          <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            <SectionLabel icon={<Heart className="w-3 h-3" />}>Recherche</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {extendedProfile.looking_for.map((item: string) => (
                <Badge key={item} className="bg-gradient-to-r from-primary to-accent text-primary-foreground border-0 text-sm py-1.5 px-3 shadow-md font-semibold">
                  {LOOKING_FOR_LABELS[item] || item}
                </Badge>
              ))}
            </div>
          </motion.section>
        )}

        {/* Albums */}
        {userId && (
          <motion.section
            id="albums-section"
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }}
          >
            <MemberProfileAlbumsSection profileUserId={userId} profileUsername={profile.username} onStartChat={handleStartChat} />
          </motion.section>
        )}

        {/* Tweens */}
        {userId && (
          <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
            <MemberTweenSection userId={userId} username={profile.username} />
          </motion.section>
        )}

        {/* Footer édito : Membre depuis */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
          className="pt-2 pb-4 text-center"
        >
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 uppercase tracking-[0.2em] font-bold">
            <Calendar className="w-3 h-3" />
            <span>Membre depuis {new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
          </div>
        </motion.div>
      </div>

      {/* ===== STICKY FOOTER ACTIONS ===== */}
      <motion.div
        initial={{ y: 100 }} animate={{ y: 0 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-30 px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] bg-card/85 backdrop-blur-2xl border-t border-border/50 shadow-[0_-8px_32px_hsl(var(--primary)/0.08)]"
      >
        <div className="flex gap-2 max-w-2xl mx-auto">
          <Button
            variant="outline" size="icon"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0 rounded-full h-12 w-12 border-border/40"
            onClick={() => setShowReportDialog(true)}
            aria-label="Signaler"
          >
            <Flag className="w-5 h-5" />
          </Button>
          <Button
            variant="outline" size="icon"
            className={cn(
              "flex-shrink-0 transition-all rounded-full h-12 w-12 border-border/40",
              isFavorite(userId || '') && "bg-amber-500/15 border-amber-500/50 text-amber-500 hover:bg-amber-500/25"
            )}
            onClick={() => userId && toggleFavorite(userId)}
            disabled={isToggling}
            aria-label="Favori"
          >
            {isToggling
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <Star className={cn("w-5 h-5", isFavorite(userId || '') && "fill-current")} />}
          </Button>
          {hasChatBot && (
            <Button
              variant="outline" size="icon"
              className="flex-shrink-0 rounded-full h-12 w-12 text-blue-500 border-blue-500/30 hover:bg-blue-500/10"
              onClick={() => setShowChatBot(true)}
              aria-label="Chatbot"
            >
              <Bot className="w-5 h-5" />
            </Button>
          )}
          <Button
            className="flex-1 h-12 bg-gradient-to-r from-primary to-accent hover:opacity-95 text-base font-display font-bold rounded-full shadow-lg shadow-primary/30"
            onClick={handleStartChat}
          >
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

/* ---------- Sous-composants éditoriaux ---------- */

const SectionLabel = ({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) => (
  <div className="flex items-center gap-1.5 mb-3 text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
    {icon}
    <span>{children}</span>
    <span className="flex-1 h-px bg-border/60 ml-1" />
  </div>
);

const StatBlock = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-2xl bg-secondary/50 border border-border/40 p-3 text-center">
    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
      {icon}
      <span className="text-[10px] uppercase tracking-wider font-bold">{label}</span>
    </div>
    <p className="font-display text-base font-black text-foreground leading-tight">{value}</p>
  </div>
);

const Pill = ({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) => (
  <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-card border border-border/50 text-sm font-medium">
    {icon}
    <span>{children}</span>
  </div>
);

const Dot = () => <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />;

export default MemberProfile;
