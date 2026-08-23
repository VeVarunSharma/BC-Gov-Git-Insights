import { describe, expect, it } from "vitest";

import type {
  AgenticRecommendation,
  EstateEntity,
  EstateRelationship,
  MetricDimension,
  MetricValue,
  Repository,
} from "@git-insights/contracts";

import {
  buildMinistryDashboardInsights,
  calculateConfidenceWeightedAggregate,
} from "./index";

const dimensions: MetricDimension[] = [
  "activity",
  "documentation",
  "testing",
  "automation",
  "sustainability",
  "securityHygiene",
  "architectureEvidence",
  "maintainability",
];

function repository(
  id: number,
  name: string,
  options: Partial<Repository> = {},
): Repository {
  return {
    id,
    nodeId: `node:${id}`,
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
    stars: 10,
    forks: 2,
    openIssues: 5,
    sizeKb: 100,
    primaryLanguage: "TypeScript",
    licenseSpdx: "Apache-2.0",
    topics: [],
    pushedAt: "2026-08-20T00:00:00.000Z",
    createdAt: "2020-01-01T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
    collectedAt: "2026-08-22T00:00:00.000Z",
    ...options,
  };
}

function metricsFor(
  repositoryId: number,
  activity: number,
  quality: number,
  confidence: number,
): MetricValue[] {
  return dimensions.map((dimension) => ({
    repositoryId,
    datasetVersion: "demo",
    definitionVersion: "0.1.0",
    dimension,
    value: dimension === "activity" ? activity : quality,
    confidence,
    evidenceIds:
      confidence > 0 ? [`evidence:${repositoryId}:${dimension}`] : [],
  }));
}

const repositories = [
  repository(1, "active-service", { openIssues: 120 }),
  repository(2, "archived-library", { archived: true, stars: 90 }),
];

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
    id: "ministry:candidate",
    type: "ministry",
    label: "Candidate ministry",
    description: "Candidate grouping.",
    status: "inferred",
    confidence: 0.8,
    repositoryId: null,
    attributes: { candidate: true },
  },
  {
    id: "portfolio:services",
    type: "portfolio",
    label: "Services",
    description: null,
    status: "inferred",
    confidence: 0.75,
    repositoryId: null,
    attributes: {},
  },
  ...repositories.map((item): EstateEntity => ({
    id: `repo:${item.id}`,
    type: "repository",
    label: item.name,
    description: null,
    status: "observed",
    confidence: 1,
    repositoryId: item.id,
    attributes: {},
  })),
  {
    id: "capability:shared",
    type: "capability",
    label: "Shared capability",
    description: null,
    status: "inferred",
    confidence: 0.85,
    repositoryId: null,
    attributes: {},
  },
];

const relationships: EstateRelationship[] = [
  {
    id: "contains:ministry",
    source: "org:bcgov",
    target: "ministry:candidate",
    type: "contains",
    status: "inferred",
    confidence: 0.8,
    evidenceIds: ["evidence:ministry"],
  },
  {
    id: "contains:portfolio",
    source: "ministry:candidate",
    target: "portfolio:services",
    type: "contains",
    status: "inferred",
    confidence: 0.75,
    evidenceIds: ["evidence:portfolio"],
  },
  ...repositories.map((item): EstateRelationship => ({
    id: `contains:repo:${item.id}`,
    source: "portfolio:services",
    target: `repo:${item.id}`,
    type: "contains",
    status: "inferred",
    confidence: 0.8,
    evidenceIds: [`evidence:${item.id}:membership`],
  })),
  ...repositories.map((item): EstateRelationship => ({
    id: `implements:${item.id}`,
    source: `repo:${item.id}`,
    target: "capability:shared",
    type: "implements",
    status: "inferred",
    confidence: 0.8,
    evidenceIds: [`evidence:${item.id}:capability`],
  })),
];

const recommendations: AgenticRecommendation[] = [
  {
    id: "agentic:active",
    repositoryId: 1,
    workflowType: "issue-triage",
    value: 90,
    readiness: 80,
    risk: 30,
    confidence: 0.85,
    rationale: "Evidence-backed candidate.",
    prerequisites: [],
    safeOutputs: ["Draft issue"],
    evidenceIds: ["evidence:agentic"],
  },
];

describe("confidence-weighted aggregates", () => {
  it("keeps quality, confidence, and coverage separate", () => {
    expect(
      calculateConfidenceWeightedAggregate(
        [
          { value: 80, confidence: 1 },
          { value: 40, confidence: 0.5 },
        ],
        3,
      ),
    ).toEqual({
      value: 67,
      confidence: 0.75,
      coverage: 0.67,
      sampleSize: 2,
    });
  });
});

describe("ministry dashboard insights", () => {
  const insights = buildMinistryDashboardInsights({
    datasetVersion: "demo",
    capturedAt: "2026-08-22T00:00:00.000Z",
    selectedRepositoryCount: 10,
    analyzedRepositoryCount: 2,
    repositories,
    metrics: [...metricsFor(1, 90, 60, 1), ...metricsFor(2, 10, 80, 0.5)],
    entities,
    relationships,
    recommendations,
  });

  it("summarizes inferred ministry and portfolio membership", () => {
    expect(insights.ministryScorecards[0]).toMatchObject({
      repositoryCount: 2,
      activeRepositoryCount: 1,
      archivedRepositoryCount: 1,
      agenticCandidateCount: 1,
      membershipConfidence: 0.8,
    });
    expect(insights.portfolioComparisons[0]).toMatchObject({
      repositoryCount: 2,
      agenticCandidateCount: 1,
      ministryId: "ministry:candidate",
    });
  });

  it("uses explicit attention rules and reuse hypotheses", () => {
    expect(insights.attentionQueue.map((item) => item.category)).toEqual(
      expect.arrayContaining([
        "active-low-health",
        "agentic-ready",
        "archived-high-interest",
        "issue-backlog",
      ]),
    );
    expect(insights.attentionQueue.every((item) => item.rule.length > 0)).toBe(
      true,
    );
    expect(insights.capabilityReuse[0]).toMatchObject({
      repositoryCount: 2,
      portfolioCount: 1,
      ministryCount: 1,
    });
    expect(insights.capabilityReuse[0]?.hypothesis).toContain(
      "Opportunity hypothesis only",
    );
  });

  it("reports snapshot coverage without inventing a trend", () => {
    expect(insights.dataQuality.analysisCoverage).toBe(0.2);
    expect(insights.dataQuality.inferredRelationshipCount).toBe(
      relationships.length,
    );
    expect(insights.dataQuality.missingEvidenceWarnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("2 of 10 selected repositories"),
        expect.stringContaining("not an authoritative organization record"),
      ]),
    );
  });
});
