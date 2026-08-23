import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import { promisify } from "node:util";

import type { EvidenceReference, Repository } from "@git-insights/contracts";
import type { RepositorySignals } from "@git-insights/metrics";

const execFileAsync = promisify(execFile);
const DEFAULT_MAX_FILES = 50_000;
const DEFAULT_MAX_FILE_BYTES = 2 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1_000;

export interface ScanLimits {
  maxFiles: number;
  maxFileBytes: number;
  timeoutMs: number;
}

export interface RepositoryScan {
  repositoryId: number;
  commitSha: string;
  scannedAt: string;
  files: string[];
  skippedLargeFiles: string[];
  documentation: Array<{
    path: string;
    excerpt: string;
    evidenceId: string;
  }>;
  signals: RepositorySignals;
  evidence: EvidenceReference[];
}

function validateRepository(repository: Repository, commitSha: string): void {
  if (repository.owner.toLowerCase() !== "bcgov") {
    throw new Error("Scanner only accepts the configured source organization.");
  }
  if (!/^[A-Za-z0-9_.-]+$/.test(repository.name)) {
    throw new Error("Repository name contains unsupported characters.");
  }
  if (!/^[0-9a-f]{40}$/i.test(commitSha)) {
    throw new Error("Scanner requires a full immutable commit SHA.");
  }
}

async function runGit(
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<void> {
  await execFileAsync("git", args, {
    cwd,
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024,
    env: {
      ...process.env,
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_LFS_SKIP_SMUDGE: "1",
      GIT_TERMINAL_PROMPT: "0",
    },
  });
}

async function cloneAtCommit(
  repository: Repository,
  commitSha: string,
  destination: string,
  timeoutMs: number,
): Promise<void> {
  await runGit(
    ["-c", "core.hooksPath=/dev/null", "init", "--quiet"],
    destination,
    timeoutMs,
  );
  await runGit(
    [
      "-c",
      "protocol.file.allow=never",
      "remote",
      "add",
      "origin",
      `https://github.com/${repository.owner}/${repository.name}.git`,
    ],
    destination,
    timeoutMs,
  );
  await runGit(
    [
      "-c",
      "protocol.file.allow=never",
      "-c",
      "core.hooksPath=/dev/null",
      "fetch",
      "--quiet",
      "--depth=1",
      "--no-tags",
      "origin",
      commitSha,
    ],
    destination,
    timeoutMs,
  );
  await runGit(
    [
      "-c",
      "core.hooksPath=/dev/null",
      "checkout",
      "--quiet",
      "--detach",
      "FETCH_HEAD",
    ],
    destination,
    timeoutMs,
  );
}

async function collectFiles(
  root: string,
  limits: ScanLimits,
): Promise<{ files: string[]; skippedLargeFiles: string[] }> {
  const files: string[] = [];
  const skippedLargeFiles: string[] = [];
  const pending = [root];
  let totalFiles = 0;

  while (pending.length > 0) {
    const directory = pending.pop();
    if (!directory) {
      break;
    }
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".git") {
        continue;
      }
      const absolute = join(directory, entry.name);
      const path = relative(root, absolute);
      if (entry.isSymbolicLink()) {
        continue;
      }
      if (entry.isDirectory()) {
        pending.push(absolute);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      totalFiles += 1;
      if (totalFiles > limits.maxFiles) {
        throw new Error(
          `Repository exceeds the ${limits.maxFiles} file limit.`,
        );
      }
      const details = await stat(absolute);
      if (details.size > limits.maxFileBytes) {
        skippedLargeFiles.push(path);
      } else {
        files.push(path);
      }
    }
  }

  return {
    files: [...files].sort(),
    skippedLargeFiles: [...skippedLargeFiles].sort(),
  };
}

function containsPath(files: readonly string[], matcher: RegExp): boolean {
  return files.some((file) => matcher.test(file));
}

