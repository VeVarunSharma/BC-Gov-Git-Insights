# Evidence and scoring methodology

## Cohort

The first cohort algorithm:

1. list public `bcgov` repositories
2. require BC Gov ownership, non-fork, and non-empty content
3. retain archived repositories
4. order by stars descending and full name ascending
5. select the first 100

The selection algorithm and source ETags are versioned.

## Evidence layers

| Layer                                     | Authority                          |
| ----------------------------------------- | ---------------------------------- |
| GitHub responses and commit-pinned files  | Source evidence                    |
| Deterministic scanner facts               | Authoritative observations         |
| Transparent metric formulas               | Reproducible derived facts         |
| Foundry dossier and relationships         | Advisory, evidence-cited inference |
| Modernization and Agentic recommendations | Human-reviewed proposal            |

Missing evidence reduces confidence. It does not automatically reduce a
repository's quality score.

## Metric dimensions

- activity and lifecycle
- documentation
- testing
- delivery automation
- dependency sustainability
- maintainability
- security hygiene
- architecture evidence completeness

The activity-versus-health view exposes all component dimensions and the
versioned formula behind any composite.

Agentic targeting keeps value, readiness, and risk independent. A high-risk
repository is not automatically a good automation target even when its business
value is high.

## Article benchmark

The dashboard stores these cited external comparisons separately from measured
telemetry:

- approximately 3,400 repositories
- 466 million lines of code
- 50 concurrent agents
- approximately 20 hours
- 25 million tokens per minute provisioned
- under US$2,000 reported cost

They are comparison references, not project estimates or service-level
objectives.
