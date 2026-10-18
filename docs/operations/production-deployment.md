# Production deployment

## Status and authorization gate

The repository contains subscription-scope Bicep and workflows targeting a
GitHub environment named `production`, with Canada Central as the default
region. These are implementation artifacts, **not proof of a cloud deployment
or permission to deploy**. No tenant, subscription, customer consent, quota,
or live RBAC verification is presumed.

Before any Azure action, obtain explicit authorization from the selected account
owner, agree the data/access mode, nominate deployment and cost owners, and
review the target subscription, resource group, policy, region, and budget.
Historical `.azure` plans do not authorize use of any account.

## What the workflows actually do

- **Continuous integration** runs repository quality checks and Bicep build.
- **Publish container images** runs on qualifying `main` pushes or manually,
  builds web/collector/scanner/synthesizer images, and reports digests. Publishing
  images is not Azure deployment; verify package pull permissions separately.
- **Validate infrastructure** builds Bicep/validates parameter JSON on matching
  pull requests; only its manual dispatch runs an OIDC subscription what-if.
- **Deploy infrastructure** is manual-only, uses the `production` environment,
  runs what-if, then immediately applies the template in the same job.

Configure environment protection/reviewers explicitly. The deployment workflow
does not pause for a separate approval between its what-if and create steps.
Review an authorized validation run first; workflow existence/success is not
deployment authorization.

**Known parity gap:** `infra-validate.yml` does not currently pass
`publicDashboard`, whereas `deploy.yml` passes `PUBLIC_DASHBOARD`. For public
mode its what-if therefore does not preview the same ingress/auth settings.
Resolve this gap, or run a separately authorized what-if with exactly the
deployment parameters and record the reviewed output before deployment.

## Select an access mode explicitly

| Mode                         | `PUBLIC_DASHBOARD` | `CONFIGURE_ENTRA_AUTH` | Expected behavior                                                           |
| ---------------------------- | ------------------ | ---------------------- | --------------------------------------------------------------------------- |
| Internal bootstrap           | `false`            | `false`                | Internal ingress; production dashboard/API deny unauthenticated data access |
| Public fixture demonstration | `true`             | `false`                | External ingress; anonymous read-only fixture viewer                        |
| Authenticated pilot          | `false`            | `true`                 | External ingress protected by Azure Easy Auth and application tenant checks |

Do not describe authenticated external ingress as network-private.
`PUBLIC_DASHBOARD=true` bypasses application authorization first, even when
other auth settings are present. Do not enable it alongside an authenticated
pilot. Public mode is only for reviewed public/demo content, never sensitive
aggregated findings. Before serving real findings, explicitly set it to `false`,
configure identity, and verify denial paths. No backing pipeline is activated
merely by changing access mode.

## GitHub `production` environment variables

Use placeholders below; the operator must supply account-specific values.

| Variable                   | Value / purpose                                                                  |
| -------------------------- | -------------------------------------------------------------------------------- |
| `AZURE_CLIENT_ID`          | `<deployment-oidc-client-id>` with approved least-privilege scope                |
| `AZURE_TENANT_ID`          | `<authorized-tenant-id>`                                                         |
| `AZURE_SUBSCRIPTION_ID`    | `<authorized-subscription-id>`                                                   |
| `AZURE_LOCATION`           | `canadacentral`, subject to policy and capacity review                           |
| `GHCR_WEB_IMAGE`           | `ghcr.io/<owner>/<web-image>@sha256:<digest>`                                    |
| `GHCR_METADATA_JOB_IMAGE`  | `ghcr.io/<owner>/<collector-image>@sha256:<digest>`                              |
| `GHCR_SCAN_JOB_IMAGE`      | `ghcr.io/<owner>/<scanner-image>@sha256:<digest>`                                |
| `GHCR_SYNTHESIS_JOB_IMAGE` | `ghcr.io/<owner>/<synthesizer-image>@sha256:<digest>`                            |
| `PUBLIC_DASHBOARD`         | Explicit `true` or `false` for the selected mode                                 |
| `CONFIGURE_ENTRA_AUTH`     | Explicit `true` or `false` for the selected mode                                 |
| `ALLOWED_TENANT_IDS`       | `<consented-tenant-id>[,<another-consented-tenant-id>]`; authenticated mode only |
| `CONFIGURE_SOURCE_OAUTH`   | `false` until project-owned source credentials are configured                    |
| `ENABLE_SCHEDULED_JOBS`    | `false` until manual job and failure-path verification                           |
| `DEPLOY_FOUNDRY_MODEL`     | `false` until model, region, capacity, and cost are confirmed                    |

