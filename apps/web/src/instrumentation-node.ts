import { useAzureMonitor as initializeAzureMonitor } from "@azure/monitor-opentelemetry";

initializeAzureMonitor({
  azureMonitorExporterOptions: {
    connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
  },
  enableLiveMetrics: false,
  samplingRatio: 0.2,
});
