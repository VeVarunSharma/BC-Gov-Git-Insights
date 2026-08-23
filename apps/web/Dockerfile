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
RUN pnpm --filter @git-insights/web build
RUN pnpm --filter @git-insights/web --prod deploy /out

FROM node:22-bookworm-slim AS runner

ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app
RUN useradd --create-home --uid 10001 appuser

COPY --from=builder --chown=appuser:appuser /out ./
COPY --from=builder --chown=appuser:appuser /workspace/apps/web/.next ./.next
COPY --from=builder --chown=appuser:appuser /workspace/apps/web/public ./public

USER appuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["./node_modules/.bin/next", "start", "--hostname", "0.0.0.0"]
