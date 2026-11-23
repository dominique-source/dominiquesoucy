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
echo ""
echo "Rendu HD en cours. Il utilise le master local et ne téléverse aucune vidéo."
npm run render -- "$MANIFEST"
echo ""
echo "Rendu terminé. Ouverture du dossier out."
open out
read -r -p "Appuie sur Entrée pour quitter."
