import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, Bell, Moon, Shield, HelpCircle, FolderLock, 
  ChevronRight, X, Crown, Zap, Sparkles, LogOut, FileText, Scale
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import SettingsDialog from './SettingsDialog';
import AlbumManager from '@/components/albums/AlbumManager';
import ProfileEditDialog from './ProfileEditDialog';

type SettingsType = 'notifications' | 'appearance' | 'privacy' | 'help';

interface ProfileSettingsDrawerProps {
  isPremium: boolean;
  subscriptionEnd: string | null;
  isAdmin?: boolean;
  onNavigateToAdmin?: () => void;
  onNavigateToPremium?: () => void;
  onContactAdmin?: () => void;
  onSignOut: () => void;
}

const ProfileSettingsDrawer = ({
  isPremium,
  subscriptionEnd,
  isAdmin,
  onNavigateToAdmin,
  onNavigateToPremium,
  onContactAdmin,
  onSignOut
}: ProfileSettingsDrawerProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [settingsType, setSettingsType] = useState<SettingsType | null>(null);
  const [showAlbumManager, setShowAlbumManager] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const menuItems = [
    { icon: FolderLock, label: 'Albums privés', action: () => { setOpen(false); setShowAlbumManager(true); }, color: 'text-violet-500', bgColor: 'bg-violet-500/10' },
    { icon: Bell, label: 'Notifications', action: () => { setOpen(false); setSettingsType('notifications'); }, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { icon: Moon, label: 'Apparence', action: () => { setOpen(false); setSettingsType('appearance'); }, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
    { icon: Shield, label: 'Confidentialité', action: () => { setOpen(false); setSettingsType('privacy'); }, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
    { icon: HelpCircle, label: 'Aide & Support', action: () => { setOpen(false); setSettingsType('help'); }, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  ];

  const legalItems = [
    { icon: Scale, label: 'Mentions légales', section: 'legal', color: 'text-slate-500', bgColor: 'bg-slate-500/10' },
    { icon: FileText, label: 'CGU & CGV', section: 'cgu', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
    { icon: Shield, label: 'RGPD & Confidentialité', section: 'privacy', color: 'text-green-500', bgColor: 'bg-green-500/10' },
  ];

  return (
    <>
      <ProfileEditDialog open={showEditDialog} onOpenChange={setShowEditDialog} />
      <AlbumManager isOpen={showAlbumManager} onClose={() => setShowAlbumManager(false)} />
      
      {settingsType && (
        <SettingsDialog 
          open={!!settingsType} 
          onOpenChange={(open) => !open && setSettingsType(null)}
          type={settingsType}
          onContactAdmin={onContactAdmin}
        />
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm shadow-lg border border-border/50 hover:bg-background hover:scale-105 transition-all"
          >
            <Settings className="h-5 w-5 text-muted-foreground" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-0">
          <SheetHeader className="px-6 pb-4">
            <SheetTitle className="text-xl font-bold flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Paramètres & Options
            </SheetTitle>
          </SheetHeader>

          <div className="overflow-y-auto h-full pb-20 px-4">
            {/* Premium Status */}
            {isPremium ? (
              <button
                onClick={() => { setOpen(false); onNavigateToPremium?.(); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 mb-4 hover:from-amber-500/20 hover:to-orange-500/20 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">Premium actif</span>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>
                  {subscriptionEnd && (
                    <span className="text-xs text-muted-foreground">
                      Jusqu'au {format(new Date(subscriptionEnd), 'dd MMM yyyy', { locale: fr })}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-amber-500" />
              </button>
            ) : (
              <button
                onClick={() => { setOpen(false); onNavigateToPremium?.(); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 mb-4 hover:from-amber-500/20 hover:to-orange-500/20 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/30">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">Passer à Premium</span>
                    <Zap className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-xs text-muted-foreground">5,99 €/mois • Débloquez tout</p>
                </div>
                <ChevronRight className="w-5 h-5 text-amber-500 group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            {/* Menu Items */}
            <div className="space-y-2">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.action}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary/50 hover:bg-secondary transition-all active:scale-[0.98]"
                >
                  <div className={`w-11 h-11 rounded-xl ${item.bgColor} flex items-center justify-center`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              ))}
            </div>

            {/* Legal Section */}
            <Separator className="my-4" />
            <div className="mb-2 px-1">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Scale className="w-4 h-4" />
                Règlement & Légal
              </h3>
            </div>
            <div className="space-y-2">
              {legalItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => { 
                    setOpen(false); 
                    navigate(`/legal#${item.section}`);
                  }}
                  className="w-full flex items-center gap-4 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all active:scale-[0.98]"
                >
                  <div className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <span className="flex-1 text-left font-medium text-sm">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>

            {/* Admin button */}
            {isAdmin && onNavigateToAdmin && (
              <>
                <Separator className="my-4" />
                <button
                  onClick={() => { setOpen(false); onNavigateToAdmin(); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                >
                  <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-amber-500" />
                  </div>
                  <span className="flex-1 text-left font-medium text-amber-600 dark:text-amber-400">Administration</span>
                  <ChevronRight className="w-5 h-5 text-amber-500" />
                </button>
              </>
            )}

            <Separator className="my-4" />

            {/* Sign out */}
            <button
              onClick={() => { setOpen(false); onSignOut(); }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-destructive/10 hover:bg-destructive/20 transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-destructive/20 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-destructive" />
              </div>
              <span className="flex-1 text-left font-medium text-destructive">Se déconnecter</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default ProfileSettingsDrawer;
