# Threat model

## Protected assets

- GitHub OAuth and Entra application secrets
- authenticated dashboard data
- normalized security findings
- repository and capability relationships
- Foundry prompts, responses, and evaluation records
- Azure identities and deployment permissions

## Principal threats

### Prompt injection from repositories

Repository text is always delimited as untrusted evidence. Batch inference has
no tools and uses a strict JSON schema. Claims require evidence IDs.

### Executing hostile repository content

The scanner uses immutable shallow fetches, disables hooks, LFS smudging,
submodules, local file transport, and interactive credentials. It never runs
repository build, install, test, or deployment commands.

### Secret amplification

Secret values are removed before persistence, logs, AI input, API output, and
exports. The UI provides defensive file/line location but no exploit payload.

### Cross-tenant authorization mistakes

Production requests are authenticated by Entra and rechecked server-side. The
application validates issuer, audience, expiry, object ID, and exact `tid`
allowlisting. Email domains are not trusted for authorization.

In v1 this path is bypassed by `PUBLIC_DASHBOARD=true`, which serves an
anonymous read-only viewer. The validation code and its tests remain in place so
protection is restored by unsetting a single variable.

### Source-organization mutation

The GitHub integration exposes GET-only REST behavior and anonymous read-only
git. Tests verify no write method exists. All GitHub Actions run in this
repository.

## Accepted proof-of-concept tradeoffs

- public authenticated Azure service endpoints instead of private endpoints
- an unauthenticated dashboard (`PUBLIC_DASHBOARD=true`). v1 serves only public
  repository metadata and derived scores, which are already public on
  github.com. This is only acceptable while no security findings reach the UI:
  an aggregated, severity-ranked view of unremediated weaknesses across bcgov
  repositories is sensitive in aggregate even though each repository is public.
  Unset `PUBLIC_DASHBOARD` before surfacing `findingSchema` data.
- a dedicated bootstrap database administrator that requires a controlled
  post-provision role-grant step
- LRS evidence storage
- single region and no database high availability
- dashboard cold starts

These choices require review before production.
