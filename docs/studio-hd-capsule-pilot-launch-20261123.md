# Pilote DOM SOUCY MEDIA — Première capsule HD

La PR #57 a fusionné le nouveau parcours de rendu : les projets conservent les timecodes et les bulles; le Studio exporte un manifeste JSON; le moteur indépendant sous `render-engine/` monte le master synchronisé de DaVinci Resolve sans passer par Vercel Blob.

Étapes : DaVinci → `master.mp4` avec audio synchronisé → Studio / Analyse / Créer les capsules → Atelier / Exporter le manifeste HD → moteur local `render-engine/RENDU-HD.command` → MP4 1080p.

Le rendu de la vidéo réelle, la suppression du fond et la fidélité graphique seront validés avec le premier master utilisateur. Il ne faut pas affirmer que ce test réel a eu lieu avant cette validation.

Ce commit actualise uniquement la documentation de mise en ligne et déclenche la connexion Git Vercel du projet `dominiquesoucy`.
