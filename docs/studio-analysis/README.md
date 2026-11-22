# Studio d’analyse IA — première livraison (PR de revue)

Route privée : `/fr/studio-analyse` ou `/en/studio-analyse`. Réutilise l’authentification du Studio Live; ne change pas son dashboard, ses contrôles vocaux ou ses APIs.

## Ce qui fonctionne dans cette première livraison

- Import local d’une transcription `.txt`, `.srt`, `.vtt` ou collage d’un texte de 100 à 26 000 caractères.
- Consentement explicite avant transmission à l’API OpenAI (modèle configuré par `OPENAI_SUMMARY_MODEL`).
- Résumé, thèmes, avertissements éditoriaux, jusqu’à huit moments forts associés aux **12 modèles de capsules approuvés**.
- Filtre défensif des citations : les extraits doivent exister textuellement dans la transcription. Les citations invalides sont retirées.
- Sélection d’un moment, prévisualisation **textuelle** de capsule, choix du ratio 16:9 / 9:16 / 1:1.
- Téléchargement local JSON des recommandations pour archivage manuel.
- Privé, noindex, garde d’accès identique au Studio Live, limite de fréquence et `store:false` côté fournisseur.

## Ce que cette version NE fait PAS

- Aucun upload audio/vidéo, aucune transcription automatique d’un MP4, aucune timeline interactive réelle.
- Aucun rendu MP4, aucun découpage automatique, aucune suppression d’arrière-plan.
- Aucun stockage cloud de projets, aucun enregistrement automatique ni publication sociale.
- Aucune vérification externe des faits; les propos de la séance ne sont pas considérés vrais par défaut.
- Les aperçus sont **des compositions textuelles** et non les 36 modèles visuels intégrés.
- Aucun test matériel ou déploiement confirmé.

## Prochain incrément

1. Stockage privé durable (projets + médias) et upload résumable.
2. Extraction audio des vidéos, transcription horodatée avec diarisation des intervenants et mapping avec les questions du public.
3. Analyse sur repères temporels, vrai lecteur vidéo et sélection visuelle des passages.
4. Intégration des 12 designs approuvés comme gabarits de rendu paramétriques; adaptation 16:9, 9:16, 1:1.
5. Moteur de rendu asynchrone avec files de traitement, sous-titres, masquage d’arrière-plan et fichiers MP4.
6. Prévisualisation et approbation humaine avant toute publication.

## Vérification requise avant fusion

`npm ci && npm run format:check && npm run typecheck && npm test && npm run build`

Tester les cas : accès non autorisé, session expirée, origine externe, absence de clé API, texte trop court/long, limite de débit, extraits absents du texte d’origine, transcription FR/EN, import TXT/SRT/VTT, téléchargement JSON, responsive mobile. Ne pas enregistrer de secrets ou transcriptions privées dans les logs.
