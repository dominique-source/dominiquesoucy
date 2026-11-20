# Vidéo adaptative

`AdaptiveVideo` réutilise le lecteur sécurisé et la normalisation des sources YouTube, Vimeo et MP4/WebM de V2. Il réserve le ratio avant tout chargement et ne change pas la géométrie à l’activation du lecteur.

```tsx
<AdaptiveVideo
  videoUrl="https://www.youtube.com/watch?v=6Zy87nhpHS8"
  orientation="portrait"
  layout="featured"
  title="PILOTE — ÉPISODE 00"
  poster={null}
  lang="fr"
/>
```

Propriétés : `videoUrl`, `title`, `orientation` (`portrait`, `landscape`, `square`), `poster` (chemin local sous `/assets/`), `captions` (WebVTT local), `layout` (`featured`, `article`, `card`), `lang` (`fr`, `en`). Valeurs par défaut : paysage, article, français.

## Publication

Ajouter au frontmatter existant :

```yaml
orientation: portrait
# poster: /assets/portraits/dominique-chemise-blanche.webp
# captions: /assets/captions/reflexion.fr.vtt
# videoDimensions: { width: 1080, height: 1920 }
```

`orientation` explicite a toujours priorité. Sinon, `videoDimensions` peut fournir la forme à partir des dimensions **réellement inspectées dans la source**. Sans ces informations, une ancienne publication reste en paysage. Aucune requête de métadonnées tierce ni inférence depuis un identifiant YouTube, un chemin Shorts ou `mediaAspect` n’est effectuée. `mediaAspect` conserve son rôle de cadrage des images V2.

Les trois cadres sont 9:16, 16:9 et 1:1. Le fichier vidéo est toujours affiché avec `object-fit: contain`; une source de ratio intermédiaire reste entière avec des bandes. Les iframes restent dans leur cadre et la vidéo est rendue par les contrôles du fournisseur. Aucune transformation, découpe ou mise à l’échelle forcée du contenu vidéo n’est appliquée. Si le ratio déclaré ne correspond pas à la source, le fournisseur peut ajouter des bandes; corriger le frontmatter plutôt que recadrer la vidéo.

Les portraits sont centrés avec une hauteur maximale exprimée en hauteur de viewport et plafonnée en pixels. Le contexte `card` possède une limite plus compacte. À petite hauteur d’écran, le cadre reste vertical, réduit en largeur et en hauteur, sans déformer la vidéo.

## Chargement et accessibilité

- Aucun iframe ni requête vidéo tierce avant l’activation explicite.
- Les iframes utilisent le domaine YouTube sans cookies ou le lecteur Vimeo normalisé et `loading="lazy"`.
- Les affiches locales sont chargées paresseusement avec un ratio déjà réservé et un affichage `contain`.
- Les fichiers locaux utilisent les contrôles natifs, `preload="none"` et une piste WebVTT si fournie. Les sous-titres des vidéos externes sont ceux du fournisseur.
- Aucun autoplay ni son déclenché automatiquement. L’activation déplace le focus vers l’iframe; titre accessible, focus visible et commandes clavier conservés.
- Les vidéos des cartes ont leur propre zone interactive, séparée du lien vers l’article.

## Pilote

Le pilote fourni est configuré dans `pilotVideo` (`lib/config.ts`) : URL approuvée, orientation portrait, variante featured et libellé exact **PILOTE — ÉPISODE 00**. Il apparaît dans Réflexions en l’absence de publication à la une et sans filtre actif.

Ce pilote n’est pas une fausse publication Markdown : aucun titre éditorial, durée, date ni transcription n’est ajouté. Le libellé sert aussi de nom accessible au lecteur. Les interfaces FR/EN entourent le même média original, sans prétendre proposer une traduction vidéo.

L’original autorisé de Dominique en chemise blanche n’était pas présent dans le dépôt. Quand il sera ajouté sous `public/assets/`, renseigner `pilotVideo.poster` avec son chemin local. Ne pas extraire un visage des maquettes ni substituer une autre personne. En attendant, le fond graphique DS est intentionnel. `npm run content:check` vérifie l’existence d’une affiche configurée.

## Vérifier

`npm test` comprend la matrice 3 orientations × 3 variantes, pour les vidéos externes différées et les fichiers natifs, ainsi que les orientations explicites, valeurs par défaut, dimensions sources, affiches et URLs invalides.

Vérifier également dans le navigateur à 375, 768 et 1440 px : ratio mesuré, hauteur limitée, absence de débordement et cadre inchangé avant/après activation. Vérifier les médias réels, affiches et sous-titres à chaque publication.
