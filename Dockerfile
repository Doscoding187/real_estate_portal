# syntax=docker/dockerfile:1

# Azure Container Apps image for the API. The frontend stays on Vercel; this
# image runs the API only (SKIP_FRONTEND=true). Configuration comes from
# environment variables (Azure Key Vault refs); no .env is baked in.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV APP_ENV=production
ENV SKIP_FRONTEND=true
ENV PORT=5000
RUN groupadd --system app && useradd --system --gid app --no-create-home app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY shared ./shared
COPY server ./server
COPY drizzle ./drizzle
COPY docs/database-authority ./docs/database-authority
COPY data/place-url-projection-national-v0.1.json ./data/place-url-projection-national-v0.1.json
RUN chown -R app:app /app
USER app
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--import", "tsx", "server/_core/start.ts"]
