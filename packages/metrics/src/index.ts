import {
  ministryDashboardInsightsSchema,
  type AgenticRecommendation,
  type AggregateScore,
  type AttentionItem,
  type CapabilityReuseInsight,
  type EstateEntity,
  type EstateRelationship,
  type MetricDimension,
  type MetricValue,
  type MinistryDashboardInsights,
  type MinistryScorecard,
  type PortfolioInsight,
  type Repository,
} from "@git-insights/contracts";

export const METRIC_DEFINITION_VERSION = "0.1.0";

export interface RepositorySignals {
  repositoryId: number;
  datasetVersion: string;
  daysSincePush: number | null;
  archived: boolean;
  hasReadme: boolean | null;
  hasArchitectureDocs: boolean | null;
  hasContributingGuide: boolean | null;
  hasTests: boolean | null;
  hasCi: boolean | null;
  hasDeploymentAutomation: boolean | null;
  hasDependencyManifest: boolean | null;
  hasDependencyLock: boolean | null;
  hasSupportedRuntime: boolean | null;
  hasSecurityPolicy: boolean | null;
  hasSecretScanningFindings: boolean | null;
  hasApiEvidence: boolean | null;
  hasDataStoreEvidence: boolean | null;
}

interface DimensionInput {
  dimension: MetricDimension;
  values: Array<boolean | null>;
  weights?: number[];
}

function scoreBooleanSignals(
  input: DimensionInput,
): Pick<MetricValue, "dimension" | "value" | "confidence"> {
  const weights = input.weights ?? input.values.map(() => 1);
  if (weights.length !== input.values.length) {
    throw new Error(`Weights do not match ${input.dimension} signal count.`);
  }

  let observedWeight = 0;
  let earnedWeight = 0;
  let possibleWeight = 0;

  input.values.forEach((value, index) => {
    const weight = weights[index] ?? 0;
    possibleWeight += weight;
    if (value !== null) {
      observedWeight += weight;
      if (value) {
        earnedWeight += weight;
      }
    }
  });

  return {
    dimension: input.dimension,
    value:
      observedWeight === 0
        ? 0
        : Math.round((earnedWeight / observedWeight) * 100),
    confidence:
      possibleWeight === 0
        ? 0
        : Number((observedWeight / possibleWeight).toFixed(2)),
  };
}

function activityScore(
  daysSincePush: number | null,
  archived: boolean,
): Pick<MetricValue, "dimension" | "value" | "confidence"> {
  if (daysSincePush === null) {
    return { dimension: "activity", value: 0, confidence: 0 };
  }
  if (archived) {
    return { dimension: "activity", value: 10, confidence: 1 };
  }
  if (daysSincePush <= 30) {
    return { dimension: "activity", value: 100, confidence: 1 };
  }
  if (daysSincePush <= 90) {
    return { dimension: "activity", value: 80, confidence: 1 };
  }
  if (daysSincePush <= 365) {
    return { dimension: "activity", value: 55, confidence: 1 };
  }
  if (daysSincePush <= 730) {
    return { dimension: "activity", value: 30, confidence: 1 };
  }
  return { dimension: "activity", value: 10, confidence: 1 };
}

