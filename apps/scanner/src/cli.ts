import { readFile, writeFile } from "node:fs/promises";

import { repositorySchema } from "@git-insights/contracts";

import { scanRepository } from "./index";

async function main(): Promise<void> {
  const repositoryPath = process.env.REPOSITORY_JSON;
  const commitSha = process.env.REPOSITORY_COMMIT_SHA;
  const outputPath = process.env.SCAN_OUTPUT;
  if (!repositoryPath || !commitSha || !outputPath) {
    throw new Error(
      "REPOSITORY_JSON, REPOSITORY_COMMIT_SHA, and SCAN_OUTPUT are required.",
    );
  }

  const repository = repositorySchema.parse(
    JSON.parse(await readFile(repositoryPath, "utf8")),
  );
  const scan = await scanRepository(
    repository,
    commitSha,
    process.env.DATASET_VERSION ?? new Date().toISOString(),
  );
  await writeFile(outputPath, `${JSON.stringify(scan, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      event: "repository-scan-failed",
      message: error instanceof Error ? error.message : "Unknown error",
    }),
  );
  process.exitCode = 1;
});
