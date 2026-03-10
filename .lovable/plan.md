

# Plan : Amélioration du défilement automatique dans les chats

## Objectif
Faire défiler automatiquement vers le bas dans deux situations :
1. Quand l'autre utilisateur commence à écrire (indicateur de saisie visible)
2. Quand un nouveau message est reçu

## Changements prévus

### 1. PrivateChatRoom.tsx
- Ajouter `isOtherTyping` comme déclencheur de scroll dans le `useEffect`
- Quand l'indicateur de saisie apparaît → scroll automatique vers le bas
- Quand un nouveau message arrive → scroll automatique vers le bas

### 2. ChatRoom.tsx
- Même amélioration pour les chats de groupe
- Ajouter `typingUsers.length` comme déclencheur de scroll

## Détails techniques

```text
┌─────────────────────────────────────┐
│  Événement                          │
├─────────────────────────────────────┤
│  Nouveau message reçu        ──────►│ Scroll vers le bas
│  Autre utilisateur écrit     ──────►│ Scroll vers le bas  
│  Chargement initial          ──────►│ Scroll vers le bas (instantané)
└─────────────────────────────────────┘
```

**Fichiers modifiés :**
- `src/components/chat/PrivateChatRoom.tsx`
- `src/components/chat/ChatRoom.tsx`

**Comportement :**
- Le scroll sera fluide (smooth) pour les événements en temps réel
- Le scroll sera instantané uniquement au chargement initial
- L'indicateur de saisie sera toujours visible en bas de l'écran

