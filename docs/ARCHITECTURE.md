# Vaani AI — Architecture

## Overview

Vaani AI is a full-stack TypeScript monorepo. A React SPA (`apps/web`) talks to an Express REST
API (`apps/api`) over HTTP (cookie-based auth). The API persists to PostgreSQL through Prisma.
AI and speech capabilities are accessed exclusively through provider abstractions so the
underlying vendor can be swapped without touching feature code.

```
┌────────────┐      HTTPS / JSON        ┌────────────┐      Prisma      ┌────────────┐
│  apps/web  │  ───────────────────▶    │  apps/api  │  ─────────────▶  │ PostgreSQL │
│  (React)   │  ◀───────────────────    │ (Express)  │  ◀─────────────  │            │
└────────────┘   httpOnly cookie JWT     └─────┬──────┘                  └────────────┘
                                               │
                                    ┌──────────┴───────────┐
                                    │   packages/ai        │
                                    │  AIProvider / STT /  │
                                    │  TTS abstractions    │
                                    └──────────────────────┘
```

## Workspaces

| Package           | Responsibility                                                             |
| ----------------- | -------------------------------------------------------------------------- |
| `@vaani/web`      | React SPA: routing, UI, state, API client                                  |
| `@vaani/api`      | Express REST API: auth, business logic, persistence                        |
| `@vaani/types`    | Shared Zod schemas + inferred types (DTOs, API envelope, AI feedback)      |
| `@vaani/ai`       | AI / speech provider abstractions (Mock, OpenAI-compatible stubs)          |
| `@vaani/config`   | Shared TS / ESLint presets                                                 |

The single source of truth for request/response shapes is `@vaani/types` — imported by both the
web and api workspaces so the contract cannot drift.

## Provider abstraction (critical rule)

The app is **never** coupled to a single AI vendor. Feature code depends on interfaces:

```
AIProvider                 SpeechToTextProvider        TextToSpeechProvider
├── MockAIProvider         ├── MockSttProvider         ├── MockTtsProvider
├── OpenAIProvider         └── (future)                └── (future)
└── (future)
```

A factory reads `AI_PROVIDER` from the environment and returns the correct implementation.
Development and tests default to the Mock providers (deterministic, no network, no keys).
**AI API keys exist only on the backend** and are never shipped to the browser.

## Backend layering

```
route  ->  controller  ->  service  ->  prisma
```

- **routes** — wire HTTP verbs/paths to controllers; attach validation + auth middleware.
- **controllers** — translate HTTP ↔ domain; no business rules.
- **services** — business logic (auth, tokens, etc.); the only layer that touches Prisma.
- **middleware** — `helmet`, CORS (credentialed), rate limiting, Zod validation, auth guard,
  and a central error handler that maps errors to 400/401/403/404/409/422/429/500 and never
  leaks stack traces in production.

## Authentication

- Passwords hashed with `bcrypt`.
- On login/register the API issues a short-lived **access JWT** and a long-lived **refresh
  token**, both delivered as `httpOnly`, `SameSite=Lax` cookies. Refresh tokens are persisted
  in the `Session` table (hashed) so they can be revoked on logout.
- Protected routes require a valid access token; `GET /api/user/me` hydrates the client.
- Google OAuth, email verification, and password reset are **stubbed** in Phase 1 with clear
  TODOs (endpoints exist and return `202`, but do not yet send email / exchange OAuth codes).

## Frontend architecture

- **Routing:** React Router with a `<ProtectedRoute>` guard around the authenticated app shell.
- **Server state:** TanStack Query (auth mutations, `me` query, languages query).
- **Client state:** Zustand `authStore` (current user, hydration status) + a theme store.
- **UI:** Tailwind design tokens (indigo→violet brand) + locally-vendored shadcn/ui primitives.
  Dark/light theme via a class-based theme provider.
- **Responsiveness:** desktop = sidebar + content; tablet = collapsible sidebar; mobile = bottom
  navigation + drawer. Target widths: 1440 / 1280 / 1024 / 768 / 390 / 375. No horizontal overflow.

## Data model (Phase 1)

Active models: `User`, `Profile`, `Language`, `UserLanguage`, `Session`. The remaining domain
models from the product spec (Conversation, Roleplay, Course, Progress, Vocabulary, …) are
documented in `IMPLEMENTATION_PLAN.md` and introduced in their respective phases to avoid
speculative, unused tables.

## Security posture

Environment-based secrets, bcrypt hashing, httpOnly cookies, rate limiting on auth routes, CORS
allow-list, Zod input validation, Prisma parameterized queries (SQL-injection safe), `helmet`
secure headers, and no stack-trace/secret leakage in production responses.

## Deviations from the original spec

- `packages/ui` is deferred: shadcn primitives live under `apps/web/src/components/ui` during
  Phase 1 (shadcn is co-location-friendly). They are promotable to a shared `packages/ui` once a
  second consumer appears.
