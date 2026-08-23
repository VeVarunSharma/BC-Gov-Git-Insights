import { describe, expect, it } from "vitest";

import {
  DATASET_SCHEMA_VERSION,
  estateEntitySchema,
  graphSliceSchema,
  repositorySchema,
} from "./index";

describe("contracts", () => {
  it("accepts a normalized repository", () => {
    const parsed = repositorySchema.parse({
      id: 1,
      nodeId: "R_1",
      owner: "bcgov",
      name: "example",
      fullName: "bcgov/example",
      htmlUrl: "https://github.com/bcgov/example",
      description: null,
      homepage: null,
      defaultBranch: "main",
      archived: false,
      fork: false,
      empty: false,
      stars: 10,
      forks: 2,
      openIssues: 1,
      sizeKb: 50,
      primaryLanguage: "TypeScript",
      licenseSpdx: "Apache-2.0",
      topics: ["government"],
      pushedAt: "2026-08-22T10:00:00.000Z",
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2026-08-22T10:00:00.000Z",
      collectedAt: "2026-08-22T10:01:00.000Z",
    });

    expect(parsed.fullName).toBe("bcgov/example");
    expect(DATASET_SCHEMA_VERSION).toBe("0.1.0");
  });

  it("accepts candidate ministry estate entities", () => {
    const parsed = estateEntitySchema.parse({
      id: "ministry:citizens-services",
      type: "ministry",
      label: "Ministry of Citizens' Services (candidate)",
      description:
        "Candidate grouping inferred from public repository evidence.",
      status: "inferred",
      confidence: 0.78,
      repositoryId: null,
      attributes: {
        candidate: true,
        evidenceBasis: "public repository evidence",
      },
    });

    expect(parsed.type).toBe("ministry");
    expect(parsed.status).toBe("inferred");
  });

  it("rejects graph slices above the browser node cap", () => {
    const entities = Array.from({ length: 501 }, (_, index) => ({
      id: `repo:${index}`,
      type: "repository" as const,
      label: `Repository ${index}`,
      description: null,
      status: "observed" as const,
      confidence: 1,
      repositoryId: index + 1,
      attributes: {},
    }));

    expect(() =>
      graphSliceSchema.parse({
        datasetVersion: "demo",
        focusId: null,
        truncated: false,
        entities,
        relationships: [],
      }),
    ).toThrow();
  });
});
