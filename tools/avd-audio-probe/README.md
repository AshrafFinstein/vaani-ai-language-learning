# AVD Audio Capture Probe

A **feasibility test** for the "Meeting Voice Assistant" recorder. Before we build a
desktop recorder, this answers the make-or-break question for your AVD:

- Can an app capture your **microphone** (you)?
- Can an app capture **system / loopback audio** (the *other* Teams/Zoom/Meet
  participants coming out of your speakers)?

It records a few seconds of each via **WASAPI loopback**, measures the signal level,
writes `mic.wav` + `system.wav` next to the program, and prints a clear **PASS / FAIL**
per source. **Nothing is uploaded anywhere.**

## How to run (inside your AVD)

1. **Start audio playing** — join a Teams meeting where someone is talking, or play a
   YouTube video. (System-audio capture can only "hear" something if something is playing.)
2. **Double-click `run.bat`.**
   - It sets up a small local Python environment the first time (needs internet once).
   - If Python isn't installed, it tells you to install Python 3.11+ from
     <https://www.python.org/downloads/> (tick *"Add python.exe to PATH"*), then re-run.
3. **Speak** during the microphone step, and keep audio **playing** during the system step.
4. Read the **VERDICT** at the end, and listen to `mic.wav` / `system.wav` to confirm.

## What the result means

| Mic | System | Meaning |
| --- | ------ | ------- |
| YES | YES | **Full two-way capture works** — the voice-recorder workflow is feasible; we can record both sides → STT → AI meeting notes. |
| YES | NO  | Only *your* side is capturable; the other participants' audio isn't exposed to apps in this AVD. Options: enable AVD audio redirection for apps, or use the meeting host's recording/transcript. |
| NO  | *    | Mic blocked (permission/redirection) — check Windows mic privacy + AVD audio settings. |

## Manual run (if you prefer)

```bat
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python avd_audio_probe.py
```

## Why this exists

The recorder itself must be a desktop app (a browser can't reliably capture system
audio). Everything **after** the audio file — Whisper STT, speaker mapping, and the AI
summary / decisions / action items — is already built in the Vaani backend. This probe
just confirms the *capture* half is possible in your specific AVD before we build the app.

Send the printed output back and we'll pick the recorder architecture accordingly.
