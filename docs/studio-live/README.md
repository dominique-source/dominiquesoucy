# Studio live V7 — installation et validation

Application Next.js accessible depuis l’en-tête, sur `/fr/studio-live` et `/en/studio-live`. L’accueil V6.4, les trois miniatures, le lecteur pilote et les routes éditoriales sont conservés.

## Ce qui fonctionne et ce qui reste à valider

| Fonction                                                                                  | État                                                                                 |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Accès privé côté serveur, session opaque, déconnexion et limitation des tentatives        | Implémenté; API et parcours local testés                                             |
| Réflexion silencieuse initiale, ouverture des questions, priorité à Dominique, pause, fin | Testé dans le navigateur en démonstration                                            |
| Cinq profils, prénoms/styles configurables, intensité et délai                            | Implémenté; démonstration avec questions prédéfinies, pas une IA                     |
| Micro, mesure du niveau et sélection d’entrée/sortie                                      | Implémenté; erreurs d’absence/refus testées avec doubles, matériel réel non validé   |
| Transcription et questions vocales OpenAI Realtime WebRTC                                 | Adaptateur implémenté; essai fournisseur réel non effectué sans clé configurée       |
| Interruption locale et sérialisation des questions                                        | Tests automatisés avec transport simulé; latence réelle à mesurer                    |
| Transcription, questions, bilan local et notes privées                                    | Export volontaire; téléchargement de transcription réellement vérifié                |
| Mémoire éditoriale locale facultative                                                     | Consultation, modification et suppression; stockage uniquement sur action explicite  |
| OBS / BlackHole / caméras                                                                 | Guide intégré; pas d’installation, contrôle OBS ou validation multipiste automatique |

La démonstration ne demande pas de clé IA : après authentification, cocher le consentement et démarrer. Saisir sa réflexion dans **Parole simulée**, puis utiliser **Ouvrir les questions** ou saisir une commande seule. Les questions sont marquées prédéfinies, sans audio de journaliste ni transcription vocale. Le bilan exporté reprend les interventions et notes sans interprétation : ce n’est pas une synthèse générée par IA.

## Variables et lancement

Copier `.env.example` dans `.env.local`, remplir `STUDIO_ACCESS_CODE` avec le code privé convenu (aucune valeur réelle n’est versionnée), puis `npm ci` et `npm run dev -- --port 3102`. Ouvrir `http://localhost:3102/fr/studio-live`.

Les cookies sont HttpOnly, SameSite=Strict et Secure. Pour tester **uniquement sur le serveur de développement lié à la boucle locale**, `STUDIO_LOCAL_HTTP=true` autorise le cookie sur HTTP. Cette exception est ignorée en production et ne doit pas être ajoutée à Vercel. Utiliser HTTPS pour les environnements partagés.

| Variable                | Usage                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `STUDIO_ACCESS_CODE`    | Code privé, vérifié uniquement sur le serveur                                       |
| `STUDIO_REDIS_URL`      | URL HTTPS d’un Redis REST compatible Upstash                                        |
| `STUDIO_REDIS_TOKEN`    | Secret Redis REST                                                                   |
| `OPENAI_API_KEY`        | Clé serveur OpenAI autorisée à utiliser Realtime; facultative pour la démonstration |
| `OPENAI_SUMMARY_MODEL`  | Modèle du résumé facultatif, défaut `gpt-4.1-mini`                                  |
| `OPENAI_REALTIME_MODEL` | Modèle configurable, défaut `gpt-realtime-2.1`                                      |

Sur Vercel, configurer les secrets en **Production** et **Preview**, idéalement avec des bases Redis séparées par environnement. Ne jamais utiliser `NEXT_PUBLIC_` pour ces variables. Les nouveaux secrets ne s’appliquent qu’aux nouveaux déploiements. Sans configuration d’accès/Redis, le studio refuse l’accès; le reste du site fonctionne. Sans clé OpenAI, le studio authentifié reste utilisable en démonstration clairement identifiée.

## Architecture et sécurité

