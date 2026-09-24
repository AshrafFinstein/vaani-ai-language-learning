# Vaani Meeting Recorder (mic-first MVP)

A desktop recorder for the Meeting Voice Assistant. It records your **microphone**,
then on Stop uploads the audio to your Vaani backend, which **transcribes it and shows
the AI summary / decisions / action items on the meeting page** in the Vaani AI web app.

```
 record mic  ->  login  ->  create meeting  ->  start recording (consent)
             ->  POST /:id/transcribe  ->  open /app/meetings/:id in Vaani
```

## Prerequisites
1. The Vaani backend + web app running:
   - API on `http://localhost:4000`, web on `http://localhost:5173`
   - Postgres up + migrated (`npm run db:up && npm run db:generate && npm run db:migrate`)
2. **For REAL transcription**: set `OPENAI_API_KEY` + `SPEECH_PROVIDER=openai` in the
   backend `.env`, then restart the API. Without a key the backend's **Mock** provider
   returns placeholder text — the whole flow still works, the words just aren't your audio.

## Run
1. **Double-click `run.bat`** (first run sets up a small Python env — needs internet once).
2. Enter your **Vaani email + password**, an optional meeting title.
3. Click **● Start recording** — the mic dot goes green and the timer runs. **⏸ Pause** /
   **▶ Resume** as needed.
4. Click **■ Stop** — it uploads, transcribes, and analyzes, then shows
   **"analysis ready"**. Click **↗ Open in Vaani** to see the summary/decisions/action-items.

## Current limits (next iterations)
- **Mic only.** System audio (the other participants) is added once the AVD capture test
  (`tools/avd-audio-probe`) confirms it — then this becomes true two-way capture.
- **~7 minutes per recording** (audio is 16 kHz mono to fit the upload limit). Longer
  meetings will be chunked.
- **Manual Start/Stop.** Auto-start on the calendar schedule (meeting starts → record;
  meeting ends → stop + upload) is the next step, using the ICS scheduler already built.

Config: edit `API_BASE` / `WEB_BASE` at the top of `recorder.py` if your ports differ.
