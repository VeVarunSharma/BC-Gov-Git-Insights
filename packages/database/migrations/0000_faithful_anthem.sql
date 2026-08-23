CREATE TYPE "public"."assertion_status" AS ENUM('observed', 'inferred', 'validated');--> statement-breakpoint
CREATE TYPE "public"."finding_origin" AS ENUM('deterministic', 'ai');--> statement-breakpoint
CREATE TABLE "agentic_recommendations" (
	"id" text PRIMARY KEY NOT NULL,
	"repository_id" integer NOT NULL,
	"dataset_version" text NOT NULL,
	"workflow_type" text NOT NULL,
	"value" numeric(6, 2) NOT NULL,
	"readiness" numeric(6, 2) NOT NULL,
	"risk" numeric(6, 2) NOT NULL,
	"confidence" numeric(4, 3) NOT NULL,
	"rationale" text NOT NULL,
	"prerequisites" jsonb NOT NULL,
	"safe_outputs" jsonb NOT NULL,
	"evidence_ids" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"repository_id" integer NOT NULL,
	"commit_sha" text NOT NULL,
	"analysis_version" text NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"result" jsonb NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"generated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estate_entities" (
	"id" text PRIMARY KEY NOT NULL,
	"dataset_version" text NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"status" "assertion_status" NOT NULL,
	"confidence" numeric(4, 3) NOT NULL,
	"repository_id" integer,
	"attributes" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estate_relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"dataset_version" text NOT NULL,
	"source_id" text NOT NULL,
	"target_id" text NOT NULL,
	"type" text NOT NULL,
	"status" "assertion_status" NOT NULL,
	"confidence" numeric(4, 3) NOT NULL,
	"evidence_ids" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_references" (
	"id" text PRIMARY KEY NOT NULL,
	"repository_id" integer NOT NULL,
	"commit_sha" text NOT NULL,
	"origin" text NOT NULL,
	"path" text NOT NULL,
	"start_line" integer,
	"end_line" integer,
	"url" text NOT NULL,
	"excerpt" text,
	"sha256" text NOT NULL,
	"redacted" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_benchmarks" (
	"id" text PRIMARY KEY NOT NULL,
	"source_title" text NOT NULL,
	"source_url" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"values" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "findings" (
	"id" text PRIMARY KEY NOT NULL,
	"scan_id" text NOT NULL,
	"repository_id" integer NOT NULL,
	"commit_sha" text NOT NULL,
	"category" text NOT NULL,
	"rule_id" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"remediation" text,
	"severity" text NOT NULL,
	"confidence" numeric(4, 3) NOT NULL,
	"origin" "finding_origin" NOT NULL,
	"engine" text NOT NULL,
	"engine_version" text NOT NULL,
	"evidence_ids" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metric_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"version" text NOT NULL,
	"description" text NOT NULL,
	"formula" text NOT NULL,
	"missing_data_behavior" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metric_values" (
	"repository_id" integer NOT NULL,
	"dataset_version" text NOT NULL,
	"definition_version" text NOT NULL,
	"dimension" text NOT NULL,
	"value" numeric(6, 2) NOT NULL,
	"confidence" numeric(4, 3) NOT NULL,
	"evidence_ids" jsonb NOT NULL,
	CONSTRAINT "metric_values_repository_id_dataset_version_dimension_pk" PRIMARY KEY("repository_id","dataset_version","dimension")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"login" text NOT NULL,
	"collected_at" timestamp with time zone NOT NULL,
	CONSTRAINT "organizations_login_unique" UNIQUE("login")
);
--> statement-breakpoint
CREATE TABLE "repositories" (
	"id" integer PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"node_id" text NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"html_url" text NOT NULL,
	"description" text,
	"default_branch" text NOT NULL,
	"archived" boolean NOT NULL,
	"stars" integer NOT NULL,
	"forks" integer NOT NULL,
	"open_issues" integer NOT NULL,
	"size_kb" integer NOT NULL,
	"primary_language" text,
	"license_spdx" text,
	"topics" jsonb NOT NULL,
	"pushed_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "repositories_node_id_unique" UNIQUE("node_id"),
	CONSTRAINT "repositories_full_name_unique" UNIQUE("full_name")
);
--> statement-breakpoint
CREATE TABLE "repository_snapshots" (
	"repository_id" integer NOT NULL,
	"scan_id" text NOT NULL,
	"commit_sha" text NOT NULL,
	"scanner_version" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"facts" jsonb NOT NULL,
	CONSTRAINT "repository_snapshots_repository_id_scan_id_pk" PRIMARY KEY("repository_id","scan_id")
);
--> statement-breakpoint
CREATE TABLE "scan_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"dataset_version" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"repository_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agentic_recommendations" ADD CONSTRAINT "agentic_recommendations_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estate_entities" ADD CONSTRAINT "estate_entities_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estate_relationships" ADD CONSTRAINT "estate_relationships_source_id_estate_entities_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."estate_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estate_relationships" ADD CONSTRAINT "estate_relationships_target_id_estate_entities_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."estate_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_references" ADD CONSTRAINT "evidence_references_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_scan_id_scan_runs_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scan_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_values" ADD CONSTRAINT "metric_values_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_snapshots" ADD CONSTRAINT "repository_snapshots_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repository_snapshots" ADD CONSTRAINT "repository_snapshots_scan_id_scan_runs_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scan_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_analysis_cache_key" ON "ai_analyses" USING btree ("repository_id","commit_sha","analysis_version");--> statement-breakpoint
CREATE INDEX "estate_entities_dataset_type_idx" ON "estate_entities" USING btree ("dataset_version","type");--> statement-breakpoint
CREATE INDEX "estate_relationships_source_idx" ON "estate_relationships" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "estate_relationships_target_idx" ON "estate_relationships" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "findings_repository_idx" ON "findings" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "findings_severity_idx" ON "findings" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "repositories_stars_idx" ON "repositories" USING btree ("stars");--> statement-breakpoint
CREATE INDEX "repositories_archived_idx" ON "repositories" USING btree ("archived");--> statement-breakpoint
CREATE UNIQUE INDEX "repository_snapshot_cache_key" ON "repository_snapshots" USING btree ("repository_id","commit_sha","scanner_version");