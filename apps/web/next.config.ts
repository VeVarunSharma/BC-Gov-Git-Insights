import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@git-insights/contracts", "@git-insights/graph"],
};

export default nextConfig;
