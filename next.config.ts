import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/*": [
      "./content/**/*.md",
      "./content/.gitkeep",
      "./node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-800-italic.woff",
    ],
  },
};
export default config;
