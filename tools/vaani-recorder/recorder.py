"""
Vaani Meeting Recorder (mic-first MVP)
======================================

A desktop recorder for the Meeting Voice Assistant. It records your MICROPHONE
(confirmed capturable in AVD), shows the always-on-top recording indicator, and when
you Stop it uploads the audio to your Vaani backend, which transcribes it (Whisper)
and produces the AI summary / decisions / action items — shown on the meeting page in
the Vaani AI web app.

Flow (all against your own Vaani backend):
  login -> create meeting (transcription on) -> start recording (consent)
        -> record mic -> POST /:id/transcribe -> open /app/meetings/:id in Vaani

Notes:
  * MIC ONLY for now. System audio (the other participants) is added once the AVD
    capture test confirms it — see tools/avd-audio-probe.
  * Real transcription needs OPENAI_API_KEY + SPEECH_PROVIDER=openai in the backend's
    .env. Without it, the backend's Mock provider returns placeholder text (the flow
    still works end-to-end; the words just aren't your real audio).
  * Audio is resampled to 16 kHz mono (what Whisper uses) to fit the upload limit
    (~7 min per recording). Longer meetings will be chunked in a later version.

Run:  run.bat   (or:  py -3.11 recorder.py)
"""

import base64
import io
import threading
import time
import tkinter as tk
import wave
import webbrowser
from datetime import datetime
from tkinter import messagebox

try:
    import numpy as np
    import pyaudiowpatch as pyaudio
    import requests
except Exception as exc:  # pragma: no cover
    print("Missing deps. Install with:  pip install pyaudiowpatch numpy requests")
    print(f"  ({exc})")
    raise SystemExit(2)

API_BASE = "http://localhost:4000"
WEB_BASE = "http://localhost:5173"
TARGET_RATE = 16000            # Whisper's native rate; keeps uploads small
MAX_B64 = 19_000_000           # stay under the API's 20 MB audio limit
CHUNK = 1024

BG = "#141414"
PANEL = "#1e1e1e"
RED = "#ff3b30"
RED_DIM = "#5a1a17"
AMBER = "#ffb020"
GREEN = "#34c759"
TEXT = "#f2f2f2"
SUBTLE = "#9a9a9a"


# --------------------------------------------------------------------------- audio
class MicCapture:
    """Non-blocking microphone capture into memory."""

    def __init__(self):
        self.pa = pyaudio.PyAudio()
        self.stream = None
        self.frames = []
        self.channels = 1
        self.rate = TARGET_RATE
        self.recording = False

    def _default_mic(self):
        try:
            return self.pa.get_device_info_by_index(self.pa.get_default_input_device_info()["index"])
        except Exception:
            for i in range(self.pa.get_device_count()):
                d = self.pa.get_device_info_by_index(i)
                if d.get("maxInputChannels", 0) > 0 and not d.get("isLoopbackDevice", False):
                    return d
        return None

    def start(self):
        dev = self._default_mic()
        if not dev:
            raise RuntimeError("No microphone found")
        self.channels = max(1, min(2, int(dev["maxInputChannels"])))
        self.rate = int(dev["defaultSampleRate"])
        self.frames = []

        def cb(in_data, frame_count, time_info, status):  # noqa: ANN001
            if self.recording:
                self.frames.append(in_data)
            return (None, pyaudio.paContinue)

        self.stream = self.pa.open(
            format=pyaudio.paInt16, channels=self.channels, rate=self.rate, input=True,
            input_device_index=int(dev["index"]), frames_per_buffer=CHUNK, stream_callback=cb,
        )
        self.recording = True
        self.stream.start_stream()
        return dev["name"]

    def pause(self):
        self.recording = False

    def resume(self):
        self.recording = True

    def stop_and_wav(self):
        """Stop capture and return 16 kHz mono 16-bit WAV bytes."""
        self.recording = False
        if self.stream:
            self.stream.stop_stream()
            self.stream.close()
            self.stream = None
        if not self.frames:
            return b""
        raw = np.frombuffer(b"".join(self.frames), dtype=np.int16)
        if self.channels == 2:                       # downmix to mono
            raw = raw.reshape(-1, 2).mean(axis=1).astype(np.int16)
        if self.rate != TARGET_RATE:                 # resample (linear)
            n_out = int(len(raw) * TARGET_RATE / self.rate)
            if n_out > 1:
                xp = np.linspace(0, 1, num=len(raw), endpoint=False)
                x = np.linspace(0, 1, num=n_out, endpoint=False)
                raw = np.interp(x, xp, raw.astype(np.float32)).astype(np.int16)
        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(TARGET_RATE)
            w.writeframes(raw.tobytes())
        return buf.getvalue()

    def terminate(self):
        try:
            self.pa.terminate()
        except Exception:
            pass


