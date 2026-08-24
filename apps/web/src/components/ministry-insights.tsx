import type {
  AggregateScore,
  AttentionItem,
  MinistryDashboardInsights,
} from "@git-insights/contracts";

const attentionLabels: Record<AttentionItem["category"], string> = {
  "active-low-health": "Active / lower health",
  "agentic-ready": "Agentic candidate",
  "archived-high-interest": "Archived / high interest",
  "issue-backlog": "Issue backlog",
};

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function AggregateScoreValue({
  score,
  table = false,
}: {
  score: AggregateScore;
  table?: boolean;
}) {
  return (
    <span className={table ? "aggregate-score table-score" : "aggregate-score"}>
      <strong>{score.value}</strong>
      <small>
        {formatPercent(score.confidence)} confidence ·{" "}
        {formatPercent(score.coverage)} coverage
      </small>
    </span>
  );
}

export function MinistryInsightsSection({
  insights,
}: {
  insights: MinistryDashboardInsights;
}) {
  const capturedAt = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(insights.dataQuality.capturedAt));

  return (
    <section id="ministry-insights" className="section-block">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Ministry insights</span>
          <h2>Candidate ministry and sub-area decision support</h2>
          <p>
            These groupings and scores are demonstration insights inferred from
            public repository evidence. They are not authoritative organization
            records, and quality is always shown separately from evidence
            confidence and coverage.
          </p>
        </div>
        <span className="dataset-pill">
          Derived from {insights.datasetVersion}
        </span>
      </div>

      <p className="methodology-banner">{insights.methodologyNote}</p>

      <div className="ministry-scorecard-grid">
        {insights.ministryScorecards.map((ministry) => (
          <article className="ministry-scorecard" key={ministry.id}>
            <div className="insight-card-heading">
              <div>
                <span className="eyebrow">Candidate ministry</span>
                <h3>{ministry.label}</h3>
              </div>
              <span className={`status-badge ${ministry.status}`}>
                {ministry.status}
              </span>
            </div>
            <p className="membership-note">{ministry.membershipNote}</p>

            <dl className="ministry-count-grid">
              <div>
                <dt>Repositories</dt>
                <dd>{ministry.repositoryCount}</dd>
              </div>
              <div>
                <dt>Active / archived</dt>
                <dd>
                  {ministry.activeRepositoryCount} /{" "}
                  {ministry.archivedRepositoryCount}
                </dd>
              </div>
              <div>
                <dt>Agentic candidates</dt>
                <dd>{ministry.agenticCandidateCount}</dd>
              </div>
            </dl>

            <div className="aggregate-score-grid">
              <div>
                <span>Aggregate activity</span>
                <AggregateScoreValue score={ministry.activity} />
              </div>
              <div>
                <span>Aggregate health</span>
                <AggregateScoreValue score={ministry.health} />
              </div>
            </div>

            <div className="evidence-strip">
              <span>
                Membership confidence{" "}
                <strong>{formatPercent(ministry.membershipConfidence)}</strong>
              </span>
              <span>
                Data confidence{" "}
                <strong>{formatPercent(ministry.evidenceConfidence)}</strong>
              </span>
              <span>
                Metric coverage{" "}
                <strong>{formatPercent(ministry.evidenceCoverage)}</strong>
              </span>
            </div>
          </article>
        ))}
      </div>

      <article className="panel ministry-comparison-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Sub-area comparison</span>
            <h3>Candidate portfolio evidence matrix</h3>
          </div>
          <span className="status-badge inferred">Inferred membership</span>
        </div>
        <p className="panel-note">
          Each value is confidence-weighted across repositories in the candidate
          portfolio. Unknown evidence lowers confidence or coverage; it is never
          scored as a failure.
        </p>
        <div className="table-shell insight-table-shell">
          <table className="insight-table">
            <caption className="sr-only">
              Candidate ministry and portfolio scores with confidence and
              evidence coverage
            </caption>
            <thead>
              <tr>
                <th>Candidate ministry</th>
                <th>Portfolio / sub-area</th>
                <th>Repositories</th>
                <th>Membership</th>
                <th>Activity</th>
                <th>Health</th>
                <th>Documentation</th>
                <th>Testing</th>
                <th>Automation</th>
                <th>Sustainability</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {insights.portfolioComparisons.map((portfolio) => (
                <tr key={portfolio.id}>
                  <td>{portfolio.ministryLabel}</td>
                  <td>
                    <strong>{portfolio.label}</strong>
                    <small>
                      {portfolio.agenticCandidateCount} Agentic candidate
                      {portfolio.agenticCandidateCount === 1 ? "" : "s"}
                    </small>
                  </td>
                  <td>{portfolio.repositoryCount}</td>
                  <td>{formatPercent(portfolio.membershipConfidence)}</td>
                  <td>
                    <AggregateScoreValue score={portfolio.activity} table />
                  </td>
                  <td>
                    <AggregateScoreValue score={portfolio.health} table />
                  </td>
                  <td>
                    <AggregateScoreValue
                      score={portfolio.documentation}
                      table
                    />
                  </td>
                  <td>
                    <AggregateScoreValue score={portfolio.testing} table />
                  </td>
                  <td>
                    <AggregateScoreValue score={portfolio.automation} table />
                  </td>
                  <td>
                    <AggregateScoreValue
                      score={portfolio.sustainability}
                      table
                    />
                  </td>
                  <td>
                    <span className="table-score">
                      <strong>
                        {formatPercent(portfolio.evidenceConfidence)}
                      </strong>
                      <small>
                        {formatPercent(portfolio.evidenceCoverage)} coverage
                      </small>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <div className="insight-work-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Attention queue</span>
              <h3>Evidence-backed actions to review</h3>
            </div>
            <span className="dataset-pill">
              {insights.attentionQueue.length} rule matches
            </span>
          </div>
          <ol className="attention-queue">
            {insights.attentionQueue.map((item) => (
              <li className="attention-item" key={item.id}>
                <div className="attention-item-heading">
                  <div>
                    <span className="attention-category">
                      {attentionLabels[item.category]}
                    </span>
                    <a
                      href={item.repositoryUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {item.repositoryName}
                    </a>
                  </div>
                  <span className={`priority-badge ${item.priority}`}>
                    {item.priority} priority
                  </span>
                </div>
                <p>{item.reason}</p>
                <small>
                  Rule: {item.rule} Evidence confidence:{" "}
                  {formatPercent(item.confidence)}.
                  {item.ministryLabel
                    ? ` Candidate ministry: ${item.ministryLabel}.`
                    : ""}
                </small>
              </li>
            ))}
          </ol>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Capability reuse</span>
              <h3>Multi-repository opportunity hypotheses</h3>
            </div>
            <span className="status-badge inferred">
              Not consolidation proof
            </span>
          </div>
          <p className="panel-note">
            Repeated capability evidence can justify comparison and reuse
            discovery. It does not prove that implementations should be merged
            or replaced.
          </p>
          <div className="table-shell">
            <table className="reuse-table">
              <caption className="sr-only">
                Capabilities implemented by multiple repositories
              </caption>
              <thead>
                <tr>
                  <th>Capability candidate</th>
                  <th>Repositories</th>
                  <th>Portfolio / ministry reach</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {insights.capabilityReuse.map((capability) => (
                  <tr key={capability.id}>
                    <td>
                      <strong>{capability.label}</strong>
                      <small>{capability.hypothesis}</small>
                    </td>
                    <td>
                      {capability.repositoryCount}
                      <small>{capability.repositoryNames.join(", ")}</small>
                    </td>
                    <td>
                      {capability.portfolioCount} portfolio
                      {capability.portfolioCount === 1 ? "" : "s"} ·{" "}
                      {capability.ministryCount} ministry candidate
                      {capability.ministryCount === 1 ? "" : "s"}
                      <small>
                        {[
                          ...capability.portfolioLabels,
                          ...capability.ministryLabels,
                        ].join(" · ")}
                      </small>
                    </td>
                    <td>{formatPercent(capability.confidence)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <article className="panel data-quality-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Data quality and freshness</span>
            <h3>Know what the snapshot can support</h3>
          </div>
          <span className="dataset-pill">Captured {capturedAt} UTC</span>
        </div>
        <div className="data-quality-grid">
          <div>
            <span>Analysis coverage</span>
            <strong>
              {insights.dataQuality.analyzedRepositoryCount} /{" "}
              {insights.dataQuality.selectedRepositoryCount}
            </strong>
            <small>
              {formatPercent(insights.dataQuality.analysisCoverage)} of selected
            </small>
          </div>
          <div>
            <span>Relationship provenance</span>
            <strong>
              {insights.dataQuality.observedRelationshipCount} /{" "}
              {insights.dataQuality.inferredRelationshipCount} /{" "}
              {insights.dataQuality.validatedRelationshipCount}
            </strong>
            <small>Observed / inferred / validated</small>
          </div>
          <div>
            <span>Relationship confidence</span>
            <strong>
              {formatPercent(
                insights.dataQuality.averageRelationshipConfidence,
              )}
            </strong>
            <small>Average, separate from relationship status</small>
          </div>
          <div>
            <span>Metric coverage</span>
            <strong>
              {formatPercent(insights.dataQuality.metricCoverage)}
            </strong>
            <small>Repository-dimension measurements observed</small>
          </div>
          <div>
            <span>Metric confidence</span>
            <strong>
              {formatPercent(insights.dataQuality.averageMetricConfidence)}
            </strong>
            <small>Average confidence where evidence exists</small>
          </div>
        </div>
        <div className="warning-block">
          <strong>Missing-evidence warnings</strong>
          <ul>
            {insights.dataQuality.missingEvidenceWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
        <p className="panel-note">
          This release uses one dataset snapshot. It intentionally does not show
          trends or change-over-time claims.
        </p>
      </article>
    </section>
  );
}
