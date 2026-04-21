

## Plan : Éliminer les rechargements de pages

### Diagnostic

Malgré le cache React Query déjà en place, les pages "rechargent" visuellement parce que :

1. **Démontage/remontage des composants** : à chaque navigation, React Router détruit la page précédente. Quand on revient, les `useState` (onglets actifs, scroll, dialogs ouverts) sont réinitialisés et les `Suspense` réaffichent un spinner pendant que les composants `lazy` enfants se ré-instancient.
2. **Scroll perdu** : revenir sur Messages, Home, Tween repart toujours en haut de page.
3. **Loaders visibles** sur certains hooks (`usePrivateMessages` 15s, `useNotifications` 15s, `useAds` 30s) qui forcent un état `isLoading` perceptible.
4. **Sous-composants `lazy`** dans les pages (`SwipePage`, `TweenFeed`, `CreditsPage`, `ProfileView`, `PrivateChatList`) ré-affichent leur fallback `Loader2` à chaque retour.

### Solution proposée

#### 1. Système "Keep-Alive" des routes principales

Créer `src/components/system/KeepAliveOutlet.tsx` qui monte **une seule fois** chaque page principale (`/home`, `/swipe`, `/messages`, `/tween`, `/profile`, `/credits`, `/aide/chat`) puis les garde montées dans le DOM en jouant uniquement sur `display: none` / `display: flex`. Résultat :

- Plus aucun démontage = plus aucun fallback `Loader2` au retour
- Le scroll, les onglets, les dialogs ouverts sont conservés
- Les requêtes en arrière-plan continuent d'écouter les changements Realtime

Les routes "lourdes" non principales (chat individuel, groupe, admin, profil membre) restent en montage classique pour ne pas saturer la mémoire.

```text
AuthenticatedLayout
└── KeepAliveOutlet
    ├── /home       (toujours montée, display:none si pas active)
    ├── /swipe      (idem)
    ├── /messages   (idem)
    ├── /tween      (idem)
    ├── /profile    (idem)
    ├── /credits    (idem)
    └── /aide/chat  (idem)
```

#### 2. Sous-composants `lazy` préchargés

Modifier `src/lib/routePrefetch.ts` pour précharger aussi les chunks internes lourds : `SwipePage`, `TweenFeed`, `CreditsPage`, `ProfileView`, `PrivateChatList`, `JoinedGroupsList`. Une fois préchargés, le `Suspense` interne ne déclenche plus jamais son fallback.

#### 3. Allonger les staleTime des hooks "loader-visibles"

| Hook | Actuel | Nouveau |
|------|--------|---------|
| `usePrivateMessages` | 15s | 60s |
| `useNotifications` | 15s | 60s |
| `useUnreadMessages` | 30s | 90s |
| `useProfilePhotos` | 60s | 5 min |
| `useProfiles` (search) | 30s | 2 min |
| `useUserBlock` | 60s | 5 min |

Le Realtime Supabase déjà en place invalide les caches au bon moment, donc allonger ces `staleTime` n'introduit aucun retard perçu.

#### 4. Restauration du scroll par page

Stocker la position de scroll dans une `Map` globale (clé = pathname). Restaurée automatiquement quand la page redevient visible dans le KeepAliveOutlet.

#### 5. Suppression des Suspense imbriqués redondants

Dans `HomePage`, `SwipePageRoute`, `TweenPageRoute`, `CreditsPageRoute`, `ProfilePage`, `MessagesPage` : retirer les `<Suspense fallback={<Loader2/>}>` internes une fois les composants préchargés. Le Suspense racine de `AuthenticatedLayout` suffit pour le tout premier montage.

### Fichiers concernés

- **Créés** : `src/components/system/KeepAliveOutlet.tsx`, `src/hooks/useScrollRestoration.ts`
- **Modifiés** : `src/layouts/AuthenticatedLayout.tsx` (utilisation de KeepAliveOutlet), `src/lib/routePrefetch.ts` (préchargement étendu), `src/pages/SwipePageRoute.tsx`, `src/pages/TweenPageRoute.tsx`, `src/pages/CreditsPageRoute.tsx`, `src/pages/ProfilePage.tsx`, `src/pages/MessagesPage.tsx` (retrait des Suspense internes), 6 hooks de cache (allongement staleTime)

### Résultat attendu

- Navigation entre Home / Swipe / Messages / Tween / Profil / Crédits **instantanée**, sans aucun spinner
- Scroll, onglets actifs et formulaires en cours conservés au retour sur une page
- Conversations privées restent montées en cache 5 min, plus de "chargement messages" en revenant sur une discussion récente
- Empreinte mémoire maîtrisée (~7 pages keep-alive maximum, pages secondaires non concernées)

