# BC Gov OpenGit Ministry — reusable Azure deployment plan

> **Status: reference design; deployment authorization and current cloud validation pending.**
> Original planning date: 2026-08-22. Publishing scrub: 2026-10-18.

This document preserves useful topology from historical planning. Earlier
account-specific approval, quota, policy, inventory, cost, and validation claims
are **not transferable evidence** and are not asserted for a reusable deployment.
No account is selected or authorized by this plan. No current cloud deployment
or live RBAC verification is established.

Use [production deployment](../docs/operations/production-deployment.md) for the
current workflow behavior, access-mode matrix, parameter parity gap, verification,
cost ownership, and teardown. Use the [architecture overview](../docs/architecture/overview.md)
to distinguish the actual fixture path from the unverified target integration.

## 1. Goal and actual implementation boundary

The target is a read-only public-repository insight service with deterministic
evidence, optional advisory Foundry synthesis, and a portfolio dashboard.
The intended collector cohort is the 100 most-starred eligible public `bcgov`
repositories; archived repositories remain eligible and labelled.

The actual dashboard serves **12 demonstration repositories of a target 100**
from a built-in fixture. Scores, memberships, relationships, and recommendations
are synthetic analysis, not verified findings. PostgreSQL read-model ingestion
and dashboard integration are target work, not a demonstrated end-to-end pipeline.
The separate offline synthetic sample is workshop material, not a dashboard mode.

Source repositories remain external and untrusted: public read-only REST and
immutable shallow clones, no source-org installation or writes, no execution of
cloned source/build/test code.

## 2. Reusable deployment inputs and gates

| Input                | Required selection / verification                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| Subscription         | `<authorized-subscription-id>` selected by its owner; explicit deployment permission required           |
| Deployment tenant    | `<authorized-tenant-id>` and approved OIDC federation for this repository/environment                   |
| Region               | `canadacentral` is the template default, not an account policy or residency approval                    |
| Resource group       | `<dedicated-resource-group-name>`; verify uniqueness, ownership, lifecycle, and contents                |
| Workload scope       | Agree cohort, expected users, job cadence, and data classification; no scale validation is implied      |
| Identity mode        | Select internal bootstrap, public fixture, or authenticated pilot explicitly                            |
| Allowed tenants      | `<consented-tenant-id>[,<another-consented-tenant-id>]`; no preapproved organizations or IDs            |
| Capacity             | Fresh Container Apps, PostgreSQL, storage, and optional model checks in the selected account/region     |
| Policy and residency | Review effective policies, public endpoints, backup location, model processing geography, and retention |
| Cost                 | Named owner, current estimate, approved limit, alert recipients, expiry, and teardown plan              |

Authentication for a pilot requires trusted platform Easy Auth, application
tenant/issuer/audience/expiry checks, and verification that principal headers
cannot be spoofed around the platform. Email suffixes are not an authorization
boundary. Do not publish real tenant/subscription identifiers or credentials in
this plan.

## 3. Components and deployment recipe

| Component       | Source path                          | Target role                                                                |
| --------------- | ------------------------------------ | -------------------------------------------------------------------------- |
| Web             | `apps/web`                           | Next.js SSR dashboard, read-only APIs, React Flow/ELK, ECharts             |
| Collector       | `apps/collector`                     | Public GitHub metadata, cohort manifest, scan plan                         |
| Scanner         | `apps/scanner`                       | Ephemeral deterministic scan at immutable commit                           |
| Synthesizer     | `apps/synthesizer`                   | Bounded/redacted evidence to advisory Foundry dossiers                     |
| Contracts       | `packages/contracts`                 | Zod validation and lineage contracts                                       |
| Evidence        | `packages/evidence`                  | Blob/ADLS artifacts, checksums, immutable writes, mutable control pointers |
| Database        | `packages/database`                  | PostgreSQL/Drizzle schema and bootstrap; read-model integration pending    |
| Metrics / graph | `packages/metrics`, `packages/graph` | Transparent scoring, graph slices, and DTOs                                |
| AI              | `packages/ai`                        | Structured advisory output and evidence contracts                          |

