# Cloud Deployment — Vaani AI (VPS + HTTPS)

Deploy the whole stack (web + api + Postgres) to a single Linux server with automatic
HTTPS. This builds on [`DEPLOYMENT.md`](./DEPLOYMENT.md) (which was validated locally)
and adds a **Caddy** reverse proxy for TLS.

```
Internet ──▶ Caddy (:443, auto Let's Encrypt) ──▶ web (nginx, SPA + /api proxy)
                                                        └─▶ api (Express) ──▶ db (Postgres)
```

## 0. Prerequisites
- A **Linux server** (Ubuntu 22.04+, ≥ 2 GB RAM recommended — the web build needs memory).
- A **domain name** you control.
- Ports **80** and **443** open to the internet (firewall / security group).
- **Docker Engine + Compose v2** (≥ 2.24 for the TLS overlay's `!reset`).

## 1. Point DNS at the server
Create a DNS **A record**: `vaani.example.com → <server public IP>`. Wait for it to
resolve (`ping vaani.example.com`) before requesting certificates.

## 2. Install Docker (on the server)
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # then log out/in
docker version && docker compose version
```

## 3. Get the code + configure
```bash
git clone https://github.com/AshrafFinstein/vaani-ai-language-learning.git
cd vaani-ai-language-learning
git checkout main        # or the release branch you deploy from

cp .env.prod.example .env.prod
nano .env.prod           # fill in the values below
```
In `.env.prod` set **real** values:
- `POSTGRES_PASSWORD` — a strong DB password.
- `JWT_SECRET` — 32+ random chars (`openssl rand -base64 48`).
- `DOMAIN` = `vaani.example.com`, `TLS_EMAIL` = your email, `CORS_ORIGIN` = `https://vaani.example.com`.
- For real AI: `AI_PROVIDER=openai`, `OPENAI_API_KEY=sk-…` (and `SPEECH_PROVIDER=openai` for voice).
  Leave as `mock` to run without a key.

## 4. Deploy (with automatic HTTPS)
```bash
docker compose -f docker-compose.prod.yml -f docker-compose.tls.yml \
  --env-file .env.prod up -d --build
```
Caddy provisions a Let's Encrypt certificate for `DOMAIN` on first start (needs ports
80/443 reachable + DNS resolving). Check progress with `docker compose ... logs -f caddy`.

## 5. Apply migrations (once, and after any schema change)
```bash
docker compose -f docker-compose.prod.yml -f docker-compose.tls.yml \
  --env-file .env.prod run --rm api npx prisma migrate deploy --schema prisma/schema.prisma
```
Optional — seed baseline content (languages, courses, characters, decks):
```bash
docker compose -f docker-compose.prod.yml -f docker-compose.tls.yml \
  --env-file .env.prod run --rm api npx tsx prisma/seed.ts
```

## 6. Verify
- Open **https://vaani.example.com** — the app loads over HTTPS.
- `curl -fsS https://vaani.example.com/api/health` → `{"data":{"status":"ok"}}`.
- Register an account in the UI; confirm it persists.

## 7. Updates (new version)
```bash
git pull
docker compose -f docker-compose.prod.yml -f docker-compose.tls.yml \
  --env-file .env.prod up -d --build
# then re-run migrations (step 5) if the schema changed
```

## 8. Backups (Postgres)
```bash
# Backup (compressed custom format)
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T db \
  pg_dump -U vaani -d vaani -Fc > vaani-$(date +%F).dump
# Restore into a fresh DB
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T db \
  pg_restore -U vaani -d vaani --clean --if-exists < vaani-YYYY-MM-DD.dump
```
Automate with a cron job; store dumps off-server. Retention for meeting recordings/
transcripts is enforced in-app via `MeetingSettings.retentionDays`.

## 9. Operations
- Logs: `docker compose -f docker-compose.prod.yml -f docker-compose.tls.yml --env-file .env.prod logs -f api`
- Stop: `… down`   ·   Restart one service: `… restart api`
- Health: api `GET /api/health` (liveness) + `GET /api/ready` (DB check); the web + db
  have compose healthchecks; Caddy retries cert issuance automatically.

## 10. Hardening checklist
- [ ] Strong, unique `JWT_SECRET` + `POSTGRES_PASSWORD` (never the example values).
- [ ] `.env.prod` is `chmod 600` and never committed.
- [ ] Only 80/443 exposed publicly (api/db stay on the internal Docker network).
- [ ] OS + Docker kept updated; unattended-upgrades enabled.
- [ ] Off-server, encrypted DB backups on a schedule.
- [ ] (Optional) a managed Postgres instead of the compose `db` for HA/backups.

## Deferred / not included
Real Teams/AVD meeting **capture**, horizontal scaling / multi-node orchestration
(Kubernetes), and centralized log/metric shipping (e.g. Loki/Prometheus) are out of
scope for this single-server setup.
