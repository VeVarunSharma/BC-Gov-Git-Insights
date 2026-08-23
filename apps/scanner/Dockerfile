FROM node:22-bookworm-slim AS builder

ARG NPM_REGISTRY=https://registry.npmjs.org/
WORKDIR /workspace
RUN npm install --global pnpm@10.33.0 \
  --registry="${NPM_REGISTRY}" \
  --fetch-retries=5 \
  --fetch-retry-mintimeout=1000 \
  && pnpm config set registry "${NPM_REGISTRY}"

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @git-insights/scanner --prod deploy /out

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production
ENV GIT_CONFIG_NOSYSTEM=1
ENV GIT_LFS_SKIP_SMUDGE=1
ENV GIT_TERMINAL_PROMPT=0

WORKDIR /app
RUN apt-get update \
  && apt-get install --yes --no-install-recommends ca-certificates git \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --create-home --uid 10001 appuser

COPY --from=builder --chown=appuser:appuser /out ./

USER appuser
CMD ["./node_modules/.bin/tsx", "src/job.ts"]
