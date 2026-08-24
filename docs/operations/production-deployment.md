# Production deployment

BC Gov OpenGit Ministry uses exactly one Azure environment: `production` in
Canada Central. Infrastructure is deployed at subscription scope through the
protected GitHub `production` environment.

## Current deployment gate

The production IaC is locally validated, but deployment remains blocked until:

1. the user-selected MCAPS production subscription is validated;
2. the GitHub `production` environment has an OIDC deployment identity;
3. Container Apps, PostgreSQL, and Foundry quotas are confirmed;
4. four public GHCR images are published and pinned by digest;
5. the Entra and source GitHub OAuth registrations are created.

No workflow deploys automatically. Both validation what-if and deployment are
manual.

## GitHub production environment

Create one protected GitHub environment named `production`. Require reviewers
for deployment and configure these variables:

| Variable                   | Phase 1 value                                    | Purpose                                      |
| -------------------------- | ------------------------------------------------ | -------------------------------------------- |
| `AZURE_CLIENT_ID`          | OIDC application client ID                       | Deployment identity                          |
| `AZURE_TENANT_ID`          | `1cf61a60-a877-46a7-86bc-a8f76b6ab441`           | MCAPS deployment tenant                      |
| `AZURE_SUBSCRIPTION_ID`    | `ad92e163-a85e-40cc-bb50-054b0b8197a8`           | User-selected MCAPS subscription             |
| `AZURE_LOCATION`           | `canadacentral`                                  | Single production region                     |
| `GHCR_WEB_IMAGE`           | `ghcr.io/...@sha256:...`                         | Immutable web image                          |
| `GHCR_METADATA_JOB_IMAGE`  | `ghcr.io/...@sha256:...`                         | Immutable collector image                    |
| `GHCR_SCAN_JOB_IMAGE`      | `ghcr.io/...@sha256:...`                         | Immutable scanner image                      |
| `GHCR_SYNTHESIS_JOB_IMAGE` | `ghcr.io/...@sha256:...`                         | Immutable synthesizer image                  |
| `CONFIGURE_ENTRA_AUTH`     | `false`                                          | Keeps web ingress private until auth exists  |
| `PUBLIC_DASHBOARD`         | `true`                                           | v1 anonymous dashboard with external ingress |
| `CONFIGURE_SOURCE_OAUTH`   | `false`                                          | Delays source secret binding                 |
| `ENABLE_SCHEDULED_JOBS`    | `false`                                          | Starts jobs manually during bootstrap        |
| `DEPLOY_FOUNDRY_MODEL`     | `false`                                          | Delays model deployment until quota is known |
| `ALLOWED_TENANT_IDS`       | MCAPS, Microsoft, BC Gov, and Alberta tenant IDs | Application authorization allowlist          |

The deployment workflow rejects image tags that are not pinned with
`@sha256:`.

## Phase 1: foundation

1. Run **Validate infrastructure** manually and review the subscription
   what-if.
2. Run **Deploy infrastructure** with all optional integrations disabled.
3. Record Bicep outputs for the generated Key Vault, Storage, PostgreSQL,
   Foundry, Container Apps, and managed identities.
4. Run the manual database-bootstrap job after the PostgreSQL server is ready.

The web Container App has no external ingress while Entra authentication is
disabled, unless `PUBLIC_DASHBOARD` is `true`.

### v1 public dashboard

v1 ships without sign-in. Setting `PUBLIC_DASHBOARD=true` both enables external
ingress and makes the application serve an anonymous read-only viewer, so no
Entra registration or Key Vault secret is needed to reach the dashboard. Phase 2
below is only required when you want authenticated access.

This is safe only while the dashboard serves public repository metadata. Unset
`PUBLIC_DASHBOARD` and complete Phase 2 before surfacing security findings. See
`docs/security/threat-model.md`.

## Phase 2: identity and collection

Create:

- one multitenant Entra web registration;
- one project-owned GitHub OAuth App for authenticated public REST reads.

Store their secrets directly in the generated production Key Vault, then set:

| Variable                         | Production value                 |
| -------------------------------- | -------------------------------- |
| `CONFIGURE_ENTRA_AUTH`           | `true`                           |
| `ENTRA_WEB_CLIENT_ID`            | Entra application client ID      |
| `ENTRA_CLIENT_SECRET_URL`        | Versionless Key Vault secret URI |
| `CONFIGURE_SOURCE_OAUTH`         | `true`                           |
| `SOURCE_OAUTH_CLIENT_ID`         | GitHub OAuth client ID           |
| `SOURCE_OAUTH_CLIENT_SECRET_URL` | Versionless Key Vault secret URI |

Redeploy and verify:

- anonymous requests cannot access dashboard data;
- Microsoft tenant sign-in succeeds;
- unallowlisted tenant IDs are rejected;
- BC Gov and Alberta access remains disabled until consent testing succeeds;
- the manual metadata job receives a 5,000-request/hour GitHub limit.

## Phase 3: Foundry and schedules

After capacity discovery, configure:

| Variable                        | Value                                   |
| ------------------------------- | --------------------------------------- |
| `DEPLOY_FOUNDRY_MODEL`          | `true`                                  |
| `FOUNDRY_MODEL_DEPLOYMENT_NAME` | Stable application deployment name      |
| `FOUNDRY_MODEL_NAME`            | Confirmed model name                    |
| `FOUNDRY_MODEL_VERSION`         | Explicit immutable version              |
| `FOUNDRY_MODEL_FORMAT`          | Usually `OpenAI`                        |
| `FOUNDRY_MODEL_SKU`             | Confirmed SKU, usually `GlobalStandard` |
| `FOUNDRY_MODEL_CAPACITY`        | Confirmed quota-backed capacity         |

Run one manual metadata, scan, and synthesis cycle. Only after all three
succeed set `ENABLE_SCHEDULED_JOBS=true` and redeploy.

## Verification

After every deployment:

1. verify the web health endpoint;
2. verify anonymous dashboard/API denial;
3. verify Entra tenant allowlisting;
4. verify Container Apps jobs and their managed identities;
5. verify container-scoped Storage RBAC;
6. verify Key Vault access is limited to web and collector identities;
7. verify the web PostgreSQL role is read-only;
8. verify Foundry calls use the synthesis identity;
9. verify Application Insights receives no repository source or secret values.

Deployment is complete only when the production URL is reported with an
`https://` scheme and live RBAC verification passes.
