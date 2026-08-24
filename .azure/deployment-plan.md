# BC Gov OpenGit Ministry - Azure Deployment Plan

> **Status:** Validated

Generated: 2026-08-22

---

## 1. Project Overview

**Goal:** Deploy one production environment for the Apache-2.0, zero-touch BC Gov OpenGit Ministry service, analyzing the 100 most-starred eligible public `bcgov` repositories and presenting deterministic and Microsoft Foundry-generated insights in an authenticated dashboard.

**Path:** New Project

The user approved the detailed implementation plan in this session before execution. This deployment plan translates those approved decisions into Azure preparation artifacts without expanding deployment scope.

---

## 2. Requirements

| Attribute             | Value                                                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Classification        | Production                                                                                                                                      |
| Scale                 | Small, initial 100-repository cohort and fewer than 1,000 dashboard users                                                                       |
| Budget                | Balanced production; resilient data services and one always-ready web replica                                                                   |
| Subscription          | ME-MngEnvMCAP744360-sharmave-1 (`ad92e163-a85e-40cc-bb50-054b0b8197a8`) - explicitly selected by the user for the single production environment |
| Location              | Canada Central - explicitly approved by the user and parameterized                                                                              |
| Data residency        | Primary resources and persisted data in Canada Central                                                                                          |
| Source boundary       | Public, read-only GitHub REST and git clone access; no BC Gov installation or writes                                                            |
| Dashboard access      | Microsoft Entra multitenant sign-in with exact tenant-ID allowlisting                                                                           |
| Security detail       | Evidence-backed defensive findings only; no secret values or exploit instructions                                                               |
| Contributor analytics | Repository/portfolio aggregate only                                                                                                             |

### Allowed identity tenants

| Organization | Tenant ID                              |
| ------------ | -------------------------------------- |
| Microsoft    | `72f988bf-86f1-41af-91ab-2d7cd011db47` |
| BC Gov       | `6fdb5200-3d0d-4a8a-b036-d3685e359adc` |
| Alberta      | `2bb51c06-af9b-42c5-8bf5-3c3b7b10850b` |
| MCAPS        | `1cf61a60-a877-46a7-86bc-a8f76b6ab441` |

The application must validate token signature, issuer, audience, expiration, and `tid`. Email suffixes are not authorization boundaries.

### Policy constraints

The MCAPS subscription inherits Azure Security Baseline, MCAPSGov audit/deploy/deny initiatives, Defender data-protection initiatives, and a classic-resource creation deny policy. The classic-resource policy applies only to legacy `Microsoft.Classic*` types and does not match this deployment. ARM validation and what-if remain the authoritative policy checks.

---

## 3. Components

| Component   | Type                                              | Technology                                           | Path                 |
| ----------- | ------------------------------------------------- | ---------------------------------------------------- | -------------------- |
| Web         | Full-stack SSR dashboard and read-only API        | Next.js, TypeScript, React Flow, ECharts             | `apps/web`           |
| Collector   | Scheduled metadata and cohort job                 | Node.js, TypeScript, GitHub REST                     | `apps/collector`     |
| Scanner     | Scheduled deterministic repository scan job       | Node.js, TypeScript, pinned scanner binaries         | `apps/scanner`       |
| Synthesizer | Scheduled AI analysis job                         | Node.js, TypeScript, Microsoft Foundry Responses API | `apps/synthesizer`   |
| Contracts   | Shared validation and lineage contracts           | TypeScript, Zod                                      | `packages/contracts` |
| Database    | Curated facts, metrics, graph, and read models    | PostgreSQL, Drizzle                                  | `packages/database`  |
| Evidence    | ADLS paths, checksums, redaction, and persistence | Azure Blob SDK                                       | `packages/evidence`  |
| Metrics     | Versioned scoring and Agentic targeting           | TypeScript                                           | `packages/metrics`   |
| Graph       | Estate graph aggregation and API DTOs             | TypeScript, ELK                                      | `packages/graph`     |
| AI          | Prompt, output, and evaluation contracts          | TypeScript                                           | `packages/ai`        |

This is a new workspace. Before execution it contained only `README.md` and this planning folder.

---

## 4. Recipe Selection

**Selected:** Standalone Bicep

**Rationale:**

- The user explicitly selected Bicep and Azure Verified Modules where suitable.
- GitHub Actions and public GHCR images are the deployment control plane.
- The project needs custom subscription-scope resource orchestration and three Container Apps Jobs.
- A standalone Bicep workflow avoids introducing an unnecessary Azure Developer CLI/ACR image path.
- Deployment remains a separate, explicitly validated activity.

