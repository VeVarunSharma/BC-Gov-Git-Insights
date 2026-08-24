import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

import {
  AzureBlobEvidenceWriter,
  type EvidenceStore,
  MemoryEvidenceWriter,
} from "@git-insights/evidence";
import {
  DATASET_SCHEMA_VERSION,
  scanPlanSchema,
  type Repository,
  type ScanTarget,
} from "@git-insights/contracts";
import { buildCohortManifest, GitHubRestClient } from "@git-insights/github";

function createWriter(): EvidenceStore {
  const storageAccount = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  return storageAccount
    ? new AzureBlobEvidenceWriter(storageAccount)
    : new MemoryEvidenceWriter();
}

async function resolveTargets(
  client: GitHubRestClient,
  repositories: Repository[],
  concurrency = 5,
): Promise<ScanTarget[]> {
  const targets: ScanTarget[] = [];
  for (let index = 0; index < repositories.length; index += concurrency) {
    const batch = repositories.slice(index, index + concurrency);
    targets.push(
      ...(await Promise.all(
        batch.map(async (repository) => ({
          repository,
          commitSha: await client.getDefaultBranchCommit(repository),
        })),
      )),
    );
  }
  return targets;
}

async function main(): Promise<void> {
  const organization = process.env.GITHUB_ORGANIZATION ?? "bcgov";
  const client = new GitHubRestClient({
    clientId: process.env.GITHUB_OAUTH_CLIENT_ID,
    clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
    token: process.env.GITHUB_TOKEN,
  });
  const writer = createWriter();
  const scanId = randomUUID();
  const { repositories, etags } =
    await client.listOrganizationRepositories(organization);
  const manifest = buildCohortManifest(
    repositories,
    organization,
    etags.at(-1) ?? null,
  );
  const scanPlan = scanPlanSchema.parse({
    schemaVersion: DATASET_SCHEMA_VERSION,
    scanId,
    datasetVersion: `github-${manifest.selectedAt}`,
    generatedAt: new Date().toISOString(),
    targets: await resolveTargets(client, manifest.repositories),
  });

  await writer.writeJson("raw", `${scanId}/repositories.json`, repositories);
  await writer.writeJson("control", `${scanId}/cohort.json`, manifest);
  await writer.writeJson("control", `${scanId}/scan-plan.json`, scanPlan);
  await writer.writeCurrentJson("control", "current/cohort.json", manifest);
  await writer.writeCurrentJson("control", "current/scan-plan.json", scanPlan);

  const outputDirectory = process.env.LOCAL_OUTPUT_DIRECTORY;
  if (outputDirectory) {
    const absoluteDirectory = resolve(outputDirectory);
    await mkdir(absoluteDirectory, { recursive: true });
    await writeFile(
      resolve(absoluteDirectory, "cohort.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { encoding: "utf8", flag: "wx" },
    );
    await writeFile(
      resolve(absoluteDirectory, "scan-plan.json"),
      `${JSON.stringify(scanPlan, null, 2)}\n`,
      { encoding: "utf8", flag: "wx" },
    );
  }

  console.log(
    JSON.stringify({
      event: "cohort-collected",
      scanId,
      organization,
      eligibleCount: manifest.eligibleCount,
      selectedCount: manifest.repositories.length,
      scanTargetCount: scanPlan.targets.length,
    }),
  );
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      event: "cohort-collection-failed",
      message: error instanceof Error ? error.message : "Unknown error",
    }),
  );
  process.exitCode = 1;
});
