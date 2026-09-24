# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Vaani API image (multi-stage). The API runs TypeScript directly via `tsx`, and
# the workspace packages (@vaani/types, @vaani/ai, @vaani/meeting) are consumed as
# source, so the runtime image ships the sources + node_modules + generated Prisma
# client. No secrets are baked in — all config is provided via env at runtime.
# Build context is the REPO ROOT: `docker build -f apps/api/Dockerfile .`
# ─────────────────────────────────────────────────────────────────────────────

# ── deps: install the full workspace (monorepo) once ─────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
# Manifests first for better layer caching.
COPY package.json package-lock.json ./
COPY packages/types/package.json packages/types/
COPY packages/ai/package.json packages/ai/
COPY packages/meeting/package.json packages/meeting/
COPY packages/config/package.json packages/config/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# Full install so the Prisma CLI is available to generate the client.
RUN npm ci

# ── build: generate the Prisma client against the schema ─────────────────────
FROM deps AS build
WORKDIR /app
# openssl lets Prisma detect the right engine (linux-musl-openssl-3.0.x on Alpine).
RUN apk add --no-cache openssl
COPY prisma ./prisma
RUN npx prisma generate --schema prisma/schema.prisma

# ── runner: lean runtime with prod deps + sources + generated client ─────────
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
# Prisma's query engine needs the OpenSSL 3 runtime lib (libssl.so.3).
RUN apk add --no-cache openssl

# Bring node_modules (incl. the generated @prisma/client) from the build stage.
COPY --from=build /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY packages ./packages
COPY apps/api ./apps/api
# Root tsconfig that the workspace tsconfigs extend (tsx reads it at runtime).
COPY tsconfig.base.json ./

# Run as the built-in non-root user.
USER node

EXPOSE 4000
# Prisma migrations are applied at deploy time (see docker-compose.prod.yml / DEPLOYMENT.md),
# not baked here. Start the API via tsx (no separate JS build step).
CMD ["npx", "tsx", "apps/api/src/index.ts"]
