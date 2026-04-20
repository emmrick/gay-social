import { useMemo } from 'react';
import { useUserTweens } from '@/hooks/useTweens';
import { useAuth } from '@/contexts/AuthContext';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Sparkles, MessageCircle, Heart, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import TweenCard from './TweenCard';

const MyTweensTab = () => {
  const { user, profile } = useAuth();
  const { data: tweens, isLoading } = useUserTweens(user?.id);
  const avatarUrl = useAvatarUrl(profile?.avatar_url);

  const stats = useMemo(() => {
    if (!tweens?.length) return { count: 0, likes: 0, comments: 0 };
    return {
      count: tweens.length,
      likes: tweens.reduce((sum, t) => sum + (t.likes_count || 0), 0),
      comments: tweens.reduce((sum, t) => sum + (t.comments_count || 0), 0),
    };
  }, [tweens]);

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Mini-profil */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/10 via-accent/5 to-background p-5 backdrop-blur-sm"
      >
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16 shrink-0 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
            <AvatarImage src={avatarUrl || undefined} alt={profile?.username || 'Moi'} className="object-cover" />
            <AvatarFallback className="bg-primary/15 text-primary font-bold text-lg">
              {(profile?.username || '?').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2
              className="text-xl font-black truncate"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              {profile?.username || 'Moi'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Votre journal Tween</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          <StatCard icon={FileText} value={stats.count} label="Tweens" />
          <StatCard icon={Heart} value={stats.likes} label="J'aime" />
          <StatCard icon={MessageCircle} value={stats.comments} label="Réponses" />
        </div>
      </motion.div>

      {/* Liste des tweens */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </div>
      ) : !tweens?.length ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 px-6"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary/40" />
          </div>
          <p className="text-base font-black" style={{ fontFamily: 'Syne, sans-serif' }}>
            Aucun Tween publié
          </p>
          <p className="text-sm text-muted-foreground mt-1.5">
            Publiez votre premier Tween depuis l'onglet "Fil public".
          </p>
        </motion.div>
      ) : (
        tweens.map((tween, index) => (
          <motion.div
            key={tween.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.03, 0.15), duration: 0.25 }}
          >
            <TweenCard tween={tween} />
          </motion.div>
        ))
      )}
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Heart;
  value: number;
  label: string;
}) => (
  <div className="flex flex-col items-center justify-center rounded-xl bg-background/60 border border-border/40 py-2.5 px-2 backdrop-blur-sm">
    <Icon className="w-3.5 h-3.5 text-primary mb-1" />
    <span className="text-base font-black leading-none" style={{ fontFamily: 'Syne, sans-serif' }}>
      {value}
    </span>
    <span className="text-[10px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wider">
      {label}
    </span>
  </div>
);

export default MyTweensTab;
