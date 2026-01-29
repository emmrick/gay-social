import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileStats } from '@/hooks/useProfileStats';
import { useIsAdmin } from '@/hooks/useAdmin';
import { useSubscription } from '@/hooks/useSubscription';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MapPin, Calendar, LogOut, Edit2, Shield, Bell, Moon, HelpCircle, ChevronRight, Loader2, Crown, Sparkles, FolderLock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ProfileEditDialog from './ProfileEditDialog';
import SettingsDialog from './SettingsDialog';
import AlbumManager from '@/components/albums/AlbumManager';

// Labels
const POSITION_LABELS: Record<string, string> = {
  'actif': '🔝 Actif (Top)',
  'passif': '🔽 Passif (Bottom)',
  'versatile': '↕️ Versatile',
  'vers_top': '↕️🔝 Versatile Top',
  'vers_bottom': '↕️🔽 Versatile Bottom',
  'side': '🤝 Side',
  'no_answer': 'Non précisé',
};

const LOOKING_FOR_LABELS: Record<string, string> = {
  'plan_cul': '🔥 Plan cul',
  'plan_regulier': '🔄 Plan régulier',
  'relation': '❤️ Relation',
  'amitie': '🤝 Amitié',
  'discussion': '💬 Discussion',
  'webcam': '📹 Webcam',
  'groupe': '👥 Plan à plusieurs',
};

const getPositionLabel = (position: string) => POSITION_LABELS[position] || position;
const getLookingForLabel = (item: string) => LOOKING_FOR_LABELS[item] || item;

interface ProfileViewProps {
  onSignOut: () => void;
  onNavigateToAdmin?: () => void;
  isAdmin?: boolean;
}

type SettingsType = 'notifications' | 'appearance' | 'privacy' | 'help';

