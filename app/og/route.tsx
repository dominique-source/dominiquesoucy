import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const en = new URL(request.url).searchParams.get("lang") === "en";
  const font = await readFile(
    path.join(
      process.cwd(),
      "node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-800-italic.woff",
    ),
  );
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0a0a0a",
        color: "#f4f4ef",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 60,
        fontFamily: "Barlow",
        borderBottom: "12px solid #ccff00",
      }}
    >
      <div style={{ fontSize: 25, letterSpacing: 4, color: "#ccff00" }}>
        {en ? "SPORT / SOCIETY / HUMAN" : "SPORT / SOCIÉTÉ / HUMAIN"}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 150,
          lineHeight: 0.9,
        }}
      >
        <span>DOMINIQUE</span>
        <span>SOUCY.</span>
      </div>
      <div style={{ fontSize: 32 }}>
        {en
          ? "Sport as a mirror of society."
          : "Le sport comme miroir de la société."}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [{ name: "Barlow", data: font, style: "italic", weight: 800 }],
    },
  );
}
