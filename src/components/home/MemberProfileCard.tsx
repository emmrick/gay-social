import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, MessageCircle, Eye, MapPin, User, Ruler, Weight, Heart, Star,
  ChevronLeft, ChevronRight, Sparkles, FolderLock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfiles';
import { useProfilePhotos } from '@/hooks/useProfilePhotos';
import { Skeleton } from '@/components/ui/skeleton';
import { useLivePresence } from '@/hooks/useLivePresence';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';
import { useUserFavorites } from '@/hooks/useUserFavorites';
import ProfileReactions from '@/components/profile/ProfileReactions';
import AlbumPreviewBlocks from '@/components/albums/AlbumPreviewBlocks';
import { cn } from '@/lib/utils';

interface MemberProfileCardProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onStartChat: () => void;
  onViewProfile: () => void;
}

const POSITION_LABELS: Record<string, string> = {
  'actif': '🔝 Actif',
  'passif': '🔽 Passif',
  'versatile': '↕️ Versatile',
  'vers_top': '↕️🔝 Vers. Top',
  'vers_bottom': '↕️🔽 Vers. Bottom',
  'side': '🤝 Side',
};

const BODY_TYPE_LABELS: Record<string, string> = {
  'mince': 'Mince', 'moyen': 'Moyen', 'muscle': 'Musclé',
  'costaud': 'Costaud', 'gros': 'Gros', 'sportif': 'Sportif',
};

const LOOKING_FOR_LABELS: Record<string, string> = {
  'plan_cul': 'Plan cul', 'plan_regulier': 'Plan régulier', 'relation': 'Relation',
  'amitie': 'Amitié', 'discussion': 'Discussion', 'webcam': 'Webcam', 'groupe': 'Plan à plusieurs',
};

const TRIBE_LABELS: Record<string, string> = {
  'bear': '🐻 Bear', 'twink': '✨ Twink', 'otter': '🦦 Otter', 'daddy': '👔 Daddy',
  'jock': '💪 Jock', 'cub': '🧸 Cub', 'chub': '🤗 Chub', 'geek': '🤓 Geek',
  'leather': '🖤 Leather', 'drag': '👠 Drag',
};

