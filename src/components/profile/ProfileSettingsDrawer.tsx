import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, Bell, Moon, Shield, HelpCircle,
  ChevronRight, Coins, LogOut, FileText, Scale, Ban, Lock, Trash2, Download, Megaphone, UserCheck, Heart, Sparkles
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import SettingsInlineContent from './SettingsInlineContent';
import AlbumManager from '@/components/albums/AlbumManager';
import ProfileEditDialog from './ProfileEditDialog';
import BlockedUsersSheet from './BlockedUsersSheet';
import PinManagementSheet from '@/components/security/PinManagementSheet';
import DeleteAccountDialog from './DeleteAccountDialog';
import DataExportDialog from './DataExportDialog';
import ContactAgeFilterSheet from './ContactAgeFilterSheet';
import CoupleSettings from '@/components/couple/CoupleSettings';
import { motion, AnimatePresence } from 'framer-motion';

type SettingsType = 'notifications' | 'appearance' | 'privacy' | 'help';

interface ProfileSettingsDrawerProps {
  isAdmin?: boolean;
  isModerator?: boolean;
  onNavigateToAdmin?: () => void;
  onNavigateToCredits?: () => void;
  onContactAdmin?: () => void;
  onSignOut: () => void;
}

interface MenuItem {
  icon: any;
  label: string;
  description?: string;
  type?: SettingsType;
  action?: () => void;
  color: string;
  bgColor: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const ProfileSettingsDrawer = ({
  isAdmin, isModerator, onNavigateToAdmin, onNavigateToCredits, onContactAdmin, onSignOut
}: ProfileSettingsDrawerProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsType | null>(null);
  const [showAlbumManager, setShowAlbumManager] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [showPinManagement, setShowPinManagement] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showDataExport, setShowDataExport] = useState(false);
  const [showAgeFilter, setShowAgeFilter] = useState(false);
  const [showCoupleSettings, setShowCoupleSettings] = useState(false);

  // Hardware back button handling
  useEffect(() => {
    if (!open || !activeSection) return;
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      setActiveSection(null);
    };
    window.history.pushState({ settingsSection: activeSection }, '');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [open, activeSection]);

  const handleClose = useCallback((isOpen: boolean) => {
    if (!isOpen) setActiveSection(null);
    setOpen(isOpen);
  }, []);

  const handleBack = useCallback(() => {
    setActiveSection(null);
    if (window.history.state?.settingsSection) window.history.back();
  }, []);

  // Grouped sections
  const sections: MenuSection[] = [
    {
      title: 'Préférences',
      items: [
        { icon: Bell, label: 'Notifications', description: 'Alertes et sons', type: 'notifications', color: 'text-blue-500', bgColor: 'bg-blue-500/12' },
        { icon: Moon, label: 'Apparence', description: 'Thème et affichage', type: 'appearance', color: 'text-indigo-500', bgColor: 'bg-indigo-500/12' },
        { icon: Shield, label: 'Confidentialité', description: 'Visibilité du profil', type: 'privacy', color: 'text-emerald-500', bgColor: 'bg-emerald-500/12' },
      ],
    },
    {
      title: 'Sécurité & Contacts',
      items: [
        { icon: Lock, label: 'Code PIN', description: 'Verrouillage de l\'app', action: () => { setOpen(false); setShowPinManagement(true); }, color: 'text-violet-500', bgColor: 'bg-violet-500/12' },
        { icon: Ban, label: 'Bloqués', description: 'Utilisateurs bloqués', action: () => { setOpen(false); setShowBlockedUsers(true); }, color: 'text-red-500', bgColor: 'bg-red-500/12' },
        { icon: UserCheck, label: 'Filtre d\'âge', description: 'Tranche autorisée', action: () => { setOpen(false); setShowAgeFilter(true); }, color: 'text-teal-500', bgColor: 'bg-teal-500/12' },
        { icon: Heart, label: 'Compte couple', description: 'Partager mon compte', action: () => { setOpen(false); setShowCoupleSettings(true); }, color: 'text-pink-500', bgColor: 'bg-pink-500/12' },
      ],
    },
    {
      title: 'Aide',
      items: [
        { icon: HelpCircle, label: 'Aide & Support', description: 'FAQ et contact', type: 'help', color: 'text-orange-500', bgColor: 'bg-orange-500/12' },
      ],
    },
  ];

