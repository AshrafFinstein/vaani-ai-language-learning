# Vaani AI

An original, AI-powered language-learning platform. Practice speaking, listening, reading,
writing, pronunciation, grammar, vocabulary, and real-world conversations with an AI tutor.

> Vaani AI is an original product. It is inspired by the _category_ of AI language tutors but
> does not copy any proprietary source code, assets, branding, or visual designs.

## Tech stack

- **Frontend:** React + TypeScript + Vite, Tailwind CSS, shadcn/ui, React Router, TanStack Query, Zustand, Lucide
- **Backend:** Node.js + TypeScript + Express (REST)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** email/password + JWT (httpOnly cookie) sessions
- **AI/Speech:** provider-abstracted (Mock provider by default; OpenAI-compatible interface)

## Monorepo layout

```
apps/
  web/     React front-end
  api/     Express back-end
packages/
  types/   shared Zod schemas + TypeScript types
  ai/      AI / speech provider abstractions (Mock default, OpenAI opt-in)
  meeting/ Meeting Intelligence: calendar, capture, transcript analysis
  config/  shared TS/ESLint presets
prisma/    schema, migrations, seed
docs/      architecture & implementation plan
```

## Prerequisites

- Node.js >= 20
- Docker (for the local PostgreSQL container) — or a local PostgreSQL you point `DATABASE_URL` at

## Getting started

```bash
# 1. Install dependencies (all workspaces)
npm install

# 2. Configure environment
cp .env.example .env        # then edit as needed

# 3. Start the database
npm run db:up               # docker compose up -d  (Postgres on host port 5433)

# 4. Apply schema + seed reference data (languages)
npm run db:generate
npm run db:migrate
npm run db:seed

# 5. Run the app (web + api together)
npm run dev
# web  -> http://localhost:5173
# api  -> http://localhost:4000
```

## Useful scripts

| Script              | Description                                  |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Run web + api in parallel                    |
| `npm run build`     | Build all packages and apps                  |
| `npm run test`      | Run meeting + api + web test suites          |
| `npm run typecheck` | Type-check every workspace                   |
| `npm run lint`      | Lint the monorepo                            |
| `npm run db:up`     | Start the Postgres container                 |
| `npm run db:migrate`| Run Prisma migrations                        |
| `npm run db:seed`   | Seed reference data                          |

## Project status

All roadmap phases (P1–P12) are implemented on `develop`: auth, AI chat, roleplay and learning
modes, voice, Meeting Intelligence, characters/debate/photo, courses, flashcards, Explore, progress
analytics, and QA/security/deployment. Live Teams/AVD capture and password reset are still deferred.
See [`docs/PHASE_MAP.md`](docs/PHASE_MAP.md) for current status and
[`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for the original roadmap.
