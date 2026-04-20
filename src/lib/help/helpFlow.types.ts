/**
 * Types du flow décisionnel du chatbot d'aide.
 * Aucun appel IA — tout est statique et 100 % cohérent.
 */
export interface HelpNode {
  /** Identifiant unique de la rubrique ou sous-rubrique */
  id: string;
  /** Libellé affiché dans le bouton */
  label: string;
  /** Emoji facultatif accolé au libellé */
  emoji?: string;
  /**
   * Réponse complète envoyée par le bot quand on clique sur le node.
   * Supporte le markdown léger : **gras** et [LINK:/chemin].
   * Si absent, le bot affiche uniquement le menu des enfants.
   */
  answer?: string;
  /** Sous-rubriques accessibles depuis ce node */
  children?: HelpNode[];
  /**
   * IDs d'autres nodes proposés en suggestions sous la réponse
   * (FAQ croisée pour réduire les escalades agent).
   */
  related?: string[];
}

export type HelpBreadcrumbStep = { id: string; label: string };
