import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import { scanPlanSchema, type ScanPlan } from "@git-insights/contracts";
import {
  AzureBlobEvidenceWriter,
  type EvidenceStore,
} from "@git-insights/evidence";
import { calculateRepositoryMetrics } from "@git-insights/metrics";
import { z } from "zod";

import { buildRepositorySignals, scanRepository } from "./index";

const SCANNER_BUNDLE_VERSION = "0.1.0";
const cachedScanSchema = z.object({
  files: z.array(z.string()),
});

function createStore(): EvidenceStore {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  if (!accountName) {
    throw new Error("AZURE_STORAGE_ACCOUNT_NAME is required for the scan job.");
  }
  return new AzureBlobEvidenceWriter(accountName);
}

async function readScanPlan(store: EvidenceStore): Promise<ScanPlan> {
  const localPath = process.env.SCAN_PLAN_JSON;
  if (localPath) {
    return scanPlanSchema.parse(JSON.parse(await readFile(localPath, "utf8")));
  }
  return scanPlanSchema.parse(
    await store.readJson(
      "control",
      process.env.SCAN_PLAN_BLOB ?? "current/scan-plan.json",
    ),
  );
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    error.statusCode === 404
  );
}

async function artifactExists(
  store: EvidenceStore,
  container: string,
  path: string,
): Promise<boolean> {
  try {
    await store.readJson(container, path);
    return true;
  } catch (error: unknown) {
    if (isNotFound(error)) {
      return false;
    }
    throw error;
  }
}

async function main(): Promise<void> {
  const store = createStore();
  const plan = await readScanPlan(store);
  const executionId = randomUUID();
  const errors: Array<{ repository: string; message: string }> = [];
  let scanned = 0;
  let cached = 0;
  let metricRecomputations = 0;

  for (const target of plan.targets) {
    const artifactPath = `${target.repository.id}/${target.commitSha}/scanner-${SCANNER_BUNDLE_VERSION}.json`;
    const metricsPath = `${plan.scanId}/${target.repository.id}/metrics-${SCANNER_BUNDLE_VERSION}.json`;
    const hasScanArtifact = await artifactExists(
      store,
      "artifacts",
      artifactPath,
    );
    const hasMetricsArtifact = await artifactExists(
      store,
      "artifacts",
      metricsPath,
    );
    if (hasScanArtifact && hasMetricsArtifact) {
      cached += 1;
      continue;
    }

    try {
      let signals;
      if (hasScanArtifact) {
        const cachedScan = cachedScanSchema.parse(
          await store.readJson("artifacts", artifactPath),
        );
        signals = buildRepositorySignals(
          target.repository,
          plan.datasetVersion,
          cachedScan.files,
        );
        metricRecomputations += 1;
      } else {
        const scan = await scanRepository(
          target.repository,
          target.commitSha,
          plan.datasetVersion,
        );
        signals = scan.signals;
        await store.writeJson("artifacts", artifactPath, scan);
        scanned += 1;
      }
      if (!hasMetricsArtifact) {
        await store.writeJson(
          "artifacts",
          metricsPath,
          calculateRepositoryMetrics(signals),
        );
      }
    } catch (error: unknown) {
      errors.push({
        repository: target.repository.fullName,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const summary = {
    executionId,
    scanId: plan.scanId,
    datasetVersion: plan.datasetVersion,
    scannerBundleVersion: SCANNER_BUNDLE_VERSION,
    targetCount: plan.targets.length,
    scanned,
    cached,
    metricRecomputations,
    errors,
    completedAt: new Date().toISOString(),
  };
  await store.writeJson(
    "manifests",
    `${plan.scanId}/scan-summary-${executionId}.json`,
    summary,
  );
  await store.writeCurrentJson(
    "manifests",
    "current/scan-summary.json",
    summary,
  );

  console.log(JSON.stringify({ event: "scan-completed", ...summary }));
  if (errors.length > 0) {
    throw new Error(`${errors.length} repository scans failed.`);
  }
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      event: "scan-job-failed",
      message: error instanceof Error ? error.message : "Unknown error",
    }),
  );
  process.exitCode = 1;
});
