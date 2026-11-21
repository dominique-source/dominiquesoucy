import test from "node:test";
import assert from "node:assert/strict";
import { RealtimeStudio, microphone } from "../lib/studio/realtime";
test("WebRTC stays muted before authorization, serializes replacement questions and cuts output locally", async (t) => {
  const sent: Record<string, unknown>[] = [];
  const statuses: string[] = [];
  const speech: boolean[] = [];
  const transcripts: string[] = [];
  const channel = {
    readyState: "open",
    send: (text: string) => sent.push(JSON.parse(text)),
    close() {},
    onmessage: undefined as undefined | ((e: { data: string }) => void),
    onopen: undefined as undefined | (() => void),
  };
  const pc = {
    connectionState: "connected",
    createDataChannel: () => channel,
    addTrack() {},
    createOffer: async () => ({ sdp: "v=0\n" }),
    setLocalDescription: async () => {},
    setRemoteDescription: async () => {},
    close() {},
    onconnectionstatechange: undefined as undefined | (() => void),
  };
  const audio = { autoplay: false, muted: false, pause() {}, srcObject: null };
  t.mock.method(globalThis, "fetch", async () => new Response("v=0\n"));
  Object.defineProperty(globalThis, "RTCPeerConnection", {
    configurable: true,
    writable: true,
    value: undefined,
  });
  Object.defineProperty(globalThis, "Audio", {
    configurable: true,
    writable: true,
    value: undefined,
  });
  t.mock.property(
    globalThis,
    "RTCPeerConnection",
    class {
      constructor() {
        return pc;
      }
    } as unknown as typeof RTCPeerConnection,
  );
  t.mock.property(
    globalThis,
    "Audio",
    class {
      constructor() {
        return audio;
      }
    } as unknown as typeof Audio,
  );
  const engine = new RealtimeStudio({
    connection: (s) => statuses.push(s),
    speaking: (b) => speech.push(b),
    transcript: (_, s) => transcripts.push(s),
    utterance() {},
  });
  const emit = (event: object) =>
    channel.onmessage?.({ data: JSON.stringify(event) });
  await engine.connect(
    { getAudioTracks: () => [] } as unknown as MediaStream,
    "fr",
    "",
  );
  channel.onopen?.();
  assert.equal(audio.muted, true);
  assert.equal(
    sent.some((e) => e.type === "response.create"),
    false,
  );
  emit({
    type: "conversation.item.input_audio_transcription.completed",
    transcript: "Je réfléchis.",
  });
  assert.deepEqual(transcripts, ["Je réfléchis."]);
  assert.equal(sent.length, 0);
  engine.ask(0, "Alex", "Ask for evidence", 2, "fr", "");
  emit({ type: "response.created", response: { id: "first" } });
  emit({ type: "output_audio_buffer.started", response_id: "first" });
  assert.equal(audio.muted, false);
  engine.silence();
  assert.equal(audio.muted, true);
  assert.equal(sent.at(-1)?.type, "output_audio_buffer.clear");
  engine.ask(1, "Camille", "Explore emotion", 2, "fr", "");
  assert.equal(sent.filter((e) => e.type === "response.create").length, 1);
  emit({ type: "output_audio_buffer.started", response_id: "first" });
  assert.equal(audio.muted, true);
  emit({ type: "response.done" });
  assert.equal(sent.filter((e) => e.type === "response.create").length, 2);
  emit({ type: "response.created", response: { id: "second" } });
  emit({ type: "output_audio_buffer.started", response_id: "second" });
  assert.equal(audio.muted, false);
  emit({
    type: "response.output_audio_transcript.done",
    response_id: "first",
    transcript: "Stale",
  });
  assert.equal(transcripts.includes("Stale"), false);
  pc.connectionState = "disconnected";
  pc.onconnectionstatechange?.();
  assert.equal(audio.muted, true);
  assert.equal(statuses.at(-1), "disconnected");
  engine.close();
  assert.equal(audio.muted, true);
  assert.ok(speech.includes(true));
});
test("microphone absence and permission denial propagate without fake success", async (t) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "navigator", previous);
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: async () => {
          throw new DOMException("denied", "NotAllowedError");
        },
      },
    },
  });
  await assert.rejects(microphone(""), { name: "NotAllowedError" });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: async () => {
          throw new DOMException("missing", "NotFoundError");
        },
      },
    },
  });
  await assert.rejects(microphone(""), { name: "NotFoundError" });
});
