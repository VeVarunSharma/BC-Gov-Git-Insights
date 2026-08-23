import { describe, expect, it, vi } from "vitest";

import type { Repository } from "@git-insights/contracts";

import { GitHubRestClient, selectMostStarredRepositories } from "./index";

function repository(
  name: string,
  stars: number,
  overrides: Partial<Repository> = {},
): Repository {
  return {
    id: Math.abs(
      name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0),
    ),
    nodeId: `R_${name}`,
    owner: "bcgov",
    name,
    fullName: `bcgov/${name}`,
    htmlUrl: `https://github.com/bcgov/${name}`,
    description: null,
    homepage: null,
    defaultBranch: "main",
    archived: false,
    fork: false,
    empty: false,
    stars,
    forks: 0,
    openIssues: 0,
    sizeKb: 1,
    primaryLanguage: null,
    licenseSpdx: "Apache-2.0",
    topics: [],
    pushedAt: null,
    createdAt: "2020-01-01T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
    collectedAt: "2026-08-22T01:00:00.000Z",
    ...overrides,
  };
}

describe("selectMostStarredRepositories", () => {
  it("uses stars then full name and keeps archived repositories", () => {
    const selected = selectMostStarredRepositories(
      [
        repository("zeta", 10),
        repository("alpha", 10, { archived: true }),
        repository("fork", 100, { fork: true }),
        repository("empty", 100, { empty: true }),
        repository("foreign", 100, { owner: "other" }),
      ],
      "bcgov",
      2,
    );

    expect(selected.map((item) => item.name)).toEqual(["alpha", "zeta"]);
  });
});

describe("GitHubRestClient", () => {
  it("never exposes a write method and requires complete OAuth credentials", () => {
    expect(() => new GitHubRestClient({ clientId: "client-only" })).toThrow(
      "configured together",
    );
    expect(
      Object.getOwnPropertyNames(GitHubRestClient.prototype),
    ).not.toContain("post");
  });

  it("retries a primary rate-limit response after its reset", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response("rate limited", {
          status: 403,
          headers: {
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": String(Math.floor(Date.now() / 1_000) - 2),
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ sha: "a".repeat(40) }, { status: 200 }),
      );
    const client = new GitHubRestClient({
      fetchImpl,
      maxRetries: 1,
    });

    await expect(
      client.getDefaultBranchCommit(repository("example", 1)),
    ).resolves.toBe("a".repeat(40));
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