const ProfileView = ({ onSignOut, onNavigateToAdmin, isAdmin }: ProfileViewProps) => {
  const { profile } = useAuth();
  const { data: stats, isLoading: statsLoading } = useProfileStats();
  const { data: isAdminUser } = useIsAdmin();
  const { isPremium, subscriptionEnd, openCustomerPortal } = useSubscription();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [settingsType, setSettingsType] = useState<SettingsType | null>(null);
  const [showAlbumManager, setShowAlbumManager] = useState(false);

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const menuItems = [
    { icon: Edit2, label: 'Modifier le profil', action: () => setShowEditDialog(true) },
    { icon: FolderLock, label: 'Albums privés', action: () => setShowAlbumManager(true) },
    { icon: Bell, label: 'Notifications', action: () => setSettingsType('notifications') },
    { icon: Moon, label: 'Apparence', action: () => setSettingsType('appearance') },
    { icon: Shield, label: 'Confidentialité', action: () => setSettingsType('privacy') },
    { icon: HelpCircle, label: 'Aide & Support', action: () => setSettingsType('help') },
  ];

  return (
    <div className="animate-fade-in pb-8">
      <ProfileEditDialog open={showEditDialog} onOpenChange={setShowEditDialog} />
      <AlbumManager isOpen={showAlbumManager} onClose={() => setShowAlbumManager(false)} />
      
      {settingsType && (
        <SettingsDialog 
          open={!!settingsType} 
          onOpenChange={(open) => !open && setSettingsType(null)}
          type={settingsType}
        />
      )}

      {/* Profile Header */}
      <div className="relative">
        {/* Banner gradient */}
        <div className="h-32 bg-gradient-to-br from-primary via-primary/80 to-accent" />
        
        {/* Profile info overlay */}
        <div className="px-4 -mt-16">
          <div className="flex flex-col items-center">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-28 h-28 border-4 border-background shadow-xl">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-accent text-white">
                  {profile.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Badge 
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5"
                variant={profile.is_online ? "default" : "secondary"}
              >
                {profile.is_online ? '🟢 En ligne' : '⚫ Hors ligne'}
              </Badge>
            </div>

            {/* Name & info */}
            <div className="mt-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-2xl font-bold font-display">
                  {profile.username}
                  {profile.age && <span className="text-muted-foreground font-normal">, {profile.age} ans</span>}
                </h1>
                {isAdminUser && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg">
                    <Crown className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </div>
              
              {/* Position badge */}
              {(profile as any).sexual_position && (
                <Badge variant="secondary" className="mt-2">
                  {getPositionLabel((profile as any).sexual_position)}
                </Badge>
              )}
              
              <div className="flex items-center justify-center gap-2 mt-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{profile.region}</span>
              </div>
              
              {/* Physical stats */}
              {((profile as any).height || (profile as any).weight) && (
                <div className="flex items-center justify-center gap-3 mt-1 text-muted-foreground text-sm">
                  {(profile as any).height && <span>{(profile as any).height} cm</span>}
                  {(profile as any).height && (profile as any).weight && <span>•</span>}
                  {(profile as any).weight && <span>{(profile as any).weight} kg</span>}
                </div>
              )}
              
              {profile.created_at && (
                <div className="flex items-center justify-center gap-2 mt-1 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    Membre depuis {format(new Date(profile.created_at), 'MMMM yyyy', { locale: fr })}
                  </span>
                </div>
              )}
            </div>

            {/* Looking for badges */}
            {(profile as any).looking_for && (profile as any).looking_for.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                {(profile as any).looking_for.map((item: string) => (
                  <Badge key={item} variant="outline" className="text-xs">
                    {getLookingForLabel(item)}
                  </Badge>
                ))}
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <p className="mt-4 text-center text-muted-foreground max-w-sm">
                {profile.bio}
              </p>
            )}

            {/* Quick edit button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4 gap-2"
              onClick={() => setShowEditDialog(true)}
            >
              <Edit2 className="w-4 h-4" />
              Modifier le profil
            </Button>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3 px-4 mt-6">
        <Card className="bg-secondary/50">
          <CardContent className="p-3 text-center">
            {statsLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
            ) : (
              <p className="text-2xl font-bold text-primary">{stats?.messagesCount || 0}</p>
            )}
            <p className="text-xs text-muted-foreground">Messages</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary/50">
          <CardContent className="p-3 text-center">
            {statsLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
            ) : (
              <p className="text-2xl font-bold text-primary">{stats?.conversationsCount || 0}</p>
            )}
            <p className="text-xs text-muted-foreground">Conversations</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary/50">
          <CardContent className="p-3 text-center">
            {statsLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
            ) : (
              <p className="text-2xl font-bold text-primary">{stats?.reactionsCount || 0}</p>
            )}
            <p className="text-xs text-muted-foreground">Réactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Menu items */}
      <div className="px-4 mt-6 space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Paramètres
        </h3>
        
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={item.action}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            <span className="flex-1 text-left font-medium">{item.label}</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        ))}

        {/* Premium status */}
        {isPremium ? (
          <button
            onClick={openCustomerPortal}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 transition-colors border border-amber-500/30"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="font-medium text-amber-500">Premium actif</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              {subscriptionEnd && (
                <span className="text-xs text-muted-foreground">
                  Renouvellement le {format(new Date(subscriptionEnd), 'dd MMM yyyy', { locale: fr })}
                </span>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-amber-500" />
          </button>
        ) : (
          <button
            onClick={() => {/* Navigate to premium handled by parent */}}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/5 to-orange-500/5 hover:from-amber-500/15 hover:to-orange-500/15 transition-colors border border-amber-500/20"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1 text-left">
              <span className="font-medium text-amber-500">Passer à Premium</span>
              <p className="text-xs text-muted-foreground">4,50 €/mois - Débloquez tout</p>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-500" />
          </button>
        )}

        {/* Admin button */}
        {isAdmin && onNavigateToAdmin && (
          <button
            onClick={onNavigateToAdmin}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-500" />
            </div>
            <span className="flex-1 text-left font-medium text-amber-500">Administration</span>
            <ChevronRight className="w-5 h-5 text-amber-500" />
          </button>
        )}

        <Separator className="my-4" />

        {/* Sign out */}
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-destructive/10 hover:bg-destructive/20 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-destructive" />
          </div>
          <span className="flex-1 text-left font-medium text-destructive">Se déconnecter</span>
        </button>
      </div>
    </div>
  );
};

export default ProfileView;
