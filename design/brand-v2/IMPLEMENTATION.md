# Traduction des références en composants V2

Les sept images de référence et les trois documents originaux ont été extraits de `dominiquesoucy-brand-v2.zip`, ajouté au dépôt sur `main`. Aucun commit de `main` n’a été fusionné pour cette intégration. Les originaux sont conservés ici pour la revue; ils ne sont pas servis comme des pages ou médias publics.

| Référence | Mise en œuvre |
| --- | --- |
| 01 — Accueil desktop lime | Hero à deux plans, nom condensé, diagonale lime, CTA contrastés et quatre portes d’entrée éditoriales compactes. Sans photographie originale, composition abstraite explicitement identifiée. |
| 02 — Accueil mobile | Ordre propre au téléphone : identité, positionnement, emplacement photo séparé, mission, boutons pleine largeur, cartes verticales. Aucun chevauchement texte/portrait. |
| 03 — Réflexions | Salle de projection sombre, lecteur et introduction issus du contenu réel; bibliothèque sur fond ivoire. Aucun portrait d’accueil répété. Aucun faux lecteur ou épisode si aucun contenu n’est publié. |
| 04 — Observations | Carnet de terrain, titre souligné lime, grille asymétrique en ordre DOM, filtres issus des sujets réellement publiés. État vide graphique distinct d’une grille de fausses publications. |
| 05 — Article signature | Masthead « IMAGINE VOULOIR… », photographie contextuelle si fournie, colonne de lecture et colonne de contenus connexes réels. Partage natif/copie fonctionnels. |
| 06 — Identité portrait | Grande échelle du nom, contraste, diagonales et lignes de terrain abstraites. Aucun visage IA réutilisé. |
| 07 — Signature | Phrase officielle intégrale, touches lime et composants partageables; usage limité à la série explicitement assignée dans le frontmatter. |

## Organisation

`app/brand-v2.css` contient les tokens et compositions V2, importés après les styles de base V1. Les systèmes de publication, localisation, SEO, vidéo et navigation restent en place.

- `Hero`, `Portrait`, `PurInstinctBridge` : identité et médias configurables.
- `EditorialEntryPoints`, `HomeSignature` : progression de l’accueil.
- `VideoEditorial`, `FieldNotes`, `SubjectEditorial` : compositions distinctes des rubriques.
- `ArticleLayout` : lecture classique ou gabarit signature selon `signature`.
- `ShareControls` : partage natif et copie avec repli accessible.
- `brandCopy` : nouveaux libellés FR/EN centralisés.

## Choix et limites

La présence lime est renforcée par les diagonales, soulignements, boutons, règles et accents de titres; « environ 20 % » est une direction visuelle, pas une mesure pixel revendiquée. Les flèches de navigation des maquettes sont remplacées par des libellés explicites et des accents sobres. Les filtres vides, recherche décorative, métriques fictives et commandes audio sans média réel ne sont pas reproduits.

Le cadrage photographique réel reste à valider lorsque les originaux autorisés seront fournis. Les grilles et les articles seront contrôlés à nouveau avec le vrai volume de contenu. La biographie conserve les faits de V1, sans présenter sa composition comme une maquette approuvée.
