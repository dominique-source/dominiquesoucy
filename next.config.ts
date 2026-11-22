import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@libsql/client", "@ffprobe-installer/ffprobe"],
  async headers() {
    return [
      {
        source: "/:lang/studio-live/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "microphone=(self), camera=()" },
        ],
      },
    ];
  },
  images: { qualities: [75, 85] },
  outputFileTracingIncludes: {
    "/api/questions/*": [
      "./node_modules/@ffprobe-installer/linux-x64/ffprobe",
      "./node_modules/@ffprobe-installer/linux-x64/package.json",
    ],
    "/*": [
      "./content/**/*.md",
      "./content/.gitkeep",
      "./node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-800-italic.woff",
    ],
  },
};
export default config;