Both Azure workflows check that all four image references contain `@sha256:`;
operators must also verify actual digest provenance, existence, and pull access.
Use protected OIDC federation for this repository/environment; do not add
deployment credentials to source control.

## Foundation and optional integrations

1. Confirm authorization, selected mode, quotas (Container Apps, PostgreSQL,
   Foundry if used), policies, and a reviewed, parameter-matched what-if.
2. Publish/pin four accessible images and configure protected OIDC variables.
3. Review `infra/main.parameters.json`: resource naming, region, and budget
   defaults require account-owner approval.
4. Dispatch **Deploy infrastructure** only after these gates are met. Capture
   deployment outputs for resource IDs, identities, endpoints, and bootstrap job.
5. If testing the database path, start the generated manual bootstrap job after
   PostgreSQL readiness; verify migrations and the web identity's read-only role.
   Database provisioning does not switch fixture routes to PostgreSQL.

For authenticated mode create an appropriately consented Entra registration and
store the client secret directly in the generated Key Vault:

| Variable                  | Value                                |
| ------------------------- | ------------------------------------ |
| `ENTRA_WEB_CLIENT_ID`     | `<entra-application-client-id>`      |
| `ENTRA_CLIENT_SECRET_URL` | `<versionless-key-vault-secret-uri>` |

For authenticated public GitHub REST reads, separately create a project-owned
GitHub OAuth application, store its secret in Key Vault, and set
`CONFIGURE_SOURCE_OAUTH=true`, `SOURCE_OAUTH_CLIENT_ID`, and
`SOURCE_OAUTH_CLIENT_SECRET_URL`. No source-organization installation or write
permission is required. Verify observed rate-limit headers rather than promising
a fixed request quota.

For optional Foundry provisioning set `DEPLOY_FOUNDRY_MODEL=true` only after
confirming `FOUNDRY_MODEL_DEPLOYMENT_NAME`, `FOUNDRY_MODEL_NAME`,
`FOUNDRY_MODEL_VERSION`, `FOUNDRY_MODEL_FORMAT`, `FOUNDRY_MODEL_SKU`, and
`FOUNDRY_MODEL_CAPACITY` against current regional availability and policy.
Do not assume defaults such as `GlobalStandard` meet residency requirements.
Run manual metadata, scan, and synthesis steps; inspect evidence, failures, and
lineage before enabling schedules. Scheduled jobs are not a proven orchestrated
pipeline or a dashboard refresh mechanism.

## Verification conditional on selected mode

Record the commit, image digests, deployment parameters, reviewer, and evidence.

- All modes: check `/api/health` or `/healthz` from the appropriate network;
  health does not prove database/AI connectivity. Verify resources, identities,
  scoped storage RBAC, secret access, read-only database grants where configured,
  and telemetry redaction. Verify retention and failure behavior.
- Internal bootstrap: confirm no public ingress and no anonymous data access;
  check health from within the permitted network.
- Public fixture: anonymous dashboard, `/api/overview`, and `/api/graph` should
  succeed and remain clearly demo-labelled. Do **not** require anonymous denial.
- Authenticated pilot: anonymous dashboard/API data must be denied or redirected
  to sign-in; approved tenant login succeeds, unallowlisted tenant fails,
  issuer/audience/expiry are checked, and principal headers cannot be spoofed
  around platform authentication. Confirm `PUBLIC_DASHBOARD=false`.
- Optional integrations: verify actual source rate limits, scan SHA/artifact
  linkage, synthesis identity and evidence citations, and observed failure
  summaries. Test absent AI without presenting fixture output as live analysis.

Do not report production readiness until the applicable checks and
[runbook release gates](runbook.md#release-readiness-checklist) are evidenced.
Report an `https://` production URL only after live verification; none is
asserted by this guide.

## Cost ownership, rollback, and teardown

Before provisioning, record a named subscription/cost owner, deployment owner,
expiry date, approved monthly limit, budget recipients, and retention decision.
The parameter file's `500` monthly budget is a configurable alert threshold,
**not an estimate or spending cap**; its empty email list needs review.
PostgreSQL, compute/jobs, storage, monitoring, and model usage may incur charges
even when the fixture dashboard does not use them.

For rollback, disable schedules, retain evidence needed for diagnosis, and
redeploy the previously approved image digests/configuration. A web rollback
does not roll back database migrations or delete evidence.

At pilot end, the authorized owner should disable schedules, export only
approved retained evidence, and inventory all created resources. Delete the
dedicated resource group **only after verifying its ownership and contents**;
review subscription-scope budgets/role assignments, registrations/federation,
Key Vault retention, model deployments, logs, and GHCR artifacts separately.
Revoke project credentials when no longer needed. Record deletion verification,
retention exceptions, and a final cost review; stopping the web app alone is not
teardown.
