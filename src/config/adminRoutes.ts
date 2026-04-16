/**
 * Source unique de vérité pour le mapping
 * AdminSection (legacy id) ↔ slug d'URL ↔ titre de page.
 *
 * Toute navigation interne admin DOIT utiliser ces helpers
 * pour garantir la cohérence entre la sidebar, le mobile nav,
 * la barre de commande et les redirections de missions.
 */
import type { AdminSection } from '@/components/admin/AdminSidebar';

export interface AdminRouteEntry {
  section: AdminSection;
  slug: string; // segment d'URL (sans le /admin/ devant)
  title: string;
}

export const ADMIN_ROUTES: AdminRouteEntry[] = [
  { section: 'dashboard', slug: '', title: 'Tableau de bord' },
  // Tâches
  { section: 'pending-tasks', slug: 'missions', title: 'Missions' },
  { section: 'support', slug: 'support', title: 'Support' },
  { section: 'support-ratings', slug: 'avis', title: 'Avis' },
  // Modération
  { section: 'verification', slug: 'identite', title: 'Vérification identité' },
  { section: 'reports', slug: 'signalements', title: 'Signalements' },
  { section: 'moderation', slug: 'contenu', title: 'Modération de contenu' },
  { section: 'ai-moderation', slug: 'ia', title: 'Modération IA' },
  { section: 'screenshot-sanctions', slug: 'captures', title: 'Sanctions captures' },
  // Utilisateurs
  { section: 'users', slug: 'membres', title: 'Membres' },
  { section: 'stats', slug: 'stats', title: 'Statistiques' },
  { section: 'moderators', slug: 'equipe', title: 'Équipe de modération' },
  // Finances
  { section: 'wallet', slug: 'portefeuille', title: 'Portefeuille' },
  { section: 'credits-surveillance', slug: 'surveillance', title: 'Surveillance des crédits' },
  { section: 'credit-purchases', slug: 'achats', title: 'Achats de crédits' },
  { section: 'rates', slug: 'tarifs', title: 'Tarifs' },
  { section: 'withdrawals', slug: 'retraits', title: 'Retraits' },
  { section: 'global', slug: 'gains', title: 'Gains globaux' },
  // Communication
  { section: 'broadcast', slug: 'push', title: 'Notifications push' },
  { section: 'popups', slug: 'popups', title: 'Pop-ups' },
  { section: 'faq', slug: 'aide', title: 'Centre d’aide' },
  { section: 'flyers', slug: 'flyers', title: 'Flyers' },
  { section: 'promo', slug: 'promos', title: 'Codes promo' },
  { section: 'ads', slug: 'annonces', title: 'Annonces' },
  { section: 'promo-images', slug: 'visuels', title: 'Visuels promotionnels' },
  { section: 'site-updates', slug: 'updates', title: 'Mises à jour' },
  // Configuration
  { section: 'credit-costs', slug: 'credits', title: 'Crédits & offres' },
  { section: 'swipe-stats', slug: 'swipe', title: 'Statistiques Swipe' },
  { section: 'maintenance', slug: 'maintenance', title: 'Maintenance' },
  { section: 'feature-toggles', slug: 'toggles', title: 'Feature toggles' },
  // Logs
  { section: 'error-logs', slug: 'erreurs', title: 'Journal des erreurs' },
  { section: 'security', slug: 'securite', title: 'Événements de sécurité' },
];

const sectionToSlug = new Map<AdminSection, string>(
  ADMIN_ROUTES.map((r) => [r.section, r.slug]),
);
const slugToSection = new Map<string, AdminSection>(
  ADMIN_ROUTES.map((r) => [r.slug, r.section]),
);
const sectionToTitle = new Map<AdminSection, string>(
  ADMIN_ROUTES.map((r) => [r.section, r.title]),
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
  sectionToTitle.get(section) ?? 'Administration';
