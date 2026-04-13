import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, Bell, Moon, Shield, HelpCircle,
  ChevronRight, Coins, LogOut, FileText, Scale, Ban, Lock, Trash2, Download, Megaphone, UserCheck, Heart
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import SettingsDialog from './SettingsDialog';
import AlbumManager from '@/components/albums/AlbumManager';
import ProfileEditDialog from './ProfileEditDialog';
import BlockedUsersSheet from './BlockedUsersSheet';
import PinManagementSheet from '@/components/security/PinManagementSheet';
import DeleteAccountDialog from './DeleteAccountDialog';
import DataExportDialog from './DataExportDialog';
import ContactAgeFilterSheet from './ContactAgeFilterSheet';
import CoupleSettings from '@/components/couple/CoupleSettings';
import { motion } from 'framer-motion';

type SettingsType = 'notifications' | 'appearance' | 'privacy' | 'help';

interface ProfileSettingsDrawerProps {
  isAdmin?: boolean;
  isModerator?: boolean;
  onNavigateToAdmin?: () => void;
  onNavigateToCredits?: () => void;
  onContactAdmin?: () => void;
  onSignOut: () => void;
}

const ProfileSettingsDrawer = ({
  isAdmin, isModerator, onNavigateToAdmin, onNavigateToCredits, onContactAdmin, onSignOut
}: ProfileSettingsDrawerProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [settingsType, setSettingsType] = useState<SettingsType | null>(null);
  const [showAlbumManager, setShowAlbumManager] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [showPinManagement, setShowPinManagement] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showDataExport, setShowDataExport] = useState(false);
  const [showAgeFilter, setShowAgeFilter] = useState(false);
  const [showCoupleSettings, setShowCoupleSettings] = useState(false);

  const menuItems = [
    { icon: Bell, label: 'Notifications', action: () => { setOpen(false); setSettingsType('notifications'); }, color: 'text-blue-500', bgColor: 'bg-blue-500/12' },
    { icon: Moon, label: 'Apparence', action: () => { setOpen(false); setSettingsType('appearance'); }, color: 'text-indigo-500', bgColor: 'bg-indigo-500/12' },
    { icon: Shield, label: 'Confidentialité', action: () => { setOpen(false); setSettingsType('privacy'); }, color: 'text-emerald-500', bgColor: 'bg-emerald-500/12' },
    { icon: Ban, label: 'Utilisateurs bloqués', action: () => { setOpen(false); setShowBlockedUsers(true); }, color: 'text-red-500', bgColor: 'bg-red-500/12' },
    { icon: UserCheck, label: 'Filtre d\'âge de contact', action: () => { setOpen(false); setShowAgeFilter(true); }, color: 'text-teal-500', bgColor: 'bg-teal-500/12' },
    { icon: HelpCircle, label: 'Aide & Support', action: () => { setOpen(false); setSettingsType('help'); }, color: 'text-orange-500', bgColor: 'bg-orange-500/12' },
    { icon: Lock, label: 'Code PIN & Sécurité', action: () => { setOpen(false); setShowPinManagement(true); }, color: 'text-violet-500', bgColor: 'bg-violet-500/12' },
    { icon: Heart, label: 'Compte Couple', action: () => { setOpen(false); setShowCoupleSettings(true); }, color: 'text-pink-500', bgColor: 'bg-pink-500/12' },
  ];

  const legalItems = [
    { icon: Scale, label: 'Mentions légales', section: 'legal', color: 'text-slate-500', bgColor: 'bg-slate-500/12' },
    { icon: FileText, label: 'CGU & CGV', section: 'cgu', color: 'text-cyan-500', bgColor: 'bg-cyan-500/12' },
    { icon: Shield, label: 'RGPD & Confidentialité', section: 'privacy', color: 'text-green-500', bgColor: 'bg-green-500/12' },
  ];

  return (
    <>
      <ProfileEditDialog open={showEditDialog} onOpenChange={setShowEditDialog} />
      <AlbumManager isOpen={showAlbumManager} onClose={() => setShowAlbumManager(false)} />
      <BlockedUsersSheet open={showBlockedUsers} onOpenChange={setShowBlockedUsers} />
      <PinManagementSheet open={showPinManagement} onOpenChange={setShowPinManagement} />
      <DeleteAccountDialog open={showDeleteAccount} onOpenChange={setShowDeleteAccount} />
      <DataExportDialog open={showDataExport} onOpenChange={setShowDataExport} />
      <ContactAgeFilterSheet open={showAgeFilter} onOpenChange={setShowAgeFilter} />

      <Sheet open={showCoupleSettings} onOpenChange={setShowCoupleSettings}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl bg-card/98 backdrop-blur-2xl border-border/20 px-0 flex flex-col">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>
          <SheetHeader className="px-5 pb-4 flex-shrink-0">
            <SheetTitle className="text-xl font-display font-bold flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/12 flex items-center justify-center">
                <Heart className="h-5 w-5 text-pink-500" />
              </div>
              Gestion du Couple
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto flex-1 px-5 pb-8">
            <CoupleSettings />
          </div>
        </SheetContent>
      </Sheet>
      
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
            variant="ghost" size="icon" 
            className="h-10 w-10 rounded-full bg-card/60 backdrop-blur-xl shadow-lg border border-border/30 hover:bg-card/80 hover:scale-105 transition-all"
          >
            <Settings className="h-5 w-5 text-muted-foreground" />
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="bottom" 
          className="h-[88vh] rounded-t-[1.5rem] px-0 bg-card/98 backdrop-blur-2xl border-border/20 flex flex-col"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>

          {/* Fixed Header */}
          <SheetHeader className="px-5 pb-4 flex-shrink-0 border-b border-border/10">
            <SheetTitle className="text-xl font-display font-bold flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              Paramètres & Options
            </SheetTitle>
          </SheetHeader>

          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1 overscroll-contain px-4 pt-4 pb-8">
            {/* Menu Items */}
            <div className="space-y-2">
              {menuItems.map((item, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 min-h-[52px] px-3 py-2.5 rounded-2xl bg-secondary/40 hover:bg-secondary/60 active:bg-secondary/70 backdrop-blur-sm transition-all active:scale-[0.98] border border-transparent hover:border-border/20"
                >
                  <div className={`w-10 h-10 rounded-xl ${item.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <span className="flex-1 text-left font-medium text-[15px] leading-tight">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                </motion.button>
              ))}
            </div>

            {/* Legal Section */}
            <div className="mt-6 mb-2 px-1">
              <h3 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest flex items-center gap-2">
                <Scale className="w-3.5 h-3.5" />
                Règlement & Légal
              </h3>
            </div>
            <div className="space-y-1.5">
              {legalItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => { setOpen(false); navigate(`/legal#${item.section}`); }}
                  className="w-full flex items-center gap-3 min-h-[48px] px-3 py-2.5 rounded-xl bg-secondary/30 hover:bg-secondary/50 active:bg-secondary/60 transition-all active:scale-[0.98]"
                >
                  <div className={`w-9 h-9 rounded-lg ${item.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <span className="flex-1 text-left font-medium text-sm">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                </button>
              ))}
            </div>

            {/* Advertise */}
            <div className="mt-6">
              <button
                onClick={() => { setOpen(false); navigate('/advertise'); }}
                className="w-full flex items-center gap-3 min-h-[56px] px-3 py-3 rounded-2xl bg-gradient-to-r from-primary/8 to-accent/8 hover:from-primary/12 hover:to-accent/12 active:from-primary/16 active:to-accent/16 transition-all active:scale-[0.98] border border-primary/10"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/12 flex items-center justify-center flex-shrink-0">
                  <Megaphone className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-medium text-[15px] leading-tight block">Faire de la publicité</span>
                  <p className="text-[12px] text-muted-foreground/70 mt-0.5">Promouvoir votre activité</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
              </button>
            </div>

            {/* Admin / Moderator */}
            {(isAdmin || isModerator) && onNavigateToAdmin && (
              <div className="mt-4">
                <button
                  onClick={() => { setOpen(false); onNavigateToAdmin(); }}
                  className={`w-full flex items-center gap-3 min-h-[56px] px-3 py-3 rounded-2xl transition-all active:scale-[0.98] border ${
                    isAdmin 
                      ? 'bg-amber-500/8 hover:bg-amber-500/15 active:bg-amber-500/20 border-amber-500/15' 
                      : 'bg-blue-500/8 hover:bg-blue-500/15 active:bg-blue-500/20 border-blue-500/15'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isAdmin ? 'bg-amber-500/15' : 'bg-blue-500/15'
                  }`}>
                    <Shield className={`w-5 h-5 ${isAdmin ? 'text-amber-500' : 'text-blue-500'}`} />
                  </div>
                  <span className={`flex-1 text-left font-semibold text-[15px] ${
                    isAdmin ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
                  }`}>
                    {isAdmin ? 'Administration' : 'Modération'}
                  </span>
                  <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isAdmin ? 'text-amber-500/40' : 'text-blue-500/40'}`} />
                </button>
              </div>
            )}

            {/* Data Management */}
            <div className="mt-6 mb-2 px-1">
              <h3 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                Mes données (RGPD)
              </h3>
            </div>
            <div className="space-y-1.5">
              <button
                onClick={() => { setOpen(false); setShowDataExport(true); }}
                className="w-full flex items-center gap-3 min-h-[48px] px-3 py-2.5 rounded-xl bg-secondary/30 hover:bg-secondary/50 active:bg-secondary/60 transition-all active:scale-[0.98]"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/12 flex items-center justify-center flex-shrink-0">
                  <Download className="w-4 h-4 text-blue-500" />
                </div>
                <span className="flex-1 text-left font-medium text-sm">Télécharger mes données</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
              </button>
              <button
                onClick={() => { setOpen(false); setShowDeleteAccount(true); }}
                className="w-full flex items-center gap-3 min-h-[48px] px-3 py-2.5 rounded-xl bg-destructive/5 hover:bg-destructive/10 active:bg-destructive/15 transition-all active:scale-[0.98]"
              >
                <div className="w-9 h-9 rounded-lg bg-destructive/12 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </div>
                <span className="flex-1 text-left font-medium text-sm text-destructive">Supprimer mon compte</span>
                <ChevronRight className="w-4 h-4 text-destructive/30 flex-shrink-0" />
              </button>
            </div>

            {/* Sign out */}
            <div className="mt-6">
              <button
                onClick={() => { setOpen(false); onSignOut(); }}
                className="w-full flex items-center gap-3 min-h-[56px] px-3 py-3 rounded-2xl bg-destructive/8 hover:bg-destructive/15 active:bg-destructive/20 transition-all active:scale-[0.98] border border-destructive/10"
              >
                <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center flex-shrink-0">
                  <LogOut className="w-5 h-5 text-destructive" />
                </div>
                <span className="flex-1 text-left font-semibold text-[15px] text-destructive">Se déconnecter</span>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default ProfileSettingsDrawer;
