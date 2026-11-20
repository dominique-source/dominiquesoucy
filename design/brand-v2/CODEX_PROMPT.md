# CODEX — Implémenter la V2 visuelle du site Dominique Soucy

Tu es un lead creative developer et design engineer. Travaille sur **https://github.com/dominique-source/dominiquesoucy**, à partir de la **V1 existante sur la PR #1** (`codex/dominiquesoucy-v1`). **Ne recrée pas l'application. Ne déploie pas. Ne fusionne pas `main` sans approbation.**

## 0. Inspection
Inspecter les fichiers existants (`app/[lang]`, `components`, `lib`, `app/globals.css`, contenu, tests). Lire `design/brand-v2/BRAND_GUIDELINES.md` et les références dans `design/brand-v2/references/`. Respecter les fonctionnalités V1 : FR/EN, routes, Markdown/Zod, filtres, brouillons exclus, vidéo, métadonnées, accessibilité, tests.

## 1. Objectif
Transformer la V1 technique en site média personnel premium correspondant aux maquettes de référence. Ni landing page SaaS, ni clone de Nike/Apple, ni grille répétée sur chaque page. **Créer une architecture réellement différente par section** tout en partageant des tokens, polices, navigation, animations et détails lime.

## 2. Design
Palette exacte : `#0A0A0A`, `#F4F4EF`, `#797979`, `#CCFF00`; présence lime accrue de 20 % dans l'accueil approuvé. Titres Barlow Condensed ou alternative licenciée, grande échelle typographique, italiques, grilles asymétriques, cohérence PürInstinct discrète; images documentaires autorisées, aucune fausse photo d'auteur. Placeholders composés proprement si portrait réel absent. Images de maquettes = références visuelles **jamais** des backgrounds plein écran du site final.

## 3. Pages à coder / refondre
### Accueil `/fr`, `/en`
Référence `01-accueil-desktop-lime.png` : identité Dominique, gros portrait réel si disponible, slogan, CTA, derniers contenus si publiés, repères Observations / Sport & culture / Société, connexion PürInstinct. Ne pas montrer de faux épisodes pour combler les vides.

### Accueil mobile
Référence `02-accueil-mobile.png` : composition sur mesure à 375px; hiérarchie nette, portrait / texte sans collision, boutons utilisables au toucher, cartes verticales, menu mobile et langue.

### Réflexions
Référence `03-reflexions-desktop.png` : **expérience vidéo d'abord**, lecteur réel seulement si contenu disponible, texte de la réflexion et transcription lorsqu'elle existe, bibliothèque/listing. Ne pas inventer « épisode #24 », durée ou date. Le plein hero portrait d'accueil ne doit pas réapparaître.

### Observations
Référence `04-observations-desktop.png` : **carnet éditorial**, filtres fonctionnels, grille asymétrique / masonry accessible avec photo, texte, vidéo téléphone. Composition nettement différente de l'accueil. Les contenus doivent sortir du modèle actuel, mais garder le schéma type-safe.

### Article signature « Imagine vouloir… »
Référence `05-article-imagine-vouloir.png` : gabarit d'article immersif, photo contextualisée si autorisée, texte lisible, liens connexes issus de vrais contenus seulement. Citation exacte : « Imagine vouloir tenter de prendre au sérieux la société dans laquelle tu vis, voter, et ensuite voir ça… ». Pas de fausse donnée d'engagement ni de date inventée.

### À propos
Conserver la page V1 fonctionnelle; ne pas inventer de maquette prétendument validée. Prévoir une future direction narrative distincte.

## 4. Réutilisabilité
Centraliser tokens et composants; différencier les *templates* Home, VideoEditorial, FieldNotes, ArticleReading. Utiliser Next.js Image, formats optimisés, import de médias réels approuvés lorsque livrés. Les boutons/menus doivent mener à des routes réelles. Conserver i18n et SEO.

## 5. Qualité
Vérifier desktop 1440px, tablette 768px, mobile 375px; pas de débordement horizontal; navigation clavier, alt, contrastes, reduced motion. `npm ci`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run content:check`. Vérifier les pages FR/EN et cas sans contenu; ne pas modifier les contenus publiés sans accord.

## 6. Livraison
Créer une branche de travail appropriée depuis la tête de la PR #1 (ou modifier sa branche si explicitement possible), produire les changements et ouvrir/mettre à jour une PR sans fusion ni déploiement. Fournir lien de PR, captures desktop/mobile si disponibles, liste des fichiers modifiés, tests, blocages et médias manquants.

**Commencer par inspection du repo, puis implémenter les véritables compositions, pas simplement écrire un plan.**
