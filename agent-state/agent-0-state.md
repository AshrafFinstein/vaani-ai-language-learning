# Agent 0 — Lead / Coordinator

## Role
Master coordinator. Assigns work, validates outputs, prevents duplicate implementation,
maintains architecture, gates phase transitions, integrates feature branches into `develop`.

## Authoritative status
See `docs/PHASE_MAP.md` for the full phase↔repo mapping. Summary as of 2026-09-22:

- ✅ P3 Foundation (auth, shell, dashboard, profile, nav) — done, `feature/phase-2-dashboard-profile`.
- ✅ P4 AI Chat — done, `feature/phase-3-ai-chat` (f40f72f).
- ✅ P5 Roleplay + P6 Learning modes (core) — done, `feature/phase-4-5-modes` (ec53c5d).
- ✅ P7 Voice + Meeting Intelligence — complete, integrated into develop.
  - P7A Voice: STT/TTS + Call page voice conversation done (mic/speaker device picker deferred).
  - P7B Meeting Intelligence: done (mock; real Teams/AVD capture deferred).
- ✅ P8 Advanced AI modes (characters, debate, photo w/ mock vision, scenarios) — done, integrated.
- ✅ P9 Courses (catalog, modules, lessons, exercises, progress, AI learning path) — done, integrated.
- ✅ P1/P2 docs — delivered (research from `/reference/` screenshots; architecture from codebase).
- `develop` integrates P1–P9; gate green: 115 tests.

## Gate (must all exit 0, re-run independently)
`npm run typecheck` · `npm run lint` · `npm run test`

## Integration ledger
| Branch | Phases | Gate verified | Integrated into develop |
| ------ | ------ | ------------- | ----------------------- |
| feature/phase-2-dashboard-profile (103c3fa) | P3 | ✅ typecheck+lint+18 tests | via ec53c5d lineage |
| feature/phase-3-ai-chat (f40f72f) | P4 | ✅ | yes (ancestor of ec53c5d) |
| feature/phase-4-5-modes (ec53c5d) | P5,P6,P7A | ✅ typecheck+lint+41 tests | ✅ develop = ec53c5d |
| feature/phase-7b-meeting-intelligence (fa554c4) | P7B | ✅ typecheck+lint+60 tests | ✅ develop = fa554c4 |
| feature/phase-8-advanced-modes | P8 | ✅ typecheck+lint+94 tests | ✅ merged into develop |
| feature/phase-9-courses (5413a48) + P1/P2 docs | P9,P1,P2 | ✅ typecheck+lint+115 tests | ✅ merged into develop |

## Open coordination notes
- A background agent owns worktree `.claude/worktrees/phase-3` on `feature/phase-4-5-modes`; it
  committed + pushed ec53c5d. Coordinate before operating in that worktree.
- CORRECTION: the ec53c5d lineage did NOT include the full Phase 2 Profile page; a background
  agent correctly merged `feature/phase-2-dashboard-profile` into develop as `0421ec5`. So that
  branch was NOT redundant — it filled a real gap. It is now integrated.
- A background agent operates in worktree `.claude/worktrees/phase-3` and has pushed to `develop`
  independently (ec53c5d, 0421ec5). Coordinate on `develop` to avoid races.

## Next actions
1. P9 Courses: catalog, lessons, modules, exercises, progress.
2. Backfill P1/P2 docs (needs `/reference/` assets from the user).
3. Later phase: real Teams/AVD capture + STT/diarization behind the `@vaani/meeting` abstraction.
4. Housekeeping: retire redundant `feature/phase-2-dashboard-profile` (superseded by develop lineage).