# --------------------------------------------------------------------------- backend
class Vaani:
    def __init__(self, api_base):
        self.api = api_base.rstrip("/")
        self.s = requests.Session()

    def login(self, email, password):
        r = self.s.post(f"{self.api}/api/auth/login", json={"email": email, "password": password}, timeout=20)
        if r.status_code != 200:
            raise RuntimeError(f"Login failed ({r.status_code}): {self._msg(r)}")

    def create_meeting(self, title):
        now = datetime.now()
        body = {
            "title": title or f"Recorded meeting {now:%Y-%m-%d %H:%M}",
            "date": now.strftime("%Y-%m-%d"),
            "startTime": now.strftime("%H:%M"),
            "endTime": now.replace(hour=min(23, now.hour + 1)).strftime("%H:%M"),
            "provider": "OTHER",
            "recordingEnabled": True,
            "transcriptionEnabled": True,
            "aiAnalysisEnabled": True,
        }
        r = self.s.post(f"{self.api}/api/meetings", json=body, timeout=20)
        if r.status_code not in (200, 201):
            raise RuntimeError(f"Create meeting failed ({r.status_code}): {self._msg(r)}")
        return self._meeting(r)["id"]

    def start_recording(self, mid):
        r = self.s.post(f"{self.api}/api/meetings/{mid}/recording/start",
                        json={"recordingConsent": True, "transcriptConsent": True}, timeout=20)
        if r.status_code not in (200, 201):
            raise RuntimeError(f"Start recording failed ({r.status_code}): {self._msg(r)}")

    def transcribe(self, mid, wav_bytes):
        data_url = "data:audio/wav;base64," + base64.b64encode(wav_bytes).decode()
        if len(data_url) > MAX_B64:
            raise RuntimeError("Recording too long for a single upload (~7 min max for now).")
        r = self.s.post(f"{self.api}/api/meetings/{mid}/transcribe",
                        json={"audio": data_url, "mimeType": "audio/wav"}, timeout=180)
        if r.status_code not in (200, 201):
            raise RuntimeError(f"Transcribe failed ({r.status_code}): {self._msg(r)}")

    @staticmethod
    def _meeting(r):
        d = r.json().get("data", {})
        return d.get("meeting", d)

    @staticmethod
    def _msg(r):
        try:
            return r.json().get("error", {}).get("message", r.text[:200])
        except Exception:
            return r.text[:200]


