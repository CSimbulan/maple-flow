import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mongoose must run as a normal Node module, not bundled.
  serverExternalPackages: ["mongoose"],
};

export default nextConfig;
