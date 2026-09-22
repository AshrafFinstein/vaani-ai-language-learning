# Phase Map — master plan ↔ repo reconciliation

The v2 master plan renumbers phases and adds a Meeting Intelligence module. This table is the
**authoritative** mapping between the master-plan phase numbers, the repo's original
`IMPLEMENTATION_PLAN.md` numbers, and actual status. Agent 0 keeps it current.

_Last updated: 2026-09-22._

| Master | Agent | Scope | Repo (old) | Status | Branch / commit |
| ------ | ----- | ----- | ---------- | ------ | --------------- |
| P1 | 1 | Product research docs (`REFERENCE_ANALYSIS`, `PRODUCT_FEATURES`, `PAGE_MAP`, `USER_FLOWS`) | pre-work | ⚠️ Partial — needs `/reference/` assets | — |
| P2 | 2 | Architecture docs (`ARCHITECTURE`✅, `DATABASE_DESIGN`, `API_DESIGN`, `AI_ARCHITECTURE`, `SECURITY_ARCHITECTURE`) | pre-work | ⚠️ Partial | — |
| P3 | 3 | UI/Foundation: shell, auth, sidebar, routing, dashboard, profile, settings | Ph 1 + 2 | ✅ Done | `feature/phase-2-dashboard-profile` 103c3fa (pushed) |
| P4 | 4 | AI Chat: streaming, history, persistence, provider abstraction, sessions | Ph 3 | ✅ Done | `feature/phase-3-ai-chat` f40f72f (pushed) |
| P5 | 5 | Roleplay: scenarios, characters, feedback, session history | Ph 4 | ✅ Done | `feature/phase-4-5-modes` ec53c5d (pushed) |
| P6 | 6 | Learning modes: word/sentence/dialogue/vocab/grammar/speaking | Ph 4 | ✅ Done (core) | `feature/phase-4-5-modes` ec53c5d |
| P7A | 7 | Voice: STT/TTS, voice conversation, recording controls (mic/speaker device selection deferred) | Ph 5 | ✅ Done (device picker deferred to real-capture phase) | `feature/phase-4-5-modes` |
| P7B | 7 | **Meeting Intelligence** (Teams/AVD): schedule, recording, transcription, participant/speaker detection, summary, decisions, action items, privacy | — (NEW) | ✅ Done (mock; real capture deferred) | `feature/phase-7b-meeting-intelligence` fa554c4 → develop |
| P8 | 8 | Advanced AI modes: photo, debate, characters, scenarios | Ph 6 | ✅ Done (mock vision) | `feature/phase-8-advanced-modes` → develop |
| P9 | 9 | Courses: catalog, lessons, modules, exercises, progress | Ph 7 | ✅ Done (feature branch; gate green) | `feature/phase-9-courses` |
| P10 | 10 | Progress + analytics (incl. meeting analytics) | Ph 8 | ❌ Not started | — |
| P11–12 | 11 | QA / security / deployment | Ph 10 | ❌ Not started | — |

Notes:
- Repo old-Phase 9 (Subscriptions/usage limits) is not in the master plan; treat as optional/deferred.
- `develop` is the integration branch integrating **P3–P8** (incl. the Phase 2 profile work merged
  in as `0421ec5`); integration gate green: typecheck + lint + 94 tests.
- Next buildable work: **P9 Courses** (catalog, lessons, modules, exercises) and completing
  **P1/P2 docs** (needs `/reference/` assets). Real Teams/AVD capture remains a later phase.
