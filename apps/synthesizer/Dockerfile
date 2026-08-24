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
RUN pnpm --filter @git-insights/synthesizer --prod deploy /out

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production
WORKDIR /app
RUN useradd --create-home --uid 10001 appuser

COPY --from=builder --chown=appuser:appuser /out ./

USER appuser
CMD ["./node_modules/.bin/tsx", "src/index.ts"]
