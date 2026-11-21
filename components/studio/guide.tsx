export function StudioGuide({ fr }: { fr: boolean }) {
  return (
    <details className="studio-guide">
      <summary>
        {fr ? "CONFIGURER MON STUDIO" : "CONFIGURE MY STUDIO"} ↗
      </summary>
      <div>
        <h3>{fr ? "Deux voix. Deux pistes." : "Two voices. Two tracks."}</h3>
        <ol>
          {(fr
            ? [
                "Installer OBS Studio depuis obsproject.com et BlackHole depuis existential.audio. Le navigateur n’installe rien.",
                "Dans Configuration audio et MIDI de macOS, créer un périphérique à sorties multiples : casque + BlackHole 2ch. Choisir la même fréquence (48 kHz) et activer la correction de dérive pour le périphérique secondaire.",
                "Choisir le micro-cravate comme entrée dans le studio et dans OBS. Ne jamais choisir BlackHole comme micro de cette application : cela ferait réécouter les journalistes.",
                "Choisir la sortie multiple pour les journalistes. Si le navigateur ne permet pas de changer de sortie, la définir dans les réglages Son du Mac. Porter des écouteurs pour éviter l’écho.",
                "Dans OBS, ajouter deux sources de capture audio : micro-cravate et BlackHole. Désactiver les captures audio globales en doublon et le monitoring qui renverrait la sortie dans BlackHole.",
                "Dans Propriétés audio avancées : micro sur piste 1, journalistes sur piste 2; une piste 3 peut servir de mix témoin. Choisir un format multipiste, par exemple MKV, et activer les pistes dans Sortie > Enregistrement.",
                "Tester les niveaux séparément, enregistrer 30 secondes et vérifier chaque piste dans le logiciel de montage. La piste témoin ne remplace pas les pistes séparées.",
                "OBS n’est pas connecté à cette application. Vérifier son bouton Enregistrer manuellement; aucune indication ici ne confirme une captation. OBS WebSocket reste une extension future.",
              ]
            : [
                "Install OBS Studio from obsproject.com and BlackHole from existential.audio. This browser installs nothing.",
                "In macOS Audio MIDI Setup, create a Multi-Output Device: headphones + BlackHole 2ch. Match sample rates (48 kHz) and enable drift correction on the secondary device.",
                "Select the lavalier microphone as input here and in OBS. Never use BlackHole as this app’s microphone; journalists would hear themselves.",
                "Send journalists to the Multi-Output Device. If output selection is unsupported in your browser, change macOS Sound output. Wear headphones to prevent feedback.",
                "In OBS, add separate audio input sources for the lavalier and BlackHole. Disable duplicate global audio capture and monitoring that feeds BlackHole.",
                "In Advanced Audio Properties, assign the mic to track 1 and journalists to track 2; optionally use track 3 as a reference mix. Use a multitrack format such as MKV and enable tracks in Output > Recording.",
                "Test levels separately. Record 30 seconds and inspect each track in your editor. A reference mix is not a substitute for separate tracks.",
                "OBS is not connected to this application. Check its Record button yourself. OBS WebSocket is a future optional integration.",
              ]
          ).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <h3>{fr ? "Trois caméras, un clap." : "Three cameras, one clap."}</h3>
        <p>
          {fr
            ? "Canon EOS, iPhone et Samsung enregistrent localement, sans contrôle par ce site. Démarrer les trois appareils, faire un clap visible et audible, puis synchroniser au montage avec l’audio témoin. Choisir 16:9, 9:16 ou une captation simultanée si le matériel le permet. Vérifier batteries, stockage et cadrage avant la séance."
            : "Canon EOS, iPhone and Samsung record locally, without website control. Start all cameras, make one visible and audible clap, then synchronize using reference audio in your editor. Choose 16:9, 9:16 or simultaneous capture if your equipment supports it. Check batteries, storage and framing first."}
        </p>
        <h3>{fr ? "Confidentialité et voix" : "Privacy and voice"}</h3>
        <p>
          {fr
            ? "Le mode connecté envoie ton audio à OpenAI pour la transcription et les questions. Ce site ne conserve ni audio ni transcription sur son serveur. Les règles de rétention du fournisseur s’appliquent. Les commandes vocales dépendent de la transcription et du réseau : SILENCE IMMÉDIAT coupe localement la sortie sans attendre. Une seule voix Realtime est utilisée; les cinq rôles sont distincts, pas cinq personnes réelles."
            : "Connected mode sends your audio to OpenAI for transcription and questions. This site stores no audio or transcript on its server. Provider retention policies apply. Voice commands depend on transcription and network latency: IMMEDIATE SILENCE mutes locally without waiting. Realtime uses one voice with five distinct roles, not five real people."}
        </p>
        <p>
          <a
            href="https://obsproject.com/kb/advanced-recording-guide-and-multi-track-audio"
            target="_blank"
            rel="noreferrer"
          >
            OBS — multitrack audio ↗
          </a>{" "}
          ·{" "}
          <a
            href="https://existential.audio/blackhole/support/"
            target="_blank"
            rel="noreferrer"
          >
            BlackHole ↗
          </a>
        </p>
      </div>
    </details>
  );
}
