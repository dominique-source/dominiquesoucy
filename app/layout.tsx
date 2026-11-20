import { headers } from "next/headers";
import localFont from "next/font/local";
import type { Viewport } from "next";
import "./globals.css";
import "./brand-v2.css";
const display = localFont({
  src: "../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-800-italic.woff2",
  variable: "--font-display",
  display: "swap",
});
const sans = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2",
      weight: "400",
    },
    {
      path: "../node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2",
      weight: "600",
    },
  ],
  variable: "--font-sans",
  display: "swap",
});
export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  colorScheme: "dark",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang =
    (await headers()).get("x-site-locale") === "en" ? "en-CA" : "fr-CA";
  return (
    <html
      lang={lang}
      data-scroll-behavior="smooth"
      className={`${display.variable} ${sans.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
