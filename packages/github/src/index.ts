import {
  DATASET_SCHEMA_VERSION,
  type CohortManifest,
  type Repository,
  repositorySchema,
} from "@git-insights/contracts";
import { z } from "zod";

const githubLicenseSchema = z
  .object({
    spdx_id: z.string().nullable(),
  })
  .nullable();

const githubOwnerSchema = z.object({
  login: z.string(),
});

const githubRepositorySchema = z.object({
  id: z.number().int().positive(),
  node_id: z.string(),
  name: z.string(),
  full_name: z.string(),
  owner: githubOwnerSchema,
  html_url: z.string().url(),
  description: z.string().nullable(),
  homepage: z.string().nullable(),
  default_branch: z.string(),
  archived: z.boolean(),
  fork: z.boolean(),
  stargazers_count: z.number().int().nonnegative(),
  forks_count: z.number().int().nonnegative(),
  open_issues_count: z.number().int().nonnegative(),
  size: z.number().int().nonnegative(),
  language: z.string().nullable(),
  license: githubLicenseSchema,
  topics: z.array(z.string()).default([]),
  pushed_at: z.string().datetime({ offset: true }).nullable(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

const githubRepositoryListSchema = z.array(githubRepositorySchema);
const githubCommitSchema = z.object({
  sha: z.string().regex(/^[0-9a-f]{40}$/i),
});

export interface GitHubRateLimit {
  limit: number | null;
  remaining: number | null;
  resetAt: Date | null;
}

export interface GitHubPage<T> {
  data: T;
  etag: string | null;
  rateLimit: GitHubRateLimit;
}

export interface GitHubClientOptions {
  clientId?: string;
  clientSecret?: string;
  token?: string;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  userAgent?: string;
}

export class GitHubRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterSeconds: number | null,
  ) {
    super(message);
    this.name = "GitHubRequestError";
  }
}

function parseIntegerHeader(headers: Headers, name: string): number | null {
  const value = headers.get(name);
  if (value === null) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function readRateLimit(headers: Headers): GitHubRateLimit {
  const reset = parseIntegerHeader(headers, "x-ratelimit-reset");
  return {
    limit: parseIntegerHeader(headers, "x-ratelimit-limit"),
    remaining: parseIntegerHeader(headers, "x-ratelimit-remaining"),
    resetAt: reset === null ? null : new Date(reset * 1_000),
  };
}

function toRepository(
  raw: z.infer<typeof githubRepositorySchema>,
  collectedAt: string,
): Repository {
  return repositorySchema.parse({
    id: raw.id,
    nodeId: raw.node_id,
    owner: raw.owner.login,
    name: raw.name,
    fullName: raw.full_name,
    htmlUrl: raw.html_url,
    description: raw.description,
    homepage: raw.homepage,
    defaultBranch: raw.default_branch,
    archived: raw.archived,
    fork: raw.fork,
    empty: raw.size === 0,
    stars: raw.stargazers_count,
    forks: raw.forks_count,
    openIssues: raw.open_issues_count,
    sizeKb: raw.size,
    primaryLanguage: raw.language,
    licenseSpdx: raw.license?.spdx_id ?? null,
    topics: raw.topics,
    pushedAt: raw.pushed_at,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    collectedAt,
  });
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class GitHubRestClient {
  private readonly fetchImpl: typeof fetch;
  private readonly maxRetries: number;
  private readonly headers: HeadersInit;
  private readonly requireAuthenticatedRateLimit: boolean;

  constructor(options: GitHubClientOptions = {}) {
    if (
      (options.clientId && !options.clientSecret) ||
      (!options.clientId && options.clientSecret)
    ) {
      throw new Error(
        "GitHub OAuth client ID and secret must be configured together.",
      );
    }
    if (options.token && (options.clientId || options.clientSecret)) {
      throw new Error(
        "Configure either a GitHub bearer token or OAuth client credentials, not both.",
      );
    }

    this.fetchImpl = options.fetchImpl ?? fetch;
    this.maxRetries = options.maxRetries ?? 3;
    this.requireAuthenticatedRateLimit = Boolean(
      options.token || (options.clientId && options.clientSecret),
    );
    this.headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": options.userAgent ?? "bc-gov-git-insights",
      "X-GitHub-Api-Version": "2026-03-10",
      ...(options.token
        ? { Authorization: `Bearer ${options.token}` }
        : options.clientId && options.clientSecret
          ? {
              Authorization: `Basic ${Buffer.from(
                `${options.clientId}:${options.clientSecret}`,
              ).toString("base64")}`,
            }
          : {}),
    };
  }

  private async get<T>(
    url: URL,
    schema: z.ZodType<T>,
    etag?: string,
  ): Promise<GitHubPage<T | null>> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const response = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          ...this.headers,
          ...(etag ? { "If-None-Match": etag } : {}),
        },
        redirect: "error",
        signal: AbortSignal.timeout(30_000),
      });

      if (response.status === 304) {
        this.assertAuthenticatedRateLimit(response.headers);
        return {
          data: null,
          etag: etag ?? null,
          rateLimit: readRateLimit(response.headers),
        };
      }

      if (response.ok) {
        const payload: unknown = await response.json();
        this.assertAuthenticatedRateLimit(response.headers);
        return {
          data: schema.parse(payload),
          etag: response.headers.get("etag"),
          rateLimit: readRateLimit(response.headers),
        };
      }

      const retryAfter = parseIntegerHeader(response.headers, "retry-after");
      const rateLimit = readRateLimit(response.headers);
      const primaryRateLimitExhausted =
        response.status === 403 &&
        rateLimit.remaining === 0 &&
        rateLimit.resetAt !== null;
      const isRetryable =
        response.status === 429 ||
        response.status >= 500 ||
        retryAfter !== null ||
        primaryRateLimitExhausted;

      if (!isRetryable || attempt === this.maxRetries) {
        const responseText = (await response.text()).slice(0, 500);
        throw new GitHubRequestError(
          `GitHub GET ${url.pathname} failed with ${response.status}: ${responseText}`,
          response.status,
          retryAfter,
        );
      }

      const resetDelaySeconds =
        primaryRateLimitExhausted && rateLimit.resetAt
          ? Math.max(
              0,
              Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1_000) + 1,
            )
          : null;
      const delaySeconds =
        retryAfter ??
        resetDelaySeconds ??
        Math.min(2 ** attempt, 16) + Math.random();
      await wait(delaySeconds * 1_000);
    }

    throw new Error("GitHub retry loop exited unexpectedly.");
  }

  private assertAuthenticatedRateLimit(headers: Headers): void {
    if (!this.requireAuthenticatedRateLimit) {
      return;
    }
    const rateLimit = readRateLimit(headers);
    if (rateLimit.limit !== null && rateLimit.limit < 5_000) {
      throw new GitHubRequestError(
        `GitHub credentials did not establish the expected authenticated rate limit (received ${rateLimit.limit} requests/hour).`,
        401,
        null,
      );
    }
  }

  async listOrganizationRepositories(
    organization: string,
  ): Promise<{ repositories: Repository[]; etags: string[] }> {
    if (!/^[A-Za-z0-9-]+$/.test(organization)) {
      throw new Error("GitHub organization contains unsupported characters.");
    }

    const repositories: Repository[] = [];
    const etags: string[] = [];
    const collectedAt = new Date().toISOString();

    for (let page = 1; ; page += 1) {
      const url = new URL(
        `/orgs/${organization}/repos`,
        "https://api.github.com",
      );
      url.searchParams.set("type", "public");
      url.searchParams.set("sort", "full_name");
      url.searchParams.set("direction", "asc");
      url.searchParams.set("per_page", "100");
      url.searchParams.set("page", String(page));

      const result = await this.get(url, githubRepositoryListSchema);
      if (result.data === null) {
        throw new Error(
          "Conditional organization pages require a persisted page cache.",
        );
      }

      repositories.push(
        ...result.data.map((repository) =>
          toRepository(repository, collectedAt),
        ),
      );
      if (result.etag) {
        etags.push(result.etag);
      }

      if (result.data.length < 100) {
        break;
      }
    }

    return { repositories, etags };
  }

  async getDefaultBranchCommit(repository: Repository): Promise<string> {
    if (
      !/^[A-Za-z0-9_.-]+$/.test(repository.owner) ||
      !/^[A-Za-z0-9_.-]+$/.test(repository.name) ||
      !/^[A-Za-z0-9_./-]+$/.test(repository.defaultBranch)
    ) {
      throw new Error("Repository coordinates contain unsupported characters.");
    }
    const url = new URL(
      `/repos/${repository.owner}/${repository.name}/commits/${repository.defaultBranch}`,
      "https://api.github.com",
    );
    const result = await this.get(url, githubCommitSchema);
    if (!result.data) {
      throw new Error(
        `GitHub returned no commit for ${repository.fullName}:${repository.defaultBranch}.`,
      );
    }
    return result.data.sha;
  }
}

