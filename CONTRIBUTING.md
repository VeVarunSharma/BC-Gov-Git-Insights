# Contributing

Thank you for helping improve BC Gov OpenGit Ministry.

## Development workflow

1. Create a focused branch.
2. Keep source-organization access read-only.
3. Add or update tests for changed contracts, scanners, metrics, or UI behavior.
4. Run the repository quality checks from `README.md`.
5. Explain changes to data lineage, scoring, security, or AI behavior in the
   pull request.

## Data and fixtures

Do not commit:

- cloned BC Gov repositories
- private or sensitive scan output
- access tokens or client secrets
- raw AI prompts containing repository source
- unredacted secret-scanner output

Tests should use synthetic fixtures or small files whose license permits
redistribution.

## Findings and AI output

Every persisted finding must retain an immutable commit SHA, engine/model
version, evidence IDs, confidence, and source URL. AI output without evidence is
not accepted as a finding.
