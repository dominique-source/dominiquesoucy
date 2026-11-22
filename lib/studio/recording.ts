// Local-only capture of the microphone and AI journalist audio into one mix.
// No audio is transmitted to the application server or persisted automatically.
export class StudioAudioRecording {
  private context: AudioContext;
  private destination: MediaStreamAudioDestinationNode;
  private recorder: MediaRecorder;
  private chunks: Blob[] = [];
  private remoteStream: MediaStream | null = null;

  private constructor(
    microphone: MediaStream,
    private readonly onComplete: (file: Blob, extension: string) => void,
    private readonly onError: () => void,
  ) {
    this.context = new AudioContext();
    this.destination = this.context.createMediaStreamDestination();
    this.context.createMediaStreamSource(microphone).connect(this.destination);
    const types = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"];
    const mimeType = types.find((type) => MediaRecorder.isTypeSupported(type));
    this.recorder = new MediaRecorder(
      this.destination.stream,
      mimeType ? { mimeType } : undefined,
    );
    this.recorder.ondataavailable = (event) => {
      if (event.data.size) this.chunks.push(event.data);
    };
    this.recorder.onerror = () => this.onError();
    this.recorder.onstop = () => {
      const type = this.recorder.mimeType || "audio/webm";
      const file = new Blob(this.chunks, { type });
      if (file.size > 0) this.onComplete(file, type.includes("mp4") ? "m4a" : "webm");
      else this.onError();
      void this.context.close();
    };
  }

  static async start(
    mic: MediaStream,
    onComplete: (file: Blob, extension: string) => void,
    onError: () => void,
  ): Promise<StudioAudioRecording> {
    if (!("MediaRecorder" in window) || !("AudioContext" in window)) {
      throw new Error("RECORDING_UNSUPPORTED");
    }
    const capture = new StudioAudioRecording(mic, onComplete, onError);
    try {
      await capture.context.resume();
      if (capture.context.state !== "running") throw new Error("RECORDING_BLOCKED");
      capture.recorder.start(1000);
      return capture;
    } catch (error) {
      void capture.context.close();
      throw error;
    }
  }

  attachRemote(stream: MediaStream) {
    if (this.remoteStream === stream) return;
    this.remoteStream = stream;
    this.context.createMediaStreamSource(stream).connect(this.destination);
  }

  stop() {
    if (this.recorder.state !== "inactive") {
      this.recorder.requestData();
      this.recorder.stop();
    }
  }
}