export function selectMostStarredRepositories(
  repositories: readonly Repository[],
  organization: string,
  limit = 100,
): Repository[] {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Cohort limit must be a positive integer.");
  }

  return [
    ...repositories.filter(
      (repository) =>
        repository.owner.toLowerCase() === organization.toLowerCase() &&
        !repository.fork &&
        !repository.empty,
    ),
  ]
    .sort(
      (left, right) =>
        right.stars - left.stars ||
        left.fullName.localeCompare(right.fullName, "en"),
    )
    .slice(0, limit);
}

export function buildCohortManifest(
  repositories: readonly Repository[],
  organization: string,
  sourceEtag: string | null,
): CohortManifest {
  const selected = selectMostStarredRepositories(
    repositories,
    organization,
    100,
  );
  if (selected.length !== 100) {
    throw new Error(
      `Expected 100 eligible repositories but selected ${selected.length}.`,
    );
  }

  return {
    schemaVersion: DATASET_SCHEMA_VERSION,
    organization,
    selectionAlgorithm: "most-starred-v1",
    selectedAt: new Date().toISOString(),
    sourceEtag,
    eligibleCount: repositories.filter(
      (repository) =>
        repository.owner.toLowerCase() === organization.toLowerCase() &&
        !repository.fork &&
        !repository.empty,
    ).length,
    repositories: selected,
  };
}
