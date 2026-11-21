import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:lang/studio-live",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "microphone=(self), camera=()" },
        ],
      },
    ];
  },
  outputFileTracingIncludes: {
    "/*": [
      "./content/**/*.md",
      "./content/.gitkeep",
      "./node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-800-italic.woff",
    ],
  },
};
export default config;
