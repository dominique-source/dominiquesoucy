# DOM SOUCY MEDIA — Rendu HD local (pilote)

Objectif : récupérer une capsule préparée dans le Studio et produire un MP4 synchronisé
en 1920×1080 (16:9), 1080×1920 (9:16) ou 1080×1080 (1:1), avec l'habillage
de référence des bulles journaliste/rafale/réponse. Le rendu se fait **sur le Mac**,
pas sur Vercel. Le code est expérimental : valider 1 capsule avant de lancer un lot.

## Phase 1 — DaVinci Resolve

- Synchroniser le son et l'image **une seule fois** pour l'épisode, vérifier la bouche.
- Exporter **master.mp4**, en H.264 haute qualité, contenant son final et image propre,
  sans sous-titres ou bulles, depuis 00:00 de la timeline originale.
- Ne pas raccourcir le début sans aussi corriger les timecodes du Studio.
- Option premium : exporter **foreground.mov** avec canal alpha via un codec alpha
  compatible (ex. ProRes 4444), ainsi que **audio.wav** parfaitement synchronisé.
  Sans alpha, le moteur affiche master.mp4 intact derrière les bulles.

## Phase 2 — DOM SOUCY STUDIO

Dans Analyse / Montage, créer des projets de capsules à partir des extraits.
Vérifier **Début** / **Fin** pour la capsule choisie; ne pas exporter si 0–0.
Choisir le style, texte de la question et citation. Cliquer
**EXPORTER LE MANIFESTE HD (.JSON)** pour récupérer `capsule-....json`.

**Attention :** une question proposée par IA n'est pas la voix originale du
journaliste et ne doit jamais être identifiée comme une citation vérifiée.
Renseigner un nom seulement pour une vraie question attribuable.

## Phase 3 — Rendu local Remotion

Prérequis : Node.js 22+ et npm installés sur macOS, puis terminal :

```bash
git clone https://github.com/dominique-source/dominiquesoucy.git
cd dominiquesoucy/render-engine
npm install
mkdir -p public
```

Copier `master.mp4` dans `render-engine/public/`.
Si la vidéo est détourée, mettre aussi `foreground.mov` et `audio.wav`
dans ce même dossier. On peut ajouter `background.png` et `reporter.png`
(personne réelle avec autorisation). Ne pas inventer de portrait journalistique.

Exécuter :

```bash
npm run render -- "/chemin/vers/capsule-xxx.json"
```

Le MP4 final apparaît sous `render-engine/out/`.

**Audio** : avec un master normal, Remotion prend le son contenu dans
`master.mp4` et démarre le son et l'image au même `start`.
Avec un `foreground.mov` transparent, le rendu utilise `audio.wav`
pour éviter de réencoder une piste différente en double.

**Limite du pilote** : le visuel des bulles est reconstruit en HTML/CSS
et animations, il ne réutilise pas l'image maquette en PNG aplatie.
Un portrait n'apparaît que si `portraitAsset` est donné et si le fichier
existe réellement. La segmentation IA, le rendu cloud, la publication et
la vérification labiale automatique ne sont pas intégrés ici.

**Droits / licence** : consulter les modalités d'utilisation commerciale de
Remotion avant d'intégrer ce moteur à un service ou une équipe payante.