export function calculateRepositoryMetrics(
  signals: RepositorySignals,
  evidenceIds: Partial<Record<MetricDimension, string[]>> = {},
): MetricValue[] {
  const dimensions = [
    activityScore(signals.daysSincePush, signals.archived),
    scoreBooleanSignals({
      dimension: "documentation",
      values: [
        signals.hasReadme,
        signals.hasArchitectureDocs,
        signals.hasContributingGuide,
      ],
      weights: [2, 1, 1],
    }),
    scoreBooleanSignals({
      dimension: "testing",
      values: [signals.hasTests],
    }),
    scoreBooleanSignals({
      dimension: "automation",
      values: [signals.hasCi, signals.hasDeploymentAutomation],
    }),
    scoreBooleanSignals({
      dimension: "sustainability",
      values: [
        signals.hasDependencyManifest,
        signals.hasDependencyLock,
        signals.hasSupportedRuntime,
      ],
    }),
    scoreBooleanSignals({
      dimension: "securityHygiene",
      values: [
        signals.hasSecurityPolicy,
        signals.hasSecretScanningFindings === null
          ? null
          : !signals.hasSecretScanningFindings,
      ],
    }),
    scoreBooleanSignals({
      dimension: "architectureEvidence",
      values: [
        signals.hasArchitectureDocs,
        signals.hasApiEvidence,
        signals.hasDataStoreEvidence,
      ],
    }),
    scoreBooleanSignals({
      dimension: "maintainability",
      values: [
        signals.hasReadme,
        signals.hasTests,
        signals.hasCi,
        signals.hasDependencyLock,
      ],
    }),
  ];

  return dimensions.map((metric) => ({
    repositoryId: signals.repositoryId,
    datasetVersion: signals.datasetVersion,
    definitionVersion: METRIC_DEFINITION_VERSION,
    ...metric,
    evidenceIds: evidenceIds[metric.dimension] ?? [],
  }));
}

export function calculateTransparentHealth(metrics: readonly MetricValue[]): {
  value: number;
  confidence: number;
} {
  const healthDimensions = metrics.filter(
    (metric) => metric.dimension !== "activity",
  );
  const observed = healthDimensions.filter((metric) => metric.confidence > 0);
  if (observed.length === 0) {
    return { value: 0, confidence: 0 };
  }

  const confidenceWeight = observed.reduce(
    (sum, metric) => sum + metric.confidence,
    0,
  );
  const weightedScore = observed.reduce(
    (sum, metric) => sum + metric.value * metric.confidence,
    0,
  );

  return {
    value: Math.round(weightedScore / confidenceWeight),
    confidence: Number(
      (
        observed.reduce((sum, metric) => sum + metric.confidence, 0) /
        healthDimensions.length
      ).toFixed(2),
    ),
  };
}

export interface AgenticSignals {
  activity: number;
  documentation: number;
  testing: number;
  automation: number;
  maintainability: number;
  securityHygiene: number;
  openIssues: number;
  repositorySizeKb: number;
  archived: boolean;
}

export function calculateAgenticTargeting(signals: AgenticSignals): {
  value: number;
  readiness: number;
  risk: number;
} {
  const issueValue = Math.min(100, Math.round(signals.openIssues * 2.5));
  const value = Math.round(signals.activity * 0.6 + issueValue * 0.4);
  const readiness = Math.round(
    signals.documentation * 0.2 +
      signals.testing * 0.3 +
      signals.automation * 0.3 +
      signals.maintainability * 0.2,
  );
  const sizeRisk = Math.min(
    100,
    Math.round(Math.log10(Math.max(signals.repositorySizeKb, 1)) * 20),
  );
  const risk = Math.round(
    (100 - signals.securityHygiene) * 0.6 +
      sizeRisk * 0.3 +
      (signals.archived ? 10 : 0),
  );

  return {
    value: Math.min(100, value),
    readiness: Math.min(100, readiness),
    risk: Math.min(100, risk),
  };
}

const ALL_METRIC_DIMENSIONS = [
  "activity",
  "documentation",
  "testing",
  "automation",
  "sustainability",
  "securityHygiene",
  "architectureEvidence",
  "maintainability",
] as const satisfies readonly MetricDimension[];

export interface WeightedScoreInput {
  value: number;
  confidence: number;
}

export function calculateConfidenceWeightedAggregate(
  values: readonly WeightedScoreInput[],
  expectedSampleSize = values.length,
): AggregateScore {
  const observed = values.filter((value) => value.confidence > 0);
  const denominator = Math.max(expectedSampleSize, observed.length);
  if (denominator === 0 || observed.length === 0) {
    return { value: 0, confidence: 0, coverage: 0, sampleSize: 0 };
  }

  const confidenceWeight = observed.reduce(
    (sum, value) => sum + value.confidence,
    0,
  );
  const weightedValue = observed.reduce(
    (sum, value) => sum + value.value * value.confidence,
    0,
  );

  return {
    value: Math.round(weightedValue / confidenceWeight),
    confidence: Number((confidenceWeight / observed.length).toFixed(2)),
    coverage: Number((observed.length / denominator).toFixed(2)),
    sampleSize: observed.length,
  };
}

