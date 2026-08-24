import type { EstateEntity, EstateRelationship } from "@git-insights/contracts";

interface EntityPalette {
  background: string;
  border: string;
}

interface RelationshipPresentation {
  color: string;
  label: string;
}

interface AssertionPresentation {
  label: string;
  strokeDasharray: string | undefined;
  strokeWidth: number;
}

export const ENTITY_PALETTES = {
  organization: { background: "#dbeafe", border: "#2563eb" },
  ministry: { background: "#ecfeff", border: "#0e7490" },
  portfolio: { background: "#f3e8ff", border: "#9333ea" },
  project: { background: "#ffedd5", border: "#c2410c" },
  repository: { background: "#f8fafc", border: "#64748b" },
  capability: { background: "#dcfce7", border: "#15803d" },
  technology: { background: "#cffafe", border: "#0e7490" },
  integration: { background: "#fef3c7", border: "#a16207" },
  sharedModule: { background: "#ccfbf1", border: "#0f766e" },
  agenticWorkflow: { background: "#fee2e2", border: "#b91c1c" },
} satisfies Record<EstateEntity["type"], EntityPalette>;

export const RELATIONSHIP_TYPE_ORDER = [
  "contains",
  "implements",
  "uses",
  "integratesWith",
  "deploysTo",
  "similarTo",
  "consolidatesInto",
  "candidateFor",
] as const satisfies readonly EstateRelationship["type"][];

export const RELATIONSHIP_PRESENTATION = {
  candidateFor: { color: "#92400e", label: "Candidate for" },
  consolidatesInto: { color: "#be123c", label: "Consolidates into" },
  contains: { color: "#1d4ed8", label: "Contains" },
  deploysTo: { color: "#b91c1c", label: "Deploys to" },
  implements: { color: "#6d28d9", label: "Implements" },
  integratesWith: { color: "#c2410c", label: "Integrates with" },
  similarTo: { color: "#475569", label: "Similar to" },
  uses: { color: "#0f766e", label: "Uses" },
} satisfies Record<EstateRelationship["type"], RelationshipPresentation>;

export const ASSERTION_STATUS_ORDER = [
  "observed",
  "inferred",
  "validated",
] as const satisfies readonly EstateRelationship["status"][];

export const ASSERTION_PRESENTATION = {
  observed: {
    label: "Observed",
    strokeDasharray: undefined,
    strokeWidth: 2,
  },
  inferred: {
    label: "Inferred",
    strokeDasharray: "8 6",
    strokeWidth: 2,
  },
  validated: {
    label: "Validated",
    strokeDasharray: undefined,
    strokeWidth: 3.5,
  },
} satisfies Record<EstateRelationship["status"], AssertionPresentation>;

export function getRelationshipVisual(
  relationship: Pick<EstateRelationship, "confidence" | "status" | "type">,
) {
  const relationshipPresentation = RELATIONSHIP_PRESENTATION[relationship.type];
  const assertionPresentation = ASSERTION_PRESENTATION[relationship.status];
  const minimumOpacity =
    relationship.status === "validated"
      ? 0.92
      : relationship.status === "observed"
        ? 0.8
        : 0.7;

  return {
    ...relationshipPresentation,
    ...assertionPresentation,
    opacity: Math.min(1, Math.max(minimumOpacity, relationship.confidence)),
  };
}
