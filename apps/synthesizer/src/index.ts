import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import {
  DOSSIER_ANALYSIS_VERSION,
  DOSSIER_PROMPT_VERSION,
  FoundryDossierClient,
  type RepositoryEvidenceBundle,
} from "@git-insights/ai";
import {
  evidenceReferenceSchema,
  scanPlanSchema,
  type ScanPlan,
} from "@git-insights/contracts";
import {
  AzureBlobEvidenceWriter,
  type EvidenceStore,
} from "@git-insights/evidence";
import { z } from "zod";

const SCANNER_BUNDLE_VERSION = "0.1.0";

const scanArtifactSchema = z.object({
  files: z.array(z.string()),
  documentation: z.array(
    z.object({
      path: z.string(),
      excerpt: z.string(),
      evidenceId: z.string(),
    }),
  ),
  evidence: z.array(evidenceReferenceSchema),
});
const scanSummarySchema = z.object({
  scanId: z.string().uuid(),
  errors: z.array(z.unknown()),
});

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function createStore(): EvidenceStore {
  return new AzureBlobEvidenceWriter(
    requiredEnvironment("AZURE_STORAGE_ACCOUNT_NAME"),
  );
}

async function readScanPlan(store: EvidenceStore): Promise<ScanPlan> {
  const localPath = process.env.SCAN_PLAN_JSON;
  if (localPath) {
    return scanPlanSchema.parse(JSON.parse(await readFile(localPath, "utf8")));
  }
  const completedScan = scanSummarySchema.parse(
    await store.readJson("manifests", "current/scan-summary.json"),
  );
  if (completedScan.errors.length > 0) {
    throw new Error(
      `Latest completed scan has ${completedScan.errors.length} failures.`,
    );
  }
  const plan = scanPlanSchema.parse(
    await store.readJson("control", `${completedScan.scanId}/scan-plan.json`),
  );
  if (plan.scanId !== completedScan.scanId) {
    throw new Error("Completed scan summary does not match its scan plan.");
  }
  return plan;
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

async function synthesizeOneBundle(): Promise<void> {
  const inputPath = requiredEnvironment("EVIDENCE_BUNDLE_JSON");
  const outputPath = requiredEnvironment("DOSSIER_OUTPUT");
  const client = new FoundryDossierClient(
    requiredEnvironment("AZURE_AI_MODEL"),
    requiredEnvironment("AZURE_AI_PROJECT_ENDPOINT"),
  );
  const bundle = JSON.parse(
    await readFile(inputPath, "utf8"),
  ) as RepositoryEvidenceBundle;
  const dossier = await client.createDossier(bundle);
  await writeFile(outputPath, `${JSON.stringify(dossier, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
}

async function synthesizeCurrentPlan(): Promise<void> {
  const store = createStore();
  const plan = await readScanPlan(store);
  const executionId = randomUUID();
  const model = requiredEnvironment("AZURE_AI_MODEL");
  const modelVersion =
    process.env.AZURE_AI_MODEL_VERSION ?? "explicit-version-not-reported";
  const client = new FoundryDossierClient(
    model,
    requiredEnvironment("AZURE_AI_PROJECT_ENDPOINT"),
  );
  const analysisConfigurationKey = createHash("sha256")
    .update(
      `${model}:${modelVersion}:${DOSSIER_ANALYSIS_VERSION}:${DOSSIER_PROMPT_VERSION}`,
      "utf8",
    )
    .digest("hex")
    .slice(0, 16);
  const errors: Array<{ repository: string; message: string }> = [];
  let synthesized = 0;
  let cached = 0;

  for (const target of plan.targets) {
    try {
      const scanPayload = await store.readJson(
        "artifacts",
        `${target.repository.id}/${target.commitSha}/scanner-${SCANNER_BUNDLE_VERSION}.json`,
      );
      const scan = scanArtifactSchema.parse(scanPayload);
      const scanHash = createHash("sha256")
        .update(JSON.stringify(scanPayload), "utf8")
        .digest("hex");
      const dossierCacheKey = createHash("sha256")
        .update(
          `${analysisConfigurationKey}:${SCANNER_BUNDLE_VERSION}:${scanHash}`,
          "utf8",
        )
        .digest("hex")
        .slice(0, 16);
      const dossierPath = `${target.repository.id}/${target.commitSha}/dossier-${dossierCacheKey}.json`;
      if (await artifactExists(store, "analysis", dossierPath)) {
        cached += 1;
        continue;
      }
      const evidenceIds = new Set(
        scan.documentation.map((item) => item.evidenceId),
      );
      const bundle: RepositoryEvidenceBundle = {
        repository: target.repository,
        commitSha: target.commitSha,
        treeSummary: scan.files.slice(0, 500).join("\n"),
        documentation: scan.documentation,
        findings: [],
        evidence: scan.evidence.filter((item) => evidenceIds.has(item.id)),
      };
      const dossier = await client.createDossier(bundle);
      await store.writeJson("analysis", dossierPath, dossier);
      synthesized += 1;
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
    analysisVersion: DOSSIER_ANALYSIS_VERSION,
    promptVersion: DOSSIER_PROMPT_VERSION,
    model,
    modelVersion,
    scannerBundleVersion: SCANNER_BUNDLE_VERSION,
    analysisConfigurationKey,
    targetCount: plan.targets.length,
    synthesized,
    cached,
    errors,
    completedAt: new Date().toISOString(),
  };
  await store.writeJson(
    "manifests",
    `${plan.scanId}/synthesis-summary-${executionId}.json`,
    summary,
  );
  await store.writeCurrentJson(
    "manifests",
    "current/synthesis-summary.json",
    summary,
  );
  console.log(JSON.stringify({ event: "synthesis-completed", ...summary }));
  if (errors.length > 0) {
    throw new Error(`${errors.length} repository syntheses failed.`);
  }
}

async function main(): Promise<void> {
  if (process.env.EVIDENCE_BUNDLE_JSON) {
    await synthesizeOneBundle();
    return;
  }
  await synthesizeCurrentPlan();
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      event: "foundry-synthesis-failed",
      message: error instanceof Error ? error.message : "Unknown error",
    }),
  );
  process.exitCode = 1;
});
