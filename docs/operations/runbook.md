# Operations runbook

## Current support boundary

This is a fixture-backed accelerator, not an operated production service.
There is **no SLA** or promised response time. A named maintenance/support owner
is **pending**; assign one before any pilot. Use repository issues for
non-sensitive defects with sanitized reproduction steps; use the
[security policy](../../SECURITY.md) for security reports. Never attach tokens,
raw source excerpts, principal headers, customer identifiers, or unredacted logs.

## Setup and variables matrix

Run commands from the repository root using Node.js >=22.14.0 and pnpm 10.34.5.
Use this patched pnpm version rather than 10.33.0 for safe setup.
`pnpm install --frozen-lockfile && pnpm dev` is sufficient for the development
dashboard; no environment file or external service is required.

| Path / purpose                                    | Variables                                                                                                                                                          | Required services / notes                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Default development dashboard                     | None                                                                                                                                                               | Built-in 12-repository fixture; no Azure, Docker, database, or AI                                            |
| Optional web configuration: `apps/web/.env.local` | `PUBLIC_DASHBOARD`, `DEV_AUTH_DISABLED`                                                                                                                            | Next.js loads this app-local file; restart after changes                                                     |
| Local sign-in gate                                | `PUBLIC_DASHBOARD=false` **and** `DEV_AUTH_DISABLED=false`                                                                                                         | Denies anonymous data access; not a full Entra deployment                                                    |
| Production authenticated gate                     | `PUBLIC_DASHBOARD=false`, trusted `EASY_AUTH_ENABLED=true`, `ALLOWED_TENANT_IDS`, `ENTRA_CLIENT_ID`                                                                | Platform Easy Auth plus approved tenant/issuer/audience/expiry checks                                        |
| Collector: explicitly loaded root `.env`          | `GITHUB_ORGANIZATION` (defaults to `bcgov`), optional `GITHUB_TOKEN` or `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET`, optional `LOCAL_OUTPUT_DIRECTORY` | Public GitHub network access; no source writes; output directory enables retained local manifests            |
| Evidence persistence                              | `AZURE_STORAGE_ACCOUNT_NAME`; local only: `AZURE_STORAGE_BLOB_ENDPOINT`, `AZURE_STORAGE_KEY`                                                                       | Managed identity in Azure; configured Azurite locally. Without an account collector uses an in-memory writer |
| Single-repository scanner CLI                     | `REPOSITORY_JSON`, `REPOSITORY_COMMIT_SHA`, `SCAN_OUTPUT`, optional `DATASET_VERSION`                                                                              | Contract-valid repository JSON and immutable commit; git/network; output must not already exist              |
| Batch scanner                                     | `AZURE_STORAGE_ACCOUNT_NAME`, optional `SCAN_PLAN_JSON` or `SCAN_PLAN_BLOB`                                                                                        | Storage plus scan plan; container entrypoint differs from the single-repository CLI                          |
| Synthesis                                         | `AZURE_AI_PROJECT_ENDPOINT`, `AZURE_AI_MODEL`, optional `AZURE_AI_MODEL_VERSION`                                                                                   | Authorized Foundry endpoint/identity; not needed for dashboard                                               |
| Local synthesis bundle                            | `EVIDENCE_BUNDLE_JSON`, `DOSSIER_OUTPUT` plus synthesis variables                                                                                                  | A real bounded/redacted evidence bundle, not the illustrative demo JSON                                      |
| Batch synthesis                                   | `AZURE_STORAGE_ACCOUNT_NAME`, optional `SCAN_PLAN_JSON` plus synthesis variables                                                                                   | Stored scan summaries/artifacts; inspect failed scan coverage                                                |
| Optional database/bootstrap path                  | `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, optional `PGPOOL_MAX`; local only `PGPASSWORD`                                                                         | PostgreSQL; production managed identity. Dashboard remains fixture-backed                                    |
| Optional telemetry                                | `APPLICATIONINSIGHTS_CONNECTION_STRING`                                                                                                                            | Never log repository source or secrets                                                                       |

Do not copy example tenant IDs into an approved pilot allowlist. For cloud-only
deployment variables and mode-specific checks, see
[production deployment](production-deployment.md).

### Environment loading for jobs

The root `.env` is **not automatically loaded** by the existing job scripts.
Node >=22.14 supports `--env-file`; explicitly load it before the TypeScript
entrypoint. The workspace packages already depend on `tsx`.

```bash
cp .env.example .env
# Edit .env for the selected job; do not commit it.
ROOT="$PWD"
pnpm --filter @git-insights/collector exec node --env-file="$ROOT/.env" --import tsx src/index.ts
```

Analogous commands, only after configuring their required inputs:

```bash
ROOT="$PWD"
pnpm --filter @git-insights/scanner exec node --env-file="$ROOT/.env" --import tsx src/cli.ts
pnpm --filter @git-insights/synthesizer exec node --env-file="$ROOT/.env" --import tsx src/index.ts
```

These processes can contact GitHub/Azure; they are not needed for a demo.
Existing shell environment variables override `--env-file` values. The offline
synthetic sample is workshop material, not scanner or synthesis job input.

### Optional local services

Only start services when exercising their adapters, not for the dashboard:

```bash
docker compose up -d
```

Postgres is on `127.0.0.1:5433` and Azurite Blob on `127.0.0.1:10000`.
For the local database set `PGHOST=127.0.0.1`, `PGPORT=5433`,
`PGUSER=gitinsights`, `PGDATABASE=gitinsights`, and `PGPASSWORD=localdev`.
For Azurite set `AZURE_STORAGE_ACCOUNT_NAME=devstoreaccount1`,
`AZURE_STORAGE_BLOB_ENDPOINT=http://127.0.0.1:10000`, and its documented
development `AZURE_STORAGE_KEY`. These password/key overrides are ignored
when `NODE_ENV=production`.

