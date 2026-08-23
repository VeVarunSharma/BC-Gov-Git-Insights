# Operations runbook

## Scheduled work

- metadata refresh: daily
- changed-repository deep scan: weekly
- Foundry synthesis of complete scan datasets: weekly after scanning
- manual runs: Azure Container Apps Job start or protected GitHub workflow

Jobs publish repository-level checkpoints. A dataset becomes current only after
all required tasks finish or are explicitly recorded as failed.

## Required bootstrap

Before deployment:

1. confirm the Azure subscription and Canada Central quotas
2. register a multitenant Entra web application
3. register a project-owned GitHub OAuth App
4. provision infrastructure through the protected deployment workflow
5. set GitHub and Entra secrets in Key Vault
6. bind Container App secret references
7. run the manual `caj-gitinsights-dbbootstrap` job to apply migrations and
   grant the web identity read-only PostgreSQL access
8. enable Microsoft tenant access and test denial paths
9. enable BC Gov and Alberta tenant IDs only after consent testing
10. select a supported Foundry model/version and confirm capacity
11. set `ENABLE_SCHEDULED_JOBS=true` only after a manual metadata, scan, and
    synthesis cycle succeeds

## Failure handling

- respect GitHub `Retry-After` and rate-limit reset headers
- stop after the configured retry budget
- keep partial job output non-current
- resume at repository boundaries
- never replace an immutable artifact path
- expose scan errors and evidence coverage in the dashboard

## Deployment

Pull requests compile Bicep but do not access Azure. Manual infrastructure
validation performs a protected OIDC what-if. Manual deployment runs what-if
again before applying the subscription template.

Deployment is not authorized until `.azure/deployment-plan.md` is marked
`Ready for Validation` and the `azure-validate` workflow is complete.
