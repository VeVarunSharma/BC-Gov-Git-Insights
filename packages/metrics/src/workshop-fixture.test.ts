import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  calculateRepositoryMetrics,
  calculateTransparentHealth,
  type RepositorySignals,
} from "./index";

const sample = JSON.parse(
  readFileSync(
    new URL("../../../docs/demo/synthetic-sample.json", import.meta.url),
    "utf8",
  ),
) as {
  synthetic: boolean;
  repositories: Array<{
    name: string;
    signals: RepositorySignals;
    expected: {
      health: number;
      documentation: number;
      documentationConfidence: number;
    };
  }>;
};

describe("reusable workshop sample", () => {
  it("explicitly identifies fictional data", () => {
    expect(sample.synthetic).toBe(true);
  });

  for (const repository of sample.repositories) {
    it(`reproduces the expected interpretation for ${repository.name}`, () => {
      const metrics = calculateRepositoryMetrics(repository.signals);
      const documentation = metrics.find(
        (metric) => metric.dimension === "documentation",
      )!;
      expect(calculateTransparentHealth(metrics).value).toBe(
        repository.expected.health,
      );
      expect(documentation.value).toBe(repository.expected.documentation);
      expect(documentation.confidence).toBeCloseTo(
        repository.expected.documentationConfidence,
      );
    });
  }
});
