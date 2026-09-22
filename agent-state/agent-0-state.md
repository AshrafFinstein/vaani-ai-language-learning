# Agent 0 — Lead / Coordinator

## Role
Master coordinator. Assigns work, validates outputs, prevents duplicate implementation,
maintains architecture, gates phase transitions, integrates feature branches into `develop`.

## Authoritative status
See `docs/PHASE_MAP.md` for the full phase↔repo mapping. Summary as of 2026-09-22:

- ✅ P3 Foundation (auth, shell, dashboard, profile, nav) — done, `feature/phase-2-dashboard-profile`.
- ✅ P4 AI Chat — done, `feature/phase-3-ai-chat` (f40f72f).
- ✅ P5 Roleplay + P6 Learning modes (core) — done, `feature/phase-4-5-modes` (ec53c5d).
- 🔨 P7A Voice — scaffolded (Web Speech hooks, Call page).
- ✅ P7B Meeting Intelligence — done (mock; real capture deferred), integrated into develop.
- ⚠️ P1/P2 research + architecture docs — partial; `/reference/` assets missing.
- `develop` integration branch at fa554c4 (integrates P3–P7B; gate green: 60 tests).

## Gate (must all exit 0, re-run independently)
`npm run typecheck` · `npm run lint` · `npm run test`

## Integration ledger
| Branch | Phases | Gate verified | Integrated into develop |
| ------ | ------ | ------------- | ----------------------- |
| feature/phase-2-dashboard-profile (103c3fa) | P3 | ✅ typecheck+lint+18 tests | via ec53c5d lineage |
| feature/phase-3-ai-chat (f40f72f) | P4 | ✅ | yes (ancestor of ec53c5d) |
| feature/phase-4-5-modes (ec53c5d) | P5,P6,P7A | ✅ typecheck+lint+41 tests | ✅ develop = ec53c5d |
| feature/phase-7b-meeting-intelligence (fa554c4) | P7B | ✅ typecheck+lint+60 tests | ✅ develop = fa554c4 |

## Open coordination notes
- A background agent owns worktree `.claude/worktrees/phase-3` on `feature/phase-4-5-modes`; it
  committed + pushed ec53c5d. Coordinate before operating in that worktree.
- Two independent P3 (phase-2) implementations exist (103c3fa and the copy inside f40f72f). The
  ec53c5d lineage is canonical; 103c3fa is redundant and can be retired.

## Next actions
1. P8 Advanced AI modes: photo, debate, characters.
2. Backfill P1/P2 docs (needs `/reference/` assets from the user).
3. Later phase: real Teams/AVD capture + STT/diarization behind the `@vaani/meeting` abstraction.
4. Housekeeping: retire redundant `feature/phase-2-dashboard-profile` (superseded by develop lineage).