  const legalItems = [
    { icon: Scale, label: 'Mentions légales', section: 'legal' },
    { icon: FileText, label: 'CGU & CGV', section: 'cgu' },
    { icon: Shield, label: 'RGPD', section: 'privacy' },
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
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl bg-card backdrop-blur-2xl border-border/20 px-0 flex flex-col">
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>
          <SheetHeader className="px-5 pb-4 flex-shrink-0">
            <SheetTitle className="text-xl font-display font-bold flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center">
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

      <Sheet open={open} onOpenChange={handleClose}>
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
          className="h-[88vh] rounded-t-[1.75rem] px-0 bg-gradient-to-b from-card via-card to-background backdrop-blur-2xl border-border/20 flex flex-col"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
          </div>

          <AnimatePresence mode="wait">
            {activeSection ? (
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col flex-1 min-h-0"
              >
                <SettingsInlineContent 
                  type={activeSection} 
                  onBack={handleBack}
                  onContactAdmin={onContactAdmin}
                  onClose={() => handleClose(false)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="main-menu"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col flex-1 min-h-0"
              >
                {/* Premium Header with gradient */}
                <SheetHeader className="px-5 pb-4 pt-2 flex-shrink-0">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4 border border-primary/10">
                    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-primary/10 blur-2xl" />
                    <div className="relative flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30">
                        <Settings className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <SheetTitle className="text-lg font-display font-bold text-foreground leading-tight">
                          Paramètres
                        </SheetTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Personnalisez votre expérience</p>
                      </div>
                    </div>
                  </div>
                </SheetHeader>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 overscroll-contain px-4 pb-8 space-y-5">
                  {/* Grouped sections */}
                  {sections.map((section, sIdx) => (
                    <div key={section.title}>
                      <h3 className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.12em] px-2 mb-2">
                        {section.title}
                      </h3>
                      <div className="rounded-2xl bg-muted/40 border border-border/30 overflow-hidden divide-y divide-border/20">
                        {section.items.map((item, idx) => (
                          <motion.button
                            key={item.label}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: (sIdx * 0.05) + (idx * 0.025) }}
                            onClick={() => {
                              if (item.type) setActiveSection(item.type);
                              else if (item.action) item.action();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted/60 active:bg-muted transition-all active:scale-[0.99]"
                          >
                            <div className={`w-10 h-10 rounded-xl ${item.bgColor} flex items-center justify-center flex-shrink-0`}>
                              <item.icon className={`w-[18px] h-[18px] ${item.color}`} />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="font-semibold text-[14.5px] leading-tight text-foreground truncate">{item.label}</p>
                              {item.description && (
                                <p className="text-[11.5px] text-muted-foreground mt-0.5 truncate">{item.description}</p>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Highlighted: Advertise */}
                  <button
                    onClick={() => { setOpen(false); navigate('/advertise'); }}
                    className="w-full relative overflow-hidden flex items-center gap-3 px-3.5 py-3.5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent hover:from-primary/15 active:from-primary/20 transition-all active:scale-[0.99] border border-primary/20"
                  >
                    <div className="absolute right-0 top-0 w-20 h-20 rounded-full bg-primary/10 blur-2xl" />
                    <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/30">
                      <Megaphone className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="relative flex-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[14.5px] leading-tight text-foreground">Faire de la publicité</span>
                        <Sparkles className="w-3 h-3 text-primary" />
                      </div>
                      <p className="text-[11.5px] text-muted-foreground mt-0.5">Promouvoir votre activité</p>
                    </div>
                    <ChevronRight className="relative w-4 h-4 text-primary/60 flex-shrink-0" />
                  </button>

                  {/* Admin / Moderator */}
                  {(isAdmin || isModerator) && onNavigateToAdmin && (
                    <button
                      onClick={() => { setOpen(false); onNavigateToAdmin(); }}
                      className={`w-full flex items-center gap-3 px-3.5 py-3.5 rounded-2xl transition-all active:scale-[0.99] border ${
                        isAdmin 
                          ? 'bg-gradient-to-r from-amber-500/12 to-amber-500/5 hover:from-amber-500/18 border-amber-500/25' 
                          : 'bg-gradient-to-r from-blue-500/12 to-blue-500/5 hover:from-blue-500/18 border-blue-500/25'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
                        isAdmin ? 'bg-amber-500/20 shadow-amber-500/20' : 'bg-blue-500/20 shadow-blue-500/20'
                      }`}>
                        <Shield className={`w-5 h-5 ${isAdmin ? 'text-amber-500' : 'text-blue-500'}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <span className={`font-bold text-[14.5px] leading-tight block ${
                          isAdmin ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
                        }`}>
                          {isAdmin ? 'Administration' : 'Modération'}
                        </span>
                        <p className="text-[11.5px] text-muted-foreground mt-0.5">Accès au panneau</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isAdmin ? 'text-amber-500/50' : 'text-blue-500/50'}`} />
                    </button>
                  )}

                  {/* Legal section - compact pills */}
                  <div>
                    <h3 className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.12em] px-2 mb-2 flex items-center gap-1.5">
                      <Scale className="w-3 h-3" />
                      Règlement & Légal
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {legalItems.map((item) => (
                        <button
                          key={item.section}
                          onClick={() => { setOpen(false); navigate(`/legal#${item.section}`); }}
                          className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl bg-muted/40 hover:bg-muted/60 active:bg-muted transition-all active:scale-[0.97] border border-border/20"
                        >
                          <item.icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-[11px] font-medium text-foreground text-center leading-tight">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Data Management (RGPD) */}
                  <div>
                    <h3 className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.12em] px-2 mb-2 flex items-center gap-1.5">
                      <Shield className="w-3 h-3" />
                      Mes données (RGPD)
                    </h3>
                    <div className="rounded-2xl bg-muted/40 border border-border/30 overflow-hidden divide-y divide-border/20">
                      <button
                        onClick={() => { setOpen(false); setShowDataExport(true); }}
                        className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted/60 active:bg-muted transition-all active:scale-[0.99]"
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-500/12 flex items-center justify-center flex-shrink-0">
                          <Download className="w-[18px] h-[18px] text-blue-500" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-[14.5px] text-foreground">Télécharger mes données</p>
                          <p className="text-[11.5px] text-muted-foreground mt-0.5">Archive ZIP complète</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                      </button>
                      <button
                        onClick={() => { setOpen(false); setShowDeleteAccount(true); }}
                        className="w-full flex items-center gap-3 px-3 py-3 hover:bg-destructive/8 active:bg-destructive/12 transition-all active:scale-[0.99]"
                      >
                        <div className="w-10 h-10 rounded-xl bg-destructive/12 flex items-center justify-center flex-shrink-0">
                          <Trash2 className="w-[18px] h-[18px] text-destructive" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-[14.5px] text-destructive">Supprimer mon compte</p>
                          <p className="text-[11.5px] text-muted-foreground mt-0.5">Action irréversible</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-destructive/40 flex-shrink-0" />
                      </button>
                    </div>
                  </div>

                  {/* Sign out */}
                  <button
                    onClick={() => { setOpen(false); onSignOut(); }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-3.5 rounded-2xl bg-destructive/10 hover:bg-destructive/15 active:bg-destructive/20 transition-all active:scale-[0.99] border border-destructive/20"
                  >
                    <LogOut className="w-4 h-4 text-destructive" />
                    <span className="font-semibold text-[14.5px] text-destructive">Se déconnecter</span>
                  </button>

                  {/* Footer */}
                  <p className="text-center text-[10px] text-muted-foreground/50 pt-2">
                    Gay Social · v1.0
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default ProfileSettingsDrawer;
