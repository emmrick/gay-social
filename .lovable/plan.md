

# Plan : Délai d'attente estimé côté client + file d'attente simplifiée

## Contexte
Le système de missions existe déjà et fonctionne. L'utilisateur veut deux choses :
1. **Confirmer** que les missions restent en file d'attente si aucun opérateur n'est en ligne (c'est déjà le cas — les tâches `pending` restent jusqu'à qu'un modérateur se connecte)
2. **Ajouter côté client** un temps d'attente estimé visible par les utilisateurs normaux (support, vérification d'identité, etc.)

## Changements prévus

### 1. Nouvelle RPC SQL : `get_estimated_wait_time`
Fonction qui calcule le temps d'attente estimé pour un utilisateur donné :
- Compte le nombre de tâches `pending` + `reserved` devant la sienne (par `created_at`)
- Compte le nombre de modérateurs en ligne (profils avec `is_online = true` et `last_seen > now() - 5 min` parmi les `user_roles` admin/moderator)
- Temps moyen par tâche estimé selon le type (support ~5min, vérification ~3min, signalement ~4min)
- Si 0 modérateurs en ligne → retourne `null` (= indéfini)
- Sinon → `position_in_queue * avg_minutes / online_moderators`

**Retour** : `{ position: int, estimated_minutes: int | null, online_moderators: int }`

### 2. Hook `useEstimatedWaitTime`
- Nouveau hook dans `src/hooks/useEstimatedWaitTime.ts`
- Appelle la RPC `get_estimated_wait_time` avec un `entity_id` (ticket_id ou verification_id)
- Rafraîchissement toutes les 30 secondes
- Exporte `position`, `estimatedMinutes`, `onlineModerators`

### 3. Composant `EstimatedWaitBanner`
- Nouveau composant réutilisable `src/components/support/EstimatedWaitBanner.tsx`
- Affiche :
  - Position dans la file : "Vous êtes n° X dans la file"
  - Temps estimé : "Temps d'attente estimé : ~15 min"
  - Si aucun modérateur : "Temps d'attente : indéfini — aucun opérateur disponible"
  - Nombre de modérateurs en ligne

### 4. Intégration dans les écrans clients
- **`SupportChatRoom.tsx`** : Ajouter le banner quand le ticket est `open` (en attente d'agent)
- **`PendingApprovalScreen.tsx`** : Ajouter le banner pour montrer le délai de vérification d'identité
- **`SupportTicketList.tsx`** : Afficher le temps estimé à côté du badge "En attente"

### Détails techniques

```text
┌──────────────────────────────────────────────┐
│  RPC get_estimated_wait_time(entity_id)      │
├──────────────────────────────────────────────┤
│  1. Trouver la tâche liée (target_entity_id) │
│  2. Compter les tâches devant (par date)     │
│  3. Compter modérateurs en ligne             │
│  4. Calculer estimation                      │
│     → 0 mods = null (indéfini)               │
│     → sinon: position × avg_min / mods       │
└──────────────────────────────────────────────┘
```

**Fichiers créés :**
- Migration SQL (nouvelle RPC)
- `src/hooks/useEstimatedWaitTime.ts`
- `src/components/support/EstimatedWaitBanner.tsx`

**Fichiers modifiés :**
- `src/components/support/SupportChatRoom.tsx` — ajout du banner
- `src/components/support/SupportTicketList.tsx` — temps estimé inline
- `src/components/verification/PendingApprovalScreen.tsx` — ajout du banner

