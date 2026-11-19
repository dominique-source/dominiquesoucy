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
