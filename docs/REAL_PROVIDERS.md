# Real Providers — Configuration Guide

Every external integration in Vaani AI is **behind a provider abstraction and off by
default**, so the app runs fully offline with deterministic mocks. Turn each one on
independently via environment variables (backend `.env` only — never commit secrets).

| Integration | Flag(s) | Default | Needs |
| ----------- | ------- | ------- | ----- |
| OpenAI text/vision | `AI_PROVIDER=openai` | mock | OpenAI key + credits |
| OpenAI speech (Whisper STT / TTS) | `SPEECH_PROVIDER=openai` | mock | OpenAI key + credits |
| Teams meeting capture (Graph) | `MEETING_CAPTURE_GRAPH=true` | off | Azure AD app + admin consent |
| Web research (Apify) | `APIFY_ENABLED=true` | off | Apify token |

---

## 1. OpenAI (text · vision · speech)

```dotenv
AI_PROVIDER="openai"
OPENAI_API_KEY="sk-..."          # backend only; never commit
OPENAI_MODEL="gpt-4o-mini"       # vision uses the same model (gpt-4o family)
SPEECH_PROVIDER="openai"         # enables Whisper STT + OpenAI TTS
AI_FALLBACK_TO_MOCK="false"      # true → degrade to mock on a transient OpenAI error
```

- All AI features (chat, roleplay, dialogue, sentence, debate, **photo vision**, courses,
  flashcards, progress feedback) route through `@vaani/ai` — no per-feature keys.
- **Billing:** these are paid API calls. A `429 insufficient_quota` means the account has
  no credits — add them at `platform.openai.com` → Settings → Billing.
- Rotate any key that has been shared in plain text.

---

## 2. Microsoft Teams meeting capture (Microsoft Graph)

This retrieves the **official** recording/transcript that Teams produced *after* a meeting
was recorded and transcribed **with consent**. It does not capture live audio and never
fabricates data. Disabled unless the flag is on **and** credentials are present.

```dotenv
MEETING_CAPTURE_PROVIDER="graph"
MEETING_CAPTURE_GRAPH="true"
AZURE_TENANT_ID="..."
AZURE_CLIENT_ID="..."
AZURE_CLIENT_SECRET="..."
# GRAPH_BASE_URL="https://graph.microsoft.com/v1.0"   # sovereign-cloud override
```

### Azure setup (M365 admin required)
1. **App registration** in Azure AD → note Tenant ID, Client ID; create a Client secret.
2. **API permissions → Microsoft Graph → Application permissions** (admin consent required):
   - `OnlineMeetings.Read.All` — meeting metadata + participants
   - `OnlineMeetingTranscript.Read.All` — transcripts
   - `OnlineMeetingRecording.Read.All` — recordings
3. Grant **admin consent** for the tenant.
4. Ensure org Teams policy **allows recording + transcription**.

> ⚠️ Validate the exact permission each Graph endpoint requires before relying on it —
> Microsoft occasionally splits/renames meeting artifact scopes. The provider surfaces the
> real Graph error (status + message) so permission gaps are visible, not silently faked.

### Behaviour
- `MEETING_CAPTURE_GRAPH=false` → the provider is **inactive**; the existing mock-transcript
  pipeline stays in charge (no fake Teams success).
- Enabled but missing creds → a clear `MeetingCaptureConfigError`, never fabricated data.

### AVD note
AVD isn't a separate recording API — inside AVD you're still in Teams, so it's the same
Graph path. Covert desktop recording is **not** implemented (policy). Real local/AVD audio
capture is a separate `LocalAudioCaptureProvider` (device-agent, later phase) and is clearly
distinguished from official Graph retrieval.

---

## 3. Apify web research (optional, independent)

Completely independent of OpenAI and Azure; off by default and never required by any feature.

```dotenv
APIFY_ENABLED="true"
APIFY_API_TOKEN="apify_api_..."
APIFY_ACTOR_ID="apify~google-search-scraper"
```

`APIFY_API_TOKEN` is used **only** for Apify. When disabled, `search()` throws a clear
`ResearchDisabledError`.

---

## Security checklist
- `.env` and `.env.*` are git-ignored; `.env.example` holds **empty** values only.
- Secrets live on the backend, never in the browser or source.
- Credentials are validated at runtime; missing config → a clear error, not a crash.
- Secrets are never printed in logs or error messages.
