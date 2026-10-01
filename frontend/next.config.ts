/// <reference types="node" />
import type { NextConfig } from "next";

// Only proxy /api/* through Next.js in dev (docker-compose.yml sets BACKEND_URL).
// In production, nginx routes /api/* directly to the backend.
const backendUrl = process.env.BACKEND_URL || null;

const nextConfig: NextConfig = {
  output: "standalone",
  ...(backendUrl && {
    async rewrites() {
      return [
        { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      ];
    },
  }),
};

export default nextConfig;
