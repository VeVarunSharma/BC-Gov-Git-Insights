import { z } from "zod";

export const DATASET_SCHEMA_VERSION = "0.1.0";

export const isoDateSchema = z.string().datetime({ offset: true });

export const evidenceOriginSchema = z.enum([
  "github",
  "scanner",
  "metric",
  "ai",
]);

export const assertionStatusSchema = z.enum([
  "observed",
  "inferred",
  "validated",
]);

export const repositorySchema = z.object({
  id: z.number().int().positive(),
  nodeId: z.string().min(1),
  owner: z.string().min(1),
  name: z.string().min(1),
  fullName: z.string().min(1),
  htmlUrl: z.string().url(),
  description: z.string().nullable(),
  homepage: z.string().nullable(),
  defaultBranch: z.string().min(1),
  archived: z.boolean(),
  fork: z.boolean(),
  empty: z.boolean(),
  stars: z.number().int().nonnegative(),
  forks: z.number().int().nonnegative(),
  openIssues: z.number().int().nonnegative(),
  sizeKb: z.number().int().nonnegative(),
  primaryLanguage: z.string().nullable(),
  licenseSpdx: z.string().nullable(),
  topics: z.array(z.string()),
  pushedAt: isoDateSchema.nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  collectedAt: isoDateSchema,
});

export const cohortManifestSchema = z.object({
  schemaVersion: z.literal(DATASET_SCHEMA_VERSION),
  organization: z.string().min(1),
  selectionAlgorithm: z.literal("most-starred-v1"),
  selectedAt: isoDateSchema,
  sourceEtag: z.string().nullable(),
  eligibleCount: z.number().int().nonnegative(),
  repositories: z.array(repositorySchema).length(100),
});

export const scanTargetSchema = z.object({
  repository: repositorySchema,
  commitSha: z.string().regex(/^[0-9a-f]{40}$/i),
});

export const scanPlanSchema = z.object({
  schemaVersion: z.literal(DATASET_SCHEMA_VERSION),
  scanId: z.string().uuid(),
  datasetVersion: z.string().min(1),
  generatedAt: isoDateSchema,
  targets: z.array(scanTargetSchema).length(100),
});

export const evidenceReferenceSchema = z.object({
  id: z.string().min(1),
  repositoryId: z.number().int().positive(),
  commitSha: z.string().regex(/^[0-9a-f]{40}$/i),
  origin: evidenceOriginSchema,
  path: z.string().min(1),
  startLine: z.number().int().positive().nullable(),
  endLine: z.number().int().positive().nullable(),
  url: z.string().url(),
  excerpt: z.string().max(2_000).nullable(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/i),
  redacted: z.boolean(),
});

export const findingCategorySchema = z.enum([
  "activity",
  "architecture",
  "automation",
  "capability",
  "dependency",
  "documentation",
  "maintainability",
  "security",
  "sustainability",
  "testing",
]);

export const severitySchema = z.enum([
  "info",
  "low",
  "medium",
  "high",
  "critical",
]);

export const findingSchema = z.object({
  id: z.string().min(1),
  scanId: z.string().uuid(),
  repositoryId: z.number().int().positive(),
  commitSha: z.string().regex(/^[0-9a-f]{40}$/i),
  category: findingCategorySchema,
  ruleId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  remediation: z.string().nullable(),
  severity: severitySchema,
  confidence: z.number().min(0).max(1),
  origin: z.enum(["deterministic", "ai"]),
  engine: z.string().min(1),
  engineVersion: z.string().min(1),
  evidenceIds: z.array(z.string().min(1)).min(1),
  createdAt: isoDateSchema,
});

export const metricDimensionSchema = z.enum([
  "activity",
  "architectureEvidence",
  "automation",
  "documentation",
  "maintainability",
  "securityHygiene",
  "sustainability",
  "testing",
]);

export const metricValueSchema = z.object({
  repositoryId: z.number().int().positive(),
  datasetVersion: z.string().min(1),
  definitionVersion: z.string().min(1),
  dimension: metricDimensionSchema,
  value: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  evidenceIds: z.array(z.string().min(1)),
});

