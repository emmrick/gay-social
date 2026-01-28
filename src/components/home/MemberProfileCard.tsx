import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Eye, MapPin, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfile } from '@/hooks/useProfiles';
import { Skeleton } from '@/components/ui/skeleton';

interface MemberProfileCardProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onStartChat: () => void;
  onViewProfile: () => void;
}

const MemberProfileCard = ({ 
  userId, 
  isOpen, 
  onClose, 
  onStartChat, 
  onViewProfile 
}: MemberProfileCardProps) => {
  const { data: profile, isLoading } = useProfile(userId);

  const getLastSeenText = () => {
    if (profile?.is_online) return 'En ligne maintenant';
    if (!profile?.last_seen) return 'Hors ligne';
    
    const diff = Date.now() - new Date(profile.last_seen).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 5) return 'Vu à l\'instant';
    if (minutes < 60) return `Vu il y a ${minutes} min`;
    if (hours < 24) return `Vu il y a ${hours}h`;
    return `Vu il y a ${days}j`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          
          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto"
          >
            <div className="bg-card rounded-t-3xl border-t border-x border-border shadow-2xl overflow-hidden">
              {/* Header with photo */}
              <div className="relative h-48 bg-gradient-to-br from-primary/30 to-accent/30">
                {isLoading ? (
                  <Skeleton className="w-full h-full" />
                ) : profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-6xl font-bold text-white/50">
                      {profile?.username?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                
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
                {profile?.is_online && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/90 text-white text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    En ligne
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
                      {(profile as unknown as { age?: number }).age && (
                        <span className="text-lg text-muted-foreground">
                          {(profile as unknown as { age: number }).age} ans
                        </span>
                      )}
                    </div>

                    {/* Status */}
                    <p className="text-sm text-muted-foreground mb-4">
                      {getLastSeenText()}
                    </p>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span>{profile.region}</span>
                      </div>
                      {(profile as unknown as { age?: number }).age && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span>{(profile as unknown as { age: number }).age} ans</span>
                        </div>
                      )}
                    </div>

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
                        onClick={onViewProfile}
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
};

export default MemberProfileCard;
