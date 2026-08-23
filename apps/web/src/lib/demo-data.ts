import "server-only";

import type {
  AgenticRecommendation,
  EstateEntity,
  EstateRelationship,
  MetricDimension,
  Repository,
} from "@git-insights/contracts";
import {
  buildMinistryDashboardInsights,
  calculateRepositoryMetrics,
  calculateTransparentHealth,
  type RepositorySignals,
} from "@git-insights/metrics";

const collectedAt = "2026-08-22T17:00:00.000Z";

export const organizationSnapshot = {
  totalRepositories: 2_693,
  activeYearRepositories: 1_039,
  activeQuarterRepositories: 717,
  selectedRepositories: 100,
  analyzedRepositories: 12,
  observedCapabilities: 18,
  inferredRelationships: 31,
  datasetVersion: "demo-2026-08-22",
  capturedAt: collectedAt,
};

const rawRepositories = [
  [31395054, "BC-Policy-Framework-For-GitHub", 179, null, false, 21, 1308],
  [109877949, "von-network", 169, "Python", false, 44, 651],
  [162173874, "bcdata", 87, "R", false, 27, 25967],
  [429950091, "bc-wallet-mobile", 84, "TypeScript", false, 188, 111602],
  [162001451, "aries-vcr", 81, "Python", false, 42, 7633],
  [104127743, "TheOrgBook", 77, "Python", true, 0, 23455],
  [36751057, "bcmaps", 74, "R", false, 8, 302536],
  [190654597, "gis-pantry", 70, "Jupyter Notebook", false, 8, 293076],
  [235861506, "wps", 65, "Python", false, 468, 224285],
  [152475404, "design-system", 62, "TypeScript", false, 48, 22347],
  [430810764, "traction", 62, "TypeScript", false, 25, 64060],
  [108884386, "fasstr", 59, "R", false, 2, 91213],
] as const;

export const repositories: Repository[] = rawRepositories.map(
  ([id, name, stars, language, archived, openIssues, sizeKb], index) => ({
    id,
    nodeId: `demo-${id}`,
    owner: "bcgov",
    name,
    fullName: `bcgov/${name}`,
    htmlUrl: `https://github.com/bcgov/${name}`,
    description:
      "Public repository metadata; analysis values are demonstration data.",
    homepage: null,
    defaultBranch:
      name === "BC-Policy-Framework-For-GitHub" ? "master" : "main",
    archived,
    fork: false,
    empty: false,
    stars,
    forks: Math.max(2, Math.round(stars * 0.45)),
    openIssues,
    sizeKb,
    primaryLanguage: language,
    licenseSpdx:
      name === "BC-Policy-Framework-For-GitHub" ? "NOASSERTION" : "Apache-2.0",
    topics: [],
    pushedAt: new Date(
      Date.UTC(2026, 7, Math.max(1, 22 - index * 4)),
    ).toISOString(),
    createdAt: "2018-01-01T00:00:00.000Z",
    updatedAt: collectedAt,
    collectedAt,
  }),
);

type DemoEvidenceSignals = Omit<
  RepositorySignals,
  "archived" | "datasetVersion" | "daysSincePush" | "repositoryId"
>;

const demonstrationSignalDefaults: DemoEvidenceSignals = {
  hasReadme: true,
  hasArchitectureDocs: null,
  hasContributingGuide: null,
  hasTests: true,
  hasCi: true,
  hasDeploymentAutomation: null,
  hasDependencyManifest: true,
  hasDependencyLock: true,
  hasSupportedRuntime: null,
  hasSecurityPolicy: true,
  hasSecretScanningFindings: null,
  hasApiEvidence: null,
  hasDataStoreEvidence: null,
};

const demonstrationSignalOverrides = new Map<
  number,
  Partial<DemoEvidenceSignals>
