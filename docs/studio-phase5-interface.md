# Studio DOM SOUCY — Phase 5 : refonte de l’interface

Statut : démarrée sur la branche `studio-phase5-interface-20261123`. Base : phase 4, commit `2c092d7ca7cde9e46d28d800e229095852415a5a`.

## Objectif
Transformer le Studio existant en un espace de production audiovisuelle simple et premium, sans reconstruire les moteurs des phases 1 à 4 ni modifier les pages publiques non concernées.

## Parcours cible
1. **Accueil** : « Qu’est-ce qu’on crée aujourd’hui ? » avec deux actions principales : « Nouveau projet » et « Reprendre un projet ».
2. **Import** : médias audio et vidéo, progression explicite, synchronisation et analyse automatiques lorsqu’elles sont disponibles.
3. **Bibliothèque** : projets récents, productions, états de traitement, reprises et archives privées.
4. **Édition** : lecteur de capsules, aperçu des cadrages, révision des extraits, formats 16:9 et 9:16.
5. **Production** : lancement par lots, suivi des 32 MP4 maximum, reprise des échecs, export et archivage privé.
6. **Secours** : panneau avancé discret pour les opérations manuelles et diagnostics.

## Direction visuelle
- Noir dominant, blanc cassé, accent lime mesuré; typographie condensée pour les titres.
- Gros boutons clairs, peu de décisions visibles simultanément, hiérarchie mobile et desktop.
- Ne pas remplacer les vrais médias par des images génériques.
- Représentation inclusive dans tout nouveau visuel humain, notamment des personnes métisses dans les rôles centraux.

## Critères de validation
- Aucun chemin de production des phases 1–4 n’est supprimé.
- Les actions sont branchées sur les fonctions réelles, sans bouton factice.
- Les états d’attente, d’erreur, de reprise et de succès sont visibles.
- Accueil, bibliothèque, lecteur, panneau de secours et navigation fonctionnent sur mobile et ordinateur.
- Tests automatisés et build réussis; validation sur vrais fichiers; déploiement Vercel vérifié avant annonce « en ligne ».

## Garde-fous
- Aucun lancement de rendu cloud autonome non implémenté.
- Ne pas exposer les archives MP4 privées ni leurs liens expirables.
- Ne pas fusionner vers `main` avant revue des modifications et vérifications.
