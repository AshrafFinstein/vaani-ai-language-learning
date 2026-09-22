# CLAUDE.md — Master rules for all Vaani AI agents

This is the root contract every agent (human or AI) reads **before** starting work.
Vaani AI is an original AI language-learning platform **plus** a Meeting Intelligence
module for Teams/AVD meetings. It is built in gated phases by a multi-agent model with
a Lead/Coordinator (Agent 0).

## Start-of-work checklist
1. Read this `CLAUDE.md`.
2. Read `docs/PHASE_MAP.md` (phase↔repo reconciliation and current status).
3. Read your own `agent-state/agent-N-state.md` and Agent 0's `agent-0-state.md`.
4. Read the relevant docs in `docs/` before modifying code.

## Core rules
1. Do **not** start a new phase until Agent 0 confirms the previous phase is complete.
2. Do **not** change the overall architecture without Coordinator approval.
3. Follow the **existing** project structure. Do not restructure wholesale. New top-level
   packages (`packages/meeting`, `apps/worker`) are added only when their phase begins.
4. Do **not** overwrite or duplicate another agent's work. Check existing branches/worktrees first.
5. `@vaani/types` is the single source of truth for request/response shapes (Zod schema + inferred type).
6. Backend layering is strict: `route → controller → service → prisma`. Only services touch Prisma.
7. AI/speech is accessed **only** through the `@vaani/ai` provider abstractions. AI keys live on
   the backend, never in the browser.
8. No speculative Prisma models/tables — add a model only with the feature that uses it.
9. Write tests for new functionality. Never weaken/skip tests to go green.
10. Do not commit secrets. Do not copy proprietary Talkpal code/assets; reference material is for
    understanding product behaviour and UI patterns only.
11. Update `docs/` after architectural changes; update your `agent-state` file after completing work.
12. Preserve backward compatibility whenever possible.

## Meeting Intelligence rules (Phase 7B)
13. Meeting recording must be **user-visible** and authorization/consent aware. Show a clear
    recording indicator. Respect Teams/AVD/OS/org recording & consent policies.
14. Do **not** implement covert/hidden recording or a generic hidden desktop recorder. Capture
    only the authorized meeting source supported by the environment.
15. Never invent meeting participants, owners, deadlines, decisions, or action items that the
    transcript does not support. Use `Owner: Unassigned` / `Due Date: Not specified` when absent.

## The gate (definition of "phase complete")
A phase is complete only when, from the repo root, all three exit 0:
```
npm run typecheck
npm run lint
npm run test
```
The Coordinator re-runs the gate **independently** — an agent's self-report is not trusted.

## Branch flow
```
main  ←  develop  ←  feature/phase-N-<slug>
```
Agents work on `feature/*` branches. Coordinator reviews + gates, then integrates into `develop`.
`main` is release-only. No agent pushes directly to `main`.
```
Agent → feature branch → tests → Coordinator review → develop → integration tests → main
```
