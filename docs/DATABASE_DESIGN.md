# Database Design — Vaani AI

_Last updated: 2026-09-22. Author: Agent 2 (Architecture)._

Documents every Prisma model and enum in `prisma/schema.prisma` (PostgreSQL). Models are
introduced **with the phase that first uses them** — there are no speculative tables
(`CLAUDE.md` §8). The "Phase" column below is the master-plan phase; see [`PHASE_MAP.md`](./PHASE_MAP.md).

## ER overview (text)

```
User 1───1 Profile
User 1───* Session                 (hashed refresh tokens)
User 1───* UserLanguage *───1 Language
User 1───1 MeetingSettings

User 1───* Conversation *───1 Language
                 │   *───? AICharacter        (CHARACTER mode)
                 └── 1───* ConversationMessage
User 1───* PracticeSession ?───1 Conversation

User 1───* Meeting
   Meeting 1───* MeetingParticipant
   Meeting 1───1 RecordingSession
   Meeting 1───1 Transcript 1───* TranscriptSegment
   Meeting 1───1 MeetingSummary
   Meeting 1───* MeetingDecision
   Meeting 1───* ActionItem

User 1───* Debate 1───* DebateMessage
User 1───* PhotoSession 1───* PhotoMessage
Language 1───* Profile (learningLanguage)
```

Cascade behaviour: deleting a `User` cascades to their Profile, Sessions, UserLanguages,
Conversations, PracticeSessions, Meetings, MeetingSettings, Debates, PhotoSessions. Deleting a
parent (`Conversation`, `Meeting`, `Debate`, `PhotoSession`, `Transcript`) cascades to its child
rows. `Conversation.character` is `SetNull` on character delete; `PracticeSession.conversation` is
`SetNull` on conversation delete.

---

## Enums

| Enum | Values | Phase |
| ---- | ------ | ----- |
| `Role` | USER, ADMIN | P3 |
| `LearningLevel` | BEGINNER, ELEMENTARY, INTERMEDIATE, UPPER_INTERMEDIATE, ADVANCED | P3 |
| `ThemePreference` | LIGHT, DARK, SYSTEM | P3 |
| `ConversationTopic` | DAILY, TRAVEL, JOB_INTERVIEW, WORKPLACE, SHOPPING, RESTAURANT, FRIENDS, TECHNOLOGY, FREE | P4 |
| `MessageRole` | USER, ASSISTANT | P4 |
| `ConversationMode` | CHAT, ROLEPLAY, DIALOGUE, CHARACTER, SCENARIO | P4/P5/P8 |
| `PracticeKind` | CHAT, ROLEPLAY, CALL, DIALOGUE, SENTENCE, WORD, PHOTO, DEBATE, CHARACTER, SCENARIO | P4+ |
| `DebateSide` | FOR, AGAINST | P8 |
| `DebateStatus` | ACTIVE, CLOSED | P8 |
| `MeetingProvider` | TEAMS, AVD, OTHER | P7B |
| `RecordingState` | IDLE, RECORDING, PAUSED, STOPPED | P7B |
| `MeetingAnalysisStatus` | PENDING, PROCESSING, COMPLETED, FAILED | P7B |
| `ActionItemStatus` | OPEN, IN_PROGRESS, DONE, BLOCKED | P7B |
| `ActionItemPriority` | LOW, MEDIUM, HIGH | P7B |
| `FlashcardResult` | AGAIN, GOOD, EASY | Flashcards |
| `ActivityKind` | CHAT, ROLEPLAY, CALL, DIALOGUE, WORD, SENTENCE, FLASHCARD, COURSE, DEBATE, PHOTO, CHARACTER, SCENARIO, MEETING | P10 |

---

## Models

### User (P3)
Core account. Fields: `id` (cuid), `email` (unique, indexed), `passwordHash`, `name`, `avatarUrl?`,
`role` (default USER), `createdAt`, `updatedAt`. Relations: `profile?`, `sessions[]`,
`userLanguages[]`, `conversations[]`, `practiceSessions[]`, `meetings[]`, `meetingSettings?`,
`debates[]`, `photoSessions[]`. The password hash is never exposed in any DTO.