>([
  [
    31395054,
    {
      hasArchitectureDocs: true,
      hasContributingGuide: true,
      hasTests: false,
      hasDeploymentAutomation: false,
      hasDependencyManifest: false,
      hasDependencyLock: false,
      hasApiEvidence: false,
      hasDataStoreEvidence: false,
    },
  ],
  [
    109877949,
    {
      hasArchitectureDocs: true,
      hasContributingGuide: true,
      hasDeploymentAutomation: true,
      hasSupportedRuntime: true,
      hasSecretScanningFindings: false,
      hasApiEvidence: true,
      hasDataStoreEvidence: true,
    },
  ],
  [
    162173874,
    {
      hasArchitectureDocs: false,
      hasContributingGuide: true,
      hasDeploymentAutomation: false,
      hasSupportedRuntime: true,
      hasSecretScanningFindings: false,
      hasApiEvidence: true,
      hasDataStoreEvidence: true,
    },
  ],
  [
    429950091,
    {
      hasArchitectureDocs: true,
      hasContributingGuide: true,
      hasDeploymentAutomation: true,
      hasSupportedRuntime: true,
      hasSecretScanningFindings: false,
      hasApiEvidence: true,
      hasDataStoreEvidence: true,
    },
  ],
  [
    162001451,
    {
      hasArchitectureDocs: true,
      hasContributingGuide: true,
      hasDeploymentAutomation: true,
      hasSupportedRuntime: true,
      hasSecretScanningFindings: false,
      hasApiEvidence: true,
      hasDataStoreEvidence: false,
    },
  ],
  [
    104127743,
    {
      hasArchitectureDocs: true,
      hasContributingGuide: true,
      hasCi: false,
      hasDeploymentAutomation: true,
      hasSupportedRuntime: false,
      hasSecretScanningFindings: false,
      hasApiEvidence: true,
      hasDataStoreEvidence: true,
    },
  ],
  [
    36751057,
    {
      hasArchitectureDocs: false,
      hasContributingGuide: false,
      hasDeploymentAutomation: false,
      hasDependencyLock: false,
      hasSupportedRuntime: true,
      hasApiEvidence: false,
      hasDataStoreEvidence: true,
    },
  ],
  [
    190654597,
    {
      hasArchitectureDocs: false,
      hasContributingGuide: false,
      hasTests: null,
      hasCi: false,
      hasDeploymentAutomation: false,
      hasDependencyLock: false,
      hasSupportedRuntime: null,
      hasSecurityPolicy: false,
      hasApiEvidence: false,
      hasDataStoreEvidence: true,
    },
  ],
  [
    235861506,
    {
      hasArchitectureDocs: true,
      hasContributingGuide: true,
      hasTests: false,
      hasDeploymentAutomation: true,
      hasSupportedRuntime: true,
      hasSecretScanningFindings: false,
      hasApiEvidence: true,
      hasDataStoreEvidence: true,
    },
  ],
  [
    152475404,
    {
      hasArchitectureDocs: true,
      hasContributingGuide: true,
      hasDeploymentAutomation: true,
      hasSupportedRuntime: true,
      hasSecretScanningFindings: false,
      hasApiEvidence: true,
      hasDataStoreEvidence: false,
    },
  ],
  [
    430810764,
    {
      hasArchitectureDocs: true,
      hasContributingGuide: true,
      hasDeploymentAutomation: true,
      hasSupportedRuntime: true,
      hasSecretScanningFindings: false,
      hasApiEvidence: true,
      hasDataStoreEvidence: true,
    },
  ],
  [
    108884386,
    {
      hasArchitectureDocs: false,
      hasContributingGuide: false,
      hasCi: false,
      hasDeploymentAutomation: false,
      hasDependencyLock: false,
      hasSupportedRuntime: true,
      hasSecurityPolicy: false,
      hasApiEvidence: false,
      hasDataStoreEvidence: true,
    },
  ],
]);

function metricEvidenceIds(
  repositoryId: number,
): Partial<Record<MetricDimension, string[]>> {
  return {
    activity: [`demo:${repositoryId}:github-metadata`],
    documentation: [`demo:${repositoryId}:documentation-scan`],
    testing: [`demo:${repositoryId}:test-scan`],
    automation: [`demo:${repositoryId}:workflow-scan`],
    sustainability: [`demo:${repositoryId}:dependency-scan`],
    securityHygiene: [`demo:${repositoryId}:security-scan`],
    architectureEvidence: [`demo:${repositoryId}:architecture-scan`],
    maintainability: [`demo:${repositoryId}:maintainability-signals`],
  };
}

export const repositoryMetricValues = repositories.flatMap((repository) => {
  const daysSincePush =
    repository.pushedAt === null
      ? null
      : Math.max(
          0,
          Math.floor(
            (Date.parse(collectedAt) - Date.parse(repository.pushedAt)) /
              (24 * 60 * 60 * 1000),
          ),
        );
  return calculateRepositoryMetrics(
    {
      repositoryId: repository.id,
      datasetVersion: organizationSnapshot.datasetVersion,
      daysSincePush,
      archived: repository.archived,
      ...demonstrationSignalDefaults,
      ...demonstrationSignalOverrides.get(repository.id),
    },
    metricEvidenceIds(repository.id),
  );
});

