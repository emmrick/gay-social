---
name: Peephole reveal lens
description: Anti-screenshot reveal lens for ephemeral selfie images — heavy blur + watermark by default, press-and-drag a circular peephole to view; ephemeral timer only counts while revealing.
type: feature
---
Composant : `src/components/security/PeepholeReveal.tsx`.

Comportement :
- Média rendu deux fois : couche floutée (blur 38px, brightness .45, scale 1.15) + couche claire masquée par `radial-gradient` (rayon 95px par défaut).
- Press-and-hold + glissement met à jour la position via pointer events ; `setPointerCapture` pour suivre le doigt hors zone.
- Anneau blanc (border + glow) suit le doigt ; hint animé (icône Hand) quand inactif.
- Watermark `GaySocialWatermark` toujours visible par-dessus le flou.

Intégration `EphemeralMediaViewer` :
- Activé uniquement pour `type === 'image'`.
- Initial `isPaused = true` pour les images → le countdown ne s'écoule que pendant `onRevealChange(true)`.
- Les handlers pointer du conteneur (tap-to-advance / long-press-to-pause) sont désactivés pour les images.
- Drag-to-reply Framer désactivé pour les images (conflit avec le suivi du doigt).
- Vidéos : comportement Snapchat classique conservé (tap = next, hold = pause).
