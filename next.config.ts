import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mongoose must run as a normal Node module, not bundled.
  serverExternalPackages: ["mongoose"],
  // Workspace pages moved from /o/... (for "organization") to /w/...; keep old links working.
  async redirects() {
    return [{ source: "/o/:path*", destination: "/w/:path*", permanent: true }];
  },
};

export default nextConfig;
