# User Flows — Vaani AI

_Last updated: 2026-09-22. Author: Agent 1 (Product Research)._

Key journeys through the built app. Steps reference real routes ([`PAGE_MAP.md`](./PAGE_MAP.md))
and endpoints ([`API_DESIGN.md`](./API_DESIGN.md)).

---

## 1. Register → login → dashboard

```
Landing (/)  ──▶  Register (/register)
                     │  POST /api/auth/register  (name, email, password)
                     │  ← 201 + httpOnly access+refresh cookies set
                     ▼
              authStore hydrated (user)  ──▶  redirect /app/dashboard
```

Returning user:
```
Login (/login) ──POST /api/auth/login──▶ cookies set ──▶ /app/dashboard
On app load: useHydrateAuth → GET /api/user/me → hydrate or redirect to /login
Access token expiry → POST /api/auth/refresh (rotates refresh session) → retry
Logout (UserMenu) → POST /api/auth/logout (revokes session) → cookies cleared → /login
```

## 2. Start & run an AI Chat

```
/app/chat  StartScreen: pick topic (CHAT_TOPICS) + level
   │  POST /api/chat            { mode: CHAT, topic, level } → 201 { conversation }
   ▼
/app/chat/:id  Composer: type a message
   │  POST /api/chat/:id/stream { content }   (Server-Sent Events)
   │     ← meta (userMessageId) → delta… delta… → done (assistantMessageId)
   │  (non-streaming fallback: POST /api/chat/:id/messages)
   ▼
Optional: "Feedback" → POST /api/chat/:id/feedback → AIFeedback panel
History: GET /api/chat/history → HistoryList → resume by :id (GET /api/chat/:id)
```

## 3. Run a Roleplay / Dialogue

```
/app/roleplay  ScenarioPicker (ROLEPLAY_SCENARIOS)   [Dialogue: DIALOGUE_SCENARIOS]
   │  POST /api/chat { mode: ROLEPLAY|DIALOGUE, scenarioKey, level }
   │     ← conversation seeded with the AI's in-character opener
   ▼
/app/roleplay/:id  converse (same stream/messages/feedback endpoints as Chat)
```
The AI stays in character via `buildRoleplayPrompt` / `buildDialoguePrompt`; corrections are not
inline — they surface via the feedback endpoint.

## 4. Run a learning mode (Word / Sentence)

```
Word (/app/word):      pick language deck (getWordDeck) → flip cards, self-rate → client-side only
Sentence (/app/sentence): read prompt (SENTENCE_PROMPTS) → write answer
   │  POST /api/practice/sentence { prompt, answer, level? }
   ▼  ← SentenceEvaluation { corrected, betterVersion, explanation, scores }
```

## 5. Voice Call

```
/app/call  Start call
   │  POST /api/chat { mode: CHAT, topic: FREE, level }  → conversation id
   │  TTS speaks greeting → on end, STT starts listening (Web Speech API)
   ▼
Loop:  learner speaks → STT final transcript
   │   POST /api/chat/:id/messages { content } → assistant reply
   │   TTS speaks reply → STT re-arms   (mute pauses STT; timer + transcript panel)
   ▼  End call → STT/TTS stopped
```
Unsupported browsers get a graceful "voice isn't supported" screen. STT/TTS run in the browser;
server STT/TTS providers are mock-only.

## 6. Schedule + analyse a Meeting (consent-gated)

```
/app/meetings/schedule  ScheduleForm: title, date, start/end, provider, participants, toggles
   │  POST /api/meetings  → 201 (meeting created; RecordingSession = IDLE, consent = false)
   ▼
/app/meetings/:id  RecordingControls + PrivacyPanel
   │  Start recording  ──POST /api/meetings/:id/recording/start { recordingConsent: true }──▶
   │     server REJECTS unless recordingConsent === true (Zod literal + service guard)
   │  Pause/Resume     ──POST /api/meetings/:id/recording/control { action }──▶
   │  Stop             ──POST …/control { action: STOP }──▶
   │     └─ on STOP: mock transcript generated → analysed → summary + decisions + action items
   ▼
MeetingAnalysis + ActionItemsTable render (owner/dueDate = Unassigned/Not specified when absent)
Privacy: DELETE /api/meetings/:id/recording · DELETE /api/meetings/:id/transcript
         GET/PATCH /api/meetings/settings (consent defaults, retention days)
```
No real capture occurs; recording is user-visible and never covert (`CLAUDE.md` §13–15).

## 7. Advanced modes: Character / Debate / Photo

```
Character (/app/characters): CharacterPicker (GET /api/characters)
   │  POST /api/characters { characterKey, level } → conversation (CHARACTER mode)
   ▼  converse via the Chat stream/messages endpoints; persona greeting seeds the chat

Debate (/app/debate): DebatePicker (DEBATE_TOPICS) → pick side
   │  POST /api/debates { topicKey, side, level } → debate
   │  POST /api/debates/:id/turns { content } → AI rebuttal (opposite side)
   ▼  POST /api/debates/:id/feedback → DebateFeedback (scores + strengths/improvements)

Photo (/app/photo): PhotoPicker → supply image (data-URL or URL)
   │  POST /api/photos { image, level } → session (mock describeImage seeds description)
   ▼  POST /api/photos/:id/messages { content } → AI converses about the photo
```

## Cross-cutting notes
- All `/app/*` journeys require a valid access cookie; expiry triggers refresh, then re-auth.
- Every practice-start records a `PracticeSession` row for future Progress analytics (P10).
- Errors surface through the `ApiResponse` envelope (`{ error: { code, message, fields? } }`); the
  web client maps `fields` to per-input messages.
