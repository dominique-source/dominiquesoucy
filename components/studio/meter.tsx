"use client";
import { useEffect, useRef } from "react";
export function AudioMeter({
  stream,
  label,
}: {
  stream: MediaStream | null;
  label: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !stream) return;
    const audio = new AudioContext();
    const analyser = audio.createAnalyser();
    analyser.fftSize = 256;
    const source = audio.createMediaStreamSource(stream);
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    function draw() {
      analyser.getByteFrequencyData(data);
      ctx!.clearRect(0, 0, 640, 100);
      ctx!.fillStyle = "#CCFF00";
      for (let i = 0; i < 64; i++) {
        const h = Math.max(2, data[i] * 0.32);
        ctx!.fillRect(i * 10, 50 - h / 2, 3, h);
      }
      frame = requestAnimationFrame(draw);
    }
    draw();
    return () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      void audio.close();
      ctx.clearRect(0, 0, 640, 100);
    };
  }, [stream]);
  return (
    <canvas
      className="studio-meter"
      ref={ref}
      width={640}
      height={100}
      role="img"
      aria-label={label}
    />
  );
}
