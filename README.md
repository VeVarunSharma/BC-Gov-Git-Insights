```text
       .--------------------.         .--------------------.
       |  PUBLIC CODE       |-------->|  SHARED INSIGHT    |
       |  </>  </>  </>      |         |  evidence -> action|
       '--------------------'         '--------------------'
             BC GOV  /  OPENGIT MINISTRY
        Discover the estate. Discuss the opportunity.
```

# BC Gov OpenGit Ministry

An independent, Apache-2.0 proof of concept for evidence-backed portfolio
intelligence over public repositories in [`github.com/bcgov`](https://github.com/bcgov).
Inspired by the external Git Insights and Git Insights Ministry concepts described
by The Velocity Whitepapers; not an official BC Gov or Alberta product and not
endorsed by either government.

## A customer conversation, not a government assessment

A public-sector portfolio lead wants to find reusable capabilities before funding
another implementation. An engineering lead needs to distinguish missing evidence
from poor quality. Together they explore a repository portfolio, examine candidate
relationships, and turn one hypothesis into an owner-led discovery workshop.
This accelerator demonstrates that conversation; it does not establish actual
ownership, vulnerabilities, savings, or readiness of the named repositories.

**Current scope:** the dashboard serves **12 demonstration repositories of a
target cohort of 100** from `apps/web/src/lib/demo-data.ts`. Scores, signals,
ministry/portfolio assignments, relationships, and recommendations are synthetic
demonstration analysis. Displayed estate totals and timestamps are fixture
context, not a live inventory. The target collector selects the 100 most-starred,
BC Gov-owned, non-fork, non-empty public repositories; archived repositories
remain eligible and labelled.

## Try the dashboard

Prerequisites: **Node.js >=22.14.0** and **pnpm 10.34.5**.
The pnpm pin was upgraded from 10.33.0 to address reported security advisories;
use the patched version for setup.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open <http://127.0.0.1:3000>. **No environment file, Azure account, credentials,
Docker, database, or AI service is needed for this development dashboard.**
It defaults to a local development viewer. If configuration is needed, Next.js
loads it from `apps/web/.env.local`, not a repository-root `.env`:

```bash
cp .env.example apps/web/.env.local
```

To exercise the local sign-in gate, set **both** `PUBLIC_DASHBOARD=false` and
`DEV_AUTH_DISABLED=false` there and restart. `PUBLIC_DASHBOARD=true` is checked
first and bypasses all other auth checks. The local gate is not proof of a
production identity deployment; production additionally requires trusted Azure
Easy Auth and validated tenant configuration.

The separate [offline synthetic JSON sample](docs/demo/synthetic-sample.json)
is reusable workshop input, **not a dashboard data mode or import feature**.
The browser still uses the built-in BC Gov fixture.

## Demonstrate and hand off

- [Demo script: five-minute and fifteen-minute journeys](docs/demo/demo-script.md)
- [Opportunity brief / workshop worksheet](docs/demo/opportunity-brief.html)
- [Illustrative evidence record](docs/demo/evidence-example.json)
- [Provisional accelerator metadata](accelerator.yaml)

Use this as a discovery/account opener, then agree a workshop or bounded pilot.
It is not a production service or a validated customer outcome. The proposed
[accelerators catalog](https://github.com/mcaps-microsoft/accelerators-catalog)
currently returns HTTP 404; metadata is provisional and not catalog-schema
validated. Independent human rehearsal and cloud deployment are not claimed.
See the demo script for media capture and release-readiness gates.

## Read-only by design

- No GitHub App installation or BC Gov organization permission.
- No source-repository workflows, commits, pull requests, issues, comments, or labels.
- Public, read-only REST requests and shallow clones; optional credentials belong
  to the project, not the source organization.
- Repository content is untrusted data and is never executed.
- Deterministic evidence and transparent metrics are authoritative; model output
  is advisory, confidence-labelled, and must cite evidence IDs.

## Implementation and target architecture

The working dashboard is a Next.js fixture-backed UI and read-only API with
React Flow/ELK and ECharts. Contracts, metrics, graph utilities, a GitHub REST
collector, ephemeral scanner, ADLS evidence writer, PostgreSQL/Drizzle schema,
and a Microsoft Foundry Responses API adapter exist in source. Their presence
does **not** establish a deployed, end-to-end collection-to-dashboard pipeline.
Dashboard routes do not currently read PostgreSQL or call Foundry.

The target Azure architecture uses Container Apps and Jobs, ADLS Gen2,
PostgreSQL Flexible Server, Key Vault, Foundry, and monitoring with managed
identities. [Architecture diagrams](docs/architecture/overview.md) separate
the actual fixture path from the unverified target integration.

## Optional jobs, quality, and operations

Job processes do not automatically load root `.env`; invoke Node explicitly with
`--env-file` as shown in the [runbook](docs/operations/runbook.md). That guide also
covers optional Postgres/Azurite services, ports, bootstrap, and troubleshooting.
Docker and Azure CLI/Bicep are only needed for their respective validation paths.

Existing quality commands:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
az bicep build --file infra/main.bicep
```

CI, GHCR publication, Bicep validation, and manual OIDC deployment workflows exist.
No account, deployment authorization, quota, or cloud verification is implied.
See [production deployment](docs/operations/production-deployment.md), including
access-mode selection, cost ownership, and teardown. Historical
[deployment](.azure/deployment-plan.md) and
[infrastructure](.azure/infrastructure-plan.json) planning artifacts are context,
not authorization to use any account.

## Further reading

- [Architecture](docs/architecture/overview.md)
- [Evidence and scoring methodology](docs/methodology/evidence-and-scoring.md)
- [Security model](docs/security/threat-model.md)
- [Operations and release readiness](docs/operations/runbook.md)
- [Production deployment](docs/operations/production-deployment.md)
- [Contributing](CONTRIBUTING.md) · [Security policy](SECURITY.md)

Licensed under [Apache-2.0](LICENSE).
