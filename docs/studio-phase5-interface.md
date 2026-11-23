# DOM SOUCY MEDIA — Phase 5 : Studio Workspace

Implémentation dans la PR #54, branche `studio-phase5-interface-20261123`, basée sur le commit de production phase 4 `2c092d7`.

## Parcours réellement connecté

- **Accueil Studio Live** : écran premium DOM SOUCY avec 3 actions actives, `NOUVEAU PROJET`, `STUDIO LIVE` et `REPRENDRE`; n'utilise pas de faux média ni des images de banques.
- **Reprise rapide** : récupère les vrais projets privés depuis `/api/analysis/projects`, affiche les 4 plus récents avec nombre de médias, capsules, étape, et ouvre `/studio-analyse?project=<id>`.
- **Nouveau projet** : `/studio-analyse?mode=new` crée un projet vierge au lieu de recharger automatiquement le projet récent.
- **Production guidée** : onglets Projets / Import / Analyse / Montage / Production / Réglages +; chaque onglet expose les **composants existants**, sans reconstruire ni déplacer leurs données.
- **Import** : audio original et optimisé, sources Canon/iPhone/Samsung, sauvegardes privées, synchronisation automatique existante et secours.
- **Analyse** : transcription horodatée, correction, analyse IA, questions reconstituées explicitement étiquetées, propositions de capsules.
- **Montage** : lecteur synchronisé, angles enregistrés, bulles, texte, formats, atelier des capsules.
- **Production** : production MP4 par lots, archivage privé et relances des erreurs; pas de promesse de rendu cloud.
- **Avancé** : paramètres du projet, copie de récupération, état de sauvegarde et journal d'incidents.

## Design

Noir `#0A0A0A`, blanc cassé `#F4F4EF`, lime `#CCFF00`, Barlow Condensed bold italic. Responsive 1–3 colonnes, navigation des étapes en 2–6 cases, contrastes et focus accessibles, respect de `prefers-reduced-motion`.

Aucun nouveau visuel humain n'est fabriqué. Toute illustration future devra représenter naturellement des personnes métisses, noires, asiatiques et blanches dans les rôles centraux.

## Validation requise

- GitHub Actions : TypeScript, tests unitaires et build.
- Vérification du statut **production** sur Vercel et du SHA fusionné, distincte du preview.
- Aucun test E2E avec les vrais médias ne peut être inféré des tests CI.
- Les exports de plus de 10 minutes et le rendu vidéo cloud sans navigateur **ne sont toujours pas disponibles**.
- La correspondance des modèles de bulles à l'art final et la synchronisation mot-à-mot restent des limites des moteurs précédents.
- La nouvelle interface simplifie l'accès aux fonctions, mais ne certifie pas encore le parcours intégral de 5 clics.

## Garde-fous

Aucune suppression des composants Studio Live ou ProductionStudio, pas de déplacement des vidéos originales, pas d'archives MP4 publiques, pas de nouvelle authentification, pas de Codex.