Infrastructure lives in `infra/`, with subscription-scope `main.bicep`, ARM JSON parameters, and resource-group-scoped modules.

---

## 5. Architecture

**Stack:** Containers

### Service mapping

| Component           | Azure service                                 | Initial SKU/configuration                                             |
| ------------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| Web/API             | Azure Container Apps                          | Consumption, authenticated HTTPS ingress, 0.5 vCPU/1 GiB, min 1/max 5 |
| Metadata collector  | Azure Container Apps Job                      | Scheduled/manual, 0.5 vCPU/1 GiB, single execution                    |
| Database bootstrap  | Azure Container Apps Job                      | Manual-only migrations and least-privilege role grants                |
| Deep scanner        | Azure Container Apps Job                      | Scheduled/manual, 2 vCPU/4 GiB, single execution                      |
| Foundry synthesizer | Azure Container Apps Job                      | Scheduled/manual, 1 vCPU/2 GiB, single execution                      |
| Raw evidence        | ADLS Gen2                                     | StorageV2, Standard_ZRS, hierarchical namespace, private containers   |
| Curated data        | Azure Database for PostgreSQL Flexible Server | PostgreSQL 16, General Purpose D2ds v5, zone HA, 128 GiB, Entra auth  |
| AI                  | Microsoft Foundry account/project             | AI Services S0, local auth disabled, model deployment parameterized   |
| Secrets             | Azure Key Vault                               | Standard, RBAC, soft delete, purge protection                         |
| Logs                | Log Analytics                                 | PerGB2018, 90-day retention                                           |
| Traces              | Application Insights                          | Workspace-based, sampled OpenTelemetry                                |
| Runtime identities  | Five user-assigned managed identities         | Isolated web, collector, scanner, synthesis, and database bootstrap   |
| Cost guardrail      | Azure budget                                  | Parameterized monthly amount and alert contacts                       |

### Image strategy

- Build public, Apache-2.0 images in GHCR from this repository.
- Pin deployments to immutable image digests.
- No Azure Container Registry is included in the proof of concept.
- Container Apps pulls public images without a registry credential.

### Supporting services deliberately omitted

- Service Bus: not needed for the initial 100-repository bounded jobs.
- Azure Functions: the full-stack app and scheduled jobs cover the first-release workload.
- VNet/private endpoints: deferred until broader sensitive access or production; all data endpoints remain authenticated and anonymous Blob access is disabled.
- Fabric, Power BI, and a graph database: not required for the initial product.
- GitHub Copilot SDK runtime: deferred until first-release dashboard acceptance.

---

## 6. Security and Identity

### Azure service authentication

- Local development uses `DefaultAzureCredential`.
- Azure-hosted code uses `ManagedIdentityCredential` with its dedicated user-assigned identity.
- Storage uses container-scoped Reader/Contributor assignments so collectors,
  scanners, synthesis, and the dashboard cannot modify one another's data
  domains.
- Key Vault uses `Key Vault Secrets User` at the vault scope.
- Foundry inference uses the narrowest supported Cognitive Services/Foundry data-plane role.
- PostgreSQL uses Microsoft Entra token authentication through
  `@azure/postgresql-auth`; no database password is stored. A dedicated manual
  bootstrap job runs migrations and grants the web identity read-only access.
- GitHub Actions uses workload identity federation; no Azure client secret is stored in GitHub.

### Non-Azure credentials

- A project-owned GitHub OAuth App supplies authenticated public REST reads.
- Its client secret and the Entra web-app secret are set out of band in Key Vault after provisioning.
- Bicep never accepts or deploys plaintext secret values.
- Public git clones use no credential.

### Data handling

- Source checkouts are ephemeral and are never persisted in Azure.
- ADLS stores source envelopes, manifests, checksums, normalized findings, SBOMs, and bounded redacted evidence.
- Scanner and AI output removes secret values, proof-of-concept payloads, and exploit instructions before persistence.
- Logs include scan IDs and aggregate telemetry, not code or raw prompts.

---

## 7. Provisioning Limit Checklist

### Resource inventory and current usage

Azure CLI quota commands could not run because the local CLI is not signed in. Per the Azure quota workflow, this is not replaced with an unreliable quota API. Azure Resource Graph was used to count current resources, and official service-limit documentation was used where a fixed published limit exists.

