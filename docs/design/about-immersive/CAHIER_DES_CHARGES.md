# DS. — THE HUMAN UNIVERSE
## Cahier de production • À propos • 24 novembre 2026

**Intention :** une expérience à travers le regard de Dominique Soucy, non une biographie conventionnelle ni une prétention à la vérité universelle. Un univers individuel parmi des milliards. La sensibilité artistique perçoit, dans des choses banales, la beauté, la laideur, un problème ou une solution. Le changement d'échelle traduit la tension entre vie intérieure et participation à la société. Proposition d'accroche (à valider) : « Je suis un univers parmi des milliards d'autres. Voici celui à travers lequel je perçois le monde. »

### Autorité des références
Les trois JPEG d'origine sont conservés octet pour octet. 01 et 05 sont maîtres visuels ; REF-SOCIETE est maître conceptuel, mais son faux portrait ne doit jamais être affiché. Les 02, 03, 04 ont été acceptées comme groupe ; 06, 07, 08 sont des références de travail (survol Sport, planche de transition, écran d'entrée L'Être sans bibliothèque). 09–12 sont des propositions de destinations, pas des textes définitifs ni des pages déjà codées. 08 doit être complétée selon le même gabarit que les autres zones. Toutes les maquettes générées sont des images composites aplaties ; les assets-web sont des conversions, pas des calques indépendants. Le projet ne dispose pas encore de modèle 3D, vrais clips, audio ou masques photoréalistes isolés. Les coordonnées proposées servent de départ, à vérifier visuellement. Ne pas afficher les annotations des maquettes au public.

### Grammaire visuelle
Noir #0A0A0A ; blanc #F4F4EF ; lime #CCFF00 ; lignes #30302E ; texte secondaire #AAA. Couleur naturelle de peau brune, photographie chaude désaturée, contraste, lumière directionnelle. La lime sert seulement à l'interaction, aux chemins actifs et aux repères. Laisser du noir respirer. Typographie actuelle confirmée dans app/layout.tsx : Barlow Condensed 800 italic (`--font-display`), Inter 400/600 (`--font-sans`). Réutiliser les fontes chargées par Next, aucun fichier de police livré. H1 48–112 px fluides, H2 32–56 px, corps 16–18 px, étiquettes 11–13 px. Garder le logo officiel et la navigation existants ; les variations de logo, menu ou titres dans les maquettes n'ont aucune autorité. Pas de portrait de Dominique sans photo réelle validée, pas de doigt pointé vers un portail, pas de mysticisme ou de couleurs saturées. Montrer naturellement des personnes métisses, noires, asiatiques et blanches, également au premier plan et en position d'initiative. Ne pas présenter les acteurs ou familles illustratifs comme de vrais proches.

### Parcours et rythme (valeurs proposées à ajuster au prototype)
| Écran | Référence | Comportement |
|---|---|---|
| 01 | Empreinte originale | Plein écran, 1–2 % de mouvement, accès direct Passer |
| 02 | Dézoom | 900 ms, texture → doigt, parallaxe faible, continuité du point focal |
| 03 | Société | 1200 ms, main de premier plan, ville diverse, bulles et connexions progressives |
| 04 | Terre | 1300 ms, dézoom vers l'orbite ; ville et bulles se dissipent, planète seule à la fin |
| 05 | Main originale | 1200 ms, retour à la paume ; cinq boutons prêts, intro réversible |
| 06 | Survol | 600 ms, un doigt actif, autres à 45–65 % ; halo et chemin lime, label et question |
| 07 | Clic | 0–500 ms : zoom vers le doigt ; 500–1000 : macro ; 1000–1800 : match cut vers destination |
| 08–12 | Destinations | Titre et contenus HTML, aperçu de l'univers, médias authentiques, retour à la main |

L'entrée est au choix : scroll par étapes ou boutons précédent/suivant, sans imposer un film. Le pointeur agit comme un outil d'exploration, pas un viseur de jeu. Au retour du doigt vers la main : mouvement inverse 1000–1400 ms, rétablissement du focus. Sortir d'un univers ne force pas à rejouer l'intro. Le scroll de lecture n'est pas confondu avec l'intro. Interruption, Esc, navigateur arrière/avant et changement de taille doivent rester fiables. Prévoir bouton Revoir l'intro et option réduire mouvement.

### Gabarit éditorial commun
01 L'Être / The Self — Qui suis-je ? — introspection, identité, ego, conscience, philosophie. Transition sillons → reliefs. 02 Le Sport / Sport — Pourquoi jouons-nous ? — sport comme laboratoire humain, compétition, leadership, éducation. Transition sillons → lignes du terrain. 03 La Société / Society — Comment vivons-nous ensemble ? — valeurs collectives, institutions, culture, éducation. Transition sillons → rues, bulles. 04 La Création / Creation — Que puis-je faire exister ? — art, entrepreneuriat, vision et innovation. Transition sillons → croquis. 05 La Transmission / Legacy — Que vais-je laisser ? — famille, relations, mentorat, héritage. Transition sillons → cernes du bois.

Pour chaque destination : hero 55–65 % de la hauteur desktop, numéro, titre, question, courte introduction approuvée ; sous le hero, grille de trois blocs modulaires vidéo / texte / notes ou articles ; audio si disponible. Barre Retour à la main toujours accessible. Un contenu absent reste « À venir », pas de faux lecteur ni de durée inventée. Le contenu FR/EN existant peut être réutilisé si réellement pertinent. Les titres et questions sont des propositions de structure, les citations dans les images ne sont pas des paroles attestées. La bio existante est conservée, sans ajouter de données personnelles privées.

### Technique, assets et QA
Dépôt : https://github.com/dominique-source/dominiquesoucy ; chemin vérifié `app/[lang]/[section]/page.tsx` et branche `a-propos` (voir MASTER_PROMPT_CODEX.md). Respecter les fichiers existants et les routes /fr/a-propos et /en/a-propos. V1 2,5D, pas de WebGL obligatoire. Composants isolés, pas de changements globaux. Les visuels WebP dérivés incluent éventuellement du texte ou du HUD rasterisé : utiliser seulement les portions propres ou refaire un calque propre à partir des références. Ne pas importer tous les rendus dans public/ ; seuls les vrais assets runtime y vont, les originaux et maquettes restent dans docs/design/about-immersive/. Utiliser les coordonnées du manifeste comme points d'ancrage, tester le mapping avec contain et les dimensions affichées. Créer les masques et fonds séparés nécessaires ; la V1 doit rester fonctionnelle avec les médias statiques et sans audio.

Tests et critères : 5 zones navigables, FR/EN, skip/replay, retour, liens profonds, clavier/touch, reduced-motion, responsive ; pas de changement du Studio, des autres sections, des API ou de la navigation. Aucun portrait fictif. Pas de texte incrusté utilisé comme UI. Mesurer et rapporter performance et résultats des commandes de contrôle. PR et preview à valider, jamais de mise en production sans approbation.