### Profile (P3)
1-1 with User (`userId` unique). Fields: `learningLanguageCode?` (FK → Language, nullable until
onboarding), `nativeLanguageCode?`, `level` (default BEGINNER), `dailyGoalMinutes` (default 30),
`theme` (default SYSTEM), `timezone?`, timestamps. Indexed on `learningLanguageCode`.

### Language (P3)
Reference table keyed by `code` (e.g. "en"). Fields: `name`, `nativeName`, `flagEmoji`, `rtl`
(default false), `isActive` (default true), `createdAt`. Seed loads 11 languages (en, es, fr, de,
it, pt, ja, ko, zh, hi, ta). Related to Profiles (learning language), UserLanguages, Conversations.

### UserLanguage (P3)
Languages a user is actively learning. `userId`+`languageCode` (both FK), `level` (default
BEGINNER), `isPrimary` (default false), timestamps. `@@unique([userId, languageCode])`, indexed on
`userId`.

### Session (P3)
Persisted refresh sessions. `userId` (FK), `refreshTokenHash` (unique — SHA-256 of the opaque
token, so a DB leak cannot reuse tokens), `userAgent?`, `ipAddress?`, `expiresAt`, `revokedAt?`
(set on logout/rotation), `createdAt`. Indexed on `userId`.

### Conversation (P4; extended P5/P8)
An AI chat/roleplay/dialogue/character/scenario conversation. `userId`, `languageCode` (FK),
`mode` (default CHAT), `topic` (default FREE), `scenarioKey?` (roleplay/dialogue/scenario),
`characterId?` (FK → AICharacter, CHARACTER mode), `level`, `title`, timestamps. Relations:
`messages[]`, `practiceSessions[]`. Indexes: `userId`, `[userId, updatedAt]`, `characterId`.

### ConversationMessage (P4)
`conversationId` (FK, cascade), `role` (USER/ASSISTANT), `content` (Text), `createdAt`. Indexed on
`[conversationId, createdAt]`.

### PracticeSession (P4; aggregated P10)
Records that a practice activity happened. `userId` (FK), `kind` (PracticeKind), `conversationId?`
(FK, SetNull), `startedAt`, `endedAt?`, `durationSeconds` (default 0), `createdAt`. Indexed on
`[userId, createdAt]`. Created on every practice start; the Progress phase (P10) will aggregate it.

### Meeting (P7B)
A scheduled meeting. `userId` (FK), `title`, `provider` (default TEAMS), `scheduledStart`,
`scheduledEnd`, `recordingEnabled`/`transcriptionEnabled` (default false), `aiAnalysisEnabled`
(default true), `analysisStatus` (default PENDING), timestamps. Relations: `participants[]`,
`recording?` (1-1), `transcript?` (1-1), `summary?` (1-1), `decisions[]`, `actionItems[]`. Indexes:
`userId`, `[userId, scheduledStart]`.

### MeetingParticipant (P7B)
`meetingId` (FK, cascade), `name`, `email?`, `role?`, `speakerLabel?` (ties a participant to
transcript segments; assigned deterministically at schedule time, e.g. "Speaker 1"). The analyzer
references these but **never invents** new participants. Indexed on `meetingId`.

### RecordingSession (P7B)
Consent-gated recording lifecycle — **state only, no real capture**. `meetingId` (unique, FK
cascade), `state` (default IDLE), `recordingConsent` (default false), `transcriptConsent` (default
false), `startedAt?`, `endedAt?`, `durationSeconds` (default 0), timestamps. A session cannot enter
RECORDING without `recordingConsent = true` (enforced in the service + Zod).

### Transcript / TranscriptSegment (P7B)
`Transcript`: `meetingId` (unique, FK cascade), `language?`, `createdAt`, `segments[]`.
`TranscriptSegment`: `transcriptId` (FK cascade), `speakerLabel`, `text` (Text), `startMs`,
`endMs`, `ordinal`. Indexed on `[transcriptId, ordinal]`. Populated by the **mock** transcript
provider on STOP.