export interface MinistryDashboardInput {
  datasetVersion: string;
  capturedAt: string;
  selectedRepositoryCount: number;
  analyzedRepositoryCount: number;
  repositories: readonly Repository[];
  metrics: readonly MetricValue[];
  entities: readonly EstateEntity[];
  relationships: readonly EstateRelationship[];
  recommendations: readonly AgenticRecommendation[];
}

interface RepositoryInsightRecord {
  repository: Repository;
  metrics: MetricValue[];
  activity: WeightedScoreInput;
  health: WeightedScoreInput;
  ministry: EstateEntity | null;
  portfolio: EstateEntity | null;
}

function clampRatio(numerator: number, denominator: number): number {
  return denominator === 0
    ? 0
    : Number(Math.min(1, numerator / denominator).toFixed(2));
}

function average(values: readonly number[]): number {
  return values.length === 0
    ? 0
    : Number(
        (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(
          2,
        ),
      );
}

export function buildMinistryDashboardInsights(
  input: MinistryDashboardInput,
): MinistryDashboardInsights {
  const entityById = new Map(
    input.entities.map((entity) => [entity.id, entity]),
  );
  const repositoryById = new Map(
    input.repositories.map((repository) => [repository.id, repository]),
  );
  const containmentParent = new Map(
    input.relationships
      .filter((relationship) => relationship.type === "contains")
      .map((relationship) => [relationship.target, relationship.source]),
  );
  const metricsByRepositoryId = new Map<number, MetricValue[]>();
  for (const metric of input.metrics) {
    const current = metricsByRepositoryId.get(metric.repositoryId) ?? [];
    current.push(metric);
    metricsByRepositoryId.set(metric.repositoryId, current);
  }

  const findAncestor = (
    entityId: string,
    type: EstateEntity["type"],
  ): EstateEntity | null => {
    const visited = new Set<string>();
    let currentId: string | undefined = entityId;
    while (currentId && !visited.has(currentId)) {
      const entity = entityById.get(currentId);
      if (entity?.type === type) {
        return entity;
      }
      visited.add(currentId);
      currentId = containmentParent.get(currentId);
    }
    return null;
  };

  const repositoryEntityByRepositoryId = new Map<number, EstateEntity>();
  for (const entity of input.entities) {
    if (entity.type === "repository" && entity.repositoryId !== null) {
      repositoryEntityByRepositoryId.set(entity.repositoryId, entity);
    }
  }
  const repositoryRecords = input.repositories.map(
    (repository): RepositoryInsightRecord => {
      const metrics = metricsByRepositoryId.get(repository.id) ?? [];
      const activityMetric = metrics.find(
        (metric) => metric.dimension === "activity",
      );
      const health = calculateTransparentHealth(metrics);
      const repositoryEntity = repositoryEntityByRepositoryId.get(
        repository.id,
      );

      return {
        repository,
        metrics,
        activity: {
          value: activityMetric?.value ?? 0,
          confidence: activityMetric?.confidence ?? 0,
        },
        health,
        ministry: repositoryEntity
          ? findAncestor(repositoryEntity.id, "ministry")
          : null,
        portfolio: repositoryEntity
          ? findAncestor(repositoryEntity.id, "portfolio")
          : null,
      };
    },
  );

  const recordsForEntity = (entityId: string, type: "ministry" | "portfolio") =>
    repositoryRecords.filter(
      (record) =>
        (type === "ministry" ? record.ministry?.id : record.portfolio?.id) ===
        entityId,
    );
  const agenticCount = (repositoryIds: Set<number>) =>
    input.recommendations.filter((recommendation) =>
      repositoryIds.has(recommendation.repositoryId),
    ).length;
  const aggregateDimension = (
    records: readonly RepositoryInsightRecord[],
    dimension: MetricDimension,
  ) =>
    calculateConfidenceWeightedAggregate(
      records.flatMap((record) => {
        const metric = record.metrics.find(
          (candidate) => candidate.dimension === dimension,
        );
        return metric
          ? [{ value: metric.value, confidence: metric.confidence }]
          : [];
      }),
      records.length,
    );
  const aggregateHealth = (records: readonly RepositoryInsightRecord[]) =>
    calculateConfidenceWeightedAggregate(
      records.map((record) => record.health),
      records.length,
    );
  const evidenceSummary = (records: readonly RepositoryInsightRecord[]) => {
    const expectedMeasurements = records.length * ALL_METRIC_DIMENSIONS.length;
    const measurements = records.flatMap((record) => record.metrics);
    const observed = measurements.filter((metric) => metric.confidence > 0);
    return {
      confidence: average(observed.map((metric) => metric.confidence)),
      coverage: clampRatio(observed.length, expectedMeasurements),
    };
  };

  const ministryEntities = input.entities.filter(
    (entity) => entity.type === "ministry",
  );
  const ministryScorecards: MinistryScorecard[] = ministryEntities
    .map((ministry) => {
      const records = recordsForEntity(ministry.id, "ministry");
      const repositoryIds = new Set(
        records.map((record) => record.repository.id),
      );
      const evidence = evidenceSummary(records);
      return {
        id: ministry.id,
        label: ministry.label,
        status: ministry.status,
        membershipNote:
          ministry.description ??
          "Candidate membership inferred from public repository evidence.",
        membershipConfidence: ministry.confidence,
        repositoryCount: records.length,
        activeRepositoryCount: records.filter(
          (record) => !record.repository.archived,
        ).length,
        archivedRepositoryCount: records.filter(
          (record) => record.repository.archived,
        ).length,
        agenticCandidateCount: agenticCount(repositoryIds),
        activity: aggregateDimension(records, "activity"),
        health: aggregateHealth(records),
        evidenceConfidence: evidence.confidence,
        evidenceCoverage: evidence.coverage,
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label, "en"));

  const portfolioComparisons: PortfolioInsight[] = input.entities
    .filter((entity) => entity.type === "portfolio")
    .flatMap((portfolio) => {
      const ministry = findAncestor(portfolio.id, "ministry");
      if (!ministry) {
        return [];
      }
      const records = recordsForEntity(portfolio.id, "portfolio");
      const repositoryIds = new Set(
        records.map((record) => record.repository.id),
      );
      const evidence = evidenceSummary(records);
      return [
        {
          id: portfolio.id,
          label: portfolio.label,
          ministryId: ministry.id,
          ministryLabel: ministry.label,
          membershipConfidence: Math.min(
            ministry.confidence,
            portfolio.confidence,
          ),
          repositoryCount: records.length,
          agenticCandidateCount: agenticCount(repositoryIds),
          activity: aggregateDimension(records, "activity"),
          health: aggregateHealth(records),
          documentation: aggregateDimension(records, "documentation"),
          testing: aggregateDimension(records, "testing"),
          automation: aggregateDimension(records, "automation"),
          sustainability: aggregateDimension(records, "sustainability"),
          evidenceConfidence: evidence.confidence,
          evidenceCoverage: evidence.coverage,
        },
      ];
    })
    .sort(
      (left, right) =>
        left.ministryLabel.localeCompare(right.ministryLabel, "en") ||
        left.label.localeCompare(right.label, "en"),
    );

  const ministryLabelForRepository = (repositoryId: number) =>
    repositoryRecords.find((record) => record.repository.id === repositoryId)
      ?.ministry?.label ?? null;
  const attentionQueue: AttentionItem[] = [];
  for (const record of repositoryRecords) {
    const { repository } = record;
    if (
      !repository.archived &&
      record.activity.value >= 60 &&
      record.health.value < 70
    ) {
      attentionQueue.push({
        id: `active-low-health:${repository.id}`,
        category: "active-low-health",
        priority: record.health.value < 55 ? "high" : "medium",
        repositoryId: repository.id,
        repositoryName: repository.name,
        repositoryUrl: repository.htmlUrl,
        ministryLabel: record.ministry?.label ?? null,
        confidence: record.health.confidence,
        reason: `Activity is ${record.activity.value}, while evidence-backed health is ${record.health.value}.`,
        rule: "Not archived, activity at least 60, and transparent health below 70.",
      });
    }
    if (repository.archived && repository.stars >= 75) {
      attentionQueue.push({
        id: `archived-high-interest:${repository.id}`,
        category: "archived-high-interest",
        priority: "medium",
        repositoryId: repository.id,
        repositoryName: repository.name,
        repositoryUrl: repository.htmlUrl,
        ministryLabel: record.ministry?.label ?? null,
        confidence: 1,
        reason: `Archived repository retains ${repository.stars} stars in observed GitHub metadata.`,
        rule: "Archived repository with at least 75 stars.",
      });
    }
    if (!repository.archived && repository.openIssues >= 100) {
      attentionQueue.push({
        id: `issue-backlog:${repository.id}`,
        category: "issue-backlog",
        priority: repository.openIssues >= 250 ? "high" : "medium",
        repositoryId: repository.id,
        repositoryName: repository.name,
        repositoryUrl: repository.htmlUrl,
        ministryLabel: record.ministry?.label ?? null,
        confidence: 1,
        reason: `${repository.openIssues} open issues are present in observed GitHub metadata.`,
        rule: "Active lifecycle repository with at least 100 open issues.",
      });
    }
  }
  for (const recommendation of input.recommendations) {
    if (
      recommendation.value >= 75 &&
      recommendation.readiness >= 70 &&
      recommendation.confidence >= 0.75
    ) {
      const repository = repositoryById.get(recommendation.repositoryId);
      if (repository) {
        attentionQueue.push({
          id: `agentic-ready:${recommendation.id}`,
          category: "agentic-ready",
          priority:
            recommendation.value >= 85 && recommendation.readiness >= 75
              ? "high"
              : "medium",
          repositoryId: repository.id,
          repositoryName: repository.name,
          repositoryUrl: repository.htmlUrl,
          ministryLabel: ministryLabelForRepository(repository.id),
          confidence: recommendation.confidence,
          reason: `Agentic value ${recommendation.value}, readiness ${recommendation.readiness}, and risk ${recommendation.risk}.`,
          rule: "Evidence confidence at least 75%, value at least 75, and readiness at least 70.",
        });
      }
    }
  }
  const priorityOrder = { high: 0, medium: 1 } as const;
  attentionQueue.sort(
    (left, right) =>
      priorityOrder[left.priority] - priorityOrder[right.priority] ||
      left.category.localeCompare(right.category, "en") ||
      left.repositoryName.localeCompare(right.repositoryName, "en"),
  );

  const capabilityReuse: CapabilityReuseInsight[] = input.entities
    .filter((entity) => entity.type === "capability")
    .flatMap((capability) => {
      const implementationRelationships = input.relationships.filter(
        (relationship) =>
          relationship.type === "implements" &&
          relationship.target === capability.id,
      );
      const repositoryEntities = implementationRelationships
        .map((relationship) => entityById.get(relationship.source))
        .filter(
          (entity): entity is EstateEntity =>
            entity?.type === "repository" && entity.repositoryId !== null,
        );
      const uniqueRepositories = new Map(
        repositoryEntities.map((entity) => [entity.id, entity]),
      );
      if (uniqueRepositories.size < 2) {
        return [];
      }

      const portfolios = new Map<string, EstateEntity>();
      const ministries = new Map<string, EstateEntity>();
      for (const repositoryEntity of uniqueRepositories.values()) {
        const portfolio = findAncestor(repositoryEntity.id, "portfolio");
        const ministry = findAncestor(repositoryEntity.id, "ministry");
        if (portfolio) {
          portfolios.set(portfolio.id, portfolio);
        }
        if (ministry) {
          ministries.set(ministry.id, ministry);
        }
      }
      const repositoryNames = [...uniqueRepositories.values()]
        .map((entity) => entity.label)
        .sort((left, right) => left.localeCompare(right, "en"));
      const portfolioLabels = [...portfolios.values()]
        .map((entity) => entity.label)
        .sort((left, right) => left.localeCompare(right, "en"));
      const ministryLabels = [...ministries.values()]
        .map((entity) => entity.label)
        .sort((left, right) => left.localeCompare(right, "en"));

      return [
        {
          id: capability.id,
          label: capability.label,
          status: capability.status,
          confidence: average([
            capability.confidence,
            ...implementationRelationships.map(
              (relationship) => relationship.confidence,
            ),
          ]),
          repositoryCount: uniqueRepositories.size,
          portfolioCount: portfolios.size,
          ministryCount: ministries.size,
          repositoryNames,
          portfolioLabels,
          ministryLabels,
          hypothesis:
            "Opportunity hypothesis only: compare these implementations for reusable patterns before considering any shared service or consolidation.",
        },
      ];
    })
    .sort(
      (left, right) =>
        right.repositoryCount - left.repositoryCount ||
        left.label.localeCompare(right.label, "en"),
    );

  const expectedMetricCount =
    input.repositories.length * ALL_METRIC_DIMENSIONS.length;
  const observedMetrics = input.metrics.filter(
    (metric) => metric.confidence > 0,
  );
  const partialMetricCount = input.metrics.filter(
    (metric) => metric.confidence < 1,
  ).length;
  const observedRelationshipCount = input.relationships.filter(
    (relationship) => relationship.status === "observed",
  ).length;
  const inferredRelationshipCount = input.relationships.filter(
    (relationship) => relationship.status === "inferred",
  ).length;
  const validatedRelationshipCount = input.relationships.filter(
    (relationship) => relationship.status === "validated",
  ).length;
  const missingEvidenceWarnings: string[] = [];
  if (input.analyzedRepositoryCount < input.selectedRepositoryCount) {
    missingEvidenceWarnings.push(
      `${input.analyzedRepositoryCount} of ${input.selectedRepositoryCount} selected repositories have demonstration analysis signals.`,
    );
  }
  if (partialMetricCount > 0) {
    missingEvidenceWarnings.push(
      `${partialMetricCount} metric measurements have partial or missing evidence; quality scores exclude unknown signals and confidence records the gap.`,
    );
  }
  if (ministryEntities.some((ministry) => ministry.status === "inferred")) {
    missingEvidenceWarnings.push(
      "Ministry and portfolio membership is an inferred candidate grouping, not an authoritative organization record.",
    );
  }
  if (validatedRelationshipCount === 0) {
    missingEvidenceWarnings.push(
      "No graph relationships have been human-validated in this demonstration dataset.",
    );
  }

  return ministryDashboardInsightsSchema.parse({
    datasetVersion: input.datasetVersion,
    methodologyNote:
      "Scores are confidence-weighted aggregates of repository-level demonstration signals. Quality and evidence confidence are reported separately; no individual contributor metrics are used.",
    ministryScorecards,
    portfolioComparisons,
    attentionQueue,
    capabilityReuse,
    dataQuality: {
      capturedAt: input.capturedAt,
      selectedRepositoryCount: input.selectedRepositoryCount,
      analyzedRepositoryCount: input.analyzedRepositoryCount,
      analysisCoverage: clampRatio(
        input.analyzedRepositoryCount,
        input.selectedRepositoryCount,
      ),
      observedRelationshipCount,
      inferredRelationshipCount,
      validatedRelationshipCount,
      averageRelationshipConfidence: average(
        input.relationships.map((relationship) => relationship.confidence),
      ),
      metricCoverage: clampRatio(observedMetrics.length, expectedMetricCount),
      averageMetricConfidence: average(
        observedMetrics.map((metric) => metric.confidence),
      ),
      missingEvidenceWarnings,
    },
  });
}