const repositoryScores = new Map(
  repositories.map((repository) => {
    const metrics = repositoryMetricValues.filter(
      (metric) => metric.repositoryId === repository.id,
    );
    const activity = metrics.find((metric) => metric.dimension === "activity");
    const health = calculateTransparentHealth(metrics);

    return [
      repository.id,
      {
        activity: activity?.value ?? 0,
        health: health.value,
        confidence: health.confidence,
      },
    ];
  }),
);

export const repositoryRows = repositories.map((repository) => ({
  ...repository,
  ...repositoryScores.get(repository.id)!,
}));

const ministryIds = {
  citizensServices: "ministry:citizens-services",
  emergencyManagement: "ministry:emergency-management-and-climate-readiness",
  waterLandStewardship: "ministry:water-land-and-resource-stewardship",
} as const;

const ministryEntities: EstateEntity[] = [
  {
    id: ministryIds.citizensServices,
    type: "ministry",
    label: "Ministry of Citizens' Services (candidate)",
    description:
      "Candidate ministry grouping inferred from public repository names, topics, and documentation; not an authoritative assignment.",
    status: "inferred",
    confidence: 0.78,
    repositoryId: null,
    attributes: {
      candidate: true,
      evidenceBasis: "public repository evidence",
    },
  },
  {
    id: ministryIds.waterLandStewardship,
    type: "ministry",
    label: "Ministry of Water, Land and Resource Stewardship (candidate)",
    description:
      "Candidate ministry grouping inferred from public repository names, topics, and documentation; not an authoritative assignment.",
    status: "inferred",
    confidence: 0.72,
    repositoryId: null,
    attributes: {
      candidate: true,
      evidenceBasis: "public repository evidence",
    },
  },
  {
    id: ministryIds.emergencyManagement,
    type: "ministry",
    label: "Ministry of Emergency Management and Climate Readiness (candidate)",
    description:
      "Candidate ministry grouping inferred from public repository names, topics, and documentation; not an authoritative assignment.",
    status: "inferred",
    confidence: 0.88,
    repositoryId: null,
    attributes: {
      candidate: true,
      evidenceBasis: "public repository evidence",
    },
  },
];

const portfolioMinistry = new Map<string, string>([
  ["portfolio:digital-trust", ministryIds.citizensServices],
  ["portfolio:service-experience", ministryIds.citizensServices],
  ["portfolio:data-geospatial", ministryIds.waterLandStewardship],
  ["portfolio:emergency-management", ministryIds.emergencyManagement],
]);

const portfolioEntities: EstateEntity[] = [
  {
    id: "portfolio:digital-trust",
    type: "portfolio",
    label: "Digital trust",
    description: "Candidate grouping inferred from public repository evidence.",
    status: "inferred",
    confidence: 0.86,
    repositoryId: null,
    attributes: {
      color: "purple",
      candidateMinistryId: ministryIds.citizensServices,
    },
  },
  {
    id: "portfolio:data-geospatial",
    type: "portfolio",
    label: "Data and geospatial",
    description: "Candidate grouping inferred from public repository evidence.",
    status: "inferred",
    confidence: 0.82,
    repositoryId: null,
    attributes: {
      color: "blue",
      candidateMinistryId: ministryIds.waterLandStewardship,
    },
  },
  {
    id: "portfolio:service-experience",
    type: "portfolio",
    label: "Service experience",
    description: "Candidate grouping inferred from public repository evidence.",
    status: "inferred",
    confidence: 0.74,
    repositoryId: null,
    attributes: {
      color: "orange",
      candidateMinistryId: ministryIds.citizensServices,
    },
  },
  {
    id: "portfolio:emergency-management",
    type: "portfolio",
    label: "Emergency management",
    description: "Candidate grouping inferred from public repository evidence.",
    status: "inferred",
    confidence: 0.9,
    repositoryId: null,
    attributes: {
      color: "green",
      candidateMinistryId: ministryIds.emergencyManagement,
    },
  },
];