- `lib/studio/auth.ts` : comparaison de code à durée constante après hachage, cookie opaque aléatoire de 256 bits, session de deux heures et révocation au verrouillage.
- `lib/studio/store.ts` : sessions et compteurs expirants. Redis obligatoire sur Vercel/production; compteur atomique Lua. Mémoire de processus partagée uniquement en développement local.
- `app/api/studio/[action]/route.ts` : contrôles de session, d’origine, réponses privées sans cache, login/logout/session et échange SDP serveur. Aucun secret fournisseur n’est transmis au navigateur.
- Limites : cinq essais par source sur 15 minutes, 100 essais globaux; six connexions vocales par session sur 15 minutes, 30 globales. Derrière Vercel, seule l’adresse réécrite par Vercel est utilisée. L’URL d’accès est publique; son contenu est privé.
- `lib/studio/domain.ts` : modes, commandes FR/EN exactes et consignes des cinq journalistes. Un silence ne déclenche jamais une question en mode réflexion.
- `lib/studio/realtime.ts` : WebRTC et canal d’événements, transcription continue, création explicite des réponses, une intervention à la fois. Le VAD ne crée aucune réponse automatique. Une nouvelle prise de parole annule une question programmée; Silence coupe immédiatement le lecteur local puis envoie annulation et vidage de tampon.
- `components/studio/` : écran d’accès, tableau de bord, mesure audio réelle et guide de tournage. Durée de séance limitée à 15 minutes dans l’interface; ce n’est pas un plafond de facturation imposé au compte fournisseur.

Le code partagé n’est pas une authentification forte. Une interface de session isolée permet de le remplacer par un fournisseur d’identité plus robuste. Le secret et les garde-fous ne constituent pas une protection contre une personne déjà autorisée qui modifie son propre client WebRTC. Ne pas traiter le délai ou le plafond côté navigateur comme un contrôle serveur de dépenses.

## Confidentialité

Le serveur ne persiste ni audio, ni transcription, ni notes. Les interventions restent en mémoire de la page et sont perdues au rechargement. **Effacer la séance** ferme le transport et efface le contexte local. Les exports se téléchargent uniquement sur action explicite. Toutes les interventions sont privées par défaut; le marquage publiable est une indication éditoriale, jamais une publication.

La mémoire éditoriale est stockée dans `localStorage` uniquement sur **Enregistrer**. Elle n’est chargée que sur **Charger**, reste modifiable et supprimable; elle ne constitue pas un entraînement du modèle. Les notes déjà envoyées à une connexion fournisseur restent dans son contexte jusqu’à la fin de cette connexion. Leur suppression locale ne constitue pas une demande de suppression chez OpenAI.

