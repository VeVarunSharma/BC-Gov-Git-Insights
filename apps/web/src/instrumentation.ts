export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
  ) {
    // Telemetry is optional and must never prevent the server from starting.
    // Turbopack currently emits hash-suffixed identifiers for external modules
    // (@azure/monitor-opentelemetry-<hash>) that cannot be resolved at runtime,
    // which otherwise throws here and exits before the port is bound.
    try {
      await import("./instrumentation-node");
    } catch (error) {
      console.error(
        "Azure Monitor instrumentation failed to load; continuing without telemetry.",
        error,
      );
    }
  }
}
