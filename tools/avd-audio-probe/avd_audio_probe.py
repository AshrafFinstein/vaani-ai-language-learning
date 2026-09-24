"""
AVD Audio Capture Probe
=======================

Feasibility test for the "Meeting Voice Assistant" recorder: can THIS machine /
AVD session capture the audio a recorder would need?

  - MICROPHONE (you)                 -> mic.wav
  - SYSTEM / loopback audio (them,   -> system.wav
    the other Teams/Zoom/Meet participants)

Uses WASAPI loopback via PyAudioWPatch. Records a few seconds of each, measures the
signal level, and prints a clear PASS/FAIL per source. No audio is uploaded anywhere.

IMPORTANT: during the test, PLAY SOME AUDIO (a Teams call with someone talking, or a
YouTube video) so the system/loopback capture has something to hear.

Run:  run.bat   (or:  python avd_audio_probe.py)
"""

import sys
import wave

RECORD_SECONDS = 8
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
    with wave.open(path, "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(int16.tobytes())


def record(pa, dev, seconds):
    """Record from a device dict using its native channels/rate (WASAPI shared mode)."""
    channels = max(1, min(2, int(dev["maxInputChannels"])))
    rate = int(dev["defaultSampleRate"])
    stream = pa.open(
        format=pyaudio.paInt16,
        channels=channels,
        rate=rate,
        input=True,
        input_device_index=int(dev["index"]),
        frames_per_buffer=CHUNK,
    )
    frames = []
    for _ in range(int(rate / CHUNK * seconds)):
        frames.append(stream.read(CHUNK, exception_on_overflow=False))
    stream.stop_stream()
    stream.close()
    data = np.frombuffer(b"".join(frames), dtype=np.int16)
    return data, channels, rate


def list_devices(pa):
    banner("1. AUDIO DEVICES VISIBLE TO THIS SESSION")
    try:
        wasapi = pa.get_host_api_info_by_type(pyaudio.paWASAPI)
    except Exception:
        wasapi = None
    print("\nInput devices (microphones):")
    for i in range(pa.get_device_count()):
        d = pa.get_device_info_by_index(i)
        if d.get("maxInputChannels", 0) > 0 and not d.get("isLoopbackDevice", False):
            print(f"   - {d['name']}  ({int(d['maxInputChannels'])}ch @ {int(d['defaultSampleRate'])}Hz)")
    print("\nLoopback devices (system/output capture):")
    try:
        for lb in pa.get_loopback_device_info_generator():
            print(f"   - {lb['name']}  ({int(lb['maxInputChannels'])}ch @ {int(lb['defaultSampleRate'])}Hz)")
    except Exception as exc:
        print(f"   (none / not available: {exc})")
    print(
        "\n   (Look for your headset/Bluetooth device and any AVD 'Remote Audio' /"
        "\n    redirected device. If system audio is only a redirected device, capture"
        "\n    behavior depends on your AVD audio-redirection policy.)"
    )


def default_mic(pa):
    try:
        return pa.get_device_info_by_index(pa.get_default_input_device_info()["index"])
    except Exception:
        for i in range(pa.get_device_count()):
            d = pa.get_device_info_by_index(i)
            if d.get("maxInputChannels", 0) > 0 and not d.get("isLoopbackDevice", False):
                return d
    return None


def default_loopback(pa):
    """The loopback device that captures the default speaker's output."""
    try:
        wasapi = pa.get_host_api_info_by_type(pyaudio.paWASAPI)
        out = pa.get_device_info_by_index(wasapi["defaultOutputDevice"])
        for lb in pa.get_loopback_device_info_generator():
            if out["name"] in lb["name"] or lb["name"] in out["name"]:
                return lb
        # Fall back to the first loopback device.
        for lb in pa.get_loopback_device_info_generator():
            return lb
    except Exception:
        return None
    return None


def probe_source(pa, name, dev, wav, hint):
    banner(name)
    if not dev:
        print(f"   RESULT: FAIL - no device found. {hint}")
        return False
    print(f"   Recording {RECORD_SECONDS}s from: {dev['name']}")
    try:
        data, ch, rate = record(pa, dev, RECORD_SECONDS)
    except Exception as exc:
        print(f"   RESULT: FAIL - could not open/read the device: {exc}")
        print(f"           {hint}")
        return False
    peak, rms = level(data)
    save_wav(wav, data, ch, rate)
    ok = peak > SILENCE_PEAK
    print(f"   peak={peak:.4f} rms={rms:.4f}  -> saved {wav}")
    print(f"   RESULT: {'PASS - audio captured' if ok else 'SILENT - no signal captured'}")
    if not ok:
        print(f"           {hint}")
    return ok


def main():
    banner("AVD AUDIO CAPTURE PROBE  -  Meeting Voice Assistant feasibility test")
    print("Records a few seconds of your mic + system audio, measures levels, and tells")
    print("you what a recorder could capture here. Nothing is uploaded.")
    pa = pyaudio.PyAudio()
    try:
        list_devices(pa)
        print("\n>>> SPEAK during the mic step, and keep AUDIO PLAYING during the system step. <<<")
        mic_ok = probe_source(
            pa,
            "2. MICROPHONE CAPTURE  (you / your voice)",
            default_mic(pa),
            "mic.wav",
            "Check Windows mic privacy settings and AVD audio redirection.",
        )
        sys_ok = probe_source(
            pa,
            "3. SYSTEM / LOOPBACK CAPTURE  (them / the meeting audio)",
            default_loopback(pa),
            "system.wav",
            "Either nothing was playing, OR this AVD does not expose system audio to apps.",
        )
    finally:
        pa.terminate()

    banner("VERDICT")
    print(f"   Microphone (you):     {'YES' if mic_ok else 'NO'}")
    print(f"   System audio (them):  {'YES' if sys_ok else 'NO'}")
    print()
    if mic_ok and sys_ok:
        print("   ==> FULL two-way capture works. The voice-recorder workflow is feasible:")
        print("       record both sides -> Whisper STT -> AI meeting notes.")
    elif mic_ok:
        print("   ==> Only YOUR mic is capturable; the other participants (system audio)")
        print("       are not exposed to apps in this AVD. Options: enable AVD audio")
        print("       redirection for apps, or use the meeting host's recording/transcript.")
    elif sys_ok:
        print("   ==> System audio works but the mic did not (permission/redirection).")
    else:
        print("   ==> Neither source captured. Ensure audio was playing and this AVD")
        print("       permits audio capture, then re-run.")
    print("\n   Listen to mic.wav / system.wav next to this program to confirm.\n")
    try:
        input("   Press Enter to exit...")
    except EOFError:
        pass


if __name__ == "__main__":
    main()
