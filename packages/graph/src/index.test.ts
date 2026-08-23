import { describe, expect, it } from "vitest";

import type { EstateEntity, EstateRelationship } from "@git-insights/contracts";

import { buildGraphSlice, MAX_GRAPH_NODES } from "./index";

const entities: EstateEntity[] = [
  {
    id: "org:bcgov",
    type: "organization",
    label: "BC Gov",
    description: null,
    status: "observed",
    confidence: 1,
    repositoryId: null,
    attributes: {},
  },
  {
    id: "ministry:citizens-services",
    type: "ministry",
    label: "Citizens' Services (candidate)",
    description: null,
    status: "inferred",
    confidence: 0.8,
    repositoryId: null,
    attributes: { candidate: true },
  },
  {
    id: "repo:1",
    type: "repository",
    label: "Repository",
    description: null,
    status: "observed",
    confidence: 1,
    repositoryId: 1,
    attributes: {},
  },
  {
    id: "capability:forms",
    type: "capability",
    label: "Digital forms",
    description: null,
    status: "inferred",
    confidence: 0.8,
    repositoryId: null,
    attributes: {},
  },
];

const relationships: EstateRelationship[] = [
  {
    id: "edge:contains",
    source: "org:bcgov",
    target: "ministry:citizens-services",
    type: "contains",
    status: "inferred",
    confidence: 0.8,
    evidenceIds: ["evidence:ministry"],
  },
  {
    id: "edge:ministry-contains",
    source: "ministry:citizens-services",
    target: "repo:1",
    type: "contains",
    status: "inferred",
    confidence: 0.8,
    evidenceIds: ["evidence:ministry"],
  },
  {
    id: "edge:implements",
    source: "repo:1",
    target: "capability:forms",
    type: "implements",
    status: "inferred",
    confidence: 0.8,
    evidenceIds: ["evidence:1"],
  },
];

describe("buildGraphSlice", () => {
  it("expands a bounded neighborhood", () => {
    const slice = buildGraphSlice(entities, relationships, {
      datasetVersion: "demo",
      focusId: "repo:1",
      depth: 1,
    });

    expect(slice.entities).toHaveLength(3);
    expect(slice.relationships).toHaveLength(2);
  });

  it("expands through ministry boundaries without changing the API shape", () => {
    const slice = buildGraphSlice(entities, relationships, {
      datasetVersion: "demo",
      focusId: "repo:1",
      depth: 2,
    });

    expect(slice.entities.map((entity) => entity.type)).toEqual(
      expect.arrayContaining([
        "organization",
        "ministry",
        "repository",
        "capability",
      ]),
    );
    expect(slice.entities).toHaveLength(4);
    expect(slice.relationships).toHaveLength(3);
  });

  it("supports ministry-only aggregate slices", () => {
    const slice = buildGraphSlice(entities, relationships, {
      datasetVersion: "demo",
      entityTypes: ["ministry"],
    });

    expect(slice.entities.map((entity) => entity.id)).toEqual([
      "ministry:citizens-services",
    ]);
    expect(slice.relationships).toHaveLength(0);
  });

  it("never allows a browser slice above the cap", () => {
    const many = Array.from({ length: 600 }, (_, index) => ({
      ...entities[1]!,
      id: `repo:${index}`,
      label: `Repo ${index}`,
      repositoryId: index + 1,
    }));

    const slice = buildGraphSlice(many, [], {
      datasetVersion: "demo",
      limit: 10_000,
    });

    expect(slice.entities).toHaveLength(MAX_GRAPH_NODES);
    expect(slice.truncated).toBe(true);
  });
});
