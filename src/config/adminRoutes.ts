/**
 * Source unique de vérité pour le mapping
 * AdminSection (legacy id) ↔ slug d'URL ↔ titre de page ↔ groupe (breadcrumb).
 *
 * Toute navigation interne admin DOIT utiliser ces helpers
 * pour garantir la cohérence entre la sidebar, le mobile nav,
 * la barre de commande et les redirections de missions.
 */
import type { AdminSection } from '@/components/admin/AdminSidebar';

export type AdminGroup =
  | 'dashboard'
  | 'tasks'
  | 'moderation'
  | 'users'
  | 'finances'
  | 'communication'
  | 'config'
  | 'logs';

export const groupLabels: Record<AdminGroup, string> = {
  dashboard: 'Tableau de bord',
  tasks: 'Tâches',
  moderation: 'Modération',
  users: 'Utilisateurs',
  finances: 'Finances',
  communication: 'Communication',
  config: 'Configuration',
  logs: 'Monitoring',
};

export interface AdminRouteEntry {
  section: AdminSection;
  slug: string; // segment d'URL (sans le /admin/ devant)
  title: string;
  group: AdminGroup;
}

export const ADMIN_ROUTES: AdminRouteEntry[] = [
  { section: 'dashboard', slug: '', title: 'Tableau de bord', group: 'dashboard' },
  // Tâches
  { section: 'pending-tasks', slug: 'missions', title: 'Missions', group: 'tasks' },
  { section: 'support', slug: 'support', title: 'Support', group: 'tasks' },
  { section: 'support-ratings', slug: 'avis', title: 'Avis', group: 'tasks' },
  // Modération
  { section: 'verification', slug: 'identite', title: 'Vérification identité', group: 'moderation' },
  { section: 'reports', slug: 'signalements', title: 'Signalements', group: 'moderation' },
  { section: 'moderation', slug: 'contenu', title: 'Modération de contenu', group: 'moderation' },
  { section: 'live-content', slug: 'direct', title: 'Surveillance en direct', group: 'moderation' },
  { section: 'ai-moderation', slug: 'ia', title: 'Modération IA', group: 'moderation' },
  { section: 'screenshot-sanctions', slug: 'captures', title: 'Sanctions captures', group: 'moderation' },
  // Utilisateurs
  { section: 'users', slug: 'membres', title: 'Membres', group: 'users' },
  { section: 'stats', slug: 'stats', title: 'Statistiques', group: 'users' },
  { section: 'moderators', slug: 'equipe', title: 'Équipe de modération', group: 'users' },
  // Finances
  { section: 'wallet', slug: 'portefeuille', title: 'Portefeuille', group: 'finances' },
  { section: 'credits-surveillance', slug: 'surveillance', title: 'Surveillance des crédits', group: 'finances' },
  { section: 'credit-purchases', slug: 'achats', title: 'Achats de crédits', group: 'finances' },
  { section: 'rates', slug: 'tarifs', title: 'Tarifs', group: 'finances' },
  { section: 'withdrawals', slug: 'retraits', title: 'Retraits', group: 'finances' },
  { section: 'global', slug: 'gains', title: 'Gains globaux', group: 'finances' },
  // Communication
  { section: 'broadcast', slug: 'push', title: 'Notifications push', group: 'communication' },
  { section: 'popups', slug: 'popups', title: 'Pop-ups', group: 'communication' },
  { section: 'faq', slug: 'aide', title: 'Centre d’aide', group: 'communication' },
  { section: 'flyers', slug: 'flyers', title: 'Flyers', group: 'communication' },
  { section: 'promo', slug: 'promos', title: 'Codes promo', group: 'communication' },
  { section: 'ads', slug: 'annonces', title: 'Annonces', group: 'communication' },
  { section: 'promo-images', slug: 'visuels', title: 'Visuels promotionnels', group: 'communication' },
  { section: 'site-updates', slug: 'updates', title: 'Mises à jour', group: 'communication' },
  // Configuration
  { section: 'credit-costs', slug: 'credits', title: 'Crédits & offres', group: 'config' },
  { section: 'swipe-stats', slug: 'swipe', title: 'Statistiques Swipe', group: 'config' },
  { section: 'maintenance', slug: 'maintenance', title: 'Maintenance', group: 'config' },
  { section: 'feature-toggles', slug: 'toggles', title: 'Feature toggles', group: 'config' },
  // Logs
  { section: 'error-logs', slug: 'erreurs', title: 'Journal des erreurs', group: 'logs' },
  { section: 'security', slug: 'securite', title: 'Événements de sécurité', group: 'logs' },
  { section: 'emails', slug: 'emails', title: 'Suivi des e-mails', group: 'logs' },
];

const sectionToSlug = new Map<AdminSection, string>(
  ADMIN_ROUTES.map((r) => [r.section, r.slug]),
);
const slugToSection = new Map<string, AdminSection>(
  ADMIN_ROUTES.map((r) => [r.slug, r.section]),
);
const sectionToEntry = new Map<AdminSection, AdminRouteEntry>(
  ADMIN_ROUTES.map((r) => [r.section, r]),
);

/** /admin or /admin/<slug> */
export const buildAdminPath = (section: AdminSection): string => {
  const slug = sectionToSlug.get(section) ?? '';
  return slug ? `/admin/${slug}` : '/admin';
};

export const sectionFromSlug = (slug: string | undefined): AdminSection => {
  if (!slug) return 'dashboard';
  return slugToSection.get(slug) ?? 'dashboard';
};

export const titleForSection = (section: AdminSection): string =>
  sectionToEntry.get(section)?.title ?? 'Administration';

export const groupForSection = (section: AdminSection): AdminGroup =>
  sectionToEntry.get(section)?.group ?? 'dashboard';