const repositoryPortfolio = new Map<string, string>([
  ["von-network", "portfolio:digital-trust"],
  ["bc-wallet-mobile", "portfolio:digital-trust"],
  ["aries-vcr", "portfolio:digital-trust"],
  ["TheOrgBook", "portfolio:digital-trust"],
  ["traction", "portfolio:digital-trust"],
  ["bcdata", "portfolio:data-geospatial"],
  ["bcmaps", "portfolio:data-geospatial"],
  ["gis-pantry", "portfolio:data-geospatial"],
  ["fasstr", "portfolio:data-geospatial"],
  ["design-system", "portfolio:service-experience"],
  ["BC-Policy-Framework-For-GitHub", "portfolio:service-experience"],
  ["wps", "portfolio:emergency-management"],
]);

export const graphEntities: EstateEntity[] = [
  {
    id: "org:bcgov",
    type: "organization",
    label: "BC Gov public GitHub",
    description: "Observed organization boundary.",
    status: "observed",
    confidence: 1,
    repositoryId: null,
    attributes: { repositories: organizationSnapshot.totalRepositories },
  },
  ...ministryEntities,
  ...portfolioEntities,
  ...repositories.map((repository): EstateEntity => {
    const candidatePortfolioId = repositoryPortfolio.get(repository.name)!;
    const candidateMinistryId = portfolioMinistry.get(candidatePortfolioId)!;

    return {
      id: `repo:${repository.id}`,
      type: "repository",
      label: repository.name,
      description: repository.description,
      status: "observed",
      confidence: 1,
      repositoryId: repository.id,
      attributes: {
        archived: repository.archived,
        stars: repository.stars,
        language: repository.primaryLanguage ?? "Unknown",
        candidatePortfolioId,
        candidateMinistryId,
      },
    };
  }),
  {
    id: "capability:verifiable-credentials",
    type: "capability",
    label: "Verifiable credentials",
    description: "Candidate shared capability.",
    status: "inferred",
    confidence: 0.91,
    repositoryId: null,
    attributes: { repositoryCount: 5 },
  },
  {
    id: "capability:geospatial-analysis",
    type: "capability",
    label: "Geospatial analysis",
    description: "Candidate shared capability.",
    status: "inferred",
    confidence: 0.88,
    repositoryId: null,
    attributes: { repositoryCount: 3 },
  },
  {
    id: "capability:accessible-components",
    type: "capability",
    label: "Accessible UI components",
    description: "Candidate shared capability.",
    status: "inferred",
    confidence: 0.84,
    repositoryId: null,
    attributes: { repositoryCount: 1 },
  },
  {
    id: "capability:wildfire-decision-support",
    type: "capability",
    label: "Wildfire decision support",
    description: "Candidate business capability.",
    status: "inferred",
    confidence: 0.94,
    repositoryId: null,
    attributes: { repositoryCount: 1 },
  },
];

export const graphRelationships: EstateRelationship[] = [
  ...ministryEntities.map((ministry): EstateRelationship => ({
    id: `contains:${ministry.id}`,
    source: "org:bcgov",
    target: ministry.id,
    type: "contains",
    status: "inferred",
    confidence: ministry.confidence,
    evidenceIds: [`demo:${ministry.id}:public-repository-signals`],
  })),
  ...portfolioEntities.map((portfolio): EstateRelationship => ({
    id: `contains:${portfolio.id}`,
    source: portfolioMinistry.get(portfolio.id)!,
    target: portfolio.id,
    type: "contains",
    status: "inferred",
    confidence: portfolio.confidence,
    evidenceIds: [`demo:${portfolio.id}:public-repository-signals`],
  })),
  ...repositories.map((repository): EstateRelationship => ({
    id: `contains:${repository.id}`,
    source: repositoryPortfolio.get(repository.name)!,
    target: `repo:${repository.id}`,
    type: "contains",
    status: "inferred",
    confidence: 0.78,
    evidenceIds: [`demo:${repository.id}:topics`],
  })),
  ...[
    "von-network",
    "bc-wallet-mobile",
    "aries-vcr",
    "TheOrgBook",
    "traction",
  ].map((name): EstateRelationship => {
    const repository = repositories.find((item) => item.name === name)!;
    return {
      id: `implements:${repository.id}:credentials`,
      source: `repo:${repository.id}`,
      target: "capability:verifiable-credentials",
      type: "implements",
      status: "inferred",
      confidence: 0.9,
      evidenceIds: [`demo:${repository.id}:readme`],
    };
  }),
  ...["bcdata", "bcmaps", "gis-pantry"].map((name): EstateRelationship => {
    const repository = repositories.find((item) => item.name === name)!;
    return {
      id: `implements:${repository.id}:geospatial`,
      source: `repo:${repository.id}`,
      target: "capability:geospatial-analysis",
      type: "implements",
      status: "inferred",
      confidence: 0.86,
      evidenceIds: [`demo:${repository.id}:readme`],
    };
  }),
  {
    id: "implements:design-system:accessibility",
    source: "repo:152475404",
    target: "capability:accessible-components",
    type: "implements",
    status: "inferred",
    confidence: 0.89,
    evidenceIds: ["demo:152475404:readme"],
  },
  {
    id: "implements:wps:wildfire",
    source: "repo:235861506",
    target: "capability:wildfire-decision-support",
    type: "implements",
    status: "inferred",
    confidence: 0.95,
    evidenceIds: ["demo:235861506:readme"],
  },
  {
    id: "uses:bc-wallet-mobile:von-network",
    source: "repo:429950091",
    target: "repo:109877949",
    type: "uses",
    status: "inferred",
    confidence: 0.87,
    evidenceIds: ["demo:429950091:manifest", "demo:109877949:readme"],
  },
  {
    id: "integrates:traction:von-network",
    source: "repo:430810764",
    target: "repo:109877949",
    type: "integratesWith",
    status: "inferred",
    confidence: 0.84,
    evidenceIds: ["demo:430810764:readme", "demo:109877949:readme"],
  },
];

