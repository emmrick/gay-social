import { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Edit2, Verified, Cake } from 'lucide-react';
import { shouldShowOnlineIndicator } from '@/hooks/useOnlineStatus';
import { getZodiacSign, isBirthdayToday, formatBirthday } from '@/lib/zodiac';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';

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

  return (
    <div className="relative">
      {/* Background gradient header */}
      <div className="h-36 bg-gradient-to-br from-primary/80 via-primary/60 to-accent/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.3),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--accent)/0.2),transparent_60%)]" />
        
        {/* Settings button */}
        <div className="absolute top-3 right-3 z-20">
          {settingsDrawer}
        </div>

        {isBirthday && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-3 left-3 bg-white/20 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-1.5"
          >
            <span className="text-lg">🎂</span>
            <span className="text-xs font-semibold text-white">Joyeux anniversaire !</span>
          </motion.div>
        )}
      </div>

      {/* Profile content overlapping the gradient */}
      <div className="px-4 -mt-16 relative z-10">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-card rounded-3xl border border-border/50 shadow-lg p-5 pb-4"
        >
          <div className="flex gap-4 items-start">
            {/* Avatar */}
            <div className="relative flex-shrink-0 -mt-12">
              <div className="p-[3px] rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg">
                <Avatar className="w-24 h-24 rounded-xl border-[3px] border-card">
                  <AvatarImage src={profile.avatar_url || undefined} className="object-cover rounded-xl" />
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold rounded-xl">
                    {profile.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              {shouldShowOnlineIndicator(profile) && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-[3px] border-card shadow-md" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-lg font-bold truncate">{profile.username}</h1>
                {profile.is_verified && <Verified className="w-4.5 h-4.5 text-blue-500 fill-blue-500 flex-shrink-0" />}
                {profile.age && (
                  <span className="text-muted-foreground font-medium text-sm">{profile.age} ans</span>
                )}
              </div>

              {/* Badges row */}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {isAdminUser && (
                  <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-semibold">
                    ⚡ Admin
                  </Badge>
                )}
                {!isAdminUser && isModerator && (
                  <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-semibold">
                    🛡️ Mod
                  </Badge>
                )}
                {profile.sexual_position && profile.sexual_position !== 'no_answer' && (
                  <Badge variant="outline" className="text-[10px] bg-secondary/50">
                    {positionLabels[profile.sexual_position] || profile.sexual_position}
                  </Badge>
                )}
                {zodiac && (
                  <Badge variant="outline" className="text-[10px] bg-secondary/50">
                    {zodiac.emoji} {zodiac.label}
                  </Badge>
                )}
              </div>

              {/* Quick info chips */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-muted-foreground">
                {profile.region && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {profile.region}
                  </span>
                )}
                {profile.birth_date && profile.show_birthday && (
                  <span className="flex items-center gap-0.5">
                    <Cake className="w-3 h-3" />
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
                    <Calendar className="w-3 h-3" />
                    {format(new Date(profile.created_at), 'MMM yyyy', { locale: fr })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed bg-secondary/30 rounded-xl px-3 py-2.5">
              {profile.bio}
            </p>
          )}

          {/* Edit button */}
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full gap-2 rounded-xl h-9 text-xs font-semibold border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all"
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
