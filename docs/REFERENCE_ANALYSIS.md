# Reference Analysis — Product Patterns for AI Language-Learning Apps

_Last updated: 2026-09-22. Author: Agent 1 (Product Research)._

> **Scope & disclaimer.** This document is an **original pattern analysis** of two reference
> screenshots of a third-party language-learning application (a Progress page and a Home /
> learning-modes page). It exists **only** to help the team understand common, industry-standard
> product conventions for this category of app. It intentionally contains **no copied text,
> branding, imagery, layout markup, or proprietary content** from that app. Every observation is
> re-expressed in our own words as a generic pattern. Nothing here prescribes reproducing that
> app; it informs how Vaani AI's own, original UI is reasoned about. See `CLAUDE.md` §10/§26.

## Why this analysis exists

Vaani AI is an original product, but the "AI conversation tutor" category has settled on a set of
well-understood UX conventions that users already expect. Cataloguing those conventions as neutral
patterns lets us (a) avoid re-inventing basic navigation, and (b) make deliberate choices about
where Vaani AI matches expectations versus where it differs (e.g. our Meeting Intelligence module,
which the reference category does not have).

---

## Pattern 1 — Persistent left navigation with grouped destinations

**Observed generically:** a slim, always-present left sidebar collapses the whole product into a
short list of top-level destinations (a home/dashboard, a "learn"/practice area, a courses area,
an explore/browse area, a progress area, and an account entry pinned near the bottom). Icons pair
with short text labels; the active destination is visually highlighted.

**Takeaway for Vaani AI:** our shell already follows this convention (`config/nav.ts` defines
grouped nav sections: Overview, Practice, Meetings, Learn, Progress, Account). Two divergences are
intentional and original to us:
- Vaani AI groups **more** practice surfaces (Chat, Roleplay, Call, Dialogue, Sentence, Word,
  Photo, Debate, Characters) because conversation practice is our core.
- Vaani AI adds a **Meetings** group that has no analogue in the reference category.

## Pattern 2 — Dashboard/home as a launchpad of "mode" cards

**Observed generically:** the home surface presents each practice activity as a distinct card with
an illustration, a title, and a one-line explanation of what the mode does (chat with a tutor,
practise a real-life scenario, learn vocabulary from decks, do an audio-only conversation, etc.).
A subset of cards may carry a "new" marker. A secondary column surfaces the learner's current
level, streak information, and an entry point to feedback.

**Takeaway for Vaani AI:** a card-per-mode launcher is the right home pattern. Our dashboard uses
quick-action cards for the same purpose (`mock/dashboard.ts` → `quickActions`). Card copy in Vaani
AI is authored fresh ("AI Chat", "Roleplay", "Call", "Photo Practice", "Debate", …) and is not
lifted from the reference.

## Pattern 3 — Level as a first-class, visible signal

**Observed generically:** the learner's current proficiency level is shown prominently on both the
home and progress surfaces (e.g. a numeric or banded "Level N" tile with a progress bar toward the
next level). It functions as a motivational anchor and a difficulty selector.

**Takeaway for Vaani AI:** we model level as a CEFR-aligned enum
(`BEGINNER → ELEMENTARY → INTERMEDIATE → UPPER_INTERMEDIATE → ADVANCED`, see `common.ts`) rather
than an opaque number. The dashboard renders a level tile and an XP-to-next-level bar
(`mockDashboard.level`, `xp`, `xpToNext`). Level is also a real input to AI difficulty in every
practice mode (it feeds `ChatOptions.level` and the prompt builders' level guidance).

## Pattern 4 — A dedicated Progress/analytics surface built from stat tiles + a time chart

**Observed generically:** a progress page aggregates learning into (a) a row/column of **stat
tiles** (total practice time, average session time, number of sessions/days studied, a
score-out-of-total), (b) a **practice-time trend chart** with range toggles (e.g. last 7 days /
last 28 days / all time), (c) the current **level** tile, and (d) an entry to per-day/"daily"
feedback. Streak counters (current + longest) appear alongside.

**Takeaway for Vaani AI:** this is the blueprint for our planned Progress + analytics phase (P10,
currently not started). The building blocks map cleanly onto data we already record:
- `PracticeSession` rows (kind, `startedAt`/`endedAt`, `durationSeconds`) → total time, average
  time, session count, per-day trend.
- The `LearningLevel` enum → the level tile.
- Per-conversation AI feedback (`AIFeedback`, `DebateFeedback`, `SentenceEvaluation`) → the
  "daily feedback" entry point.
- Streaks and skill radar are currently **mock-only** (`mock/dashboard.ts`) and become real when
  P10 lands the analytics endpoints. The current dashboard chart (`WeeklyChart.tsx`) is a preview
  of the real time-series chart the Progress page will host.

## Pattern 5 — Streaks and daily-goal reinforcement

**Observed generically:** a current-streak and a longest-streak counter, plus a daily-feedback /
daily-goal call-to-action, are used to drive habitual return visits.

**Takeaway for Vaani AI:** we already carry a `dailyGoalMinutes` on the `Profile` (default 30) and
surface streak/daily-goal UI on the dashboard (mock today). Making streaks real is P10 work — it
derives from the distinct calendar days on which a `PracticeSession` exists.

## Pattern 6 — Courses/guided-curriculum as a separate track from free practice

**Observed generically:** alongside open-ended practice modes, a structured **Courses** track
offers a guided curriculum (browse a catalogue, follow a level-appropriate path). It is presented
as a distinct destination from ad-hoc practice.

**Takeaway for Vaani AI:** Courses is a planned phase (P9, not started). Nav entries already exist
under the **Learn** group (Courses, Vocabulary, Grammar, Pronunciation) and currently render the
shared "Coming soon" page. The data model for courses is intentionally **not** yet in Prisma to
avoid speculative tables (see `IMPLEMENTATION_PLAN.md` "Future phase notes").

---

## Where Vaani AI deliberately diverges from the reference category

| Aspect | Reference-category convention | Vaani AI's original position |
| ------ | ----------------------------- | ---------------------------- |
| Core loop | Chat + curriculum courses | Chat **plus** a wide bank of conversation modes (Roleplay, Call, Dialogue, Sentence, Word, Photo, Debate, Characters) |
| Meetings | Not present | A first-class **Meeting Intelligence** module (schedule → consent-gated recording → transcript → summary/decisions/action-items) |
| Level model | Opaque numeric level | CEFR-aligned banded enum that actually drives AI difficulty |
| Feedback | Daily feedback digest | Structured, schema-validated per-session feedback (corrections, vocab, pronunciation, scores) surfaced inline per mode |
| Privacy | N/A for the category | Explicit consent/retention model for meeting recording (`CLAUDE.md` §13–15) |

## Related docs
- Feature catalogue → [`PRODUCT_FEATURES.md`](./PRODUCT_FEATURES.md)
- Route inventory → [`PAGE_MAP.md`](./PAGE_MAP.md)
- Journeys → [`USER_FLOWS.md`](./USER_FLOWS.md)
