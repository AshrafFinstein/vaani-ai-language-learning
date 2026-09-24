# Phase Map — master plan ↔ repo reconciliation

The v2 master plan renumbers phases and adds a Meeting Intelligence module. This table is the
**authoritative** mapping between the master-plan phase numbers, the repo's original
`IMPLEMENTATION_PLAN.md` numbers, and actual status. Agent 0 keeps it current.

_Last updated: 2026-09-23._

| Master | Agent | Scope | Repo (old) | Status | Branch / commit |
| ------ | ----- | ----- | ---------- | ------ | --------------- |
| P1 | 1 | Product research docs (`REFERENCE_ANALYSIS`, `PRODUCT_FEATURES`, `PAGE_MAP`, `USER_FLOWS`) | pre-work | ✅ Done (from `/reference/` screenshots + built app) | on develop |
| P2 | 2 | Architecture docs (`ARCHITECTURE`, `DATABASE_DESIGN`, `API_DESIGN`, `AI_ARCHITECTURE`, `SECURITY_ARCHITECTURE`) | pre-work | ✅ Done (derived from codebase) | on develop |
| P3 | 3 | UI/Foundation: shell, auth, sidebar, routing, dashboard, profile, settings | Ph 1 + 2 | ✅ Done | `feature/phase-2-dashboard-profile` 103c3fa (pushed) |
| P4 | 4 | AI Chat: streaming, history, persistence, provider abstraction, sessions | Ph 3 | ✅ Done | `feature/phase-3-ai-chat` f40f72f (pushed) |
| P5 | 5 | Roleplay: scenarios, characters, feedback, session history | Ph 4 | ✅ Done | `feature/phase-4-5-modes` ec53c5d (pushed) |
| P6 | 6 | Learning modes: word/sentence/dialogue/vocab/grammar/speaking | Ph 4 | ✅ Done (core) | `feature/phase-4-5-modes` ec53c5d |
| P7A | 7 | Voice: STT/TTS, voice conversation, recording controls (mic/speaker device selection deferred) | Ph 5 | ✅ Done (device picker deferred to real-capture phase) | `feature/phase-4-5-modes` |
| P7B | 7 | **Meeting Intelligence** (Teams/AVD): schedule, recording, transcription, participant/speaker detection, summary, decisions, action items, privacy | — (NEW) | ✅ Done (mock; real capture deferred) | `feature/phase-7b-meeting-intelligence` fa554c4 → develop |
| P8 | 8 | Advanced AI modes: photo, debate, characters, scenarios | Ph 6 | ✅ Done (mock vision) | `feature/phase-8-advanced-modes` → develop |
| P9 | 9 | Courses: catalog, lessons, modules, exercises, progress | Ph 7 | ✅ Done | `feature/phase-9-courses` → develop |
| P10 | 10 | Progress + analytics: real activity tracking, streaks, level/XP, weekly series, daily feedback, achievements | Ph 8 | ✅ Done (real data; mock removed) | `feature/phase-10-progress` → develop |
| P11–12 | 11 | QA / security / deployment: AuthZ/consent/audit tests, AuditLog, data-deletion, Dockerfiles, prod compose, GitHub Actions CI, deploy docs | Ph 10 | ✅ Done | `feature/phase-11-12-qa-deploy` → develop |
| — | — | **Extra modules** (Talkpal gap): Flashcards (decks + SR review + AI gen), Explore (daily picks) | — | ✅ Done | `feature/flashcards-explore` → develop |

Notes:
- **Production AI/speech wired (opt-in):** real OpenAI text provider (hardened: timeouts, retries,
  fallback) + real Whisper STT / OpenAI TTS behind the existing abstractions, selected by env
  (`AI_PROVIDER`/`SPEECH_PROVIDER`=openai + `OPENAI_API_KEY`). Mock remains the default so the suite
  runs offline. Keys live only in local `.env` (never committed). Live Teams/AVD capture still deferred.
- Repo old-Phase 9 (Subscriptions/usage limits) is not in the master plan; treat as optional/deferred.
- ✅ **ALL PHASES COMPLETE (P1–P12)** on `develop` + Flashcards/Explore + real AI/speech.
  Integration gate green: typecheck + lint + **330 tests** + build (plus a CI `migrations` job:
  migrate deploy + schema-drift check + idempotent seed on real Postgres). E2E is a separate `npm run e2e`.
- `develop` integrates P1/P2 docs, P3–P12 features (Phase 2 profile merged as `0421ec5`).
- **Gap-analysis fixes (2026-09-23):** web client now auto-refreshes expired access tokens (users
  were silently logged out after 15 min); refresh rotation is atomic with reuse detection; login
  timing no longer leaks account existence; `language` module gets a service (layering rule 6); CI
  validates migrations against a real DB; README brought up to date.
- Remaining/later work (not roadmap phases): password reset (forgot-password is still a stub), live Teams/AVD meeting capture (consent + env validation),
  voice mic/speaker device selection, a distinct server-side CALL activity kind, TLS/ingress, and
  centralized log/metric shipping. Optional: old-Phase 9 Subscriptions/usage limits.
