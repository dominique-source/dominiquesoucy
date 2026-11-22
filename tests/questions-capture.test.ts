import test from "node:test";
import assert from "node:assert/strict";
import { requestCapture } from "../lib/questions/capture";
test("missing devices and denied permissions produce explicit failures", async () => {
  await assert.rejects(
    requestCapture(undefined, { audio: true }, new AbortController().signal),
    /UNSUPPORTED/,
  );
  await assert.rejects(
    requestCapture(
      {
        getUserMedia: async () => {
          throw new DOMException("denied", "NotAllowedError");
        },
      },
      { audio: true },
      new AbortController().signal,
    ),
    { name: "NotAllowedError" },
  );
});
test("permission timeout stops a stream granted too late", async () => {
  let grant: (s: MediaStream) => void = () => {};
  let stopped = false;
  const devices = {
    getUserMedia: () =>
      new Promise<MediaStream>((resolve) => {
        grant = resolve;
      }),
  };
  await assert.rejects(
    requestCapture(devices, { audio: true }, new AbortController().signal, 5),
    /TIMEOUT/,
  );
  grant({
    getTracks: () => [
      {
        stop() {
          stopped = true;
        },
      },
    ],
  } as unknown as MediaStream);
  await Promise.resolve();
  assert.equal(stopped, true);
});
test("unmount cancellation releases any later camera/microphone stream", async () => {
  const controller = new AbortController();
  let grant: (s: MediaStream) => void = () => {};
  let stopped = 0;
  const request = requestCapture(
    {
      getUserMedia: () =>
        new Promise<MediaStream>((r) => {
          grant = r;
        }),
    },
    { audio: true, video: true },
    controller.signal,
  );
  controller.abort();
  await assert.rejects(request, { name: "AbortError" });
  grant({
    getTracks: () => [
      {
        stop() {
          stopped++;
        },
      },
      {
        stop() {
          stopped++;
        },
      },
    ],
  } as unknown as MediaStream);
  await Promise.resolve();
  assert.equal(stopped, 2);
});
