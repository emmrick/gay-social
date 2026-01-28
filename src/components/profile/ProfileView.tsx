import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Settings, MapPin, Calendar, LogOut, Edit2, Shield, Bell, Moon, HelpCircle, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ProfileEditDialog from './ProfileEditDialog';

interface ProfileViewProps {
  onSignOut: () => void;
  onNavigateToAdmin?: () => void;
  isAdmin?: boolean;
}

const ProfileView = ({ onSignOut, onNavigateToAdmin, isAdmin }: ProfileViewProps) => {
  const { profile } = useAuth();
  const [showEditDialog, setShowEditDialog] = useState(false);

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const menuItems = [
    { icon: Edit2, label: 'Modifier le profil', action: () => setShowEditDialog(true) },
    { icon: Bell, label: 'Notifications', action: () => {} },
    { icon: Moon, label: 'Apparence', action: () => {} },
    { icon: Shield, label: 'Confidentialité', action: () => {} },
    { icon: HelpCircle, label: 'Aide & Support', action: () => {} },
  ];

  return (
    <div className="animate-fade-in pb-8">
      <ProfileEditDialog open={showEditDialog} onOpenChange={setShowEditDialog} />

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
              <h1 className="text-2xl font-bold font-display">{profile.username}</h1>
              <div className="flex items-center justify-center gap-2 mt-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{profile.region}</span>
              </div>
              {profile.created_at && (
                <div className="flex items-center justify-center gap-2 mt-1 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    Membre depuis {format(new Date(profile.created_at), 'MMMM yyyy', { locale: fr })}
                  </span>
                </div>
              )}
            </div>

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
            <p className="text-2xl font-bold text-primary">0</p>
            <p className="text-xs text-muted-foreground">Messages</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">0</p>
            <p className="text-xs text-muted-foreground">Conversations</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">0</p>
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