Standalone Bicep lives in `infra/`: subscription-scope `main.bicep`, ARM JSON
parameters, and resource-group-scoped modules. GitHub Actions supplies CI, image
publication, and manual OIDC infrastructure workflows; no deployment permission
is inferred from their presence.

## 4. Target resource topology

Values below are reference sizing, not reserved capacity, account-specific
availability confirmation, a cost estimate, or an SLA. Review actual Bicep
parameters and current service capabilities before use.

| Component          | Azure service                         | Reference configuration                                                        |
| ------------------ | ------------------------------------- | ------------------------------------------------------------------------------ |
| Web/API            | Container Apps                        | Consumption, 0.5 vCPU / 1 GiB, min 1 / max 5; ingress depends on selected mode |
| Metadata           | Container Apps Job                    | Manual until schedules enabled; 0.5 vCPU / 1 GiB                               |
| Database bootstrap | Container Apps Job                    | Manual-only migrations and least-privilege SQL role grants                     |
| Scanner            | Container Apps Job                    | Manual or weekly; 2 vCPU / 4 GiB, bounded execution                            |
| Synthesis          | Container Apps Job                    | Manual or weekly; 1 vCPU / 2 GiB, optional Foundry dependency                  |
| Evidence           | ADLS Gen2                             | StorageV2, hierarchical namespace, Standard_ZRS, private containers            |
| Query database     | PostgreSQL Flexible Server            | PostgreSQL 16, General Purpose D2ds v5, 128 GiB, zone HA, Entra auth           |
| AI                 | Foundry account/project               | AI Services S0; local auth disabled; model/version/capacity conditional        |
| Secrets            | Key Vault                             | Standard, RBAC, soft delete, purge protection                                  |
| Logs / traces      | Log Analytics / Application Insights  | Workspace-backed, bounded retention/ingestion, sampled telemetry               |
| Runtime identities | Five user-assigned managed identities | Web, collector, scanner, synthesis, database bootstrap                         |
| Cost alerts        | Azure budget                          | Parameterized threshold and recipients; not a spending cap                     |

Storage containers are `raw`, `control`, `manifests`, `artifacts`, `evidence`,
`analysis`, and `exports`. Runtime identities and container-scoped roles are
intended to isolate metadata, scan, synthesis, and read-only access.
Actual grants still require live verification.

The [infrastructure reference](infrastructure-plan.json) retains illustrative
resource names and dependency topology; names are not an inventory of provisioned
resources. The Bicep implementation, not this JSON reference, controls deployment.

### Images and optional services

Publish web/collector/scanner/synthesizer images to GHCR, verify provenance and
pull access, and pin by immutable digest. No Azure Container Registry is included
in the target topology. A published image is not a deployed workload.

Service Bus, Functions, Fabric, Power BI, a separate graph database, and a hosted
autonomous agent are not required for the reference architecture. Private
networking is not implemented by this reference design; authenticated public
service endpoints are not equivalent to network-private resources. Any customer
requiring private access needs a separately reviewed design.

## 5. Access modes and data handling

| Mode                | Public dashboard | Entra configuration | Result                                                           |
| ------------------- | ---------------- | ------------------- | ---------------------------------------------------------------- |
| Internal bootstrap  | `false`          | `false`             | Internal web ingress; production data APIs deny anonymous access |
| Public fixture      | `true`           | `false`             | External anonymous read-only fixture viewer                      |
| Authenticated pilot | `false`          | `true`              | External ingress with platform sign-in and tenant authorization  |

