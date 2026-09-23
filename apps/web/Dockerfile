# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Vaani web image (multi-stage). Builds the Vite SPA and serves the static bundle
# with nginx, which also reverse-proxies /api → the API service (the SPA calls the
# API same-origin, so cookies flow without CORS). No secrets are baked in.
# Build context is the REPO ROOT: `docker build -f apps/web/Dockerfile .`
# ─────────────────────────────────────────────────────────────────────────────

# ── build: install workspace + produce the static SPA bundle ─────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/types/package.json packages/types/
COPY packages/ai/package.json packages/ai/
COPY packages/meeting/package.json packages/meeting/
COPY packages/config/package.json packages/config/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci

COPY packages ./packages
COPY apps/web ./apps/web
RUN npm run build --workspace @vaani/web

# ── runtime: nginx serving the static bundle + /api reverse proxy ────────────
FROM nginx:1.27-alpine AS runner
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
# nginx runs in the foreground (its base image sets the right CMD).
