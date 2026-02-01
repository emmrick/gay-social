import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Eye, MapPin, Calendar, User, Ruler, Weight, Heart, Flame, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfiles';
import { useProfilePhotos } from '@/hooks/useProfilePhotos';
import { Skeleton } from '@/components/ui/skeleton';
import { shouldShowOnlineIndicator, getDetailedLastSeenText } from '@/hooks/useOnlineStatus';

interface MemberProfileCardProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onStartChat: () => void;
  onViewProfile: () => void;
}

// Labels for profile fields
const POSITION_LABELS: Record<string, string> = {
  'actif': '🔝 Actif (Top)',
  'passif': '🔽 Passif (Bottom)',
  'versatile': '↕️ Versatile',
  'vers_top': '↕️🔝 Versatile Top',
  'vers_bottom': '↕️🔽 Versatile Bottom',
  'side': '🤝 Side',
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
  'plan_cul': 'Plan cul',
  'plan_regulier': 'Plan régulier',
  'relation': 'Relation',
  'amitie': 'Amitié',
  'discussion': 'Discussion',
  'webcam': 'Webcam',
  'groupe': 'Plan à plusieurs',
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

const MemberProfileCard = ({ 
  userId, 
  isOpen, 
  onClose, 
  onStartChat, 
  onViewProfile 
}: MemberProfileCardProps) => {
  const navigate = useNavigate();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const { data: profile, isLoading } = useProfile(userId);
  const { photos: userPhotos } = useProfilePhotos(userId);

  // iOS/Safari quirk: a `position: fixed` element inside a transformed ancestor
  // (e.g., page transitions / motion wrappers) can become offset.
  // Rendering in a portal ensures correct viewport anchoring.
  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  const extendedProfile = profile as any;
  
  // Build photos array
  const allPhotos = userPhotos.length > 0 
    ? userPhotos.map(p => p.photo_url)
    : profile?.avatar_url 
      ? [profile.avatar_url] 
      : [];
  
  const goToPrevPhoto = () => {
    setCurrentPhotoIndex(prev => prev > 0 ? prev - 1 : allPhotos.length - 1);
  };
  
  const goToNextPhoto = () => {
    setCurrentPhotoIndex(prev => prev < allPhotos.length - 1 ? prev + 1 : 0);
  };

  const getLastSeenText = () => {
    return getDetailedLastSeenText(profile);
  };
  
  const isOnline = shouldShowOnlineIndicator(profile);

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
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
          />
          
          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[100] w-full max-w-lg mx-auto h-[85dvh] overflow-y-auto sm:h-auto sm:max-h-[85dvh]"
          >
            <div className="bg-card rounded-t-3xl border-t border-x border-border shadow-2xl overflow-hidden safe-area-pb min-h-full">
              {/* Header with photo carousel */}
              <div className="relative h-64 bg-gradient-to-br from-primary/30 to-accent/30">
                {isLoading ? (
                  <Skeleton className="w-full h-full" />
                ) : allPhotos.length > 0 ? (
                  <>
                    <img 
                      src={allPhotos[currentPhotoIndex]} 
                      alt={profile?.username}
                      className="w-full h-full object-cover"
                    />
                    {/* Photo navigation */}
                    {allPhotos.length > 1 && (
                      <>
                        {/* Dots indicator */}
                        <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                          {allPhotos.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setCurrentPhotoIndex(idx)}
                              className={`w-2 h-2 rounded-full transition-all ${
                                idx === currentPhotoIndex 
                                  ? 'bg-white w-4' 
                                  : 'bg-white/50'
                              }`}
                            />
                          ))}
                        </div>
                        {/* Left/Right arrows */}
                        <button 
                          onClick={goToPrevPhoto}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={goToNextPhoto}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-6xl font-bold text-white/50">
                      {profile?.username?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent pointer-events-none" />
                
                {/* Close button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="absolute top-4 right-4 bg-black/30 hover:bg-black/50 text-white rounded-full"
                >
                  <X className="w-5 h-5" />
                </Button>

                {/* Online status */}
                {isOnline && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/90 text-white text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    En ligne
                  </div>
                )}

                {/* Position badge */}
                {extendedProfile?.sexual_position && POSITION_LABELS[extendedProfile.sexual_position] && (
                  <div className="absolute bottom-4 left-4">
                    <Badge variant="secondary" className="bg-black/50 text-white border-0">
                      {POSITION_LABELS[extendedProfile.sexual_position]}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5 -mt-6 relative">
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : profile ? (
                  <>
                    {/* Name and age */}
                    <div className="flex items-baseline gap-2 mb-1">
                      <h2 className="font-display text-2xl font-bold text-foreground">
                        {profile.username}
                      </h2>
                      {extendedProfile?.age && (
                        <span className="text-lg text-muted-foreground">
                          {extendedProfile.age} ans
                        </span>
                      )}
                    </div>

                    {/* Status */}
                    {getLastSeenText() && (
                      <p className="text-sm text-muted-foreground mb-4">
                        {getLastSeenText()}
                      </p>
                    )}

                    {/* Quick info pills */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-sm">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        <span>{profile.region}</span>
                      </div>
                      
                      {extendedProfile?.height && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-sm">
                          <Ruler className="w-3.5 h-3.5 text-primary" />
                          <span>{extendedProfile.height} cm</span>
                        </div>
                      )}
                      
                      {extendedProfile?.weight && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-sm">
                          <Weight className="w-3.5 h-3.5 text-primary" />
                          <span>{extendedProfile.weight} kg</span>
                        </div>
                      )}
                      
                      {extendedProfile?.body_type && BODY_TYPE_LABELS[extendedProfile.body_type] && (
                        <div className="px-3 py-1.5 rounded-full bg-secondary text-sm">
                          {BODY_TYPE_LABELS[extendedProfile.body_type]}
                        </div>
                      )}
                    </div>

                    {/* Tribes */}
                    {extendedProfile?.tribes && extendedProfile.tribes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {extendedProfile.tribes.map((tribe: string) => (
                          <Badge key={tribe} variant="outline" className="text-xs">
                            {TRIBE_LABELS[tribe] || tribe}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Looking for */}
                    {extendedProfile?.looking_for && extendedProfile.looking_for.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          Recherche
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {extendedProfile.looking_for.map((item: string) => (
                            <Badge 
                              key={item} 
                              variant="secondary" 
                              className="bg-primary/10 text-primary border-primary/20 text-xs"
                            >
                              {LOOKING_FOR_LABELS[item] || item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bio */}
                    {profile.bio && (
                      <div className="mb-6 p-4 rounded-xl bg-secondary/50">
                        <p className="text-sm text-foreground leading-relaxed">
                          {profile.bio}
                        </p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          onClose();
                          navigate(`/profile/${userId}`);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Voir le profil
                      </Button>
                      <Button
                        className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                        onClick={onStartChat}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Envoyer un message
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <User className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Profil non trouvé</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (!portalTarget) return null;

  return createPortal(modal, portalTarget);
};

export default MemberProfileCard;
