

# Plan : Remplacement du Systeme Premium par un Systeme de Credits

## Resume

Ce projet transforme completement le modele de monetisation de l'application. Le systeme Premium actuel (abonnement mensuel de 5,99EUR) sera remplace par un systeme de credits ou chaque action consomme des credits. Les utilisateurs recevront des credits gratuits quotidiens, des bonus d'inscription, et pourront acheter des credits supplementaires.

## 1. Architecture de la Base de Donnees

### 1.1 Nouvelles Tables

**Table `user_credits`** - Stockage des soldes de credits par utilisateur

```text
+--------------------+------------------+
| Colonne            | Type             |
+--------------------+------------------+
| user_id            | UUID (PK)        |
| daily_credits      | DECIMAL(10,2)    | -- Credits quotidiens (max 5.0)
| bonus_credits      | DECIMAL(10,2)    | -- Credits bonus (parrainage, verification)
| purchased_credits  | DECIMAL(10,2)    | -- Credits achetes
| daily_claims_used  | INTEGER          | -- Nombre de jours utilises ce mois (max 7)
| last_daily_claim   | TIMESTAMPTZ      | -- Derniere recuperation quotidienne
| monthly_reset_date | TIMESTAMPTZ      | -- Date reset mensuel des claims quotidiens
| created_at         | TIMESTAMPTZ      |
| updated_at         | TIMESTAMPTZ      |
+--------------------+------------------+
```

**Table `credit_transactions`** - Historique de toutes les transactions

```text
+--------------------+------------------+
| Colonne            | Type             |
+--------------------+------------------+
| id                 | UUID (PK)        |
| user_id            | UUID             |
| amount             | DECIMAL(10,2)    | -- Montant (+/-)
| credit_type        | ENUM             | -- daily/bonus/purchased
| transaction_type   | TEXT             | -- claim_daily, send_message, etc.
| description        | TEXT             |
| created_at         | TIMESTAMPTZ      |
+--------------------+------------------+
```

**Table `nearby_profiles_unlock`** - Deblocages de profils a proximite

```text
+--------------------+------------------+
| Colonne            | Type             |
+--------------------+------------------+
| id                 | UUID (PK)        |
| user_id            | UUID             |
| unlock_type        | TEXT             | -- '30_extra' ou '130_extra'
| credits_spent      | DECIMAL(10,2)    | -- 5.0 ou 10.0
| unlocked_at        | TIMESTAMPTZ      |
| expires_at         | TIMESTAMPTZ      | -- +72h ou +7j
+--------------------+------------------+
```

**Table `profile_view_credits`** - Suivi des vues de profils

```text
+--------------------+------------------+
| Colonne            | Type             |
+--------------------+------------------+
| id                 | UUID (PK)        |
| viewer_user_id     | UUID             |
| viewed_user_id     | UUID             |
| credits_spent      | DECIMAL(10,2)    |
| viewed_at          | TIMESTAMPTZ      |
+--------------------+------------------+
```

### 1.2 Fonctions SQL

- `deduct_credits(user_id, amount, transaction_type, description)` - Deduction intelligente (quotidien > bonus > achete)
- `add_credits(user_id, amount, credit_type, description)` - Ajout de credits
- `claim_daily_credits(user_id)` - Recuperation des 5 credits quotidiens
- `get_user_credit_balance(user_id)` - Solde total et par type
- `check_sufficient_credits(user_id, amount)` - Verification du solde

## 2. Grille Tarifaire des Credits

| Action                           | Cout        |
|----------------------------------|-------------|
| Message prive (texte)            | 0.1 credit  |
| Message groupe (texte)           | 0.1 credit  |
| Photo simple (prive/groupe)      | 0.02 credit |
| Video simple (prive/groupe)      | 0.02 credit |
| Photo/Video groupe               | 0.2 credit  |
| Photo/Video ephemere             | 0.5 credit  |
| Partage d'album                  | 1.0 credit  |
| Creer 2eme album (et suivants)   | 10.0 credits|
| Reaction profil                  | 0.3 credit  |
| Consulter un profil              | 0.1 credit  |
| Debloquer 30 profils (72h)       | 5.0 credits |
| Debloquer 130 profils (7j)       | 10.0 credits|

## 3. Credits Gratuits et Bonus

| Evenement                                  | Credits   |
|--------------------------------------------|-----------|
| Inscription                                | 15.0 (10 + 5 bienvenue) |
| Verification identite                      | 30.0      |
| Credit quotidien (7 jours/mois max)        | 5.0/jour  |
| Parrainage reussi (filleul verifie)        | 10.0 chacun |

### Regles Credits Quotidiens

- Maximum 7 reclamations par mois calendaire
- Non cumulables (doivent etre reclames chaque jour)
- Reset au debut de chaque mois

## 4. Systeme de Parrainage Modifie

Le parrainage actuel base sur 3 mois d'abonnement consecutifs sera remplace :
- Quand un filleul complete la verification d'identite
- Le parrain ET le filleul recoivent chacun 10 credits bonus
- Suivi visible des filleuls et de leur statut de verification

## 5. Composants UI a Creer/Modifier

### 5.1 Nouveaux Composants

**`CreditBalanceBar.tsx`** - Barre de progression multi-couleurs
- Vert : credits quotidiens
- Bleu fonce : credits bonus  
- Bleu clair : credits achetes
- Affiche le total restant

**`CreditPurchasePage.tsx`** - Page d'achat de credits
- 100 credits pour 5,99EUR
- Integration lien Revolut existant

**`DailyCreditsClaimCard.tsx`** - Carte de recuperation quotidienne
- Affiche jours restants ce mois
- Bouton "Reclamer 5 credits"
- Cooldown 24h

