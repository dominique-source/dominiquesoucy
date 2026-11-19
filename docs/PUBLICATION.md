# Publier une réflexion, une observation ou The Thought

Le dossier `content/` est la source de vérité de la V1. Aucun CMS ni panneau administrateur n’est connecté. Les fichiers Markdown sont des données : le HTML brut et le JavaScript ne sont pas exécutés. Le futur CMS pourra retourner le même type `Entry` derrière les fonctions de `lib/content.ts`.

## Créer un fichier

Copier le gabarit ci-dessous dans `content/mon-sujet.fr.md`. Il s’agit d’un exemple technique, pas d’un texte de Dominique. Garder `status: draft` tant que le contenu n’est pas approuvé. Les brouillons ne sont jamais servis par les routes publiques, y compris en développement.

```yaml
---
slug: mon-sujet
title: "Titre approuvé"
description: "Résumé approuvé"
category: societe
contentType: reflection
publicationDate: "2026-11-19"
language: fr
coverImage: null
# coverImage: /assets/editorial/mon-sujet.webp
# coverAlt: "Description réelle de l’image approuvée"
# videoUrl: https://www.youtube.com/watch?v=ID_VALIDE
# duration: "10 min"
# captions: /assets/captions/mon-sujet.fr.vtt
tags: [société]
status: draft
featured: false
signature: false
---
Texte approuvé en **Markdown**.
```

Tous les champs non commentés sont requis, sauf `signature` (false par défaut). `coverImage: null` active la composition abstraite; toute photographie nécessite `coverAlt`. Les médias locaux doivent exister dans `public/assets/`. Les images éditoriales sont locales pour éviter les hôtes arbitraires. Les sous-titres utilisent le format WebVTT.

- `category` : `sport`, `societe`, `humain`.
- `contentType` : `reflection` (Réflexions), `observation` (Observations), `thought` (The Thought, dans Observations).
- `publicationDate` : date ISO entre guillemets, interprétée comme jour UTC. Une date future reste masquée jusqu’au jour prévu; aucun service de planification n’est configuré.
- `status` : `draft` ou `published`.
- `featured` : permet de sélectionner une réflexion mise en avant avec `featuredReflection()`. L’accueil réserve « Dernière réflexion » à la plus récente.
- `signature` : activer seulement pour la série « IMAGINE VOULOIR… ». Le texte exact provient de `lib/config.ts` et n’est jamais ajouté à tous les articles.

## Traductions

Créer un deuxième fichier avec **le même slug**, `language: en` et un texte anglais approuvé. Ne jamais produire une traduction éditoriale automatiquement. Sans traduction, la route dans l’autre langue affiche un message localisé et un lien vers l’original. Les libellés d’interface sont dans `lib/i18n.ts`.

## Vidéos et images

YouTube (watch, youtu.be ou embed), Vimeo (identifiant public numérique), MP4 et WebM HTTPS sont acceptés. Les liens privés/signés Vimeo ne sont pas pris en charge en V1. Les fichiers locaux se rangent dans `public/assets/videos/`. Aucun autoplay. Les vidéos externes ne sont chargées qu’après action explicite du visiteur. Pour les vidéos auto-hébergées, fournir une piste WebVTT pour rendre le contenu accessible. Vérifier les droits de chaque média avant publication.

Pour activer le portrait : placer une photo autorisée dans `public/assets/portraits/`, puis remplacer `media.portrait: null` dans `lib/config.ts` par `{ src: "/assets/portraits/dominique.webp", alt: { fr: "Description réelle", en: "Approved description" } }`.

## Vérification et publication

1. Lancer `npm run content:check`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.
2. Lancer `npm start` et vérifier les deux langues, les filtres et la page individuelle.
3. Changer `status` à `published` uniquement après approbation, puis faire réviser la modification par PR.
4. Après fusion et déploiement autorisé, le contenu devient visible. Les listes sont rendues au serveur; la page d’accueil est reconstruite au déploiement. Pour une date future, déclencher un nouveau déploiement le jour de publication.

Ne pas ajouter d’articles fictifs pour remplir les grilles.