The Resource Graph query found zero existing resources of every planned type in Canada Central in the selected MCAPS subscription.

| Resource type                                      | Deploy | Existing | Total after | Published limit/quota                                       | Result/source                                                                           |
| -------------------------------------------------- | -----: | -------: | ----------: | ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `Microsoft.App/managedEnvironments`                |      1 |        0 |           1 | Subscription-specific regional quota                        | Pre-deployment `az quota` check required; one environment is the minimum requested      |
| `Microsoft.App/containerApps`                      |      1 |        0 |           1 | Environment/application scoped                              | Within design scale; environment quota remains a deployment gate                        |
| `Microsoft.App/jobs`                               |      4 |        0 |           4 | Environment/application scoped                              | Within design scale; environment quota remains a deployment gate                        |
| `Microsoft.Storage/storageAccounts`                |      1 |        0 |           1 | 250 per region by default                                   | Within limit; official Azure service-limits documentation                               |
| `Microsoft.DBforPostgreSQL/flexibleServers`        |      1 |        0 |           1 | Subscription and regional vCore capacity varies             | Canada Central supports the selected tier; deployment-time capacity validation required |
| `Microsoft.KeyVault/vaults`                        |      1 |        0 |           1 | Transaction quotas, no relevant count conflict found        | Within design scale; official Key Vault limits                                          |
| `Microsoft.CognitiveServices/accounts`             |      1 |        0 |           1 | 200 mixed AI Services resources per region; 100 of one type | Within limit before model quota; official Foundry Tools limits                          |
| `Microsoft.CognitiveServices/accounts/projects`    |      1 |        0 |           1 | Parent-account scoped                                       | Within design scale                                                                     |
| `Microsoft.CognitiveServices/accounts/deployments` |      1 |        0 |           1 | Model-specific capacity                                     | Model name/version/capacity and quota must be confirmed before deployment               |
| `Microsoft.OperationalInsights/workspaces`         |      1 |        0 |           1 | Service-level limits far above one workspace                | Within design scale                                                                     |
| `Microsoft.Insights/components`                    |      1 |        0 |           1 | Workspace-backed component                                  | Within design scale                                                                     |
| `Microsoft.ManagedIdentity/userAssignedIdentities` |      5 |        0 |           5 | Subscription resource limit not approached                  | Dedicated identities reduce cross-workload privilege                                    |

**Capacity status:** Application and infrastructure generation may proceed. Deployment and `Ready for Validation` status are blocked until:

1. The user confirms the assumed subscription.
2. `az login` is available.
3. `az quota list` confirms Container Apps environment/consumption cores.
4. PostgreSQL regional vCore capacity is confirmed.
5. A Foundry model deployment is selected and its Canada Central quota is confirmed.

No resource has been provisioned.

---

## 8. Regional Availability

- Microsoft Foundry projects are available in Canada Central.
- Azure Database for PostgreSQL Flexible Server is available in Canada Central, including General Purpose compute, zone-redundant HA, geo-redundant backup, and Entra authentication.
- Container Apps, Storage, Key Vault, Log Analytics, Application Insights, and managed identities are available in Canada Central.
- Foundry model availability and capacity are model-specific and remain deployment parameters.

---

## 9. Research Summary

| Component      | Applied guidance                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Container Apps | Consumption profile, scale-to-zero for the proof of concept, health probes, immutable revisions, bounded CPU/memory, no inbound ingress for jobs                         |
| Storage        | StorageV2 with hierarchical namespace, Standard_ZRS, 30-day delete retention, TLS 1.2+, anonymous access disabled, shared-key access disabled, managed identity          |
| PostgreSQL     | General Purpose D2ds v5, zone-redundant HA, 128 GiB autogrow storage, 14-day geo-redundant backup, Entra-only application access, token provider, SSL validation, alerts |
| Key Vault      | Standard SKU, RBAC authorization, 90-day soft-delete retention, purge protection, managed-identity reads                                                                 |
| Foundry        | AI Services account/project, managed identity, local authentication disabled, project/model deployment separated, model quota checked before deployment                  |
| App Insights   | Workspace-based Azure Monitor OpenTelemetry initialized before application imports, sampled telemetry, no repository content                                             |
| GitHub         | OAuth App client credentials for public REST, rate-limit headers, ETags, bounded retries, public shallow clones                                                          |
| Bicep          | Subscription-scope entry point, current resource schemas, AVM modules where their interface is stable and complete, direct resources where required                      |

