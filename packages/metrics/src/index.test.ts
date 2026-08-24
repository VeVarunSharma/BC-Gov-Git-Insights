import { describe, expect, it } from "vitest";

import {
  calculateAgenticTargeting,
  calculateRepositoryMetrics,
  calculateTransparentHealth,
  type RepositorySignals,
} from "./index";

const completeSignals: RepositorySignals = {
  repositoryId: 1,
  datasetVersion: "demo",
  daysSincePush: 10,
  archived: false,
  hasReadme: true,
  hasArchitectureDocs: true,
  hasContributingGuide: true,
  hasTests: true,
  hasCi: true,
  hasDeploymentAutomation: true,
  hasDependencyManifest: true,
  hasDependencyLock: true,
  hasSupportedRuntime: true,
  hasSecurityPolicy: true,
  hasSecretScanningFindings: false,
  hasApiEvidence: true,
  hasDataStoreEvidence: true,
};

describe("repository metrics", () => {
  it("keeps missing data in confidence instead of treating it as failure", () => {
    const complete = calculateRepositoryMetrics(completeSignals);
    const incomplete = calculateRepositoryMetrics({
      ...completeSignals,
      hasArchitectureDocs: null,
    });

    const completeDocumentation = complete.find(
      (metric) => metric.dimension === "documentation",
    );
    const incompleteDocumentation = incomplete.find(
      (metric) => metric.dimension === "documentation",
    );

    expect(completeDocumentation?.value).toBe(100);
    expect(incompleteDocumentation?.value).toBe(100);
    expect(incompleteDocumentation?.confidence).toBeLessThan(
      completeDocumentation?.confidence ?? 0,
    );
  });

  it("produces a transparent weighted health score", () => {
    expect(
      calculateTransparentHealth(calculateRepositoryMetrics(completeSignals)),
    ).toEqual({ value: 100, confidence: 1 });
  });
});

describe("agentic targeting", () => {
  it("keeps value, readiness, and risk independent", () => {
    const result = calculateAgenticTargeting({
      activity: 90,
      documentation: 80,
      testing: 70,
      automation: 90,
      maintainability: 75,
      securityHygiene: 85,
      openIssues: 20,
      repositorySizeKb: 10_000,
      archived: false,
    });

    expect(result.value).toBeGreaterThan(50);
    expect(result.readiness).toBeGreaterThan(70);
    expect(result.risk).toBeLessThan(50);
  });
});
