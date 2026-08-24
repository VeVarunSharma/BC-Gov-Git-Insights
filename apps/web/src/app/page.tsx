import { headers } from "next/headers";

import { CoverageChart } from "@/components/coverage-chart";
import { EstateMap } from "@/components/estate-map";
import {
  ASSERTION_PRESENTATION,
  ASSERTION_STATUS_ORDER,
  RELATIONSHIP_PRESENTATION,
  RELATIONSHIP_TYPE_ORDER,
} from "@/components/estate-map-model";
import { MinistryInsightsSection } from "@/components/ministry-insights";
import { SignInGate } from "@/components/sign-in-gate";
import { authorizeHeaders } from "@/lib/auth";
import {
  agenticRecommendations,
  dimensionCoverage,
  graphEntities,
  graphRelationships,
  ministryInsights,
  organizationSnapshot,
  repositoryRows,
  repositories,
} from "@/lib/demo-data";

export const dynamic = "force-dynamic";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-CA").format(value);
}

const navItems = [
  ["overview", "Overview"],
  ["ministry-insights", "Ministry insights"],
  ["estate-map", "Estate map"],
  ["repositories", "Repositories"],
  ["agentic", "Agentic opportunities"],
] as const;

export default async function Home() {
  let principal;
  try {
    principal = authorizeHeaders(await headers());
  } catch {
    principal = null;
  }
  if (!principal) {
    return <SignInGate />;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <span className="product-kicker">
            Open-source portfolio intelligence
          </span>
          <h1>BC Gov OpenGit Ministry</h1>
        </div>
        <div className="identity-chip">
          <span className="identity-dot" />
          <span>{principal.displayName}</span>
        </div>
      </header>

      <nav className="section-nav" aria-label="Dashboard sections">
        {navItems.map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>

      <main>
        <section id="overview" className="section-block">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Portfolio overview</span>
              <h2>Public code estate at a glance</h2>
            </div>
            <div className="dataset-pill">
              Demo dataset · {organizationSnapshot.datasetVersion}
            </div>
          </div>

          <div className="metric-grid">
            <article className="metric-card">
              <span>Total public repositories</span>
              <strong>
                {formatNumber(organizationSnapshot.totalRepositories)}
              </strong>
              <small>Observed GitHub organization metadata</small>
            </article>
            <article className="metric-card">
              <span>Initial cohort</span>
              <strong>{organizationSnapshot.selectedRepositories}</strong>
              <small>Most-starred eligible repositories</small>
            </article>
            <article className="metric-card">
              <span>Active in the last year</span>
              <strong>
                {formatNumber(organizationSnapshot.activeYearRepositories)}
              </strong>
              <small>Portfolio expansion candidate</small>
            </article>
            <article className="metric-card">
              <span>Capability candidates</span>
              <strong>{organizationSnapshot.observedCapabilities}</strong>
              <small>AI-inferred and evidence-labelled</small>
            </article>
          </div>

          <div className="two-column-grid">
            <article className="panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Evidence quality</span>
                  <h3>Coverage before confidence</h3>
                </div>
                <span className="status-badge observed">Observed</span>
              </div>
              <CoverageChart data={dimensionCoverage} />
            </article>

            <article className="panel insight-panel">
              <span className="eyebrow">Initial finding</span>
              <h3>Popularity surfaces reusable public capabilities</h3>
              <p>
                The first cohort clusters around digital trust, geospatial
                analysis, public data, emergency decision support, and reusable
                service experience components.
              </p>
              <div className="confidence-row">
                <span>Evidence confidence</span>
                <strong>84%</strong>
              </div>
              <p className="panel-note">
                Demonstration insight only. Production claims must cite an
                immutable commit, scanner version, and evidence IDs.
              </p>
            </article>
          </div>
        </section>

        <MinistryInsightsSection insights={ministryInsights} />

        <section id="estate-map" className="section-block">
          <div className="section-heading estate-map-heading">
            <div>
              <span className="eyebrow">Interactive estate map</span>
              <h2>Ministries, portfolios, repositories, and capabilities</h2>
              <p>
                Ministry boundaries and assignments are candidate groupings
                inferred from public repository evidence, never authoritative
                organizational records. Edge color describes the relationship;
                line style describes its provenance.
              </p>
            </div>
            <div className="graph-legend" aria-label="Estate map visual legend">
              <div className="legend-group">
                <strong className="legend-title">Provenance</strong>
                {ASSERTION_STATUS_ORDER.map((status) => (
                  <span className="legend-item" key={status}>
                    <i
                      aria-hidden="true"
                      className={`legend-line ${status}-line`}
                    />
                    {ASSERTION_PRESENTATION[status].label}
                  </span>
                ))}
              </div>
              <div className="legend-group">
                <strong className="legend-title">Relationship</strong>
                {RELATIONSHIP_TYPE_ORDER.map((type) => {
                  const presentation = RELATIONSHIP_PRESENTATION[type];
                  return (
                    <span className="legend-item" key={type}>
                      <i
                        aria-hidden="true"
                        className="legend-line relationship-line"
                        style={{ borderTopColor: presentation.color }}
                      />
                      {presentation.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          <article className="panel map-panel">
            <EstateMap
              entities={graphEntities}
              relationships={graphRelationships}
            />
          </article>
        </section>

        <section id="repositories" className="section-block">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Repository explorer</span>
              <h2>Evidence-backed repository dossiers</h2>
            </div>
            <span className="dataset-pill">
              Showing {repositories.length} demonstration records
            </span>
          </div>
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Repository</th>
                  <th>Language</th>
                  <th>Stars</th>
                  <th>Activity</th>
                  <th>Health</th>
                  <th>Confidence</th>
                  <th>Lifecycle</th>
                </tr>
              </thead>
              <tbody>
                {repositoryRows.map((repository) => (
                  <tr key={repository.id}>
                    <td>
                      <a
                        href={repository.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {repository.name}
                      </a>
                    </td>
                    <td>{repository.primaryLanguage ?? "Documentation"}</td>
                    <td>{repository.stars}</td>
                    <td>{repository.activity}</td>
                    <td>{repository.health}</td>
                    <td>{Math.round(repository.confidence * 100)}%</td>
                    <td>
                      <span
                        className={`status-badge ${
                          repository.archived ? "archived" : "active"
                        }`}
                      >
                        {repository.archived ? "Archived" : "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="agentic" className="section-block">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Agentic opportunities</span>
              <h2>Where workflows may be valuable and safe</h2>
              <p>
                Recommendations combine transparent value, readiness, and risk
                dimensions with Foundry-generated evidence-cited rationale.
              </p>
            </div>
          </div>
          <div className="recommendation-grid">
            {agenticRecommendations.map((recommendation) => {
              const repository = repositories.find(
                (item) => item.id === recommendation.repositoryId,
              )!;
              return (
                <article
                  className="recommendation-card"
                  key={recommendation.id}
                >
                  <div className="recommendation-title">
                    <div>
                      <span className="eyebrow">{repository.name}</span>
                      <h3>
                        {recommendation.workflowType
                          .split("-")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1),
                          )
                          .join(" ")}
                      </h3>
                    </div>
                    <span className="confidence-score">
                      {Math.round(recommendation.confidence * 100)}%
                    </span>
                  </div>
                  <p>{recommendation.rationale}</p>
                  <dl className="score-row">
                    <div>
                      <dt>Value</dt>
                      <dd>{recommendation.value}</dd>
                    </div>
                    <div>
                      <dt>Readiness</dt>
                      <dd>{recommendation.readiness}</dd>
                    </div>
                    <div>
                      <dt>Risk</dt>
                      <dd>{recommendation.risk}</dd>
                    </div>
                  </dl>
                  <small>
                    Safe output: {recommendation.safeOutputs.join(", ")}
                  </small>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <footer>
        <span>
          Independent open-source proof of concept. Not an official BC Gov or
          Alberta product.
        </span>
        <span>Apache-2.0</span>
      </footer>
    </div>
  );
}