export const estateEntityTypeSchema = z.enum([
  "organization",
  "ministry",
  "portfolio",
  "project",
  "repository",
  "capability",
  "technology",
  "integration",
  "sharedModule",
  "agenticWorkflow",
]);

export const estateEntitySchema = z.object({
  id: z.string().min(1),
  type: estateEntityTypeSchema,
  label: z.string().min(1),
  description: z.string().nullable(),
  status: assertionStatusSchema,
  confidence: z.number().min(0).max(1),
  repositoryId: z.number().int().positive().nullable(),
  attributes: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean()]),
  ),
});

export const estateRelationshipTypeSchema = z.enum([
  "candidateFor",
  "consolidatesInto",
  "contains",
  "deploysTo",
  "implements",
  "integratesWith",
  "similarTo",
  "uses",
]);

export const estateRelationshipSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  type: estateRelationshipTypeSchema,
  status: assertionStatusSchema,
  confidence: z.number().min(0).max(1),
  evidenceIds: z.array(z.string().min(1)),
});

export const agenticRecommendationSchema = z.object({
  id: z.string().min(1),
  repositoryId: z.number().int().positive(),
  workflowType: z.enum([
    "accessibility-review",
    "architecture-documentation",
    "dependency-assessment",
    "documentation-freshness",
    "issue-triage",
    "release-notes",
    "stale-work-triage",
    "test-gap-analysis",
  ]),
  value: z.number().min(0).max(100),
  readiness: z.number().min(0).max(100),
  risk: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  prerequisites: z.array(z.string()),
  safeOutputs: z.array(z.string()),
  evidenceIds: z.array(z.string().min(1)).min(1),
});

export const repositoryDossierSchema = z.object({
  repositoryId: z.number().int().positive(),
  commitSha: z.string().regex(/^[0-9a-f]{40}$/i),
  analysisVersion: z.string().min(1),
  purpose: z.string().min(1),
  architecture: z.string().min(1),
  capabilities: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string().min(1),
      confidence: z.number().min(0).max(1),
      evidenceIds: z.array(z.string().min(1)).min(1),
    }),
  ),
  integrations: z.array(
    z.object({
      name: z.string().min(1),
      kind: z.string().min(1),
      confidence: z.number().min(0).max(1),
      evidenceIds: z.array(z.string().min(1)).min(1),
    }),
  ),
  projectCandidates: z.array(
    z.object({
      name: z.string().min(1),
      confidence: z.number().min(0).max(1),
      evidenceIds: z.array(z.string().min(1)).min(1),
    }),
  ),
  modernizationConcerns: z.array(
    z.object({
      title: z.string().min(1),
      summary: z.string().min(1),
      confidence: z.number().min(0).max(1),
      evidenceIds: z.array(z.string().min(1)).min(1),
    }),
  ),
  generatedAt: isoDateSchema,
});

export const graphSliceSchema = z.object({
  datasetVersion: z.string().min(1),
  focusId: z.string().nullable(),
  truncated: z.boolean(),
  entities: z.array(estateEntitySchema).max(500),
  relationships: z.array(estateRelationshipSchema),
});

export const aggregateScoreSchema = z.object({
  value: z.number().int().min(0).max(100),
  confidence: z.number().min(0).max(1),
  coverage: z.number().min(0).max(1),
  sampleSize: z.number().int().nonnegative(),
});

export const portfolioInsightSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  ministryId: z.string().min(1),
  ministryLabel: z.string().min(1),
  membershipConfidence: z.number().min(0).max(1),
  repositoryCount: z.number().int().nonnegative(),
  agenticCandidateCount: z.number().int().nonnegative(),
  activity: aggregateScoreSchema,
  health: aggregateScoreSchema,
  documentation: aggregateScoreSchema,
  testing: aggregateScoreSchema,
  automation: aggregateScoreSchema,
  sustainability: aggregateScoreSchema,
  evidenceConfidence: z.number().min(0).max(1),
  evidenceCoverage: z.number().min(0).max(1),
});

