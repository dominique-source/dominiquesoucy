# Importation audio/vidéo — V1

Interface privée : `/fr/studio-analyse` et `/en/studio-analyse`.

## Parcours
1. Se connecter au Studio privé existant.
2. Choisir un MP3, MP4, M4A, MPEG, WAV, WebM, OGG ou FLAC d'au plus **24 Mo**, visionner ou écouter l'aperçu local.
3. Cocher le consentement explicite dans le panneau de transcription.
4. Cliquer **Transcrire cet enregistrement** : le navigateur envoie le média directement vers **Vercel Blob PRIVATE**. L'API serveur produit un jeton d'upload uniquement pour une session authentifiée et garde une association temporaire avec cette session.
5. La route `/api/analysis/transcribe` vérifie la propriété du média, charge le média en privé, puis demande à OpenAI une transcription `gpt-4o-transcribe-diarize` avec segments horodatés.
6. La transcription est transférée dans le champ de l'analyse éditoriale déjà codée (12 modèles). Le média est supprimé du Blob après traitement; le client conserve une prévisualisation locale jusqu'à ce qu'il ferme la page.

**Ne jamais considérer les étiquettes de locuteurs automatiques comme des identités réelles.** Les citations et le texte doivent être vérifiés manuellement. Les horodatages sont ceux du modèle, pas un repérage vérifié à l'image près.

## Configuration et sécurité
- Créer un Vercel Blob store avec `access: private` et le connecter à ce projet. Ne pas réutiliser un store public.
- Pour `handleUpload`, disposer de `BLOB_READ_WRITE_TOKEN` côté serveur **uniquement**, jamais `NEXT_PUBLIC_`.
- Pour les lectures privées, connecter l'OIDC du store (`BLOB_STORE_ID`, `VERCEL_OIDC_TOKEN`) ou conserver un jeton privé.
- `OPENAI_API_KEY` doit être configuré. Les médias et transcriptions quittent le serveur vers OpenAI uniquement après consentement.
- La session existante reste obligatoire; **aucun endpoint public de téléchargement média n'est ajouté**.
- Le code tente de supprimer le blob après chaque tentative de transcription. Une erreur de suppression ou un upload abandonné peut laisser un orphelin. Une politique de purge périodique est requise avant un déploiement large.
- Limitation initiale de taille **24 Mo** : une vidéo de 15 minutes non compressée ou haute résolution dépasse généralement cette limite, même si les audios compressés peuvent être compatibles. Prévoir extraction audio serveur, travail par segments et file asynchrone pour les gros fichiers.
- Aucun fichier média n'est sauvegardé dans la bibliothèque du site, et aucun contenu n'est publié automatiquement.

## Validation
`npm ci && npm run typecheck && npm test && npm run build`.

Sur site connecté, tester une courte piste réelle, une vidéo MP4 sous 24 Mo, un refus de consentement, un fichier malveillant/extension erronée, session expirée, échec de stockage/du fournisseur, segments anonymisés et nettoyage. Pas de test bout-en-bout avec un vrai enregistrement exécuté par l'agent. La branche protège le Studio Live et ses six commandes.
