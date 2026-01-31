import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Flag, MapPin, Ruler, Weight, Heart, Calendar, User, Shield, Star, Loader2, Crown, Ban } from 'lucide-react';
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
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useMobileNavigation } from '@/hooks/useMobileNavigation';
import { useIsPremiumUser } from '@/hooks/usePremiumUsers';
import { useUserSuspensionStatus } from '@/hooks/useUserSuspensionStatus';
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

const ETHNICITY_LABELS: Record<string, string> = {
  'asian': 'Asiatique',
  'black': 'Noir',
  'latino': 'Latino',
  'middle_eastern': 'Moyen-Orient',
  'mixed': 'Métis',
  'south_asian': 'Sud-Asiatique',
  'white': 'Blanc',
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
  const { toast } = useToast();
  const [showReportDialog, setShowReportDialog] = useState(false);

  const { data: profile, isLoading } = useProfile(userId || '');
  const { photos } = useProfilePhotos(userId || '');
  const { isFavorite, toggleFavorite, isToggling } = useUserFavorites();
  const { isPremium: isUserPremium } = useIsPremiumUser(userId);
  const { data: suspensionStatus, isLoading: suspensionLoading } = useUserSuspensionStatus(userId);

  // Subscribe to real-time online status changes for this user
  useRealtimeUserOnlineStatus(userId);
  
  // Check if user is blocked or suspended
  const isUserUnavailable = suspensionStatus?.isBlocked || suspensionStatus?.isSuspended;

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
      toast({
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
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <Ban className="w-10 h-10 text-destructive" />
        </div>
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
        <User className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Profil non trouvé</h2>
        <p className="text-muted-foreground mb-4">Ce profil n'existe pas ou a été supprimé.</p>
        <Button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold">{profile.username}</h1>
          <p className={`text-xs ${isTrulyOnline ? 'text-green-500' : 'text-muted-foreground'}`}>
              {getLastSeenText()}
            </p>
          </div>
          {profile.is_verified && (
            <Badge variant="secondary" className="bg-green-500/20 text-green-500">
              <Shield className="w-3 h-3 mr-1" />
              Vérifié
            </Badge>
          )}
        </div>
      </div>

      {/* Photo Carousel */}
      <div className="relative">
        {/* Premium golden frame around carousel */}
        <div className={isUserPremium ? "p-1 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500" : ""}>
          <ProfilePhotoCarousel 
            photos={allPhotos} 
            username={profile.username}
            className="aspect-square"
          />
        </div>
        
        {/* Online status overlay */}
        {isTrulyOnline && (
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/90 text-white text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            En ligne
          </div>
        )}

        {/* Premium badge overlay */}
        {isUserPremium && (
          <div className="absolute top-4 right-4">
            <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 shadow-lg">
              <Crown className="w-3 h-3 mr-1" />
              Premium
            </Badge>
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

      {/* Profile Content */}
      <div className="p-4 space-y-6">
        {/* Name and age */}
        <div>
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
          <p className="text-sm text-muted-foreground">
            {getLastSeenText()}
          </p>
        </div>

        {/* Profile Reactions */}
        {userId && (
          <ProfileReactions profileUserId={userId} />
        )}

        {/* Quick info pills */}
        <div className="flex flex-wrap gap-2">
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

          {extendedProfile?.ethnicity && ETHNICITY_LABELS[extendedProfile.ethnicity] && (
            <div className="px-3 py-1.5 rounded-full bg-secondary text-sm">
              {ETHNICITY_LABELS[extendedProfile.ethnicity]}
            </div>
          )}
        </div>

        {/* Relationship status */}
        {extendedProfile?.relationship_status && RELATIONSHIP_LABELS[extendedProfile.relationship_status] && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Heart className="w-4 h-4" />
            <span>{RELATIONSHIP_LABELS[extendedProfile.relationship_status]}</span>
          </div>
        )}

        {/* Tribes */}
        {extendedProfile?.tribes && extendedProfile.tribes.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
              Tribus
            </p>
            <div className="flex flex-wrap gap-1.5">
              {extendedProfile.tribes.map((tribe: string) => (
                <Badge key={tribe} variant="outline" className="text-sm">
                  {TRIBE_LABELS[tribe] || tribe}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Looking for */}
        {extendedProfile?.looking_for && extendedProfile.looking_for.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide flex items-center gap-1">
              <Heart className="w-3 h-3" />
              Recherche
            </p>
            <div className="flex flex-wrap gap-1.5">
              {extendedProfile.looking_for.map((item: string) => (
                <Badge 
                  key={item} 
                  variant="secondary" 
                  className="bg-primary/10 text-primary border-primary/20 text-sm"
                >
                  {LOOKING_FOR_LABELS[item] || item}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
              À propos
            </p>
            <div className="p-4 rounded-xl bg-secondary/50">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {profile.bio}
              </p>
            </div>
          </div>
        )}

        {/* Member since */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t border-border">
          <Calendar className="w-4 h-4" />
          <span>
            Membre depuis {new Date(profile.created_at).toLocaleDateString('fr-FR', {
              month: 'long',
              year: 'numeric'
            })}
          </span>
        </div>
      </div>

      {/* Fixed bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button
            variant="outline"
            size="icon"
            className="text-destructive hover:text-destructive flex-shrink-0"
            onClick={() => setShowReportDialog(true)}
          >
            <Flag className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "flex-shrink-0 transition-colors",
              isFavorite(userId || '') && "bg-amber-500/20 border-amber-500 text-amber-500 hover:bg-amber-500/30 hover:text-amber-600"
            )}
            onClick={() => userId && toggleFavorite(userId)}
            disabled={isToggling}
          >
            {isToggling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Star className={cn("w-4 h-4", isFavorite(userId || '') && "fill-current")} />
            )}
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            onClick={handleStartChat}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Message
          </Button>
        </div>
      </div>

      {/* Report Dialog */}
      <ReportUserDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        userId={userId || ''}
        username={profile.username}
      />
    </div>
  );
};

export default MemberProfile;
