import { questionInstructions } from "./domain";
export type Callbacks = {
  transcript: (speaker: "Dominique" | "journalist", text: string) => void;
  speaking: (active: boolean) => void;
  connection: (status: string) => void;
  utterance: () => void;
  userSpeaking?: () => void;
};
export class RealtimeStudio {
  private pc?: RTCPeerConnection;
  private channel?: RTCDataChannel;
  private audio?: HTMLAudioElement;
  private stopped = false;
  private permitted = false;
  private generating = false;
  private abandoning = false;
  private responseId?: string;
  private pending?: object;
  private connecting?: AbortController;
  constructor(private callbacks: Callbacks) {}
  async connect(stream: MediaStream, lang: string, sink: string) {
    this.callbacks.connection("connecting");
    this.connecting = new AbortController();
    try {
      const pc = (this.pc = new RTCPeerConnection());
      const audio = (this.audio = new Audio());
      audio.autoplay = true;
      audio.muted = true;
      if (sink && "setSinkId" in audio) await audio.setSinkId(sink);
      pc.ontrack = (e) => {
        audio.srcObject = e.streams[0];
        audio.play().catch(() => this.callbacks.connection("audio-blocked"));
      };
      for (const track of stream.getAudioTracks()) pc.addTrack(track, stream);
      pc.onconnectionstatechange = () => {
        if (this.stopped) return;
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected" ||
          pc.connectionState === "closed"
        ) {
          this.silence();
          this.callbacks.connection("disconnected");
        }
      };
      const dc = (this.channel = pc.createDataChannel("oai-events"));
      dc.onopen = () => this.callbacks.connection("connected");
      dc.onclose = () => {
        if (!this.stopped) this.callbacks.connection("disconnected");
      };
      dc.onmessage = (e) => {
        if (this.stopped) return;
        let event;
        try {
          event = JSON.parse(e.data);
        } catch {
          return;
        }
        if (event.type === "input_audio_buffer.speech_started")
          this.callbacks.userSpeaking?.();
        if (event.type === "response.created" && !this.abandoning)
          this.responseId = event.response?.id;
        if (event.type === "response.done") {
          this.generating = false;
          if (event.response?.status === "failed") {
            this.silence();
            this.callbacks.connection("provider-error");
            return;
          }
          if (this.pending && this.permitted) {
            const pending = this.pending;
            this.pending = undefined;
            this.dispatch(pending);
          }
        }
        if (
          event.type ===
            "conversation.item.input_audio_transcription.completed" &&
          typeof event.transcript === "string"
        ) {
          this.callbacks.transcript("Dominique", event.transcript);
          this.callbacks.utterance();
        }
        if (
          event.type === "response.output_audio_transcript.done" &&
          this.permitted &&
          event.response_id === this.responseId &&
          typeof event.transcript === "string"
        )
          this.callbacks.transcript("journalist", event.transcript);
        if (event.type === "output_audio_buffer.started") {
          if (!this.permitted || event.response_id !== this.responseId)
            this.send({ type: "output_audio_buffer.clear" });
          else {
            if (this.audio) this.audio.muted = false;
            this.callbacks.speaking(true);
          }
        }
        if (
          event.type === "output_audio_buffer.stopped" &&
          event.response_id === this.responseId &&
          !this.pending
        )
          this.callbacks.speaking(false);
        if (
          event.type === "error" &&
          event.error?.code !== "response_cancel_not_active"
        ) {
          this.silence();
          this.callbacks.connection("provider-error");
        }
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const response = await fetch("/api/studio/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdp: offer.sdp, lang, consent: true }),
        signal: this.connecting.signal,
      });
      if (!response.ok) {
        // Surface only our own API error code, never upstream secrets or responses.
        let code = "PROVIDER_UNAVAILABLE";
        try {
          const body: unknown = await response.json();
          if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
            code = body.error;
          }
        } catch {
          // Preserve the status if a proxy returns a non-JSON error.
        }
        throw new Error(`STUDIO_HTTP_${response.status}_${code}`);
      }
      const answer = await response.text();
      if (this.stopped) return;
      await pc.setRemoteDescription({ type: "answer", sdp: answer });
    } catch (e) {
      if (!this.stopped) {
        this.close();
        throw e;
      }
    }
  }
  private send(data: object) {
    if (this.channel?.readyState === "open")
      this.channel.send(JSON.stringify(data));
  }
  ask(
    index: number,
    name: string,
    style: string,
    intensity: number,
    lang: string,
    memory: string,
    repeat?: string,
  ) {
    if (this.channel?.readyState !== "open") throw new Error("disconnected");
    this.permitted = true;

    const request = {
      type: "response.create",
      response: {
        output_modalities: ["audio"],
        instructions: repeat
          ? `Repeat exactly this previous question in ${lang === "fr" ? "French" : "English"}, then stop: ${repeat.slice(0, 4000)}`
          : questionInstructions(index, name, style, intensity, lang, memory),
      },
    };
    if (this.generating) this.pending = request;
    else this.dispatch(request);
  }
  private dispatch(request: object) {
    this.generating = true;
    this.abandoning = false;
    this.responseId = undefined;
    this.send(request);
  }
  silence() {
    this.permitted = false;
    this.abandoning = this.generating;
    this.responseId = undefined;
    if (this.audio) this.audio.muted = true;
    this.pending = undefined;
    if (this.generating) this.send({ type: "response.cancel" });
    this.send({ type: "output_audio_buffer.clear" });
  }
  close() {
    this.stopped = true;
    this.connecting?.abort();
    this.silence();
    this.channel?.close();
    this.pc?.close();
    if (this.audio) {
      this.audio.pause();
      this.audio.srcObject = null;
    }
  }
}
export async function microphone(device: string) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
  return navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: device ? { exact: device } : undefined,
      echoCancellation: true,
      noiseSuppression: true,
    },
    video: false,
  });
}
