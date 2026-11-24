#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
echo "=================================="
echo "    DOM SOUCY MEDIA — RENDU HD     "
echo "=================================="
echo ""
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js et npm sont requis. Installe Node.js 22+ depuis https://nodejs.org/"
  read -r -p "Appuie sur Entrée pour terminer."
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "Installation du moteur vidéo local..."
  npm install --no-audit --no-fund
fi
mkdir -p public out
if [ ! -f public/master.mp4 ]; then
  echo "Choisis le MASTER 16:9 exporté par Adobe Premiere Pro."
  MASTER="$(osascript -e 'POSIX path of (choose file with prompt "Choisis master.mp4 exporté depuis Adobe Premiere Pro")')" || exit 1
  if [ -z "$MASTER" ] || [ ! -f "$MASTER" ]; then echo "Aucun fichier sélectionné"; exit 1; fi
  ln -s "$MASTER" public/master.mp4
fi
echo "Choisis le manifeste JSON téléchargé depuis DOM SOUCY STUDIO."
MANIFEST="$(osascript -e 'POSIX path of (choose file with prompt "Choisis le manifeste JSON de la capsule")')" || exit 1
if [ -z "$MANIFEST" ] || [ ! -f "$MANIFEST" ]; then echo "Aucun manifeste sélectionné"; exit 1; fi
# Read the requested signature name from the approved local Studio manifest.
# Do not evaluate/execute manifest JSON as shell code.
OUTRO="$(node -e 'const fs=require("node:fs");const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(p.outroAsset||"")' "$MANIFEST")"
if [ -n "$OUTRO" ] && [ ! -e "public/$OUTRO" ]; then
  case "$OUTRO" in
    signature-horizontal.mp4)
      PROMPT="Choisis la signature officielle DOM SOUCY horizontale (2 secondes, 1920x1080)" ;;
    signature-vertical.mp4)
      PROMPT="Choisis la signature officielle DOM SOUCY verticale (2 secondes, 1080x1920)" ;;
    *)
      echo "Signature non reconnue : $OUTRO"
      exit 1 ;;
  esac
  OUTRO_SOURCE="$(osascript -e "POSIX path of (choose file with prompt \"$PROMPT\")")" || exit 1
  if [ -z "$OUTRO_SOURCE" ] || [ ! -f "$OUTRO_SOURCE" ]; then echo "Signature non sélectionnée"; exit 1; fi
  ln -s "$OUTRO_SOURCE" "public/$OUTRO"
fi
echo ""
echo "Rendu HD en cours. Il utilise le master local et ne téléverse aucune vidéo."
npm run render -- "$MANIFEST"
echo ""
echo "Rendu terminé. Ouverture du dossier out."
open out
read -r -p "Appuie sur Entrée pour quitter."
