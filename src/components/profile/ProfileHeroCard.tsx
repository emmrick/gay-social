import { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Edit2, Verified, Cake } from 'lucide-react';
import { useLivePresence } from '@/hooks/useLivePresence';
import { getZodiacSign, isBirthdayToday, formatBirthday } from '@/lib/zodiac';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';

interface ProfileHeroCardProps {
  profile: any;
  isAdminUser?: boolean;
  isModerator?: boolean;
  isAdmin?: boolean;
  positionLabels: Record<string, string>;
  onEdit: () => void;
  settingsDrawer: ReactNode;
}

const ProfileHeroCard = ({ profile, isAdminUser, isModerator, isAdmin, positionLabels, onEdit, settingsDrawer }: ProfileHeroCardProps) => {
  const zodiac = profile.birth_date ? getZodiacSign(profile.birth_date) : null;
  const isBirthday = profile.birth_date ? isBirthdayToday(profile.birth_date) : false;
  const resolvedAvatar = useAvatarUrl(profile.avatar_url);
  const presence = useLivePresence(profile);

  return (
    <div className="relative pb-4">
      {/* Background gradient header with rounded bottom */}
      <div className="h-48 bg-gradient-to-br from-primary via-accent/80 to-primary/60 relative overflow-hidden rounded-b-[2rem]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,hsl(var(--primary)/0.5),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_20%,hsl(var(--accent)/0.4),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(var(--background)/0.3),transparent_70%)]" />
        
        {/* Floating geometric shapes */}
        <div className="absolute top-6 right-12 w-20 h-20 rounded-full border border-white/10 animate-pulse" />
        <div className="absolute bottom-8 left-8 w-12 h-12 rounded-lg border border-white/10 rotate-45" />

        {/* Settings button */}
        <div className="absolute top-3 right-3 z-20">
          {settingsDrawer}
        </div>

        {isBirthday && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-3 left-3 bg-white/15 backdrop-blur-xl rounded-full px-3.5 py-1.5 flex items-center gap-1.5 border border-white/20"
          >
            <span className="text-lg">🎂</span>
            <span className="text-xs font-semibold text-white">Joyeux anniversaire !</span>
          </motion.div>
        )}
      </div>

      {/* Profile card — floating overlay between gradient and content */}
      <div className="px-4 -mt-24 relative z-10">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="bg-card rounded-3xl border border-border/50 shadow-[0_12px_40px_-8px_hsl(var(--primary)/0.15),0_4px_16px_-4px_hsl(0_0%_0%/0.08)] p-5 pb-4"
        >
          <div className="flex gap-4 items-start">
            {/* Avatar — pops above the card */}
            <div className="relative flex-shrink-0 -mt-14 self-start">
              <div className="p-[3px] rounded-2xl bg-gradient-to-br from-primary via-accent to-primary shadow-[0_6px_24px_hsl(var(--primary)/0.35)]">
                <Avatar className="w-[92px] h-[92px] rounded-xl border-[3px] border-card">
                  <AvatarImage src={resolvedAvatar || undefined} className="object-cover rounded-xl" />
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-accent text-primary-foreground font-display font-bold rounded-xl">
                    {profile.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              {presence.showIndicator && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-[3px] border-card shadow-[0_0_8px_hsl(142_76%_36%/0.4)]" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pt-8 sm:pt-10">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-lg font-display font-bold truncate">{profile.username}</h1>
                {profile.is_verified && <Verified className="w-4.5 h-4.5 text-blue-500 fill-blue-500 flex-shrink-0" />}
                {profile.age && (
                  <span className="text-muted-foreground font-medium text-sm">{profile.age} ans</span>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {isAdminUser && (
                  <Badge className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-semibold backdrop-blur-sm">
                    ⚡ Admin
                  </Badge>
                )}
                {!isAdminUser && isModerator && (
                  <Badge className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-semibold backdrop-blur-sm">
                    🛡️ Mod
                  </Badge>
                )}
                {profile.sexual_position && profile.sexual_position !== 'no_answer' && (
                  <Badge variant="outline" className="text-[10px] bg-secondary/50 backdrop-blur-sm">
                    {positionLabels[profile.sexual_position] || profile.sexual_position}
                  </Badge>
                )}
                {zodiac && (
                  <Badge variant="outline" className="text-[10px] bg-secondary/50 backdrop-blur-sm">
                    {zodiac.emoji} {zodiac.label}
                  </Badge>
                )}
              </div>

              {/* Quick info chips */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-[11px] text-muted-foreground">
                {profile.region && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3 text-primary/60" />
                    {profile.region}
                  </span>
                )}
                {profile.birth_date && profile.show_birthday && (
                  <span className="flex items-center gap-0.5">
                    <Cake className="w-3 h-3 text-pink-500/60" />
                    {formatBirthday(profile.birth_date)}
                  </span>
                )}
                {(profile.height || profile.weight) && (
                  <span>
                    {profile.height && `${profile.height}cm`}
                    {profile.height && profile.weight && ' · '}
                    {profile.weight && `${profile.weight}kg`}
                  </span>
                )}
                {profile.created_at && (
                  <span className="flex items-center gap-0.5">
                    <Calendar className="w-3 h-3 text-muted-foreground/60" />
                    {format(new Date(profile.created_at), 'MMM yyyy', { locale: fr })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-muted-foreground mt-3.5 leading-relaxed bg-secondary/40 rounded-xl px-3.5 py-2.5 border border-border/30">
              {profile.bio}
            </p>
          )}

          {/* Edit button */}
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full gap-2 rounded-xl h-10 text-xs font-semibold border-primary/25 hover:bg-primary/5 hover:border-primary/50 hover:shadow-[0_0_12px_hsl(var(--primary)/0.1)] transition-all"
            onClick={onEdit}
          >
            <Edit2 className="w-3.5 h-3.5" />
            Modifier mon profil
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfileHeroCard;
