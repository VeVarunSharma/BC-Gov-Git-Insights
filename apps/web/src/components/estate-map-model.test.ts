import { describe, expect, it } from "vitest";

import {
  RELATIONSHIP_PRESENTATION,
  RELATIONSHIP_TYPE_ORDER,
  getRelationshipVisual,
} from "./estate-map-model";

describe("estate map relationship presentation", () => {
  it("assigns every relationship type a distinct color", () => {
    const colors = RELATIONSHIP_TYPE_ORDER.map(
      (type) => RELATIONSHIP_PRESENTATION[type].color,
    );

    expect(new Set(colors).size).toBe(RELATIONSHIP_TYPE_ORDER.length);
  });

  it("keeps provenance visible independently of relationship color", () => {
    const inferred = getRelationshipVisual({
      type: "contains",
      status: "inferred",
      confidence: 0.4,
    });
    const observed = getRelationshipVisual({
      type: "contains",
      status: "observed",
      confidence: 0.4,
    });
    const validated = getRelationshipVisual({
      type: "contains",
      status: "validated",
      confidence: 0.4,
    });

    expect(inferred.strokeDasharray).toBe("8 6");
    expect(observed.strokeDasharray).toBeUndefined();
    expect(validated.strokeWidth).toBeGreaterThan(observed.strokeWidth);
    expect(inferred.color).toBe(observed.color);
  });

  it("provides readable relationship labels", () => {
    expect(RELATIONSHIP_PRESENTATION.integratesWith.label).toBe(
      "Integrates with",
    );
    expect(RELATIONSHIP_PRESENTATION.consolidatesInto.label).toBe(
      "Consolidates into",
    );
  });
});
