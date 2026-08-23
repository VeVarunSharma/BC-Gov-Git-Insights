# Dashboard

The dashboard is a full-stack Next.js application designed for Azure Container
Apps. It renders an authenticated portfolio overview, evidence-backed repository
table, confidence-aware ministry and portfolio insights, rule-explained attention
and capability-reuse views, Agentic Workflow recommendations, and a React Flow
estate map.

During local development, authentication is bypassed unless
`DEV_AUTH_DISABLED=false`. Production requests must include the validated Azure
Container Apps authentication principal header and pass the configured tenant
allowlist.

Run from the repository root:

```bash
pnpm dev
```

The unauthenticated health endpoint is `/healthz`.
