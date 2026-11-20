# Dominique Soucy — V2

**SPORT. SOCIÉTÉ. HUMAIN.** Un média personnel indépendant. « Le sport comme miroir de la société. »

Projet Next.js App Router, TypeScript strict, React, Tailwind CSS 4, Markdown (`gray-matter` + `react-markdown`), validation Zod. Interface française canadienne par défaut, anglais disponible. Barlow Condensed et Inter sont livrées localement via Fontsource, sous licence SIL OFL (licences incluses dans les paquets installés). Aucun portrait, article, épisode, compte social ou lien commercial fictif.

## Démarrer

Node.js **22 LTS ou plus récent compatible** et npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Ouvrir `http://127.0.0.1:3000`. `/` redirige vers `/fr`. Toutes les routes publiques sans préfixe (`/reflexions`, etc.) redirigent vers leur version française. FR/EN conserve le chemin courant. Les filtres de catégorie se réinitialisent lors d’un changement de langue.

## Pages

Chaque route existe sous `/fr` et `/en` :

| Chemin                 | Fonction                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `/`                    | Accueil éditorial, dernière réflexion, observations, sujets, biographie, PürInstinct |
| `/reflexions`          | Réflexions longues, filtres par catégorie                                            |
| `/reflexions/[slug]`   | Article/vidéo et métadonnées                                                         |
| `/observations`        | Observations et The Thought, filtres                                                 |
| `/observations/[slug]` | Texte court, photo ou vidéo                                                          |
| `/sport-culture`       | Publications de la catégorie sport                                                   |
| `/societe`             | Publications de la catégorie société                                                 |
| `/a-propos`            | Biographie limitée aux faits fournis                                                 |

Les alias d’article sous un sujet redirigent vers la route canonique du format. Les slugs inexistants donnent une page 404. Une traduction manquante affiche un message localisé avec le lien original et `noindex`.

## Direction artistique V2

L’accueil, la bibliothèque vidéo, le carnet d’observations et les articles signature possèdent des compositions distinctes. La V2 conserve le système éditorial de la V1; elle n’ajoute aucun contenu fictif. Les références originales sont dans `design/brand-v2/`, hors de `public/`. Voir [la correspondance avec les maquettes](design/brand-v2/IMPLEMENTATION.md).

## Architecture et fichiers

- `app/layout.tsx` : document HTML et polices locales; langue initiale transmise par le proxy.
- `app/[lang]/` : layout localisé, accueil, sections, articles, 404, transition de page.
- `app/globals.css` : base V1; `app/brand-v2.css` : tokens et compositions V2 responsive.
- `app/og/route.tsx` : image Open Graph 1200 × 630 générée localement, FR/EN.
- `app/sitemap.ts`, `app/robots.ts` : indexation.
- `proxy.ts` : préfixe français par défaut; actifs et métadonnées exclus.
- `components/site.tsx` : Header, Hero, AboutPreview, PurInstinctBridge, Footer, portrait configurable.
- `components/navigation.tsx` : navigation active, MobileNavigation animée, FR/EN.
- `components/editorial.tsx` : cartes et briques éditoriales communes.
- `components/home-editorial.tsx` : portes d’entrée et signature de l’accueil.
- `components/editorial-templates.tsx` : VideoEditorial, FieldNotes, SubjectEditorial et filtres.
- `components/article-reading.tsx` : lecture classique et gabarit signature, contenus connexes.
- `components/share-controls.tsx` : partage natif, copie et repli accessible.
- `lib/brand-copy.ts` : nouveaux libellés V2 FR/EN.
- `components/video-player.tsx` : lecteur responsive et activation explicite des intégrations.
- `components/reveal.tsx` : apparitions au défilement via IntersectionObserver, contenu visible sans JS.
- `lib/content.ts` : schéma, validation, tri, filtres, brouillons, sélection à la une; interface à conserver pour un futur CMS.
- `lib/i18n.ts` : dictionnaires centralisés et types de routes.
- `lib/config.ts` : identité, médias, liens approuvés et signature exacte.
- `lib/video.ts`, `lib/metadata.ts` : normalisation des lecteurs et SEO.
- `content/` : publications Markdown, vide intentionnellement à la livraison.
- `public/assets/{brand,portraits,editorial,videos,captions}/` : médias approuvés.
- `docs/PUBLICATION.md` : guide complet et gabarit de publication.
- `tests/` : validation éditoriale et normalisation vidéo.