const MemberProfileCard = ({
  userId,
  isOpen,
  onClose,
  onStartChat,
}: MemberProfileCardProps) => {
  const navigate = useNavigate();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const { data: profile, isLoading } = useProfile(userId);
  const { photos: userPhotos } = useProfilePhotos(userId);
  const { isFavorite, toggleFavorite, isToggling } = useUserFavorites();

  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  const extendedProfile = profile as any;

  const allPhotos = userPhotos.length > 0
    ? userPhotos.map(p => p.photo_url)
    : profile?.avatar_url
      ? [profile.avatar_url]
      : [];

  const currentPhotoUrl = useAvatarUrl(allPhotos[currentPhotoIndex] || null);

  const goToPrevPhoto = () =>
    setCurrentPhotoIndex(prev => prev > 0 ? prev - 1 : allPhotos.length - 1);
  const goToNextPhoto = () =>
    setCurrentPhotoIndex(prev => prev < allPhotos.length - 1 ? prev + 1 : 0);

  const live = useLivePresence(profile);
  const isOnline = live.showIndicator;
  const lastSeenText = live.detailedLastSeenText;
  const favorited = profile ? isFavorite(profile.user_id) : false;

  const handleToggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (profile) toggleFavorite(profile.user_id);
  };

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-md"
          />

          {/* Sheet */}
          <motion.div
            initial={{ opacity: 0, y: 80, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 80, scale: 0.97 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 z-[100] w-full max-w-xl mx-auto h-[90dvh] sm:h-auto sm:max-h-[90dvh] sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2"
          >
            <div className="bg-card rounded-t-3xl sm:rounded-3xl border border-border/60 shadow-2xl overflow-hidden h-full flex flex-col">

              {/* HERO — pleine largeur, immersif */}
              <div className="relative h-[52vh] sm:h-[420px] shrink-0 bg-muted">
                {isLoading ? (
                  <Skeleton className="w-full h-full" />
                ) : allPhotos.length > 0 && currentPhotoUrl ? (
                  <img
                    src={currentPhotoUrl}
                    alt={profile?.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-accent/30">
                    <span className="text-7xl font-display font-bold text-foreground/30">
                      {profile?.username?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}

                {/* Dégradé éditorial bas */}
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-card via-card/80 to-transparent pointer-events-none" />
                {/* Dégradé top léger pour lisibilité boutons */}
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

                {/* Top bar — close + favori */}
                <div className="absolute top-3 inset-x-3 flex items-center justify-between z-20">
                  <button
                    onClick={onClose}
                    className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                    aria-label="Fermer"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleToggleFav}
                    disabled={isToggling}
                    className={cn(
                      "w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all",
                      favorited
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/40 scale-105"
                        : "bg-black/40 text-white hover:bg-black/60"
                    )}
                    aria-label={favorited ? "Retirer des favoris" : "Ajouter aux favoris"}
                  >
                    <Star className={cn("w-4 h-4", favorited && "fill-current")} />
                  </button>
                </div>

                {/* Carrousel — flèches + dots */}
                {allPhotos.length > 1 && (
                  <>
                    <button
                      onClick={goToPrevPhoto}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors z-10"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={goToNextPhoto}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors z-10"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                      {allPhotos.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentPhotoIndex(idx)}
                          className={cn(
                            "h-1 rounded-full transition-all",
                            idx === currentPhotoIndex ? "w-6 bg-white" : "w-3 bg-white/50"
                          )}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Online pill */}
                {isOnline && (
                  <div className="absolute bottom-32 left-5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(142_76%_36%)] text-white text-[11px] font-semibold uppercase tracking-wider shadow-lg z-10">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    En ligne
                  </div>
                )}

                {/* Headline éditoriale collée au bas du hero */}
                {profile && (
                  <div className="absolute bottom-0 inset-x-0 px-6 pb-5 z-10">
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-display text-4xl sm:text-5xl font-black tracking-tight text-foreground leading-none truncate">
                          {profile.username}
                        </h2>
                        <div className="mt-2 flex items-center gap-2 text-sm text-foreground/70 font-medium">
                          {extendedProfile?.age && (
                            <>
                              <span>{extendedProfile.age} ans</span>
                              <span className="text-foreground/30">·</span>
                            </>
                          )}
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate">{profile.region}</span>
                        </div>
                      </div>
                      {extendedProfile?.sexual_position && POSITION_LABELS[extendedProfile.sexual_position] && (
                        <Badge
                          variant="secondary"
                          className="shrink-0 bg-primary/15 text-primary border border-primary/30 font-semibold"
                        >
                          {POSITION_LABELS[extendedProfile.sexual_position]}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* CONTENU SCROLLABLE */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="px-6 py-5 space-y-6">
                  {isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : profile ? (
                    <>
                      {/* Last seen */}
                      {!isOnline && lastSeenText && (
                        <p className="text-xs text-muted-foreground -mt-2">{lastSeenText}</p>
                      )}

                      {/* Bio — typographie magazine */}
                      {profile.bio && (
                        <blockquote className="relative pl-4 border-l-2 border-primary/60">
                          <p className="font-display text-lg leading-snug text-foreground italic">
                            « {profile.bio} »
                          </p>
                        </blockquote>
                      )}

                      {/* Réactions */}
                      <section>
                        <SectionLabel icon={<Sparkles className="w-3 h-3" />}>
                          Réagir
                        </SectionLabel>
                        <ProfileReactions profileUserId={profile.user_id} />
                      </section>

                      {/* Mensurations — grille éditoriale */}
                      {(extendedProfile?.height || extendedProfile?.weight || extendedProfile?.body_type) && (
                        <section>
                          <SectionLabel>Physique</SectionLabel>
                          <div className="grid grid-cols-3 gap-2">
                            {extendedProfile?.height && (
                              <StatBlock icon={<Ruler className="w-3.5 h-3.5" />} label="Taille" value={`${extendedProfile.height} cm`} />
                            )}
                            {extendedProfile?.weight && (
                              <StatBlock icon={<Weight className="w-3.5 h-3.5" />} label="Poids" value={`${extendedProfile.weight} kg`} />
                            )}
                            {extendedProfile?.body_type && BODY_TYPE_LABELS[extendedProfile.body_type] && (
                              <StatBlock icon={<User className="w-3.5 h-3.5" />} label="Corps" value={BODY_TYPE_LABELS[extendedProfile.body_type]} />
                            )}
                          </div>
                        </section>
                      )}

                      {/* Recherche */}
                      {extendedProfile?.looking_for && extendedProfile.looking_for.length > 0 && (
                        <section>
                          <SectionLabel icon={<Heart className="w-3 h-3" />}>Recherche</SectionLabel>
                          <div className="flex flex-wrap gap-1.5">
                            {extendedProfile.looking_for.map((item: string) => (
                              <Badge
                                key={item}
                                className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 font-medium"
                              >
                                {LOOKING_FOR_LABELS[item] || item}
                              </Badge>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* Tribus */}
                      {extendedProfile?.tribes && extendedProfile.tribes.length > 0 && (
                        <section>
                          <SectionLabel>Tribus</SectionLabel>
                          <div className="flex flex-wrap gap-1.5">
                            {extendedProfile.tribes.map((tribe: string) => (
                              <Badge key={tribe} variant="outline" className="font-medium">
                                {TRIBE_LABELS[tribe] || tribe}
                              </Badge>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* Albums (avec demande d'accès gérée par viewer interne via redirection profil) */}
                      <section>
                        <SectionLabel icon={<FolderLock className="w-3 h-3" />}>Albums</SectionLabel>
                        <AlbumPreviewBlocks
                          userId={profile.user_id}
                          onAlbumClick={() => {
                            onClose();
                            navigate(`/profile/${profile.user_id}`);
                          }}
                        />
                      </section>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <User className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-muted-foreground">Profil non trouvé</p>
                    </div>
                  )}
                </div>
              </div>

              {/* FOOTER ACTIONS — sticky */}
              {profile && !isLoading && (
                <div className="shrink-0 border-t border-border/60 bg-card/95 backdrop-blur-md px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] flex gap-2">
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 font-semibold"
                    onClick={() => {
                      onClose();
                      navigate(`/profile/${userId}`);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Profil
                  </Button>
                  <Button
                    size="lg"
                    className="flex-[2] bg-gradient-to-r from-primary to-accent hover:opacity-95 font-semibold shadow-lg shadow-primary/30"
                    onClick={onStartChat}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Envoyer un message
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (!portalTarget) return null;
  return createPortal(modal, portalTarget);
};

/* ---------- petits sous-composants éditoriaux ---------- */

const SectionLabel = ({
  children,
  icon,
}: { children: React.ReactNode; icon?: React.ReactNode }) => (
  <div className="flex items-center gap-1.5 mb-2.5 text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground">
    {icon}
    <span>{children}</span>
    <span className="flex-1 h-px bg-border/60 ml-1" />
  </div>
);

const StatBlock = ({
  icon,
  label,
  value,
}: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-xl bg-secondary/60 border border-border/40 p-2.5 text-center">
    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
      {icon}
      <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
    </div>
    <p className="font-display text-base font-bold text-foreground leading-tight">{value}</p>
  </div>
);

export default MemberProfileCard;
