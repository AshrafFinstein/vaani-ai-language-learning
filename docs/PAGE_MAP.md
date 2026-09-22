# Page Map — Vaani AI Web Routes

_Last updated: 2026-09-22. Author: Agent 1 (Product Research)._

Every route in the web app, derived from `apps/web/src/App.tsx` and `apps/web/src/config/nav.ts`.
"Ready" reflects the `ready` flag in `nav.ts` and whether the route renders a real feature vs. the
shared **Coming soon** page. Authenticated routes live under `/app` behind `<ProtectedRoute>`
(`components/ProtectedRoute.tsx`), which redirects unauthenticated users to `/login`.

## Public routes

| Path | Component | Auth | Notes |
| ---- | --------- | ---- | ----- |
| `/` | `pages/public/Landing.tsx` | Public | Marketing landing |
| `/login` | `pages/public/Login.tsx` | Public | |
| `/register` | `pages/public/Register.tsx` | Public | |
| `/forgot-password` | `pages/public/ForgotPassword.tsx` | Public | Backend is a stub (202) |
| `/features` | `pages/public/MarketingPlaceholder.tsx` | Public | Placeholder |
| `/pricing` | `MarketingPlaceholder` | Public | Placeholder |
| `/about` | `MarketingPlaceholder` | Public | Placeholder |
| `/terms` | `MarketingPlaceholder` | Public | Placeholder |
| `/privacy` | `MarketingPlaceholder` | Public | Placeholder |
| `*` (unmatched) | — | Public | Redirects to `/` |

## Authenticated routes (`/app`, protected, rendered inside `AppShell`)

| Path | Component | Nav group | Ready | Notes |
| ---- | --------- | --------- | ----- | ----- |
| `/app` | → redirect | — | ✅ | Redirects to `/app/dashboard` |
| `/app/dashboard` | `pages/app/Dashboard.tsx` | Overview | ✅ | Mock data |
| `/app/chat`, `/app/chat/:id` | `pages/app/Chat.tsx` | Practice | ✅ | AI Chat |
| `/app/roleplay`, `/app/roleplay/:id` | `pages/app/Roleplay.tsx` | Practice | ✅ | |
| `/app/dialogue`, `/app/dialogue/:id` | `pages/app/Dialogue.tsx` | Practice | ✅ | |
| `/app/sentence` | `pages/app/Sentence.tsx` | Practice | ✅ | |
| `/app/word` | `pages/app/Word.tsx` | Practice | ✅ | |
| `/app/call` | `pages/app/Call.tsx` | Practice | ✅ | Browser STT/TTS |
| `/app/photo`, `/app/photo/:id` | `pages/app/Photo.tsx` | Practice | ✅ | Mock vision |
| `/app/debate`, `/app/debate/:id` | `pages/app/Debate.tsx` | Practice | ✅ | |
| `/app/characters`, `/app/characters/:id` | `pages/app/Characters.tsx` | Practice | ✅ | |
| `/app/meetings` | `pages/app/Meetings.tsx` | Meetings | ✅ | Mock pipeline |
| `/app/meetings/schedule` | `pages/app/MeetingSchedule.tsx` | Meetings | ✅ | |
| `/app/meetings/:id` | `pages/app/MeetingDetail.tsx` | Meetings | ✅ | |
| `/app/profile` | `pages/app/Profile.tsx` | Account | ✅ | |
| `/app/settings` | → redirect | — | ✅ | Redirects to `/app/profile` |
| `/app/courses` | `pages/app/ComingSoon.tsx` | Learn | ⏳ | Coming soon (P9) |
| `/app/vocabulary` | `ComingSoon` | Learn | ⏳ | Coming soon (P9) |
| `/app/grammar` | `ComingSoon` | Learn | ⏳ | Coming soon (P9) |
| `/app/pronunciation` | `ComingSoon` | Learn | ⏳ | Coming soon (P9) |
| `/app/progress` | `ComingSoon` | Progress ("Statistics") | ⏳ | Coming soon (P10) |
| `/app/history` | `ComingSoon` | Progress | ⏳ | Coming soon (P10) |
| `/app/achievements` | `ComingSoon` | Progress | ⏳ | Coming soon (P10) |
| `/app/subscription` | `ComingSoon` | — (no nav link) | ⏳ | Coming soon (optional) |
| `/app/help` | `ComingSoon` | — (no nav link) | ⏳ | Coming soon |

Coming-soon routes are enumerated in `App.tsx`'s `COMING_SOON` array:
`courses, vocabulary, grammar, pronunciation, progress, history, achievements, subscription, help`.

## Navigation structure (`config/nav.ts`)

Sidebar groups and items (items without a `ready: true` flag that point at coming-soon routes still
render "Coming soon" — the flag only controls sidebar affordance):

- **Overview:** Dashboard `ready`
- **Practice:** AI Chat, Roleplay, Call, Dialogue, Sentence, Word, Photo `ready`, Debate `ready`,
  Characters `ready`
- **Meetings:** Meetings `ready`
- **Learn:** Courses, Vocabulary, Grammar, Pronunciation (all coming-soon)
- **Progress:** Statistics (`/app/progress`), History, Achievements (all coming-soon)
- **Account:** Profile `ready`

**Mobile bottom nav** (`MOBILE_NAV`): Home (`/app/dashboard`), Chat, Courses, Profile.

> Note: several **Practice** items (AI Chat, Roleplay, Call, Dialogue, Sentence, Word) are fully
> built even though they lack a `ready: true` flag in `nav.ts`. The flag is used inconsistently —
> the authoritative "is this built?" signal is whether `App.tsx` maps the path to a real page
> component or to `ComingSoonPage`. This mismatch is flagged for cleanup (see report).

## Layout shell

`components/layout/AppShell.tsx` composes: `Sidebar` (+ `SidebarNav`), `TopBar` (+ `UserMenu`,
`LanguageSwitcher`, theme toggle), and `MobileNav` for small screens. The auth pages use
`AuthLayout.tsx`.

## Related docs
- [`PRODUCT_FEATURES.md`](./PRODUCT_FEATURES.md) · [`USER_FLOWS.md`](./USER_FLOWS.md) ·
  [`API_DESIGN.md`](./API_DESIGN.md)
