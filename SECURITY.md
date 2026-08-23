# Security Policy

## Reporting a vulnerability

Do not open a public issue containing exploit details, secret values, or
proof-of-concept payloads. Contact the repository maintainers privately through
the security reporting mechanism configured for this repository.

Include:

- affected component and version
- defensive impact description
- minimal reproduction information
- suggested mitigation when known

## Security boundaries

The project must never write to analyzed source organizations. Scanner output
must redact secret values before storage, telemetry, prompts, API responses, or
exports. The authenticated dashboard may show defensive severity and file/line
evidence, but not weaponization guidance.