Create the storage containers against the explicit local Blob endpoint,
matching `infra/modules/storage.bicep`:

```bash
for container in raw control manifests artifacts evidence analysis exports; do
  az storage container create --name "$container" \
    --account-name devstoreaccount1 \
    --account-key "$AZURE_STORAGE_KEY" \
    --blob-endpoint http://127.0.0.1:10000/devstoreaccount1
done
```

Export the local development key in that shell first; this Azure CLI invocation
does not read `.env`. Stop with `docker compose down`; use
`docker compose down -v` only when intentionally deleting local evidence/database
volumes. Never use these development credentials in cloud deployments.

## Scheduling and failure handling

Bicep schedules metadata daily at 02:00 UTC, scanning Sunday at 03:00 UTC, and
synthesis Monday at 02:00 UTC when `ENABLE_SCHEDULED_JOBS=true`; otherwise jobs
are manual. These are independent schedules, **not completion dependencies**.
Use Azure Container Apps job start for manual runs. The repository's manual
deployment workflow provisions resources; it is not a job-orchestration workflow.

Operators should:

- Respect GitHub `Retry-After`/rate-limit reset and configured retry budgets.
- Inspect repository-level errors and scan/synthesis summaries.
- Never treat a mutable `current/*` pointer alone as evidence of completeness;
  partial scan summaries may be published before a job exits unsuccessfully.
- Preserve immutable artifacts; do not replace an existing evidence/output path.
- Retry only known failed work after checking idempotency and dataset lineage.
- Do not assume transactional checkpoints, automatic resumability, or dashboard
  error exposure have been integrated. The fixture UI does not show live jobs.

## Troubleshooting

| Symptom                                                | Check / action                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gate still bypassed after disabling dev auth           | Set `PUBLIC_DASHBOARD=false` too; it is evaluated first. Check inherited shell variables and restart Next.js                                                                                                                                                                        |
| Root `.env` changes do not affect UI                   | Use `apps/web/.env.local`; root `.env` belongs to explicitly invoked jobs                                                                                                                                                                                                           |
| Job reports missing variables                          | Use Node `--env-file` with an absolute path; confirm variable names and exported-shell overrides without printing secrets                                                                                                                                                           |
| Job ran but dashboard is unchanged                     | Expected: dashboard imports fixture data, not job artifacts/PostgreSQL                                                                                                                                                                                                              |
| Collector output disappears                            | Without configured storage it uses memory; configure approved persistence or `LOCAL_OUTPUT_DIRECTORY` before running                                                                                                                                                                |
| Storage/database connection fails                      | Check optional services, ports 10000/5433, local credentials, and container existence; production ignores local password/key overrides                                                                                                                                              |
| Scanner output already exists                          | `SCAN_OUTPUT` is write-once; choose a new dataset/output path rather than overwriting evidence                                                                                                                                                                                      |
| 401/403 or sign-in loop in pilot                       | Check selected access mode, platform auth, tenant consent/allowlist, issuer/audience/expiry, and secret bindings; do not weaken the gate                                                                                                                                            |
| Foundry unavailable or quota denied                    | Keep the fixture demo independent; stop synthesis retries, confirm model/region/capacity and cost approval before retrying                                                                                                                                                          |
| Validation and deployment plans differ                 | Review the `PUBLIC_DASHBOARD` parameter parity gap documented in deployment guidance                                                                                                                                                                                                |
| Build attempts an external Google Fonts download       | The dashboard now uses system fonts; check that the obsolete `next/font/google` import has not been reintroduced. No font service is required                                                                                                                                       |
| Install follows inaccessible private-feed tarball URLs | Packaging repaired the lockfile using pnpm 10.34.5 with `--fix-lockfile --force --registry=https://registry.npmjs.org`, preserving dependency versions. Use the committed lockfile and normal frozen install; do not hand-edit tarball URLs or routinely bypass the frozen lockfile |