Le mode connecté envoie réellement le microphone à OpenAI, après consentement. La rétention fournisseur dépend de la configuration du compte et des [contrôles de données OpenAI](https://developers.openai.com/api/docs/guides/your-data). Utiliser un casque; une sortie captée par le micro peut produire de l’écho ou des commandes indésirables. L’app ne sait pas si OBS enregistre : elle affiche **Non confirmé**.

## Limites vocales et coûts

Une commande vocale attend sa transcription finale; bruit, accent, réseau et fournisseur peuvent la retarder ou la manquer. Le bouton **Silence immédiat** est le contrôle prioritaire local. En pause, le microphone est désactivé : reprendre avec le bouton. Une connexion perdue met la régie en pause; terminer puis redémarrer pour reconnecter. Les réponses longues sont coupées au bout de 45 secondes côté client.

La [documentation Realtime](https://developers.openai.com/api/docs/guides/realtime-conversations) indique qu’une voix ne peut plus changer après la première sortie audio d’une session. La V7 utilise donc la voix `marin` avec cinq personnalités textuelles distinctes. Cinq voix distinctes nécessiteraient des connexions séparées et une synchronisation de contexte; ce n’est pas prétendu opérationnel ici. L’[échange SDP WebRTC via serveur](https://developers.openai.com/api/docs/guides/voice-webrtc?voice-api=realtime) garde la clé standard sur le serveur.

Selon la [tarification officielle](https://developers.openai.com/api/docs/pricing) consultée le 21 novembre 2026, `gpt-realtime-2.1` facture l’audio à 32 USD par million de tokens entrants et 64 USD par million sortants; le texte à 4 et 24 USD respectivement, hors transcription séparée et taxes. Une séance de 10–15 minutes n’a pas de tarif fixe : durée de parole, contexte et sorties influencent le coût. Consulter le tableau de bord fournisseur et configurer ses limites de dépense. Redis et Vercel peuvent aussi facturer selon le forfait et l’usage; aucune souscription payante n’a été créée par cette implémentation.

## MacBook, OBS, BlackHole et trois caméras

Le guide **Configurer mon studio** est accessible dans la régie :

1. Installer [OBS Studio](https://obsproject.com/) et [BlackHole](https://existential.audio/blackhole/support/) depuis leurs sources officielles.
2. Dans Configuration audio et MIDI, créer une sortie multiple casque + BlackHole 2ch, avec fréquence identique, par exemple 48 kHz, et correction de dérive du périphérique secondaire.
3. Sélectionner le micro-cravate comme entrée ici et dans OBS. Ne pas utiliser BlackHole comme entrée du studio web.
4. Envoyer les journalistes vers la sortie multiple. Si la sélection de sortie n’est pas disponible dans le navigateur, utiliser les réglages Son de macOS.
5. Dans OBS, ajouter séparément micro-cravate et BlackHole, désactiver les doublons et le monitoring qui provoquerait une boucle.
6. Affecter micro à la piste 1 et journalistes à la piste 2. Une piste 3 peut servir de mix témoin. Suivre le [guide multipiste officiel OBS](https://obsproject.com/kb/advanced-recording-guide-and-multi-track-audio); enregistrer en MKV avec les pistes activées.
7. Enregistrer un essai de 30 secondes et ouvrir chaque piste dans le logiciel de montage. Tester le casque et les niveaux avant chaque séance.
8. Démarrer Canon EOS, iPhone et Samsung localement. Faire un clap visible et audible puis synchroniser au montage avec l’audio témoin. Le choix 16:9, 9:16 ou simultané est un repère de tournage, pas un contrôle des caméras.

## Vérification reproductible

59 tests automatisés passent après intégration V6.4. Les contrôles reproductibles : `npm test`, `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run build`.

Avec un serveur local **de démonstration sans clé fournisseur**, `node --env-file=.env.local scripts/check-studio.mjs` vérifie les refus anonymes, une origine étrangère, le login, l’accès API, le fournisseur absent, la révocation et la limite d’essais. Ce test épuise volontairement le compteur local : redémarrer le serveur avant de nouveaux essais d’accès.

Tests unitaires : modes et priorité, commandes FR/EN, VAD silencieux, export et confidentialité, expiration/révocation du stockage, code erroné, compteur d’essais, interruptions et sérialisation via transport simulé, absence/refus du micro simulés. Un test simulé ne valide ni un vrai micro, ni un flux OpenAI, ni OBS.

Captures réelles : [MacBook FR](review/1440-fr-dashboard.png), [mobile EN](review/375-en-dashboard.png), [tablette FR](review/768-fr-dashboard.png). Le navigateur a réellement servi une session authentifiée en démonstration; aucune donnée biographique privée n’a été utilisée pour ces tests.

## Résumé éditorial facultatif

Après la séance, le panneau **Résumé éditorial IA** permet un envoi volontaire de la transcription à OpenAI, avec un consentement séparé. Le résumé est privé, modifiable et exportable après relecture. L’API Responses utilise `store: false`, un texte limité à 40 000 caractères et cinq demandes par session sur 15 minutes. Le coût du modèle de résumé s’ajoute à la voix; voir la [fiche officielle GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini). L’intégration est testée avec un fournisseur simulé; aucun résumé fournisseur réel n’a été généré sans clé. Le bilan local reste disponible hors connexion.
