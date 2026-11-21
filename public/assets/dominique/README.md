# Dominique Soucy — collection photographique pour le site

Ce dossier est conçu pour être **décompressé à la racine** du dépôt `dominique-source/dominiquesoucy`. Les ressources se placeront dans `public/assets/dominique/` et seront immédiatement accessibles dans Next.js via `/assets/dominique/...`.

## Contenu (7 photos × 3 versions = 21 fichiers)

- `originals/` : copies des **vrais fichiers JPEG fournis**, sans modification des visages ou des scènes.
- `vintage/` : corrections de colorimétrie, contraste et grain obtenues à partir des photos, sans génération de personnages.
- `transparent/` : **premières tentatives de détourage** PNG RGBA, susceptibles d'avoir des halos, des parties manquantes ou des imperfections sur les cheveux, les mains et les groupes. **NE PAS les publier automatiquement** avant validation visuelle et finition si nécessaire.

`assets-manifest.json` associe les trois versions de chaque photo.

## Utilisation dans le site

- Hero/À propos : privilégier les portraits `02_portrait_chemise_bleue` ou `05_portrait_ballon`, en version originale ou vintage après validation.
- Parcours sportif : `01_basket_action_archive` et `07_archive_rouge_et_or`.
- Communauté : `03_moment_communautaire` et `04_equipe_purathlete`.
- Dimension humaine : `06_moment_humain`.
- Dans Next.js : `<Image src="/assets/dominique/vintage/02_portrait_chemise_bleue.jpg" alt="Portrait de Dominique Soucy" width={449} height={449} />` (vérifier les dimensions réelles et adapter selon usage).

## Conditions importantes

- Aucun visage ne doit être reconstruit ou régénéré par IA à partir de ces ressources.
- Éviter d'associer de nouvelles légendes factuelles ou des identités non confirmées aux personnes photographiées.
- Vérifier les droits de publication des photos d'archives et des photos avec d'autres personnes avant mise en ligne.
- Si un PNG transparent est imparfait, utiliser son original plutôt que d'afficher un détourage défectueux.
- Ne pas intégrer ce ZIP comme un fichier brut dans `public/` : **décompresser son contenu** dans le dépôt.
