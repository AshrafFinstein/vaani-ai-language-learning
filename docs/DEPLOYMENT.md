# Deployment — Vaani AI

_Last updated: 2026-09-23. Author: Agent 11 (QA/Security/Deployment)._

How to build, ship, run, and operate Vaani AI. The stack is three containers:
**web** (nginx serving the Vite SPA + reverse-proxying `/api`), **api** (Express,
run via `tsx`), and **db** (PostgreSQL 16). No secrets are baked into images — all
config is supplied via environment at runtime.

## Artifacts

| File | Purpose |
| ---- | ------- |
| `apps/api/Dockerfile` | Multi-stage API image. Installs the workspace, generates the Prisma client, runs `tsx apps/api/src/index.ts` as a non-root user. |
| `apps/web/Dockerfile` | Multi-stage web image. Builds the SPA (`vite build`), serves `dist/` via nginx. |
| `apps/web/nginx.conf` | Static serving + SPA history fallback + `/api` reverse proxy to the API + basic hardening headers. |
| `.dockerignore` | Keeps the build context lean and secret-free (excludes `.env`, `node_modules`, `.git`, docs, agent state). |
| `docker-compose.yml` | **Dev** DB only (Postgres on host port 5433). Unchanged. |
| `docker-compose.prod.yml` | **Prod** web + api + db, healthchecks, restart policies, env-file placeholders. |
| `.github/workflows/ci.yml` | CI gate (typecheck · lint · test · build) on push/PR; a non-blocking E2E job on manual/nightly. |

## Configuration & secrets

- Copy `.env.example` → `.env.prod` and fill in **real** values. **Never commit it.**
- Required secrets: `POSTGRES_PASSWORD`, `JWT_SECRET` (≥16 chars — generate with
  `openssl rand -hex 32`). `OPENAI_API_KEY` only if `AI_PROVIDER=openai`.
- The API validates env at boot and **fails fast** on misconfiguration (`env.ts`).
- Default AI/speech providers are the offline **Mock**; real OpenAI is strictly opt-in.

## Build & run (production compose)

```bash
# 1. Build + start web + api + db
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# 2. Apply DB migrations once the db is healthy (idempotent)
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  run --rm api npx prisma migrate deploy --schema prisma/schema.prisma

# 3. (Optional) seed baseline content (languages, courses, characters, decks, …)
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  run --rm api npx tsx prisma/seed.ts

# 4. Verify
curl -f http://localhost/api/health   # liveness  → {"data":{"status":"ok"}}
curl -f http://localhost/api/ready     # readiness → 200 when DB reachable, else 503
```

The SPA is served at `http://localhost/` (or `WEB_PORT`); it calls the API
same-origin via nginx's `/api` proxy, so cookies flow without CORS.

## Health, readiness & ops

- **`GET /api/health`** — liveness; dependency-free. Used by the container healthcheck.
- **`GET /api/ready`** — readiness; runs `SELECT 1` against Postgres, returns **503**
  when the DB is unreachable so load balancers hold traffic until recovery.
- **Structured request logging** (`middleware/request-logger.ts`) — one line per
  request (method, path, status, duration). JSON in production; skipped for
  health/ready probes and under `NODE_ENV=test`. Never logs bodies, cookies, or tokens.
- **Graceful shutdown** (`index.ts`) — on `SIGINT`/`SIGTERM` the server stops
  accepting connections, drains in-flight requests, then disconnects Prisma.
- **Error handling** — the central handler returns the canonical envelope and never
  leaks stack traces/internals in production (`middleware/error-handler.ts`).

## Backups & retention (Postgres)

```bash
# Backup (compressed custom format)
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  exec db pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" > vaani-$(date +%F).dump

# Restore into a fresh DB
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  exec -T db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean < vaani-YYYY-MM-DD.dump
```

Schedule `pg_dump` (e.g. nightly cron) and retain per your policy. **Retention of
user data** is a product concern: meeting recording/transcript metadata honors the
per-user `MeetingSettings.retentionDays` (default 30) and can be deleted on demand via
`DELETE /api/meetings/:id/recording` and `DELETE /api/meetings/:id/transcript`
(ownership-checked, audited). See `docs/SECURITY_ARCHITECTURE.md`.

## E2E (not part of the deploy gate)

E2E is a separate `npm run e2e` (Playwright), never in the default `npm run test`
gate. It needs the full stack:

```bash
npm run db:up            # Postgres
npm run db:deploy        # apply migrations
npm run dev              # API :4000 + web :5173
npm run e2e              # Playwright happy-path (in a second shell)
```

## CI

`.github/workflows/ci.yml` runs the exact offline gate on push/PR (Node 20, npm
cache): `npm ci` → `db:generate` → `typecheck` → `lint` → `test` → `build`. A
separate, `continue-on-error` **E2E** job runs only on manual dispatch / schedule so
it never blocks a PR.

## Deferred

- TLS termination / a real ingress (nginx here listens on plain HTTP; front it with a
  TLS-terminating proxy or platform load balancer in production).
- Live Teams/AVD meeting capture (still deferred per `CLAUDE.md` §14).
- Centralized log/metric shipping and alerting (structured logs are emitted; wiring a
  collector is environment-specific).