export const ministryScorecardSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  status: assertionStatusSchema,
  membershipNote: z.string().min(1),
  membershipConfidence: z.number().min(0).max(1),
  repositoryCount: z.number().int().nonnegative(),
  activeRepositoryCount: z.number().int().nonnegative(),
  archivedRepositoryCount: z.number().int().nonnegative(),
  agenticCandidateCount: z.number().int().nonnegative(),
  activity: aggregateScoreSchema,
  health: aggregateScoreSchema,
  evidenceConfidence: z.number().min(0).max(1),
  evidenceCoverage: z.number().min(0).max(1),
});

export const attentionItemSchema = z.object({
  id: z.string().min(1),
  category: z.enum([
    "active-low-health",
    "agentic-ready",
    "archived-high-interest",
    "issue-backlog",
  ]),
  priority: z.enum(["high", "medium"]),
  repositoryId: z.number().int().positive(),
  repositoryName: z.string().min(1),
  repositoryUrl: z.string().url(),
  ministryLabel: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
  rule: z.string().min(1),
});

export const capabilityReuseInsightSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  status: assertionStatusSchema,
  confidence: z.number().min(0).max(1),
  repositoryCount: z.number().int().min(2),
  portfolioCount: z.number().int().nonnegative(),
  ministryCount: z.number().int().nonnegative(),
  repositoryNames: z.array(z.string().min(1)).min(2),
  portfolioLabels: z.array(z.string().min(1)),
  ministryLabels: z.array(z.string().min(1)),
  hypothesis: z.string().min(1),
});

export const insightDataQualitySchema = z.object({
  capturedAt: isoDateSchema,
  selectedRepositoryCount: z.number().int().nonnegative(),
  analyzedRepositoryCount: z.number().int().nonnegative(),
  analysisCoverage: z.number().min(0).max(1),
  observedRelationshipCount: z.number().int().nonnegative(),
  inferredRelationshipCount: z.number().int().nonnegative(),
  validatedRelationshipCount: z.number().int().nonnegative(),
  averageRelationshipConfidence: z.number().min(0).max(1),
  metricCoverage: z.number().min(0).max(1),
  averageMetricConfidence: z.number().min(0).max(1),
  missingEvidenceWarnings: z.array(z.string().min(1)),
});

export const ministryDashboardInsightsSchema = z.object({
  datasetVersion: z.string().min(1),
  methodologyNote: z.string().min(1),
  ministryScorecards: z.array(ministryScorecardSchema),
  portfolioComparisons: z.array(portfolioInsightSchema),
  attentionQueue: z.array(attentionItemSchema),
  capabilityReuse: z.array(capabilityReuseInsightSchema),
  dataQuality: insightDataQualitySchema,
});

export type AgenticRecommendation = z.infer<typeof agenticRecommendationSchema>;
export type AggregateScore = z.infer<typeof aggregateScoreSchema>;
export type AttentionItem = z.infer<typeof attentionItemSchema>;
export type CapabilityReuseInsight = z.infer<
  typeof capabilityReuseInsightSchema
>;
export type CohortManifest = z.infer<typeof cohortManifestSchema>;
export type EstateEntity = z.infer<typeof estateEntitySchema>;
export type EstateRelationship = z.infer<typeof estateRelationshipSchema>;
export type EvidenceReference = z.infer<typeof evidenceReferenceSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type GraphSlice = z.infer<typeof graphSliceSchema>;
export type InsightDataQuality = z.infer<typeof insightDataQualitySchema>;
export type MetricDimension = z.infer<typeof metricDimensionSchema>;
export type MetricValue = z.infer<typeof metricValueSchema>;
export type MinistryDashboardInsights = z.infer<
  typeof ministryDashboardInsightsSchema
>;
export type MinistryScorecard = z.infer<typeof ministryScorecardSchema>;
export type PortfolioInsight = z.infer<typeof portfolioInsightSchema>;
export type Repository = z.infer<typeof repositorySchema>;
export type RepositoryDossier = z.infer<typeof repositoryDossierSchema>;
export type ScanPlan = z.infer<typeof scanPlanSchema>;
export type ScanTarget = z.infer<typeof scanTargetSchema>;
