import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const assertionStatus = pgEnum("assertion_status", [
  "observed",
  "inferred",
  "validated",
]);

export const findingOrigin = pgEnum("finding_origin", ["deterministic", "ai"]);

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  login: text("login").notNull().unique(),
  collectedAt: timestamp("collected_at", { withTimezone: true }).notNull(),
});

export const repositories = pgTable(
  "repositories",
  {
    id: integer("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    nodeId: text("node_id").notNull().unique(),
    name: text("name").notNull(),
    fullName: text("full_name").notNull().unique(),
    htmlUrl: text("html_url").notNull(),
    description: text("description"),
    defaultBranch: text("default_branch").notNull(),
    archived: boolean("archived").notNull(),
    stars: integer("stars").notNull(),
    forks: integer("forks").notNull(),
    openIssues: integer("open_issues").notNull(),
    sizeKb: integer("size_kb").notNull(),
    primaryLanguage: text("primary_language"),
    licenseSpdx: text("license_spdx"),
    topics: jsonb("topics").$type<string[]>().notNull(),
    pushedAt: timestamp("pushed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("repositories_stars_idx").on(table.stars),
    index("repositories_archived_idx").on(table.archived),
  ],
);

export const scanRuns = pgTable("scan_runs", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  status: text("status").notNull(),
  datasetVersion: text("dataset_version").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  repositoryCount: integer("repository_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
});

export const repositorySnapshots = pgTable(
  "repository_snapshots",
  {
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id),
    scanId: text("scan_id")
      .notNull()
      .references(() => scanRuns.id),
    commitSha: text("commit_sha").notNull(),
    scannerVersion: text("scanner_version").notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    facts: jsonb("facts").$type<Record<string, unknown>>().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.repositoryId, table.scanId],
    }),
    uniqueIndex("repository_snapshot_cache_key").on(
      table.repositoryId,
      table.commitSha,
      table.scannerVersion,
    ),
  ],
);

export const evidenceReferences = pgTable("evidence_references", {
  id: text("id").primaryKey(),
  repositoryId: integer("repository_id")
    .notNull()
    .references(() => repositories.id),
  commitSha: text("commit_sha").notNull(),
  origin: text("origin").notNull(),
  path: text("path").notNull(),
  startLine: integer("start_line"),
  endLine: integer("end_line"),
  url: text("url").notNull(),
  excerpt: text("excerpt"),
  sha256: text("sha256").notNull(),
  redacted: boolean("redacted").notNull(),
});

export const findings = pgTable(
  "findings",
  {
    id: text("id").primaryKey(),
    scanId: text("scan_id")
      .notNull()
      .references(() => scanRuns.id),
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id),
    commitSha: text("commit_sha").notNull(),
    category: text("category").notNull(),
    ruleId: text("rule_id").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    remediation: text("remediation"),
    severity: text("severity").notNull(),
    confidence: numeric("confidence", {
      precision: 4,
      scale: 3,
      mode: "number",
    }).notNull(),
    origin: findingOrigin("origin").notNull(),
    engine: text("engine").notNull(),
    engineVersion: text("engine_version").notNull(),
    evidenceIds: jsonb("evidence_ids").$type<string[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("findings_repository_idx").on(table.repositoryId),
    index("findings_severity_idx").on(table.severity),
  ],
);

export const metricDefinitions = pgTable("metric_definitions", {
  id: text("id").primaryKey(),
  version: text("version").notNull(),
  description: text("description").notNull(),
  formula: text("formula").notNull(),
  missingDataBehavior: text("missing_data_behavior").notNull(),
});

export const metricValues = pgTable(
  "metric_values",
  {
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id),
    datasetVersion: text("dataset_version").notNull(),
    definitionVersion: text("definition_version").notNull(),
    dimension: text("dimension").notNull(),
    value: numeric("value", {
      precision: 6,
      scale: 2,
      mode: "number",
    }).notNull(),
    confidence: numeric("confidence", {
      precision: 4,
      scale: 3,
      mode: "number",
    }).notNull(),
    evidenceIds: jsonb("evidence_ids").$type<string[]>().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.repositoryId, table.datasetVersion, table.dimension],
    }),
  ],
);

export const estateEntities = pgTable(
  "estate_entities",
  {
    id: text("id").primaryKey(),
    datasetVersion: text("dataset_version").notNull(),
    type: text("type").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    status: assertionStatus("status").notNull(),
    confidence: numeric("confidence", {
      precision: 4,
      scale: 3,
      mode: "number",
    }).notNull(),
    repositoryId: integer("repository_id").references(() => repositories.id),
    attributes: jsonb("attributes")
      .$type<Record<string, string | number | boolean>>()
      .notNull(),
  },
  (table) => [
    index("estate_entities_dataset_type_idx").on(
      table.datasetVersion,
      table.type,
    ),
  ],
);

export const estateRelationships = pgTable(
  "estate_relationships",
  {
    id: text("id").primaryKey(),
    datasetVersion: text("dataset_version").notNull(),
    sourceId: text("source_id")
      .notNull()
      .references(() => estateEntities.id),
    targetId: text("target_id")
      .notNull()
      .references(() => estateEntities.id),
    type: text("type").notNull(),
    status: assertionStatus("status").notNull(),
    confidence: numeric("confidence", {
      precision: 4,
      scale: 3,
      mode: "number",
    }).notNull(),
    evidenceIds: jsonb("evidence_ids").$type<string[]>().notNull(),
  },
  (table) => [
    index("estate_relationships_source_idx").on(table.sourceId),
    index("estate_relationships_target_idx").on(table.targetId),
  ],
);

export const aiAnalyses = pgTable(
  "ai_analyses",
  {
    id: text("id").primaryKey(),
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id),
    commitSha: text("commit_sha").notNull(),
    analysisVersion: text("analysis_version").notNull(),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    result: jsonb("result").$type<Record<string, unknown>>().notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("ai_analysis_cache_key").on(
      table.repositoryId,
      table.commitSha,
      table.analysisVersion,
    ),
  ],
);

export const agenticRecommendations = pgTable("agentic_recommendations", {
  id: text("id").primaryKey(),
  repositoryId: integer("repository_id")
    .notNull()
    .references(() => repositories.id),
  datasetVersion: text("dataset_version").notNull(),
  workflowType: text("workflow_type").notNull(),
  value: numeric("value", {
    precision: 6,
    scale: 2,
    mode: "number",
  }).notNull(),
  readiness: numeric("readiness", {
    precision: 6,
    scale: 2,
    mode: "number",
  }).notNull(),
  risk: numeric("risk", {
    precision: 6,
    scale: 2,
    mode: "number",
  }).notNull(),
  confidence: numeric("confidence", {
    precision: 4,
    scale: 3,
    mode: "number",
  }).notNull(),
  rationale: text("rationale").notNull(),
  prerequisites: jsonb("prerequisites").$type<string[]>().notNull(),
  safeOutputs: jsonb("safe_outputs").$type<string[]>().notNull(),
  evidenceIds: jsonb("evidence_ids").$type<string[]>().notNull(),
});

export const externalBenchmarks = pgTable("external_benchmarks", {
  id: text("id").primaryKey(),
  sourceTitle: text("source_title").notNull(),
  sourceUrl: text("source_url").notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
  values: jsonb("values").$type<Record<string, number | string>>().notNull(),
});