Primary sources include Microsoft Learn service documentation, current Bicep schemas, Azure Well-Architected service guides, Azure SDK samples, and GitHub API documentation.

---

## 10. Execution Checklist

### Phase 1: Planning

- [x] Analyze workspace
- [x] Gather requirements from the user-approved plan
- [x] Select Canada Central
- [x] Confirm the user-selected MCAPS production subscription
- [x] Query effective Azure Policy assignments
- [x] Prepare resource inventory
- [x] Check current resource counts with Azure Resource Graph
- [x] Record quota checks that require authenticated Azure CLI
- [x] Select standalone Bicep
- [x] Plan architecture and security
- [x] Record prior user approval

### Phase 2: Execution

- [x] Research component guidance and schemas
- [x] Scaffold monorepo and shared contracts
- [x] Implement collector, persistence, metrics, API, and dashboard vertical slice
- [x] Implement deterministic scanner safety controls
- [x] Implement Foundry schema-constrained analysis adapter
- [x] Generate Dockerfiles
- [x] Generate Bicep infrastructure
- [x] Generate GitHub Actions CI and deployment workflows
- [x] Run local functional verification
- [x] Confirm subscription and live quotas (Container Apps and Storage quota pass; PostgreSQL production capabilities pass; Foundry model quota deferred because model deployment is disabled in phase 1)
- [x] Update status to `Ready for Validation`

### Phase 3: Validation

- [x] Invoke `azure-validate`
- [x] Bicep compilation
- [x] ARM template validation
- [x] Subscription what-if
- [x] Production quota confirmation
- [x] Application formatting, lint, type-check, tests, and production build
- [x] Static managed-identity/RBAC review
- [x] Azure Policy review
- [x] Populate validation proof
- [x] Update status to `Validated`

### Phase 4: Deployment

- [ ] Invoke `azure-deploy` only after validation and explicit deployment intent
- [ ] Record deployed endpoints
- [ ] Update status to `Deployed`

---

## 11. Files to Generate

| File/path                             | Purpose                                                 | Status   |
| ------------------------------------- | ------------------------------------------------------- | -------- |
| `.azure/deployment-plan.md`           | Azure preparation source of truth                       | Complete |
| `.azure/infrastructure-plan.json`     | Verified resource-level architecture plan               | Complete |
| `package.json`, `pnpm-workspace.yaml` | Monorepo foundation                                     | Complete |
| `apps/*`                              | Web and job applications                                | Complete |
| `packages/*`                          | Shared domain, persistence, metrics, graph, and AI code | Complete |
| `infra/main.bicep`                    | Subscription-scope entry point                          | Complete |
| `infra/main.parameters.json`          | ARM parameter template                                  | Complete |
| `infra/modules/*.bicep`               | Azure resource modules                                  | Complete |
| `apps/*/Dockerfile`                   | Web and job images                                      | Complete |
| `.github/workflows/*.yml`             | CI, image, Bicep, and deployment automation             | Complete |

---

## 12. Functional Verification

- Status: Locally and control-plane validated; live runtime verification follows deployment
- Backend: Health, overview, graph contracts, scanner, migrations, and fail-closed guards tested
- UI: Next.js dashboard and React Flow rendered in browser with no console errors
- Containers: Web, collector/bootstrap, scanner, and synthesizer images built; web and scanner images smoke-tested
- Authentication: Production image returns 401 without Easy Auth; live multitenant sign-in requires provisioned Entra registration
- Azure integrations: ARM validation and what-if pass in the MCAPS subscription; live resource and endpoint verification follow deployment

---

## 13. Validation Proof

