// A browser permission request cannot itself be cancelled. Stop any stream granted after timeout/unmount.
export function requestCapture(
  devices: Pick<MediaDevices, "getUserMedia"> | undefined,
  constraints: MediaStreamConstraints,
  signal: AbortSignal,
  timeoutMs = 15000,
): Promise<MediaStream> {
  if (!devices?.getUserMedia)
    return Promise.reject(new Error("CAPTURE_UNSUPPORTED"));
  return new Promise((resolve, reject) => {
    let finished = false;
    const cleanup = () => {
      finished = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
    };
    const cancel = () => {
      if (!finished) {
        cleanup();
        reject(new DOMException("Capture cancelled", "AbortError"));
      }
    };
    const timer = setTimeout(() => {
      if (!finished) {
        cleanup();
        reject(new Error("CAPTURE_PERMISSION_TIMEOUT"));
      }
    }, timeoutMs);
    if (signal.aborted) {
      cancel();
      return;
    }
    signal.addEventListener("abort", cancel, { once: true });
    devices.getUserMedia(constraints).then(
      (stream) => {
        if (finished) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        cleanup();
        resolve(stream);
      },
      (error) => {
        if (!finished) {
          cleanup();
          reject(error);
        }
      },
    );
  });
}
