# Corriger le décalage sur iPhone XR

## Objectif
Stabiliser l’affichage sur les iPhone à encoche, notamment l’iPhone XR, en portrait comme en paysage.

## Modifications
- Unifier la hauteur visible de l’application avec les unités adaptées à Safari iOS et un repli pour les anciennes versions.
- Empêcher tout débordement horizontal du document sans réduire artificiellement la largeur des éléments internes.
- Appliquer les zones sûres de l’iPhone de façon cohérente aux écrans principaux et aux barres fixes.
- Rendre la fenêtre de confirmation d’âge défilable et correctement espacée sur les écrans iPhone courts.
- Vérifier le résultat aux dimensions iPhone XR en portrait et paysage.

## Détails techniques
- Centraliser les variables CSS de zones sûres et de hauteur mobile.
- Corriger la règle globale `max-width` susceptible de déformer les éléments positionnés ou animés.
- Conserver les règles existantes de navigation et l’apparence actuelle.
