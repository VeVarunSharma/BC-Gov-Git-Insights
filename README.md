# BC Gov OpenGit Ministry

An independent, Apache-2.0 proof of concept for evidence-backed portfolio
intelligence over public repositories in
[`github.com/bcgov`](https://github.com/bcgov).

The project is inspired by the external Git Insights and Git Insights Ministry
concepts described by The Velocity Whitepapers. It is not an official BC Gov or
Alberta product and does not imply endorsement by either government.

## Design boundary

The proof of concept is zero-touch against the source organization:

- no GitHub App installation in BC Gov
- no workflows, commits, pull requests, issues, comments, or labels
- no BC Gov token or organization permission
- public, read-only REST requests and shallow git clones only
- repository code is scanned as data and is never executed

The initial cohort is the 100 most-starred BC Gov-owned, non-fork, non-empty
repositories. Archived repositories remain eligible and are labelled.

## Architecture

```text
Public GitHub REST + immutable shallow clones
                    |
                    v
        Azure Container Apps Jobs
          metadata | scan | AI
                    |
          +---------+----------+
          |                    |
          v                    v
      ADLS Gen2          PostgreSQL Flexible
      evidence           facts, metrics, graph
          |                    |
          +---------+----------+
                    |
                    v
          Next.js Container App
      dashboard + read-only API + React Flow
                    |
                    v
    Microsoft Foundry Responses API (advisory)
```

Deterministic facts and transparent metrics are authoritative. Foundry output is
advisory, confidence-labelled, and must cite evidence IDs. The dashboard remains
useful when AI is disabled.

## Current vertical slice

- versioned Zod contracts for repositories, evidence, findings, metrics, graph
  entities, dossiers, and Agentic recommendations
- authenticated public GitHub REST client with stable top-100 selection
- immutable ADLS writer with managed identity and checksums
- PostgreSQL/Drizzle schema with Entra token authentication
- safe ephemeral scanner that disables hooks, LFS smudging, prompts, submodules,
  and repository code execution
- transparent repository health, confidence-weighted ministry/portfolio
  aggregates, and Agentic value/readiness/risk calculations
- Microsoft Foundry Responses API adapter with strict structured output
- authenticated Next.js dashboard with ministry insights, attention and reuse
  hypotheses, React Flow/ELK, and ECharts
- subscription-scope Bicep for Container Apps, Jobs, ADLS, PostgreSQL, Key
  Vault, Foundry, and monitoring
- GitHub Actions for CI, GHCR images, Bicep validation, and manual OIDC
  deployment

Dashboard data is currently a clearly labelled demonstration fixture based on
public repository metadata. Production routes are designed to move to
PostgreSQL read models without changing the visualization contracts.

## Local development

Prerequisites:

- Node.js 22 or newer
- pnpm 10.33.0
- Docker for container verification
- Azure CLI and Bicep CLI for infrastructure validation

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Open <http://127.0.0.1:3000>. Local authentication is bypassed by default. Set
`DEV_AUTH_DISABLED=false` to exercise the production-style access gate.

The dashboard reads demonstration data and needs no backing services. To run the
collector, scanner, or synthesizer jobs, start Postgres and Azurite:

```bash
docker compose up -d
```

Postgres listens on `127.0.0.1:5433` and Azurite on `127.0.0.1:10000`, chosen so
the stack cannot collide with other local instances. Uncomment the local block
in `.env` to point the jobs at them: setting `PGPASSWORD` switches the pool to
password auth, and setting `AZURE_STORAGE_BLOB_ENDPOINT` with
`AZURE_STORAGE_KEY` points evidence writes at Azurite. Both are ignored when
`NODE_ENV=production`, so deployed workloads always use managed identity.

Create the evidence container once after first start:

```bash
az storage container create --name evidence \
  --connection-string "UseDevelopmentStorage=true"
```

Stop the stack with `docker compose down`, or `docker compose down -v` to also
discard the local data volumes.

Quality checks:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
az bicep build --file infra/main.bicep
```

## Azure preparation

The approved application plan is captured in:

- [Azure deployment plan](.azure/deployment-plan.md)
- [Infrastructure plan](.azure/infrastructure-plan.json)

Infrastructure generation is complete, but deployment is intentionally blocked
until the target subscription, Container Apps quota, PostgreSQL capacity, and a
Foundry model deployment are confirmed.

## Documentation

- [Architecture](docs/architecture/overview.md)
- [Methodology](docs/methodology/evidence-and-scoring.md)
- [Security model](docs/security/threat-model.md)
- [Operations](docs/operations/runbook.md)
- [Production deployment](docs/operations/production-deployment.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## License

Licensed under the [Apache License 2.0](LICENSE).
