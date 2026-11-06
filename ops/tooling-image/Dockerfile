# syntax=docker/dockerfile:1

# Release-tooling image for Azure Container Apps JOBS (legal-release installer,
# runtime-grant probes). It carries a full clean git clone so the installer can
# verify sourceHead and a clean tree. It is never an app image: jobs pass the
# command, and the installer refuses to run in an app replica.
# Build context is a staging dir: clean clone in src/ (including .git) plus this
# Dockerfile and .dockerignore at the staging root. See README.md.

FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app
COPY src/ /app/

# corepack reads the pinned packageManager from /app/package.json.
RUN corepack enable
RUN pnpm install --frozen-lockfile
RUN git config --global --add safe.directory /app

ENV NODE_ENV=production
ENV APP_ENV=production

# Fail the build if the tree is dirty (node_modules is gitignored).
RUN git -C /app status --porcelain | (! grep .)