### MeetingSummary (P7B)
1-1 with Meeting (`meetingId` unique). `overview` (Text), plus `String[]` array columns:
`discussionPoints`, `risks`, `questions`, `nextSteps`. `createdAt`.

### MeetingDecision (P7B)
`meetingId` (FK cascade), `description` (Text), `decidedBy` (default "Unassigned" — never
fabricated), `confidence` (Float 0–1). Indexed on `meetingId`.

### ActionItem (P7B)
`meetingId` (FK cascade), `ordinal`, `description` (Text), `owner` (default "Unassigned"),
`dueDate` (default "Not specified" — a string sentinel, not a Date), `status` (default OPEN),
`priority` (default MEDIUM), `confidence` (Float). Indexed on `[meetingId, ordinal]`.

### MeetingSettings (P7B)
Per-user privacy defaults. `userId` (unique, FK cascade), `recordingConsent`/`transcriptConsent`/
`autoRecord`/`autoTranscribe` (default false), `retentionDays` (default 30), timestamps.

### AICharacter (P8)
Seeded persona for Character mode. `key` (unique slug), `name`, `tagline`, `description` (Text),
`setting`, `avatarEmoji`, `greeting` (Text), `persona` (Text — shapes the system prompt, never
shown to the learner), `sortOrder` (default 0), `isActive` (default true), `createdAt`. Referenced
by Conversation. Seed loads 5 characters (barista, interviewer, travel_guide, shopkeeper, doctor).

### Debate / DebateMessage (P8)
`Debate`: `userId` (FK cascade), `languageCode`, `topicKey` (→ static `DEBATE_TOPICS`), `motion`
(Text), `userSide` (DebateSide), `level`, `status` (default ACTIVE), timestamps. Indexes: `userId`,
`[userId, updatedAt]`. `DebateMessage`: `debateId` (FK cascade), `role`, `content` (Text),
`createdAt`; indexed `[debateId, createdAt]`.

### PhotoSession / PhotoMessage (P8)
`PhotoSession`: `userId` (FK cascade), `languageCode`, `imageUrl` (Text — data-URL or remote URL
stored as-is; no upload pipeline), `description` (Text — from **mock** vision), `level`,
timestamps. Indexes: `userId`, `[userId, updatedAt]`. `PhotoMessage`: `photoSessionId` (FK
cascade), `role`, `content` (Text), `createdAt`; indexed `[photoSessionId, createdAt]`.

---

### ActivityEvent (P10)
A lightweight, persisted record that a learning activity completed. `userId` (FK cascade),
`kind` (ActivityKind), `minutes` (Int, estimated duration credited), `xp` (Int), `createdAt`.
Indexed on `[userId, createdAt]`. Feature services append one at each activity's natural
completion point (message sent, card reviewed, lesson completed, meeting analyzed, …) via
`apps/api/src/lib/activity.ts` (fixed deterministic minutes/xp per kind). The Progress module
aggregates these into totals, a streak, level/XP, and the trailing-7-day weekly series.

### Achievement / UserAchievement (P10)
`Achievement`: seeded definition — `code` (unique slug matched by unlock logic), `title`,
`description` (Text), `icon`, `sortOrder`, `createdAt`. Seed loads 8 achievements.
`UserAchievement`: join row — `userId` (FK cascade), `achievementId` (FK cascade),
`unlockedAt`. `@@unique([userId, achievementId])`, indexed on `userId`. Unlock predicates
live in the progress service (they depend on computed progress); the DB holds display
metadata + unlock timestamps.

---

## Models NOT yet in the schema (planned)

Per `IMPLEMENTATION_PLAN.md`, these are introduced when their phase begins:
- **P9 Courses:** `Vocabulary`, `UserVocabulary`, `GrammarTopic` (deferred; not yet needed).
- **Optional:** `Subscription`, `Usage`.

## Related docs
- [`API_DESIGN.md`](./API_DESIGN.md) · [`SECURITY_ARCHITECTURE.md`](./SECURITY_ARCHITECTURE.md) ·
  [`ARCHITECTURE.md`](./ARCHITECTURE.md)
