import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, Trash2, Globe, MapPin, Lock, Shield, Plus, Users } from 'lucide-react';
import { useStories, StoryGroup, Story } from '@/hooks/useStories';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SecureAvatarImg } from '@/components/ui/secure-avatar';

interface StoryViewerProps {
  group: StoryGroup;
  onClose: () => void;
  onNextGroup: () => void;
  onAddStory?: () => void;
}

const STORY_DURATION = 5;

const VISIBILITY_LABELS: Record<string, { label: string; icon: typeof Globe }> = {
  public: { label: 'Public', icon: Globe },
  regional: { label: 'Régional', icon: MapPin },
  private: { label: 'Favoris', icon: Lock },
};

const StoryViewer = ({ group, onClose, onNextGroup, onAddStory }: StoryViewerProps) => {
  const { user } = useAuth();
  const { viewStory, deleteStory } = useStories();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const currentStory = group.stories[currentIndex];
  const isOwn = currentStory?.user_id === user?.id;

  // Preload next story image
  const nextStory = group.stories[currentIndex + 1];
  useEffect(() => {
    if (nextStory?.media_type === 'image' && nextStory.signedUrl) {
      const img = new Image();
      img.src = nextStory.signedUrl;
    }
  }, [nextStory]);

  // Fetch view count for own stories
  const { data: viewersData } = useQuery({
    queryKey: ['story-viewers', currentStory?.id],
    queryFn: async () => {
      if (!currentStory) return { count: 0, viewers: [] };
      const { data, error } = await supabase
        .from('story_views')
        .select('viewer_user_id, viewed_at, screenshot_detected')
        .eq('story_id', currentStory.id);
      if (error) throw error;
      if (!data || data.length === 0) return { count: 0, viewers: [] };
      const viewerIds = data.map(v => v.viewer_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', viewerIds);
      const viewers = data.map(v => ({
        ...v,
        profile: profiles?.find(p => p.user_id === v.viewer_user_id),
      }));
      return { count: data.length, viewers };
    },
    enabled: !!currentStory && isOwn,
    staleTime: 10000,
  });

  // Mark as viewed
  useEffect(() => {
    if (currentStory && !isOwn && !currentStory.has_viewed) {
      viewStory.mutate(currentStory.id);
    }
  }, [currentStory?.id, isOwn]);

  // Reset image loaded state on index change
  useEffect(() => {
    setImageLoaded(false);
    setProgress(0);
  }, [currentIndex]);

  // Progress timer - only starts when media is loaded
  useEffect(() => {
    if (isPaused || isClosing || showViewers) return;
    if (currentStory?.media_type === 'image' && !imageLoaded) return;

    const interval = 50;
    const step = (interval / (STORY_DURATION * 1000)) * 100;

    progressTimerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentIndex < group.stories.length - 1) {
            setCurrentIndex(i => i + 1);
            return 0;
          } else {
            onNextGroup();
            return 0;
          }
        }
        return prev + step;
      });
    }, interval);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isPaused, isClosing, showViewers, currentIndex, group.stories.length, onNextGroup, imageLoaded, currentStory?.media_type]);

  // Pause/resume video on pause state change
  useEffect(() => {
    if (videoRef.current) {
      if (isPaused || showViewers) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isPaused, showViewers]);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clientX = 'touches' in e ? e.changedTouches[0].clientX : (e as React.MouseEvent).clientX;
    const x = clientX - rect.left;
    const isLeftSide = x < rect.width / 3;

    if (isLeftSide) {
      if (currentIndex > 0) {
        setCurrentIndex(i => i - 1);
      }
    } else {
      if (currentIndex < group.stories.length - 1) {
        setCurrentIndex(i => i + 1);
      } else {
        onNextGroup();
      }
    }
  }, [currentIndex, group.stories.length, onNextGroup]);

  const handlePointerDown = useCallback(() => {
    holdTimerRef.current = setTimeout(() => setIsPaused(true), 200);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsPaused(false);
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 250);
  }, [onClose]);

  const handleDelete = useCallback(async () => {
    if (!currentStory) return;
    await deleteStory.mutateAsync(currentStory.id);
    if (group.stories.length <= 1) {
      handleClose();
    } else if (currentIndex >= group.stories.length - 1) {
      setCurrentIndex(i => Math.max(0, i - 1));
    }
  }, [currentStory, deleteStory, group.stories.length, currentIndex, handleClose]);

  const visInfo = VISIBILITY_LABELS[currentStory?.visibility || 'public'];
  const VisIcon = visInfo.icon;

  if (!currentStory) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isClosing ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[100] bg-black select-none"
      >
        {/* Segmented progress bars */}
        <div className="absolute top-[env(safe-area-inset-top,8px)] left-3 right-3 z-20 flex gap-1 pt-2">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/25">
              <div
                className="h-full bg-white rounded-full"
                style={{
                  width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
                  transition: i === currentIndex ? 'width 50ms linear' : 'none',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-[calc(env(safe-area-inset-top,8px)+16px)] left-0 right-0 pt-4 px-4 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full ring-2 ring-white/30 overflow-hidden bg-muted flex-shrink-0">
                {group.avatar_url ? (
                  <SecureAvatarImg src={group.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-accent">
                    <span className="text-white font-bold text-sm">
                      {group.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-white text-sm block truncate">
                  {isOwn ? 'Ma story' : group.username}
                </span>
                <span className="text-white/50 text-[11px] flex items-center gap-1">
                  <VisIcon className="w-3 h-3 flex-shrink-0" />
                  {visInfo.label} · {formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true, locale: fr })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {isOwn && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowViewers(true); }}
                    className="h-8 px-2.5 rounded-full bg-white/10 backdrop-blur-sm flex items-center gap-1.5 text-white/80 hover:bg-white/20 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">{viewersData?.count || 0}</span>
                  </button>
                  {onAddStory && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onAddStory(); }}
                      className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-white/20 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                    className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-red-400 hover:bg-white/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Media content - full screen cover */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          onClick={handleTap}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {currentStory.media_type === 'image' ? (
            <motion.img
              key={currentStory.id}
              src={currentStory.signedUrl}
              alt="Story"
              loading="eager"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: imageLoaded ? 1 : 0, scale: isPaused ? 1.03 : 1 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full object-cover"
              draggable={false}
              style={{ imageRendering: 'auto' }}
            />
          ) : (
            <motion.video
              key={currentStory.id}
              ref={videoRef}
              src={currentStory.signedUrl}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted={false}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, scale: isPaused ? 1.03 : 1 }}
              transition={{ duration: 0.2 }}
              onCanPlay={() => setImageLoaded(true)}
            />
          )}

          {/* Loading spinner while image loads */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Caption */}
        {currentStory.caption && (
          <div className="absolute bottom-20 left-0 right-0 px-6 z-20 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-lg rounded-2xl px-4 py-3 max-w-sm mx-auto">
              <p className="text-white text-sm text-center leading-relaxed">{currentStory.caption}</p>
            </div>
          </div>
        )}

        {isPaused && (
          <div className="absolute bottom-10 left-0 right-0 text-center z-20 pointer-events-none">
            <span className="text-white/50 text-xs font-medium">⏸ En pause</span>
          </div>
        )}

        <div className="absolute bottom-4 left-0 right-0 text-center z-10 pointer-events-none">
          <p className="text-white/20 text-[10px] flex items-center justify-center gap-1">
            <Shield className="w-2.5 h-2.5" />
            Protégé contre les captures
          </p>
        </div>

        {/* Story counter indicator */}
        <div className="absolute bottom-4 right-4 z-20 pointer-events-none">
          <span className="text-white/30 text-[10px] font-medium">
            {currentIndex + 1}/{group.stories.length}
          </span>
        </div>

        {/* Viewers Sheet (own stories) */}
        <Sheet open={showViewers} onOpenChange={setShowViewers}>
          <SheetContent side="bottom" className="z-[110] max-h-[60vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {viewersData?.count || 0} vue{(viewersData?.count || 0) > 1 ? 's' : ''}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3 overflow-y-auto max-h-[40vh]">
              {viewersData?.viewers && viewersData.viewers.length > 0 ? (
                viewersData.viewers.map((viewer) => (
                  <div key={viewer.viewer_user_id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex items-center justify-center flex-shrink-0">
                      {viewer.profile?.avatar_url ? (
                        <SecureAvatarImg src={viewer.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">
                          {viewer.profile?.username?.charAt(0).toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{viewer.profile?.username || 'Utilisateur'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(viewer.viewed_at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                    {viewer.screenshot_detected && (
                      <span className="text-xs text-destructive font-medium px-2 py-0.5 rounded-full bg-destructive/10">
                        📸 Capture
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Personne n'a encore vu cette story
                </p>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </motion.div>
    </AnimatePresence>
  );
};

export default StoryViewer;
