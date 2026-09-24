"""
AVD Audio Capture Probe
=======================

Feasibility test for the "Meeting Voice Assistant" recorder: can THIS machine /
AVD session capture the audio a recorder would need?

  - MICROPHONE (you)                 -> mic.wav
  - SYSTEM / loopback audio (them,   -> system_<device>.wav
    the other Teams/Zoom/Meet participants)  (tests EVERY output device)

Uses WASAPI loopback via PyAudioWPatch, in NON-BLOCKING (callback) mode so an idle
output device can't hang the probe. Records a few seconds of each, measures the
signal level, and prints PASS/FAIL. No audio is uploaded anywhere.

IMPORTANT: during the test, PLAY SOME AUDIO OUT LOUD (a Teams call with someone
talking, or a YouTube video) on the speaker/headset you actually hear.

Run:  run.bat   (or:  py -3.11 avd_audio_probe.py)
"""

import re
import sys
import time
import wave

MIC_SECONDS = 8
SYS_SECONDS = 6
SILENCE_PEAK = 0.003  # peak amplitude (0..1) above which a capture is "real audio"
CHUNK = 1024

try:
    import numpy as np
    import pyaudiowpatch as pyaudio
except Exception as exc:  # pragma: no cover
    print("ERROR: missing dependencies. Install with:  pip install pyaudiowpatch numpy")
    print(f"       ({exc})")
    sys.exit(2)


def banner(title):
    print("\n" + "=" * 62)
    print(title)
    print("=" * 62)


def level(int16):
    if int16 is None or len(int16) == 0:
        return 0.0, 0.0
    f = int16.astype(np.float32) / 32768.0
    return float(np.max(np.abs(f))), float(np.sqrt(np.mean(np.square(f))))


def save_wav(path, int16, channels, rate):
    if int16 is None or len(int16) == 0:
        return
    with wave.open(path, "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(int16.tobytes())


def record(pa, dev, seconds):
    """Non-blocking (callback) capture — can't hang on an idle device."""
    channels = max(1, min(2, int(dev["maxInputChannels"])))
    rate = int(dev["defaultSampleRate"])
    frames = []

    def cb(in_data, frame_count, time_info, status):  # noqa: ANN001
        frames.append(in_data)
        return (None, pyaudio.paContinue)

    stream = pa.open(
        format=pyaudio.paInt16,
        channels=channels,
        rate=rate,
        input=True,
        input_device_index=int(dev["index"]),
        frames_per_buffer=CHUNK,
        stream_callback=cb,
    )
    stream.start_stream()
    deadline = time.time() + seconds
    while time.time() < deadline:
        time.sleep(0.1)
    stream.stop_stream()
    stream.close()
    data = np.frombuffer(b"".join(frames), dtype=np.int16) if frames else np.array([], dtype=np.int16)
    return data, channels, rate


def safe_name(name):
    return re.sub(r"[^A-Za-z0-9]+", "_", name)[:40].strip("_")


def list_input_devices(pa):
    out = []
    for i in range(pa.get_device_count()):
        d = pa.get_device_info_by_index(i)
        if d.get("maxInputChannels", 0) > 0 and not d.get("isLoopbackDevice", False):
            out.append(d)
    return out


def loopback_devices(pa):
    try:
        return list(pa.get_loopback_device_info_generator())
    except Exception:
        return []


def default_mic(pa):
    try:
        return pa.get_device_info_by_index(pa.get_default_input_device_info()["index"])
    except Exception:
        devs = list_input_devices(pa)
        return devs[0] if devs else None


def main():
    banner("AVD AUDIO CAPTURE PROBE  -  Meeting Voice Assistant feasibility test")
    print("Records a few seconds of your mic + EACH output device, measures levels,")
    print("and tells you what a recorder could capture here. Nothing is uploaded.")
    pa = pyaudio.PyAudio()
    mic_ok = False
    sys_ok = False
    sys_hits = []
    try:
        banner("1. AUDIO DEVICES VISIBLE TO THIS SESSION")
        print("\nInput devices (microphones):")
        for d in list_input_devices(pa):
            print(f"   - {d['name']}  ({int(d['maxInputChannels'])}ch @ {int(d['defaultSampleRate'])}Hz)")
        loops = loopback_devices(pa)
        print("\nLoopback devices (system/output capture):")
        for lb in loops:
            print(f"   - {lb['name']}  ({int(lb['maxInputChannels'])}ch @ {int(lb['defaultSampleRate'])}Hz)")
        if not loops:
            print("   (none found)")

        # --- Microphone -------------------------------------------------------
        banner("2. MICROPHONE CAPTURE  (you / your voice)")
        print(">>> SPEAK NOW for a few seconds. <<<")
        mic = default_mic(pa)
        if mic:
            print(f"   Recording {MIC_SECONDS}s from: {mic['name']}")
            try:
                data, ch, rate = record(pa, mic, MIC_SECONDS)
                peak, rms = level(data)
                save_wav("mic.wav", data, ch, rate)
                mic_ok = peak > SILENCE_PEAK
                print(f"   peak={peak:.4f} rms={rms:.4f}  -> saved mic.wav")
                print(f"   RESULT: {'PASS - microphone captured' if mic_ok else 'SILENT - no mic signal'}")
            except Exception as exc:
                print(f"   RESULT: FAIL - {exc}")
        else:
            print("   RESULT: FAIL - no microphone found")

        # --- System audio: test EVERY loopback device -------------------------
        banner("3. SYSTEM / LOOPBACK CAPTURE  (them / the meeting audio)")
        print(">>> Keep a video / Teams call PLAYING OUT LOUD during this. <<<")
        for lb in loops:
            print(f"\n   Recording {SYS_SECONDS}s from: {lb['name']}")
            try:
                data, ch, rate = record(pa, lb, SYS_SECONDS)
                peak, rms = level(data)
                fname = f"system_{safe_name(lb['name'])}.wav"
                save_wav(fname, data, ch, rate)
                hit = peak > SILENCE_PEAK
                sys_ok = sys_ok or hit
                if hit:
                    sys_hits.append(lb["name"])
                print(f"   peak={peak:.4f} rms={rms:.4f}  -> saved {fname}")
                print(f"   RESULT: {'PASS - captured audio from this output' if hit else 'silent (nothing playing on this device?)'}")
            except Exception as exc:
                print(f"   RESULT: FAIL - {exc}")
    finally:
        pa.terminate()

    banner("VERDICT")
    print(f"   Microphone (you):     {'YES' if mic_ok else 'NO'}")
    print(f"   System audio (them):  {'YES' if sys_ok else 'NO'}" + (f"   via: {', '.join(sys_hits)}" if sys_hits else ""))
    print()
    if mic_ok and sys_ok:
        print("   ==> FULL two-way capture works. The voice-recorder workflow is feasible:")
        print("       record both sides -> Whisper STT -> AI meeting notes.")
    elif mic_ok:
        print("   ==> Only YOUR mic captured. If audio WAS playing out loud on one of the")
        print("       output devices above and it still read silent, this AVD isn't exposing")
        print("       system audio to apps. If nothing was playing, re-run with a video ON.")
    elif sys_ok:
        print("   ==> System audio works but the mic did not (permission/redirection).")
    else:
        print("   ==> Neither captured. Ensure audio was playing out loud, then re-run.")
    print("\n   Listen to mic.wav / system_*.wav next to this program to confirm.\n")
    try:
        input("   Press Enter to exit...")
    except EOFError:
        pass


if __name__ == "__main__":
    main()
