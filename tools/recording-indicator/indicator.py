"""
On-screen Recording Indicator (demo)
=====================================

An always-on-top widget for the Meeting Voice Assistant, matching the mockup:
a blinking red dot + running timer, Mic / System status dots, and
Pause / Resume + Stop controls. Recording is always user-visible (never covert).

This is a UI DEMO — Pause/Resume/Stop drive the on-screen state (and the timer).
When the audio capture is wired in, these same controls will pause/resume/stop the
actual recording.

- Always on top, borderless, draggable (drag the top row).
- Pause  -> button becomes Resume; the timer freezes.
- Stop   -> ends the session (timer frozen, dot grey).
- Close with the  X  (top-right) or press Esc.

Run:  run.bat   (or:  py -3.11 indicator.py)   — uses built-in tkinter, no install.
"""

import time
import tkinter as tk

BG = "#141414"
PANEL = "#1e1e1e"
RED = "#ff3b30"
RED_DIM = "#5a1a17"
AMBER = "#ffb020"
GREY = "#6b6b6b"
GREEN = "#34c759"
TEXT = "#f2f2f2"
SUBTLE = "#9a9a9a"


class Indicator:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Recording")
        self.root.overrideredirect(True)
        self.root.attributes("-topmost", True)
        try:
            self.root.attributes("-alpha", 0.95)
        except tk.TclError:
            pass
        self.root.configure(bg=BG)
        sw = self.root.winfo_screenwidth()
        self.root.geometry(f"+{sw - 320}+28")

        # ---- state ----
        self.state = "recording"     # recording | paused | stopped
        self.accum = 0.0             # seconds accumulated before the current running segment
        self.seg_start = time.time()
        self._blink = True

        # ---- top row: dot + timer + status + close ----
        top = tk.Frame(self.root, bg=BG)
        top.pack(fill="x", padx=2, pady=(2, 0))

        self.dot = tk.Label(top, text="●", fg=RED, bg=BG, font=("Segoe UI", 15))
        self.dot.pack(side="left", padx=(12, 6), pady=8)

        self.timer = tk.Label(top, text="REC  00:00", fg=TEXT, bg=BG, font=("Segoe UI Semibold", 12))
        self.timer.pack(side="left")

        status = tk.Frame(top, bg=BG)
        status.pack(side="left", padx=14)
        self.mic_dot = tk.Label(status, text="●", fg=GREEN, bg=BG, font=("Segoe UI", 9))
        self.mic_dot.pack(side="left")
        tk.Label(status, text="Mic", fg=SUBTLE, bg=BG, font=("Segoe UI", 9)).pack(side="left", padx=(2, 8))
        self.sys_dot = tk.Label(status, text="●", fg=GREEN, bg=BG, font=("Segoe UI", 9))
        self.sys_dot.pack(side="left")
        tk.Label(status, text="System", fg=SUBTLE, bg=BG, font=("Segoe UI", 9)).pack(side="left", padx=(2, 0))

        close = tk.Label(top, text="✕", fg=SUBTLE, bg=BG, font=("Segoe UI", 11))
        close.pack(side="right", padx=(6, 12))
        close.bind("<Button-1>", lambda _e: self.root.destroy())
        close.bind("<Enter>", lambda _e: close.config(fg="white"))
        close.bind("<Leave>", lambda _e: close.config(fg=SUBTLE))

        # ---- bottom row: Pause/Resume + Stop ----
        controls = tk.Frame(self.root, bg=BG)
        controls.pack(fill="x", padx=12, pady=(2, 10))
        self.pause_btn = self._button(controls, "⏸  Pause", self.toggle_pause)
        self.pause_btn.pack(side="left")
        self.stop_btn = self._button(controls, "■  Stop", self.stop, danger=True)
        self.stop_btn.pack(side="left", padx=(8, 0))

        # drag via the top row
        for w in (top, self.dot, self.timer):
            w.bind("<Button-1>", self._grab)
            w.bind("<B1-Motion>", self._drag)

        self.root.bind("<Escape>", lambda _e: self.root.destroy())
        self.root.bind("<space>", lambda _e: self.toggle_pause())
        self._tick()

    def _button(self, parent, text, cmd, danger=False):
        b = tk.Label(parent, text=text, fg=TEXT, bg=PANEL, font=("Segoe UI", 10),
                     padx=14, pady=6, cursor="hand2")
        hover = "#3a1f1f" if danger else "#2c2c2c"
        b.bind("<Button-1>", lambda _e: cmd())
        b.bind("<Enter>", lambda _e: b.config(bg=hover))
        b.bind("<Leave>", lambda _e: b.config(bg=PANEL))
        return b

    # ---- dragging ----
    def _grab(self, e):
        self._ox, self._oy = e.x, e.y

    def _drag(self, e):
        self.root.geometry(f"+{self.root.winfo_x() + e.x - self._ox}+{self.root.winfo_y() + e.y - self._oy}")

    # ---- controls ----
    def elapsed(self):
        if self.state == "recording":
            return self.accum + (time.time() - self.seg_start)
        return self.accum

    def toggle_pause(self):
        if self.state == "recording":
            self.accum += time.time() - self.seg_start
            self.state = "paused"
            self.pause_btn.config(text="▶  Resume")
        elif self.state == "paused":
            self.seg_start = time.time()
            self.state = "recording"
            self.pause_btn.config(text="⏸  Pause")

    def stop(self):
        if self.state == "recording":
            self.accum += time.time() - self.seg_start
        self.state = "stopped"
        self.pause_btn.config(text="⏸  Pause", fg=GREY)
        self.mic_dot.config(fg=GREY)
        self.sys_dot.config(fg=GREY)

    # ---- render loop ----
    def _tick(self):
        el = int(self.elapsed())
        prefix = {"recording": "REC", "paused": "PAUSED", "stopped": "STOPPED"}[self.state]
        self.timer.config(text=f"{prefix}  {el // 60:02d}:{el % 60:02d}")
        if self.state == "recording":
            self._blink = not self._blink
            self.dot.config(fg=RED if self._blink else RED_DIM)
        elif self.state == "paused":
            self.dot.config(fg=AMBER)
        else:
            self.dot.config(fg=GREY)
        self.root.after(500, self._tick)

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    Indicator().run()
