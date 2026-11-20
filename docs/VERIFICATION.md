# Vérification V1 — 19 novembre 2026

Vérifications locales; aucun déploiement exécuté.

- Installation des dépendances réussie; audit npm : aucune vulnérabilité signalée au moment de l’installation.
- `npm test` : 6 tests réussis.
- `npm run lint` : aucune erreur ni avertissement.
- `npm run typecheck` : génération des routes et TypeScript réussis.
- `npm run build` : build de production Next.js 16.4.6 réussi.
- `npm run content:check` : aucun contenu publié livré; dossier intentionnellement vide.
- HTTP : accueil FR/EN, sections, biographie, sitemap, robots et Open Graph disponibles.
- HTTP : slugs inconnus et chemins profonds inconnus renvoient 404; libellés français et anglais vérifiés dans le HTML initial.
- Données temporaires de contrôle local, retirées avant commit : rendu Markdown, filtres, route d’article, traduction manquante avec lien vers l’original, exclusion des brouillons et dates futures.
- Navigateur : vues 375 × 812, 768 × 1024 et 1440 × 900 inspectées; largeur du document égale à la largeur du viewport.
- Menu mobile ouvert/fermé; Échap et bascule FR/EN vérifiés. Aucune erreur ou alerte console observée après rechargement final.
- Paquet serveur : présence explicite de `content/.gitkeep` dans les traces Next.js, pour conserver le dossier vide lors d’un déploiement Vercel.

## Limites et configuration restante

Aucun portrait ou média approuvé n’a été fourni. Les compositions abstraites et les états d’attente sont intentionnels. Aucun vrai épisode n’a donc été lu dans un lecteur tiers; les URLs de fournisseurs sont validées par les tests, mais la disponibilité et les sous-titres de chaque vidéo réelle devront être vérifiés à la publication.

Les liens sociaux, la destination PürInstinct, les textes légaux et les premières publications/traductions restent à fournir. Aucun score Lighthouse ou résultat réel de Core Web Vitals n’est revendiqué.

Pas de workflow GitHub Actions livré : la connexion disponible ne permettait pas de créer un workflow. Toutes les commandes de vérification restent dans `package.json` et peuvent être exécutées en CI ultérieurement.

# Vérification V2 — 19 novembre 2026

## Contrôles exécutés

- `npm ci` : réussi après régénération du verrouillage npm dans un dossier propre. Les dépendances optionnelles transitives manquantes dans V1 sont maintenant incluses; aucune dépendance d’application ajoutée.
- `npm test` : **11 tests réussis**, dont 5 nouveaux tests pour les champs rétrocompatibles, les filtres dérivés du contenu visible, les thèmes invalides, les connexes de série et la parité des dictionnaires FR/EN.
- `npm run lint`, `npm run typecheck`, `npm run content:check`, `npm run build` : réussis.
- Contenu final : **0 entrée Markdown**, aucun fichier de contrôle temporaire conservé dans `content/`.
- HTTP : accueil et rubriques FR/EN, biographie, sitemap, robots et image Open Graph vérifiés. Slugs inconnus et chemins profonds : 404, avec texte initial localisé.

## Contrôles dans le navigateur

Comparaison avec les sept références de `design/brand-v2/references/`. Accueil, Réflexions et Observations inspectés à 375, 768 et 1440 px. Les six pages principales ont aussi été mesurées à 375 px : largeur du document égale à celle du viewport et un seul h1 par page.

- Hero mobile : photo et typographie séparées, boutons accessibles, aucun débordement constaté.
- Menu mobile : ouverture, fermeture par Échap et remise à zéro au changement de langue vérifiées.
- FR/EN : libellés traduits, chemin conservé et langue du document mise à jour lors des navigations sans rechargement.
- Carnet : filtre Éducation testé avec des entrées locales explicites; seulement les entrées correspondantes demeurent. Sans publications, seul « Tout » est proposé.
- Signature : texte exact vérifié dans le DOM; connexes limités à la série et à la langue. Gabarit inspecté sur bureau, tablette et mobile avec des entrées identifiées « APERÇU LOCAL ».
- Partage : bouton « Copier le lien » testé, confirmation « Lien copié » affichée.
- Réduction des animations : règles CSS conservées; aucun changement de préférence système n’a été effectué pour simuler cette option.

Les entrées temporaires ont été retirées avant le build final. Les captures de livraison présentent le site vide réel, sauf une capture séparée et explicitement nommée `signature-qa`, qui illustre le gabarit de contrôle.

## Médias et limites

Aucune photographie originale autorisée n’était présente : les emplacements abstraits sont intentionnels. Aucun portrait IA des maquettes n’a été réutilisé. Le cadrage réel et la lecture des véritables vidéos restent à vérifier lorsque les médias seront fournis. Aucun score Lighthouse ou résultat réel de Core Web Vitals n’est revendiqué.

Aucune fusion de branche ni aucun déploiement effectué. Les références graphiques sont conservées hors de `public/`. La mise en production, les médias autorisés, les contenus et traductions approuvés, les liens officiels et les textes légaux demeurent à compléter.
