"""
On-screen Recording Indicator (demo)
=====================================

A small always-on-top widget that floats "in front of" your display: a blinking
red dot + a running REC timer. This is the visible recording indicator for the
Meeting Voice Assistant (recording must always be user-visible — never covert).

- Always on top, borderless, semi-transparent.
- Drag it anywhere with the mouse.
- Click the  X  (or press Esc) to close.

Run:  run.bat   (or:  py -3.11 indicator.py)
Uses only Python's built-in tkinter — no extra install needed.
"""

import time
import tkinter as tk

BG = "#141414"
RED = "#ff3b30"
RED_DIM = "#5a1a17"


class Indicator:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Recording")
        self.root.overrideredirect(True)          # borderless
        self.root.attributes("-topmost", True)     # always in front
        try:
            self.root.attributes("-alpha", 0.93)
        except tk.TclError:
            pass
        self.root.configure(bg=BG)

        # Top-right corner by default.
        sw = self.root.winfo_screenwidth()
        self.root.geometry(f"+{sw - 250}+28")

        self.dot = tk.Label(self.root, text="●", fg=RED, bg=BG, font=("Segoe UI", 16))
        self.dot.pack(side="left", padx=(14, 8), pady=9)

        self.label = tk.Label(
            self.root, text="REC  00:00", fg="white", bg=BG, font=("Segoe UI Semibold", 12)
        )
        self.label.pack(side="left", padx=(0, 12))

        close = tk.Label(self.root, text="✕", fg="#8a8a8a", bg=BG, font=("Segoe UI", 11))
        close.pack(side="left", padx=(0, 12))
        close.bind("<Button-1>", lambda _e: self.root.destroy())
        close.bind("<Enter>", lambda _e: close.config(fg="white"))
        close.bind("<Leave>", lambda _e: close.config(fg="#8a8a8a"))

        self.root.bind("<Escape>", lambda _e: self.root.destroy())

        # Drag the whole widget.
        for w in (self.root, self.dot, self.label):
            w.bind("<Button-1>", self._grab)
            w.bind("<B1-Motion>", self._drag)

        self._start = time.time()
        self._on = True
        self._tick()

    def _grab(self, e):
        self._ox, self._oy = e.x, e.y

    def _drag(self, e):
        x = self.root.winfo_x() + e.x - self._ox
        y = self.root.winfo_y() + e.y - self._oy
        self.root.geometry(f"+{x}+{y}")

    def _tick(self):
        elapsed = int(time.time() - self._start)
        self.label.config(text=f"REC  {elapsed // 60:02d}:{elapsed % 60:02d}")
        self._on = not self._on
        self.dot.config(fg=RED if self._on else RED_DIM)   # blink
        self.root.after(500, self._tick)

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    Indicator().run()
