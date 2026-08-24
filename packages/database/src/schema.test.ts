import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  estateEntities,
  estateRelationships,
  evidenceReferences,
  findings,
  repositories,
  scanRuns,
} from "./schema";

describe("database schema", () => {
  it("keeps evidence, facts, and graph relationships in separate tables", () => {
    expect(
      [
        repositories,
        scanRuns,
        evidenceReferences,
        findings,
        estateEntities,
        estateRelationships,
      ].map(getTableName),
    ).toEqual([
      "repositories",
      "scan_runs",
      "evidence_references",
      "findings",
      "estate_entities",
      "estate_relationships",
    ]);
  });
});
