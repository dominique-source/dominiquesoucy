# Déploiement Studio local-first

Le commit `d6c9847053f449fb574a8ed58e14d93560f94563` contient la migration sans Vercel Blob, fusionnée via la PR #56.

Cette modification documentaire sur `main` déclenche la connexion Git native de Vercel pour publier l'état courant du dépôt sans passer par l'API de création de déploiement. Les fichiers du Studio et les médias originaux ne sont pas modifiés par cette note.

Vérifier explicitement le commit et l'état de la production dans Vercel avant de considérer la mise en ligne réussie.