`PUBLIC_DASHBOARD=true` bypasses application auth checks first. It is only
appropriate for reviewed public/demo content, never real aggregated sensitive
findings. Both `PUBLIC_DASHBOARD=false` and `DEV_AUTH_DISABLED=false` are needed
to exercise the local gate; local gate testing does not verify production auth.

Use dedicated managed identities in Azure. Project-owned GitHub OAuth and Entra
secrets, if needed, are stored out of band in Key Vault, not committed or passed
as plaintext Bicep secrets. Public clones need no credential. Local development
password/storage-key overrides are not a cloud credential strategy.

Source content is untrusted data. Preserve evidence IDs, immutable commit,
dataset/schema/tool/model lineage and checksums; redact before storage/model
input/logging. Model output remains advisory. Immutable artifacts must not be
overwritten; mutable `current/*` pointers are not proof of complete processing.

## 6. Capacity, policy, residency, and cost verification

No prior resource counts, quota usage, or policy inspection establishes current
availability. Perform these checks only after account-owner authorization:

1. Confirm the target identity, subscription, region, dedicated resource group,
   effective permissions, and policy assignments.
2. Inventory existing resources and name conflicts; do not assume an empty account.
3. Verify Container Apps environment/compute quotas, storage availability, and
   PostgreSQL SKU/vCore/HA/backup capability in the selected account and region.
4. For AI, verify model name/version/SKU/capacity and processing geography. A
   regional resource location does not prove regional model processing.
5. Review public endpoints, firewall scope, consent, backup/retention policy,
   telemetry redaction, and actual managed-identity access.
6. Obtain a current cost estimate and named owner; review always-ready web,
   database, storage, telemetry, and model charges. Budget alerts do not stop spend.
7. Review a parameter-matched what-if and unresolved changes before deployment.

The manual validation workflow currently omits `publicDashboard` while deployment
passes it. Resolve or explicitly compensate for that parity gap before relying
on a public-mode preview. The deployment workflow's what-if and create occur in
one job without a separate approval pause.

## 7. Reusable execution checklist

- [x] Source topology, Bicep, application components, and manual workflows exist.
- [x] Preserve a publishable reference plan without account identifiers or approvals.
- [ ] Name deployment, maintenance, security, data, and cost owners.
- [ ] Obtain explicit account-owner deployment authorization and source scope.
- [ ] Select access mode, consented tenants, region, policies, and residency controls.
- [ ] Perform current inventory, quota, capacity, and cost checks.
- [ ] Verify image provenance/digests, protected OIDC environment, and pull access.
- [ ] Review parameter-matched what-if, role scope, secret bindings, and retention.
- [ ] Deploy only after explicit approval of the intended action.
- [ ] Bootstrap the database if testing that path; verify actual grants.
- [ ] Verify mode-specific endpoint behavior and live identity/RBAC.
- [ ] Verify any claimed ingestion/read-model integration; fixture data is not proof.
- [ ] Run manual jobs and failure/recovery checks before enabling schedules.
- [ ] Record HTTPS endpoint, evidence, operational handoff, and approved teardown.

## 8. Verification record and next steps

Historical planning contained validation statements that are not reproduced as
current account evidence. Historical CI/image-publication runs are documented in
the [runbook](../docs/operations/runbook.md#verification-record-and-limits); they
do not verify current infrastructure or establish a deployment.

Current packaging has reported local lint, typecheck, tests, and application
build success. The packaging contributor also checked a local production server in
Chrome, observing 12 fixture rows, successful API responses, and no runtime
errors. These are local demonstration checks, not independent human rehearsal,
cloud deployment, live Entra, quota, policy, or end-to-end integration validation.
Screenshots/recording require their own existence and playback checks before
publication.

Next: finish reproducible demo evidence, assign owners, and agree whether an
authorized workshop/pilot is warranted. Use the
[runbook release gates](../docs/operations/runbook.md#release-readiness-checklist)
and [deployment guide](../docs/operations/production-deployment.md), not this
reference plan's historical origin, to decide readiness.