# --------------------------------------------------------------------------- UI
class RecorderApp:
    def __init__(self):
        self.mic = None
        self.state = "idle"       # idle | recording | paused | uploading | done
        self.accum = 0.0
        self.seg_start = 0.0
        self._blink = True
        self.meeting_id = None
        self.mic_name = ""

        self.root = tk.Tk()
        self.root.title("Vaani Meeting Recorder")
        self.root.configure(bg=BG)
        self.root.attributes("-topmost", True)
        self.root.geometry("360x300")
        self.root.resizable(False, False)

        pad = {"padx": 14}
        tk.Label(self.root, text="🎙  Vaani Meeting Recorder", fg=TEXT, bg=BG,
                 font=("Segoe UI Semibold", 13)).pack(anchor="w", pady=(12, 8), **pad)

        self.email = self._field("Vaani email")
        self.password = self._field("Password", show="•")
        self.title_in = self._field("Meeting title (optional)")

        row = tk.Frame(self.root, bg=BG)
        row.pack(fill="x", pady=(6, 4), **pad)
        self.dot = tk.Label(row, text="●", fg=SUBTLE, bg=BG, font=("Segoe UI", 15))
        self.dot.pack(side="left")
        self.timer = tk.Label(row, text="00:00", fg=TEXT, bg=BG, font=("Segoe UI Semibold", 13))
        self.timer.pack(side="left", padx=(6, 12))
        self.mic_dot = tk.Label(row, text="●", fg=SUBTLE, bg=BG, font=("Segoe UI", 9))
        self.mic_dot.pack(side="left")
        tk.Label(row, text="Mic", fg=SUBTLE, bg=BG, font=("Segoe UI", 9)).pack(side="left", padx=(2, 0))

        btns = tk.Frame(self.root, bg=BG)
        btns.pack(fill="x", pady=(6, 4), **pad)
        self.rec_btn = self._button(btns, "●  Start recording", self.toggle_record, danger=True)
        self.rec_btn.pack(side="left")
        self.pause_btn = self._button(btns, "⏸  Pause", self.toggle_pause)
        self.pause_btn.pack(side="left", padx=(8, 0))

        self.status = tk.Label(self.root, text="Enter your Vaani login, then Start.", fg=SUBTLE,
                               bg=BG, font=("Segoe UI", 9), wraplength=330, justify="left")
        self.status.pack(anchor="w", pady=(8, 0), **pad)
        self.open_btn = self._button(self.root, "↗  Open in Vaani", self.open_meeting)

        self.root.protocol("WM_DELETE_WINDOW", self._quit)
        self._tick()

    def _field(self, label, show=None):
        tk.Label(self.root, text=label, fg=SUBTLE, bg=BG, font=("Segoe UI", 9)).pack(anchor="w", padx=14)
        e = tk.Entry(self.root, bg=PANEL, fg=TEXT, insertbackground=TEXT, relief="flat",
                     font=("Segoe UI", 10), show=show or "")
        e.pack(fill="x", padx=14, ipady=4, pady=(0, 6))
        return e

    def _button(self, parent, text, cmd, danger=False):
        b = tk.Label(parent, text=text, fg=TEXT, bg=PANEL, font=("Segoe UI", 10),
                     padx=14, pady=6, cursor="hand2")
        hover = "#3a1f1f" if danger else "#2c2c2c"
        b.bind("<Button-1>", lambda _e: cmd())
        b.bind("<Enter>", lambda _e: b.config(bg=hover))
        b.bind("<Leave>", lambda _e: b.config(bg=PANEL))
        return b

    # ---- recording ----
    def elapsed(self):
        return self.accum + (time.time() - self.seg_start) if self.state == "recording" else self.accum

    def toggle_record(self):
        if self.state in ("idle", "done"):
            self.start()
        elif self.state in ("recording", "paused"):
            self.stop()

    def start(self):
        if not self.email.get().strip() or not self.password.get():
            messagebox.showwarning("Vaani", "Enter your Vaani email and password first.")
            return
        try:
            self.mic = MicCapture()
            self.mic_name = self.mic.start()
        except Exception as exc:
            messagebox.showerror("Microphone", str(exc))
            return
        self.state = "recording"
        self.accum = 0.0
        self.seg_start = time.time()
        self.meeting_id = None
        self.mic_dot.config(fg=GREEN)
        self.rec_btn.config(text="■  Stop")
        self.pause_btn.config(text="⏸  Pause")
        self._set_status(f"Recording from: {self.mic_name}")

    def toggle_pause(self):
        if self.state == "recording":
            self.accum += time.time() - self.seg_start
            self.state = "paused"
            self.mic.pause()
            self.pause_btn.config(text="▶  Resume")
        elif self.state == "paused":
            self.seg_start = time.time()
            self.state = "recording"
            self.mic.resume()
            self.pause_btn.config(text="⏸  Pause")

    def stop(self):
        if self.state == "recording":
            self.accum += time.time() - self.seg_start
        self.state = "uploading"
        self.rec_btn.config(text="●  Start recording")
        self.pause_btn.config(text="⏸  Pause")
        self.mic_dot.config(fg=SUBTLE)
        self.dot.config(fg=AMBER)
        self._set_status("Finishing recording and uploading to Vaani…")
        threading.Thread(target=self._upload, daemon=True).start()

    def _upload(self):
        try:
            wav = self.mic.stop_and_wav()
            self.mic.terminate()
            self.mic = None
            if not wav:
                raise RuntimeError("No audio was captured.")
            v = Vaani(API_BASE)
            self._set_status("Signing in…")
            v.login(self.email.get().strip(), self.password.get())
            self._set_status("Creating meeting…")
            mid = v.create_meeting(self.title_in.get().strip())
            v.start_recording(mid)
            self._set_status("Transcribing + analyzing (this can take a moment)…")
            v.transcribe(mid, wav)
            self.meeting_id = mid
            self.state = "done"
            self._set_status("✅ Done — analysis ready. Click 'Open in Vaani' to see the summary.")
            self.root.after(0, lambda: self.open_btn.pack(anchor="w", padx=14, pady=(8, 0)))
        except Exception as exc:
            self.state = "idle"
            self._set_status(f"⚠ {exc}")

    def open_meeting(self):
        if self.meeting_id:
            webbrowser.open(f"{WEB_BASE}/app/meetings/{self.meeting_id}")

    # ---- render ----
    def _set_status(self, text):
        self.root.after(0, lambda: self.status.config(text=text))

    def _tick(self):
        el = int(self.elapsed())
        self.timer.config(text=f"{el // 60:02d}:{el % 60:02d}")
        if self.state == "recording":
            self._blink = not self._blink
            self.dot.config(fg=RED if self._blink else RED_DIM)
        elif self.state == "paused":
            self.dot.config(fg=AMBER)
        elif self.state == "uploading":
            self.dot.config(fg=AMBER)
        elif self.state == "done":
            self.dot.config(fg=GREEN)
        else:
            self.dot.config(fg=SUBTLE)
        self.root.after(500, self._tick)

    def _quit(self):
        try:
            if self.mic:
                self.mic.terminate()
        finally:
            self.root.destroy()

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    RecorderApp().run()