| Check                            | Command                                                                           | Result                                                                                                              | Timestamp                 |
| -------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Formatting                       | `pnpm format:check`                                                               | Pass                                                                                                                | 2026-08-22T15:59:00-07:00 |
| Lint                             | `pnpm lint`                                                                       | Pass                                                                                                                | 2026-08-22T15:59:00-07:00 |
| TypeScript                       | `pnpm typecheck`                                                                  | Pass                                                                                                                | 2026-08-22T15:59:00-07:00 |
| Tests                            | `pnpm test`                                                                       | Pass                                                                                                                | 2026-08-22T15:59:00-07:00 |
| Application build                | `pnpm build`                                                                      | Pass                                                                                                                | 2026-08-22T15:59:00-07:00 |
| Bicep compilation                | `az bicep build --file infra/main.bicep --stdout`                                 | Pass                                                                                                                | 2026-08-22T16:03:00-07:00 |
| Bicep lint                       | `az bicep lint --file infra/main.bicep`                                           | Pass                                                                                                                | 2026-08-22T16:03:00-07:00 |
| Workflow lint                    | `actionlint`                                                                      | Pass                                                                                                                | 2026-08-22T15:59:00-07:00 |
| Infrastructure plan dependencies | `jq` uniqueness and dependency check                                              | Pass                                                                                                                | 2026-08-22T15:59:00-07:00 |
| Docker images                    | Build web, collector, scanner, and synthesizer images                             | Pass                                                                                                                | 2026-08-22T16:02:00-07:00 |
| Container smoke tests            | Web fail-closed health/auth plus collector/scanner/synthesizer artifact checks    | Pass                                                                                                                | 2026-08-22T16:02:00-07:00 |
| Azure Policy                     | `policy_assignment_list` and classic-resource deny definition review              | Pass: inherited MCAPS policies reviewed; classic-resource deny does not match planned resource types                | 2026-08-23T08:13:00-07:00 |
| Resource inventory               | Azure Resource Graph count in Canada Central                                      | Pass: no existing planned resource types returned                                                                   | 2026-08-23T08:13:00-07:00 |
| Static RBAC                      | Review all `Microsoft.Authorization/roleAssignments` against runtime operations   | Pass: container-scoped Storage roles, Key Vault secret readers, and synthesis-only Foundry role                     | 2026-08-22T16:03:00-07:00 |
| Azure CLI authentication         | `az account show`                                                                 | Pass: MCAPS subscription `ad92e163-a85e-40cc-bb50-054b0b8197a8`, tenant `1cf61a60-a877-46a7-86bc-a8f76b6ab441`      | 2026-08-23T08:12:00-07:00 |
| Container Apps quota             | `az quota show/usage show ManagedEnvironmentCount`                                | Pass: limit 50, usage 0                                                                                             | 2026-08-23T08:14:00-07:00 |
| Storage quota                    | `az quota list/usage show Microsoft.Storage`                                      | Pass: limit 250, usage 0                                                                                            | 2026-08-23T08:15:00-07:00 |
| PostgreSQL capability            | `az postgres flexible-server list-skus --location canadacentral`                  | Pass: D2ds v5, zone HA, geo backup, and combined zone HA/geo backup supported                                       | 2026-08-23T08:16:00-07:00 |
| Foundry model quota              | Model-specific capacity                                                           | Deferred: phase-1 deployment has `deployFoundryModel=false`                                                         | 2026-08-23T08:17:00-07:00 |
| Image publication                | Public GHCR digest references                                                     | Blocked until implementation is committed and image workflow runs                                                   | 2026-08-22T16:04:00-07:00 |
| ARM template validation          | `az deployment sub validate --subscription ad92...`                               | Pass: provisioning state `Succeeded`                                                                                | 2026-08-23T08:18:00-07:00 |
| Production what-if               | `az deployment sub what-if --subscription ad92... --result-format ResourceIdOnly` | Pass: create-only preview; no modify/delete; dynamic RBAC/admin resources reported as expected unsupported analysis | 2026-08-23T08:18:00-07:00 |

**Validated by:** `azure-validate`

**Validation timestamp:** 2026-08-23T08:18:00-07:00

### Role Assignment Verification

- Status: Static verification passed; live verification is deferred until deployment.
- Identities checked: web, collector, scanner, synthesis, and database bootstrap.
- Storage: container-scoped Blob Data Reader/Contributor assignments match each workload's read/write paths.
- Key Vault: only web and collector identities receive Key Vault Secrets User.
- Foundry: only the synthesis identity receives Cognitive Services OpenAI User.
- PostgreSQL: a dedicated Entra administrator identity runs the manual bootstrap job; the web role is granted read-only SQL permissions.
- No generic subscription- or resource-group-scoped Contributor/Owner role is assigned to an application workload.

---

## 14. Next Steps

Current phase: Pre-deployment setup on the validated MCAPS production subscription.

1. Publish the four verified images to public GHCR packages and capture immutable digests.
2. Create the production Entra and GitHub OAuth registrations.
3. Deploy the phase-1 foundation with optional integrations and schedules disabled.
4. Run live RBAC and endpoint verification.
5. Select and verify a Canada Central Foundry model deployment before phase 3.
