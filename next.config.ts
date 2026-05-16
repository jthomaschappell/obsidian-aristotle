import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/healthz", destination: "/api/health" }];
  },
};

export default nextConfig;