export const agenticRecommendations: AgenticRecommendation[] = [
  {
    id: "agentic:design-system:accessibility",
    repositoryId: 152475404,
    workflowType: "accessibility-review",
    value: 86,
    readiness: 91,
    risk: 23,
    confidence: 0.84,
    rationale:
      "Active TypeScript component library with a bounded, evidence-rich accessibility review surface.",
    prerequisites: ["Human-approved rule set", "Read-only repository access"],
    safeOutputs: ["Draft issue", "Review artifact"],
    evidenceIds: ["demo:152475404:workflows", "demo:152475404:tests"],
  },
  {
    id: "agentic:bcdata:docs",
    repositoryId: 162173874,
    workflowType: "documentation-freshness",
    value: 72,
    readiness: 84,
    risk: 18,
    confidence: 0.81,
    rationale:
      "Mature public package where documentation can be checked against exported functions without write access.",
    prerequisites: ["Documentation build command catalogued"],
    safeOutputs: ["Documentation gap report"],
    evidenceIds: ["demo:162173874:readme", "demo:162173874:manifest"],
  },
  {
    id: "agentic:wps:test-gap",
    repositoryId: 235861506,
    workflowType: "test-gap-analysis",
    value: 94,
    readiness: 73,
    risk: 58,
    confidence: 0.78,
    rationale:
      "High-value active service with substantial issue activity; begin with read-only test-gap analysis due to operational risk.",
    prerequisites: ["Domain-owner review", "No deployment permissions"],
    safeOutputs: ["Evidence-cited test-gap report"],
    evidenceIds: ["demo:235861506:tests", "demo:235861506:issues"],
  },
];

export const ministryInsights = buildMinistryDashboardInsights({
  datasetVersion: organizationSnapshot.datasetVersion,
  capturedAt: organizationSnapshot.capturedAt,
  selectedRepositoryCount: organizationSnapshot.selectedRepositories,
  analyzedRepositoryCount: organizationSnapshot.analyzedRepositories,
  repositories,
  metrics: repositoryMetricValues,
  entities: graphEntities,
  relationships: graphRelationships,
  recommendations: agenticRecommendations,
});

const coverageDimensions = [
  { dimension: "documentation", label: "Documentation" },
  { dimension: "testing", label: "Testing" },
  { dimension: "automation", label: "Automation" },
  { dimension: "sustainability", label: "Sustainability" },
  { dimension: "architectureEvidence", label: "Architecture" },
] as const satisfies ReadonlyArray<{
  dimension: MetricDimension;
  label: string;
}>;

export const dimensionCoverage = coverageDimensions.map(
  ({ dimension, label }) => {
    const metrics = repositoryMetricValues.filter(
      (metric) => metric.dimension === dimension,
    );
    return {
      dimension: label,
      observed: Math.round(
        (metrics.reduce((sum, metric) => sum + metric.confidence, 0) /
          repositories.length) *
          100,
      ),
      target: 100,
    };
  },
);
