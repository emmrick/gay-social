/**
 * Sous-onglets horizontaux affichés en haut des sections du groupe "Modération"
 * sur mobile. Permet de naviguer entre Signalements / Contenu / IA / Captures /
 * Identité sans devoir repasser par le dashboard.
 *
 * Les items sont filtrés selon les permissions du modérateur (ou tous visibles
 * pour les admins).
 */
import { memo, useMemo } from 'react';
import {
  Filter,
  MessageSquare,
  Bot,
  Camera,
  IdCard,
  ListChecks,
  Headphones,
  Star,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminSection, ModPermissions } from './AdminSidebar';

interface SubTab {
  id: AdminSection;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  permissionKey?: keyof ModPermissions;
}

const MOD_TABS: SubTab[] = [
  { id: 'pending-tasks', label: 'Missions', icon: ListChecks },
  { id: 'support', label: 'Support', icon: Headphones, permissionKey: 'can_manage_support' as never },
  { id: 'support-ratings', label: 'Avis', icon: Star, adminOnly: true },
  { id: 'reports', label: 'Signalements', icon: Filter, permissionKey: 'can_manage_reports' },
  { id: 'moderation', label: 'Contenu', icon: MessageSquare, permissionKey: 'can_manage_content' },
  { id: 'live-content', label: 'Direct', icon: Radio, permissionKey: 'can_manage_content' },
  { id: 'ai-moderation', label: 'IA', icon: Bot, permissionKey: 'can_ai_moderation' },
  { id: 'screenshot-sanctions', label: 'Captures', icon: Camera, permissionKey: 'can_screenshot_sanctions' },
  { id: 'verification', label: 'Identité', icon: IdCard, adminOnly: true, permissionKey: 'can_verify_identity' },
];

const MODERATION_SECTIONS: AdminSection[] = [
  'pending-tasks',
  'support',
  'support-ratings',
  'reports',
  'moderation',
  'live-content',
  'ai-moderation',
  'screenshot-sanctions',
  'verification',
];

interface Props {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  isAdmin: boolean;
  modPermissions?: ModPermissions | null;
}

const AdminModerationSubTabs = ({
  activeSection,
  onSectionChange,
  isAdmin,
  modPermissions,
}: Props) => {
  const visible = useMemo(() => {
    return MOD_TABS.filter((t) => {
      if (isAdmin) return true;
      if (t.adminOnly) return false;
      // Si une permission est requise, on la vérifie. Sinon (pas de clé), c'est visible.
      if (!t.permissionKey) return true;
      return Boolean(modPermissions?.[t.permissionKey as keyof ModPermissions]);
    });
  }, [isAdmin, modPermissions]);

  if (!MODERATION_SECTIONS.includes(activeSection)) return null;
  if (visible.length <= 1) return null;

  return (
    <div className="-mx-3 mb-3 border-b border-border/40">
      <div className="flex gap-1 overflow-x-auto px-3 pb-2 scrollbar-none">
        {visible.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeSection;
          return (
            <button
              key={tab.id}
              onClick={() => onSectionChange(tab.id)}
              className={cn(
                'flex items-center gap-1.5 flex-shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default memo(AdminModerationSubTabs);
export { MODERATION_SECTIONS };
