import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@git-insights/contracts", "@git-insights/graph"],
  // Azure Monitor's OpenTelemetry instrumentation patches module loading at
  // runtime. Bundling it makes Turbopack emit a mangled external reference
  // (require-in-the-middle-<hash>) that cannot be resolved, so the
  // instrumentation hook throws and the server exits before binding a port.
  serverExternalPackages: ["@azure/monitor-opentelemetry"],
};

export default nextConfig;
