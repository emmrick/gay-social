

## Refonte page Messages

Je vais reconstruire `MessagesPage` en composants modulaires avec une UX enrichie, sans casser la logique existante (conversations privées, groupes, archives, snaps).

### Problèmes actuels
- Layout monolithique dans `MessagesPage.tsx` (113 lignes mélangeant UI + logique)
- Pas de barre de recherche dans la liste
- Pas de filtres rapides (non lus, favoris, médias)
- Tabs sans compteurs de non-lus
- Deux boutons "+" séparés selon l'onglet (peu ergonomique)
- Pas d'état vide soigné
- Bandeau Selfies absent alors qu'il existe ailleurs

### Nouvelle structure

**Composants créés** (`src/components/messages/`)
```
├── MessagesHeader.tsx         // Header + bouton FAB radial
├── MessagesTabs.tsx            // Onglets avec badges compteurs (Messages 3 / Groupes / Archives)
├── MessagesSearchBar.tsx       // Recherche live (nom + dernier message)
├── MessagesQuickFilters.tsx    // Chips: Tous / Non lus / En ligne / Médias / Favoris
├── MessagesStoriesRow.tsx      // Bandeau Selfies horizontal (réutilise système existant)
├── MessagesEmptyState.tsx      // États vides illustrés par onglet
└── MessagesFAB.tsx             // FAB radial: Nouveau msg / Créer groupe / Rejoindre groupe
```

**Page réécrite**
- `src/pages/MessagesPage.tsx` : compose les blocs, garde toute la logique métier (`usePrivateConversations`, `useUnreadMessages`, navigation)

**Hook léger**
- `src/hooks/useMessagesFilters.ts` : centralise état de recherche + filtre actif

### Enrichissements UX

1. **Recherche live** dans les conversations (filtre temps réel)
2. **Filtres rapides en chips** : Tous / Non lus / En ligne / Médias / Favoris
3. **Compteurs sur onglets** : `Messages (3)` si non lus
4. **FAB radial unique** : un seul "+" qui déploie 3 actions contextuelles (supprime la duplication actuelle)
5. **Bandeau Selfies** en haut de l'onglet Messages (réutilise `selfie-system`)
6. **Statut "en ligne" temps réel** via `useLivePresence` (déjà migré)
7. **États vides illustrés** différents par onglet
8. **Tri intelligent** : favoris épinglés > non lus > récents
9. **Animations fluides** : transitions framer-motion entre filtres

### Logique 100% préservée
- `getOrCreateConversation`, `markAsRead`, navigation `/messages/:userId` et `/chat/:regionCode`
- Composants existants réutilisés tels quels : `PrivateChatList`, `JoinedGroupsList`, `MemberSearch`, `GroupPickerDialog`, `CreateGroupDialog`
- Aucune migration DB
- `UnifiedPageHeader` conservé pour cohérence

### Fichiers touchés
- **Créés (8)** : 7 composants + 1 hook
- **Réécrit (1)** : `src/pages/MessagesPage.tsx`
- **Inchangés** : `PrivateChatList.tsx`, hooks de données, routes, base de données

### Responsive
- Testé pour viewport 485px (mobile actuel) + desktop
- Sticky header + scroll fluide
- Bottom sheets respectent le standard 88vh du projet