For escalation include commit SHA, tool versions, selected mode, sanitized error,
dataset/scan IDs, UTC timestamp, and reproduction steps. Clearly distinguish
fixture behavior from unverified cloud integration.

## Release readiness checklist

### Verification record and limits

During this packaging pass, local lint, typecheck, tests, and application build
passed after removing an unnecessary Google Fonts import and repairing
private-feed lockfile tarball locations. The dashboard uses system fonts.
Dependency versions were preserved by the lockfile repair; pnpm itself was
separately upgraded to patched 10.34.5.

The packaging contributor also checked the local production server at
`http://127.0.0.1:3001` with Chrome 155: 12 fixture rows, HTTP 200 API responses,
and no runtime errors were reported. This is a local browser check, not an
independent human rehearsal, live cloud identity check, or deployed service.

Historical main commit `bdd4601` has successful
[CI run 32805264093](https://github.com/VeVarunSharma/BC-Gov-Git-Insights/actions/runs/32805264093)
and
[image publication run 32805264086](https://github.com/VeVarunSharma/BC-Gov-Git-Insights/actions/runs/32805264086).
These are historical results, not checks of the current changes. No deployment
workflow run is recorded; the last infrastructure compile is from an older
commit, not this packaging pass. Human rehearsal, browser/media verification,
and cloud validation remain separate pending gates.

### Local demonstration gate

- [ ] Install and run on Node >=22.14.0 / pnpm 10.34.5 without credentials/services.
- [ ] Check all displayed scores/groupings remain clearly synthetic and candidate-only.
- [ ] Check README, script, worksheet, evidence example, and offline sample agree.
- [ ] Verify every published media link exists; retain captions, dataset version,
      commit SHA, capture date, and accessibility notes.
- [ ] Record an independent human five-/fifteen-minute rehearsal and handoff;
      do not mark complete based only on automated checks.
- [x] Record local lint, typecheck, test, and application-build success reported
      for this packaging pass. Formatting is handled separately; current CI and
      infrastructure validation are not implied.
- [x] Record the packaging contributor's local production-server browser/API
      check; independent handoff and media playback checks remain pending.

### Pilot/cloud gate — separate authorization required

- [ ] Name maintenance, security, deployment, data, and cost owners; agree support
      expectations (no SLA is supplied by this repository).
- [ ] Obtain account-owner authorization, scope, tenant consent, region/policy,
      quota, budget recipients, retention, expiry, and teardown approval.
- [ ] Review immutable image provenance and parameter-matched what-if, including
      the validation workflow's public-mode parity gap.
- [ ] Verify selected access mode, denial paths if authenticated, trusted headers,
      managed-identity RBAC, redaction, and telemetry.
- [ ] Verify any claimed end-to-end ingestion/read-model integration rather than
      presenting fixture responses as live findings.
- [ ] Exercise manual jobs, partial failures, recovery, absent AI, rollback, and
      evidence lineage before enabling schedules.
- [ ] Verify HTTPS endpoint, cost monitoring, rollback/teardown evidence, and
      named operational handoff before describing the pilot as deployed.

### Catalog/publication gate

- [ ] Confirm the intended catalog URL is accessible and obtain its real schema.
      The proposed catalog currently returns 404; `accelerator.yaml` is provisional.
- [ ] Validate metadata against that schema and complete the catalog's actual
      submission/review process; do not imply acceptance.
