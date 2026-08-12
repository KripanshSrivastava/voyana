import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output writes a self-contained server bundle to .next/standalone.
  // The Docker image copies just that plus .next/static + public/ — a ~150 MB
  // production image instead of dragging along the full 1 GB+ node_modules tree.
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zkseknhmpowzrqlouedq.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
