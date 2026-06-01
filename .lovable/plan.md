# Sécurisation propre : profils & médias

Objectif : refermer les 2 failles rouvertes (colonnes sensibles profils + bucket médias privé accessible à tous) **sans casser l'app**.

## Étape 1 — Bucket médias : séparer public / privé

Créer 2 buckets :
- `media-public` (public) → avatars, photos de profil approuvées, médias de Tweens publics
- `medias-private` (privé) → vérif identité, albums verrouillés, snaps éphémères, photos privées échangées en chat

Policies storage :
- `media-public` : lecture libre pour `authenticated`, écriture restreinte au dossier `auth.uid()`
- `medias-private` : lecture **uniquement** par le propriétaire (`auth.uid() = (storage.foldername(name))[1]`), accès cross-user **uniquement via signed URLs** générées côté serveur (Edge Functions déjà en place pour albums/ID/snaps)

Migration des fichiers existants : laisser le bucket `media` actuel en lecture libre pour `authenticated` (back-compat), et basculer **les nouveaux uploads** vers le bon bucket. Pas de move massif (risque casse URLs).

## Étape 2 — Profils : colonnes safe partout

Re-appliquer le `REVOKE` sur colonnes sensibles (`phone_number`, `first_name`, `last_name`, `latitude`, `longitude`, `location_updated_at`), puis migrer **tous les `select('*')` sur `profiles`** vers `PROFILE_SAFE_COLUMNS`.

Fichiers à scanner & corriger (~10–15) :
- hooks : `useNearbyProfiles`, `useUserFavorites`, `usePrivateConversations`, `useChatRooms`, `useProfileVisits`, `useSwipeActions`, `useStories`, `useTweens`, `useResolvedAvatars`, etc.
- composants : tout ce qui fait `.from('profiles').select('*')`
- pages : `MemberProfile`, `RegionPage`, `SwipePage`

Remplacement systématique : `.select('*')` → `.select(PROFILE_SAFE_COLUMNS)` (via le import existant `src/lib/profileColumns.ts`).

Données privées du user connecté → RPC `get_my_private_profile()` déjà créé.
Données privées d'un autre user (staff uniquement) → RPC `admin_get_full_profile()` déjà créé.

## Étape 3 — Validation

1. Audit : `rg "from\('profiles'\).*select\('\*'\)" src/` → liste exhaustive
2. Corriger chaque occurrence
3. Re-appliquer la migration REVOKE
4. Tester : login, home (proximité/favoris/visites), swipe, chat, profil membre, paramètres
5. Re-run security scan

## Risques

- **~15 fichiers** à modifier (gros diff, mais mécanique)
- Si on oublie un `select('*')` → 401 et écran blanc → on corrige au fur et à mesure
- Migration storage : aucune URL existante cassée, on bascule juste les nouveaux uploads

## Hors scope (pour plus tard)

- Migration physique des anciens fichiers de `media` vers `media-public`/`medias-private`
- Lien de compatibilité sur l'ancien bucket `media` (on le laisse vivre)

Tu valides ce plan ? Je commence par l'audit `rg` puis je fais tout d'un coup avec une grosse PR.
