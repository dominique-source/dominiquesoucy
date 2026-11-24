# DOM SOUCY STUDIO — Phase 1

Le Studio présente cinq étapes dans les deux langues. Mes projets et les réglages donnent toujours accès aux outils existants. Le projet initial est généré une seule fois côté serveur, ce qui donne au navigateur le même décor lors de l’hydratation.

Dans **Créer les bulles**, sélectionne un extrait, écoute-le dans l’aperçu si le master est chargé, puis approuve-le ou rejette-le. Les décisions sont enregistrées avec le projet. Elles peuvent être remises à valider. La modification des repères d’un extrait approuvé déclenche une nouvelle validation.

**Exporter** liste les capsules approuvées. Une bulle prête peut télécharger ses instructions HD, que le moteur Remotion exécute sur le Mac. Les anciens projets manuels restent exportables par l’éditeur technique. L’export PNG autonome reste accessible dans l’atelier. **Publier** présente les titres et formats approuvés en vue de la diffusion.

## Vérifications

- `npm test`
- `npm run typecheck`
- `npm run build`
- Dans Chrome, un épisode fictif vérifie l’approbation, le rejet, la persistance des décisions avec une API de projet simulée et le contenu du manifeste téléchargé.
- Les captures [avant](avant.jpg) et [après](apres.jpg) montrent le même épisode fictif. La [validation des extraits](validation.jpg) montre les deux décisions.

Le parcours avec un master Premiere, les services réels d’analyse et de sauvegarde, puis un rendu MP4 local reste à valider ensemble. Le raccord audio de la signature, la production HD en lot et les connexions de publication restent prévus pour les phases suivantes.

## Archives de référence

Les deux ZIP sont ignorés à la racine et les copies de secours sont ignorées dans `.studio-references/`. Les originaux vidéo sont désignés comme privés. L’archive graphique contient des portraits, des noms affichés et des maquettes approuvées. Les deux ZIP restent accessibles dans l’historique Git. Une purge éventuelle requiert une décision distincte sur le périmètre et l’accès à ces médias.