function evidenceForFile(
  repository: Repository,
  commitSha: string,
  path: string,
): EvidenceReference {
  const url = `${repository.htmlUrl}/blob/${commitSha}/${encodeURI(path)}`;
  return {
    id: createHash("sha256")
      .update(`${repository.id}:${commitSha}:${path}`)
      .digest("hex"),
    repositoryId: repository.id,
    commitSha,
    origin: "scanner",
    path,
    startLine: null,
    endLine: null,
    url,
    excerpt: null,
    sha256: createHash("sha256").update(path).digest("hex"),
    redacted: false,
  };
}

export function buildRepositorySignals(
  repository: Repository,
  datasetVersion: string,
  files: readonly string[],
): RepositorySignals {
  const pushedAt = repository.pushedAt
    ? new Date(repository.pushedAt).getTime()
    : null;
  const daysSincePush =
    pushedAt === null
      ? null
      : Math.max(0, Math.floor((Date.now() - pushedAt) / 86_400_000));

  return {
    repositoryId: repository.id,
    datasetVersion,
    daysSincePush,
    archived: repository.archived,
    hasReadme: containsPath(files, /(^|\/)readme(\.[^/]+)?$/i),
    hasArchitectureDocs: containsPath(
      files,
      /(^|\/)(architecture|docs\/architecture|adr)(\/|\.|$)/i,
    ),
    hasContributingGuide: containsPath(files, /(^|\/)contributing(\.[^/]+)?$/i),
    hasTests: containsPath(
      files,
      /(^|\/)(__tests__|tests?|spec)(\/|\.|$)|\.(test|spec)\.[^.]+$/i,
    ),
    hasCi: containsPath(files, /^\.github\/workflows\/.+\.ya?ml$/i),
    hasDeploymentAutomation: containsPath(
      files,
      /(^|\/)(dockerfile|azure\.yaml|helmfile\.ya?ml|chart\.ya?ml|main\.bicep|main\.tf)$/i,
    ),
    hasDependencyManifest: containsPath(
      files,
      /(^|\/)(package\.json|pyproject\.toml|requirements.*\.txt|pom\.xml|build\.gradle|go\.mod|cargo\.toml|.*\.csproj)$/i,
    ),
    hasDependencyLock: containsPath(
      files,
      /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|poetry\.lock|uv\.lock|go\.sum|cargo\.lock)$/i,
    ),
    hasSupportedRuntime: null,
    hasSecurityPolicy: containsPath(
      files,
      /(^|\/)(security|security-policy)(\.[^/]+)?$/i,
    ),
    hasSecretScanningFindings: null,
    hasApiEvidence: containsPath(
      files,
      /(^|\/)(openapi|swagger)(\.[^/]+)?$|(^|\/)routes?(\/|\.|$)/i,
    ),
    hasDataStoreEvidence: containsPath(
      files,
      /(^|\/)(migrations?|schema|database|db)(\/|\.|$)/i,
    ),
  };
}

async function collectDocumentation(
  root: string,
  files: readonly string[],
  evidence: readonly EvidenceReference[],
): Promise<{
  documentation: RepositoryScan["documentation"];
  redactedPaths: Set<string>;
}> {
  const evidenceByPath = new Map(evidence.map((item) => [item.path, item]));
  const candidates = files
    .filter((path) =>
      /(^|\/)(readme|architecture|contributing|security)(\.[^/]+)?$/i.test(
        path,
      ),
    )
    .slice(0, 5);
  const documentation: RepositoryScan["documentation"] = [];
  const redactedPaths = new Set<string>();

  for (const path of candidates) {
    try {
      const source = await readFile(join(root, path), "utf8");
      const redacted = redactPotentialSecrets(source);
      const containsCredentialMaterial = redacted !== source;
      const excerpt = containsCredentialMaterial
        ? "[REDACTED: potential credential material detected]"
        : redacted.slice(0, 2_000);
      if (containsCredentialMaterial) {
        redactedPaths.add(path);
      }
      const reference = evidenceByPath.get(path);
      if (reference && excerpt.trim()) {
        documentation.push({
          path,
          excerpt,
          evidenceId: reference.id,
        });
      }
    } catch (error: unknown) {
      if (error instanceof Error && "code" in error) {
        continue;
      }
      throw error;
    }
  }

  return { documentation, redactedPaths };
}