**`CreditHistorySheet.tsx`** - Historique des transactions

### 5.2 Composants a Modifier

- `PremiumPage.tsx` -> `CreditsPage.tsx`
- `PremiumBadge.tsx` -> Supprime ou adapte
- `ReferralSection.tsx` - Nouveau systeme de recompense
- `UpgradePrompt.tsx` -> Prompt achat credits
- Tous les hooks d'envoi (messages, medias, reactions, profils)

### 5.3 Hook Principal

**`useCredits.ts`** - Gestion centralisee des credits
- Soldes par type
- Deduction avec verification
- Reclamation quotidienne
- Historique

## 6. Modifications des Hooks Existants

### Messages Prives (`usePrivateMessages.ts`)
- Avant envoi : verifier 0.1 credit (texte) ou 0.02 (media)
- Deduire via `deduct_credits()`
- Afficher erreur si insuffisant

### Messages Groupes (`useMessages.ts`)
- Texte : 0.1 credit
- Photo/Video : 0.2 credit

### Media Ephemere (`useEphemeralMediaUpload.ts`)
- Verifier et deduire 0.5 credit

### Albums (`useAlbums.ts`)
- Premier album : gratuit
- Albums suivants : 10 credits
- Partage : 1 credit

### Reactions Profil (`useProfileReactions.ts`)
- Deduire 0.3 credit (ajout uniquement, retrait gratuit)

### Vue Profil (`MemberProfile.tsx`)
- Deduire 0.1 credit premiere visite
- Tracker dans `profile_view_credits`
- Ne pas facturer les revisites

### Profils Proches (`useNearbyProfiles.ts`)
- Gerer les deblocages temporaires
- Verifier `nearby_profiles_unlock`

## 7. Panel Admin

### Modifications `PremiumActivationPanel.tsx`

Remplacer par `CreditsManagementPanel.tsx` :
- Recherche utilisateur
- Ajout/Retrait de credits manuels
- Historique des transactions utilisateur
- Vue des deblocages actifs

### Nouveau Panel Stats Credits

- Total credits en circulation
- Credits achetes vs gratuits
- Transactions par type

## 8. Fichiers Concernes

### A Creer
- `src/hooks/useCredits.ts`
- `src/components/credits/CreditBalanceBar.tsx`
- `src/components/credits/CreditPurchasePage.tsx`
- `src/components/credits/DailyCreditsClaimCard.tsx`
- `src/components/credits/CreditHistorySheet.tsx`
- `src/components/admin/CreditsManagementPanel.tsx`

### A Modifier
- `src/hooks/useSubscription.ts` - Supprimer ou adapter
- `src/hooks/useUserUsage.ts` - Remplacer par logique credits
- `src/hooks/usePrivateMessages.ts`
- `src/hooks/useMessages.ts`
- `src/hooks/useEphemeralMediaUpload.ts`
- `src/hooks/useAlbums.ts`
- `src/hooks/useProfileReactions.ts`
- `src/hooks/useNearbyProfiles.ts`
- `src/hooks/useReferral.ts`
- `src/hooks/useIdentityVerification.ts`
- `src/components/premium/PremiumPage.tsx`
- `src/components/premium/ReferralSection.tsx`
- `src/components/admin/PremiumActivationPanel.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/pages/Admin.tsx`
- `src/pages/MemberProfile.tsx`

### A Supprimer/Deprecier
- `src/components/premium/PremiumBadge.tsx`
- `src/components/premium/UpgradePrompt.tsx`
- `src/components/premium/PremiumUserBadge.tsx`

## 9. Migration de Donnees

- Les utilisateurs Premium actuels recevront un bonus de credits equivalent
- Les credits quotidiens seront disponibles immediatement
- Bonus inscription pour les nouveaux utilisateurs

## 10. Securite

- RLS sur toutes les nouvelles tables
- Transactions atomiques pour les deductions
- Verification serveur (pas seulement client)
- Logs de toutes les transactions

---

## Section Technique Detaillee

### Types TypeScript

```typescript
interface UserCredits {
  userId: string;
  dailyCredits: number;
  bonusCredits: number;
  purchasedCredits: number;
  totalCredits: number;
  dailyClaimsUsed: number;
  canClaimDaily: boolean;
  daysUntilMonthlyReset: number;
}

interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  creditType: 'daily' | 'bonus' | 'purchased';
  transactionType: string;
  description: string;
  createdAt: string;
}

type CreditActionType = 
  | 'private_message_text' 
  | 'private_message_media'
  | 'group_message_text'
  | 'group_message_media'
  | 'ephemeral_media'
  | 'album_share'
  | 'album_create'
  | 'profile_reaction'
  | 'profile_view'
  | 'nearby_unlock_30'
  | 'nearby_unlock_130';
```

### Configuration des Couts

```typescript
export const CREDIT_COSTS = {
  private_message_text: 0.1,
  private_message_media: 0.02,
  group_message_text: 0.1,
  group_message_media: 0.2,
  ephemeral_media: 0.5,
  album_share: 1.0,
  album_create: 10.0,
  profile_reaction: 0.3,
  profile_view: 0.1,
  nearby_unlock_30: 5.0,
  nearby_unlock_130: 10.0,
} as const;

export const CREDIT_REWARDS = {
  signup: 15.0, // 10 + 5 bienvenue
  identity_verification: 30.0,
  daily_claim: 5.0,
  referral_success: 10.0, // pour chaque partie
} as const;
```

### Ordre de Priorite de Deduction

```sql
-- Dans la fonction deduct_credits()
1. Utiliser daily_credits jusqu'a epuisement
2. Completer avec bonus_credits si necessaire
3. Utiliser purchased_credits en dernier
```