Le document HTML utilise le rendu dynamique pour garantir la langue correcte dès la première réponse, y compris pour les 404. Les composants sont rendus au serveur, sauf les interactions ciblées (menu, changement de langue, reveals, activation vidéo). Pas de dépendance d’animation lourde : CSS et APIs natives suffisent. Le menu est un panneau de navigation non modal, se ferme avec Échap et rend le focus au bouton. Les liens masqués sont inertes. `prefers-reduced-motion`, focus visibles, lien d’évitement et lecteurs natifs sont pris en charge.

`SocialGraphic` expose les formats portrait 4:5, vertical 9:16 et paysage 16:9 et une variante de série. C’est un composant réutilisable pour des compositions approuvées, pas un outil de publication sur les réseaux sociaux. `/og` est l’image de partage réelle du site.

## Configuration à compléter

Copier `.env.example` vers `.env.local`. `SITE_URL` vaut `https://dominiquesoucy.com` par défaut. Définir uniquement des destinations HTTPS confirmées pour `PURINSTINCT_URL`, `INSTAGRAM_URL`, `FACEBOOK_URL`, `YOUTUBE_URL`. Les liens absents ne sont pas affichés.

Fournir les portraits autorisés, premiers contenus et traductions approuvées, ainsi que les textes légaux/confidentialité avant mise en ligne publique. Le pied de page affiche pour l’instant un libellé explicite, sans fausse page juridique. Aucun suivi, formulaire d’inscription ou stockage de visiteurs n’est installé.

## Contrôles

```sh
npm run content:check
npm test
npm run lint
npm run typecheck
npm run build
npm start
```

Les tests couvrent brouillons, dates futures, dates invalides, filtres, ordre, featured, chemins canoniques, doublons, alt text et sources vidéo. Les données de test restent dans `tests/`, jamais dans le contenu publié. Pour les modifications visuelles, vérifier au minimum 375, 768 et 1440 px, le menu clavier, FR/EN, les erreurs 404 et les contenus réels avant publication.

## Déployer sur Vercel — après autorisation

Aucun déploiement n’est effectué par ce dépôt ou cette livraison.

1. Faire réviser puis fusionner la PR dans `main`.
2. Dans Vercel, choisir **Add New → Project**, importer `dominique-source/dominiquesoucy`.
3. Sélectionner **Next.js**, racine `./`, branche de production `main`, Node.js 22 LTS, installation `npm ci`, build `npm run build`; conserver le répertoire de sortie par défaut de Next.js.
4. Ajouter `SITE_URL=https://dominiquesoucy.com` et seulement les liens approuvés. Ne pas copier de secrets dans le dépôt.
5. Déployer uniquement une fois autorisé. Vérifier les routes FR/EN, pages éditoriales, 404, `/sitemap.xml`, `/robots.txt` et `/og?lang=fr` sur l’URL fournie.
6. Dans **Project Settings → Domains**, ajouter `dominiquesoucy.com` et éventuellement `www.dominiquesoucy.com`. Appliquer chez le fournisseur DNS les valeurs exactes indiquées par Vercel. Choisir le domaine canonique et vérifier le certificat HTTPS.
7. Les prochains pushes pourront déclencher des déploiements automatiques une fois l’intégration Git activée. Régler ces automatisations selon le processus d’approbation retenu.

Documentation officielle : [Next.js sur Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [domaines](https://vercel.com/docs/domains/working-with-domains/add-a-domain).