export async function scanRepository(
  repository: Repository,
  commitSha: string,
  datasetVersion: string,
  limits: Partial<ScanLimits> = {},
): Promise<RepositoryScan> {
  validateRepository(repository, commitSha);
  const effectiveLimits: ScanLimits = {
    maxFiles: limits.maxFiles ?? DEFAULT_MAX_FILES,
    maxFileBytes: limits.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
    timeoutMs: limits.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };
  const worktree = await mkdtemp(join(tmpdir(), "git-insights-"));

  try {
    const details = await lstat(worktree);
    if (!details.isDirectory()) {
      throw new Error("Temporary worktree is not a directory.");
    }
    await cloneAtCommit(
      repository,
      commitSha,
      worktree,
      effectiveLimits.timeoutMs,
    );
    const { files, skippedLargeFiles } = await collectFiles(
      worktree,
      effectiveLimits,
    );
    const evidence = files.map((path) =>
      evidenceForFile(repository, commitSha, path),
    );
    const { documentation, redactedPaths } = await collectDocumentation(
      worktree,
      files,
      evidence,
    );
    const safeEvidence = evidence.map((reference) =>
      redactedPaths.has(reference.path)
        ? { ...reference, redacted: true }
        : reference,
    );
    return {
      repositoryId: repository.id,
      commitSha,
      scannedAt: new Date().toISOString(),
      files,
      skippedLargeFiles,
      documentation,
      signals: buildRepositorySignals(repository, datasetVersion, files),
      evidence: safeEvidence,
    };
  } finally {
    await rm(worktree, { recursive: true, force: true });
  }
}

export function redactPotentialSecrets(content: string): string {
  const patterns: Array<[RegExp, string]> = [
    [
      /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g,
      "[REDACTED_PRIVATE_KEY]",
    ],
    [/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*/g, "[REDACTED_PRIVATE_KEY]"],
    [
      /(\b(?:authorization|proxy-authorization)\s*:\s*bearer\s+)[^\s"'<>]+/gi,
      "$1[REDACTED]",
    ],
    [/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, "[REDACTED_GITHUB_TOKEN]"],
    [
      /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
      "[REDACTED_JWT]",
    ],
    [/((?:accountkey|sharedaccesskey|sig)\s*=\s*)[^;\s"']+/gi, "$1[REDACTED]"],
    [
      /((?:"?(?:api[_-]?key|client[_-]?secret|password|passwd|token|credential|connection[_-]?string|private[_-]?key|sas)"?)\s*[:=]\s*)(["']?)[^\s"',;}]+/gi,
      "$1$2[REDACTED]",
    ],
    [/(https?:\/\/[^/\s:@]+:)[^@\s/]+@/gi, "$1[REDACTED]@"],
  ];

  return patterns.reduce(
    (redacted, [pattern, replacement]) =>
      redacted.replace(pattern, replacement),
    content,
  );
}

export async function summarizeTextFile(
  root: string,
  relativePath: string,
  maxCharacters = 2_000,
): Promise<string> {
  if (
    relativePath.startsWith("/") ||
    relativePath.includes("..") ||
    relativePath.includes("\\")
  ) {
    throw new Error("Unsafe text file path.");
  }
  const absolute = join(root, relativePath);
  if (basename(absolute) !== basename(relativePath)) {
    const rootDetails = await lstat(root);
    if (!rootDetails.isDirectory()) {
      throw new Error("Scanner root is invalid.");
    }
  }
  const content = await readFile(absolute, "utf8");
  return redactPotentialSecrets(content.slice(0, maxCharacters));
}
