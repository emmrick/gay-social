# Plan Now / Recherche Express

Mode d'activation temporaire qui met en avant un profil cherchant une rencontre immédiate, avec auto-réponses configurables et option d'échange d'albums sécurisé.

## Vue d'ensemble

- **Activation** : 5 crédits pour 30 minutes (durée fixe v1, prolongeable par une nouvelle activation).
- **Effet** : badge "⚡ Plan Now" sur la carte profil, tri prioritaire sur Home (onglet Proximité et nouvel onglet dédié), notification opt-in aux profils proches actifs.
- **Auto-réponses** : 3 questions pré-configurables (recherche / dispo / photos) répondues automatiquement dans le DM pendant la session.
- **Échange d'albums** : si les deux participants sont en Plan Now actif, bouton 1-tap qui déverrouille mutuellement un album privé choisi, pour 30 min, avec watermark renforcé et blocage capture.
- **Reprise manuelle** : à tout moment l'utilisateur clique "Personnaliser la réponse" et la session passe en mode manuel sur cette conversation (auto-réponses désactivées pour ce chat).

## Architecture backend

### Nouvelles tables

**`plan_now_sessions`**
- `user_id` uuid (FK auth.users)
- `started_at`, `expires_at` timestamptz
- `status` enum : `active` | `expired` | `cancelled`
- `credits_spent` int default 5
- index sur `(expires_at)` partiel `WHERE status='active'`

**`plan_now_auto_replies`** (1 row par user, persiste entre sessions)
- `user_id` uuid PK
- `looking_for` text (réponse à "tu recherches quoi ?")
- `available_now` text
- `photo_exchange` text
- `enabled` bool default true
- `updated_at`

**`plan_now_album_shares`** (réutilise la logique albums existante)
- `id`, `from_user_id`, `to_user_id`, `album_id`
- `expires_at` (now + 30 min)
- `accepted` bool default false
- contrainte unique `(from_user_id, to_user_id, album_id)`

### RLS

- `plan_now_sessions` : lecture publique des sessions `active` (pour afficher le badge), insert/update self uniquement.
- `plan_now_auto_replies` : CRUD self uniquement.
- `plan_now_album_shares` : lecture par from/to, insert par from, update (accept) par to.

### Fonctions / triggers

- Trigger `before_insert plan_now_sessions` : vérifie crédits via `consume_credits('plan_now', user_id)`, créé une promo entry `credit_costs.plan_now = 5`.
- Cron 1 min : expire les sessions et album_shares `expires_at < now()`.
- RPC `get_plan_now_active_profiles(geo, radius)` : profils actifs + distance, tri prioritaire.
- Modification de `get_nearby_profiles` : `ORDER BY plan_now_active DESC, distance ASC`.

### Edge function

**`plan-now-auto-reply`** : déclenchée par trigger `after_insert private_messages`. Si destinataire a une session active + auto-replies enabled + la conversation n'a pas le flag `manual_override`, analyse le texte du message via Gemini Flash Lite (classification simple : looking_for / available / photos / other) et insère la réponse automatique correspondante. Marque le message avec un flag `auto_replied = true` pour affichage côté UI ("Réponse automatique").

## Frontend

### Composants nouveaux

- `src/components/plan-now/PlanNowToggle.tsx` : sheet d'activation (résumé + bouton "Activer pour 5 crédits / 30 min"), countdown live.
- `src/components/plan-now/PlanNowBadge.tsx` : badge ⚡ animé pour les cartes profil + ring jaune/orange sur l'avatar.
- `src/components/plan-now/PlanNowSettingsSheet.tsx` : édition des 3 réponses auto (textareas, 280 caractères max).
- `src/components/plan-now/PlanNowAlbumShareSheet.tsx` : choix de l'album à partager + accept côté destinataire.
- `src/components/messaging/PlanNowAutoReplyBubble.tsx` : variant de bulle avec label "✨ Réponse auto".
- `src/components/messaging/PlanNowComposerBanner.tsx` : bandeau "Auto-réponses actives — Personnaliser la réponse".

### Hooks

- `usePlanNowSession.ts` : session active de l'user courant + countdown.
- `usePlanNowActiveUsers.ts` : liste live (realtime) des plans actifs proches.
- `usePlanNowAutoReplies.ts` : CRUD des réponses auto.
- `usePlanNowAlbumShare.ts` : créer / accepter une demande d'échange.

### Intégrations UI

- **Home** : nouvel onglet "⚡ Plan Now" entre Proximité et Favoris quand au moins 1 profil actif dans le rayon. Cards triées avec ring orange.
- **Profile self** : carte "Recherche Express" dans `ProfileView` avec toggle d'activation.
- **MemberProfile** : badge à côté du nom si actif, bouton "Échanger un album" visible uniquement si les deux ont Plan Now actif.
- **Composer DM** : bandeau jaune si auto-replies actives sur cette conversation, lien "Personnaliser" → flag `manual_override`.
- **Settings drawer** : nouvelle entrée "Plan Now" pour éditer les réponses auto même hors session.

### Sécurité albums Plan Now

- Réutilise le système d'albums existant + bucket privé.
- URLs signées 30 min max (au lieu de 1h standard).
- Watermark renforcé : pseudo destinataire + "Plan Now" + timestamp sur chaque photo.
- `usePreventiveScreenshotBlur` activé dès l'ouverture, log screenshot → sanction immédiate.

## Notifications

- Push "⚡ X est en Plan Now près de toi" envoyé aux profils dans 10 km qui ont opt-in (nouvelle pref `notify_plan_now` dans `notification_preferences`, default true).
- Push "✨ Auto-réponse envoyée à X" pour l'owner de la session, action "Reprendre la main".
- Push "📸 X veut échanger un album" si Plan Now mutuel.

## Admin

- Feature toggle `plan_now_enabled` (default false, à activer après QA).
- Section `/admin/plan-now` : sessions actives en temps réel, revenus générés, durée moyenne, taux de matching, abus reportés.
- `credit_costs.plan_now` (5) éditable depuis `/admin/credit-costs`.

## Étapes d'implémentation

1. **Migration SQL** : tables + RLS + RPC + trigger crédits + entry `credit_costs`.
2. **Hooks + UI activation** : toggle + countdown sur Profile, badge sur cards.
3. **Auto-replies CRUD** : sheet de config + persistence + bandeau composer.
4. **Edge function auto-reply** : trigger + classification Gemini + insertion message.
5. **Album share** : sheet + accept flow + signed URLs 30 min + watermark.
6. **Onglet Home + notifications push** + feature toggle admin.
7. **QA** : 2 comptes test, activation, auto-reply, album share, expiration, abus.

## Points à confirmer

- Durée fixe 30 min ok ? (alternative : 15/30/60 au choix +/- crédits)
- Notification push aux profils proches : opt-in par défaut ou opt-out ?
- Limite quotidienne (ex. max 3 activations / jour) ?
- Auto-replies désactivées automatiquement quand la session expire, ou restent en mémoire pour la prochaine ?
