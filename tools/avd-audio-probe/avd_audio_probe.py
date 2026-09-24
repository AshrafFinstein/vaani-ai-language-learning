"""
AVD Audio Capture Probe
=======================

Feasibility test for the "Meeting Voice Assistant" recorder: can THIS machine /
AVD session capture the audio a recorder would need?

It answers the make-or-break question for the desktop recorder:
  - Can we capture the MICROPHONE (you)?            -> mic.wav
  - Can we capture SYSTEM / loopback audio (them,   -> system.wav
    i.e. the other Teams/Zoom/Meet participants)?

How it works: uses WASAPI loopback (via the `soundcard` library) to record the
default speaker's output, plus the default microphone. It records a few seconds
of each, measures the signal level, and prints a clear PASS/FAIL per source.

IMPORTANT: during the test, PLAY SOME AUDIO (join a Teams meeting with someone
talking, or play a YouTube video) so the system/loopback capture has something to
hear — otherwise system audio will correctly read as "silent".

Run:  double-click avd-audio-probe.exe   (or:  python avd_audio_probe.py)
No audio is uploaded anywhere; the two .wav files are written next to the program
so you can listen and confirm.
"""

import sys
import wave

RECORD_SECONDS = 8
SAMPLE_RATE = 48000
# Peak amplitude (0..1) above which we consider a capture "real audio", not silence.
SILENCE_PEAK = 0.003

try:
    import numpy as np
    import soundcard as sc
except Exception as exc:  # pragma: no cover - import guard for a friendlier message
    print("ERROR: missing dependencies. Install with:  pip install soundcard numpy")
    print(f"       ({exc})")
    sys.exit(2)


def banner(title):
    print("\n" + "=" * 60)
    print(title)
    print("=" * 60)


def list_devices():
    banner("1. AUDIO DEVICES VISIBLE TO THIS SESSION")
    try:
        speakers = sc.all_speakers()
        default_spk = sc.default_speaker()
        print("\nOutput devices (speakers / headsets / redirected):")
        for s in speakers:
            mark = "  <- default" if s.name == default_spk.name else ""
            print(f"   - {s.name}{mark}")
    except Exception as exc:
        print(f"   (could not enumerate speakers: {exc})")

    try:
        mics = sc.all_microphones(include_loopback=True)
        default_mic = sc.default_microphone()
        print("\nInput devices (microphones + loopback):")
        for m in mics:
            kind = "loopback/system" if getattr(m, "isloopback", False) else "microphone"
            mark = "  <- default mic" if m.name == default_mic.name else ""
            print(f"   - [{kind}] {m.name}{mark}")
    except Exception as exc:
        print(f"   (could not enumerate microphones: {exc})")
    # Hints for the AVD-specific question.
    print(
        "\n   (Look for: your headset/Bluetooth device, and an AVD 'Remote Audio' /"
        "\n    redirected device. If system audio only shows as 'Remote Audio', capture"
        "\n    behavior depends on your AVD audio-redirection policy.)"
    )


def level(data):
    if data is None or len(data) == 0:
        return 0.0, 0.0
    mono = data[:, 0] if data.ndim > 1 else data
    peak = float(np.max(np.abs(mono)))
    rms = float(np.sqrt(np.mean(np.square(mono))))
    return peak, rms


def save_wav(path, data):
    mono = data[:, 0] if data.ndim > 1 else data
    pcm = np.clip(mono, -1.0, 1.0)
    pcm16 = (pcm * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(pcm16.tobytes())


def record_microphone():
    banner("2. MICROPHONE CAPTURE  (you / your voice)")
    try:
        mic = sc.default_microphone()
        print(f"   Recording {RECORD_SECONDS}s from: {mic.name}")
        print("   -> SPEAK NOW.")
        with mic.recorder(samplerate=SAMPLE_RATE, channels=1) as rec:
            data = rec.record(numframes=SAMPLE_RATE * RECORD_SECONDS)
        peak, rms = level(data)
        save_wav("mic.wav", data)
        ok = peak > SILENCE_PEAK
        print(f"   peak={peak:.4f} rms={rms:.4f}  -> saved mic.wav")
        print(f"   RESULT: {'PASS - microphone captured' if ok else 'SILENT - no mic signal (check mic permission/redirection)'}")
        return ok, peak
    except Exception as exc:
        print(f"   RESULT: FAIL - could not capture microphone: {exc}")
        return False, 0.0


def record_system():
    banner("3. SYSTEM / LOOPBACK CAPTURE  (them / the meeting audio)")
    print("   -> Make sure audio is PLAYING (Teams call with someone talking, or a video).")
    try:
        spk = sc.default_speaker()
        # The loopback 'microphone' that records the default speaker's output.
        loop = sc.get_microphone(id=str(spk.name), include_loopback=True)
        print(f"   Recording {RECORD_SECONDS}s of system output from: {spk.name}")
        with loop.recorder(samplerate=SAMPLE_RATE, channels=1) as rec:
            data = rec.record(numframes=SAMPLE_RATE * RECORD_SECONDS)
        peak, rms = level(data)
        save_wav("system.wav", data)
        ok = peak > SILENCE_PEAK
        print(f"   peak={peak:.4f} rms={rms:.4f}  -> saved system.wav")
        if ok:
            print("   RESULT: PASS - system/meeting audio captured  (the recorder can hear 'them')")
        else:
            print("   RESULT: SILENT - no system audio captured.")
            print("           Either nothing was playing, OR this AVD does not expose")
            print("           system/loopback audio to apps (the key limitation).")
        return ok, peak
    except Exception as exc:
        print(f"   RESULT: FAIL - loopback capture unavailable: {exc}")
        print("           This AVD likely blocks system-audio capture for apps.")
        return False, 0.0


def main():
    banner("AVD AUDIO CAPTURE PROBE  -  Meeting Voice Assistant feasibility test")
    print("This records a few seconds of your mic and system audio, measures the")
    print("levels, and tells you what a recorder could capture here. No upload.")
    list_devices()
    mic_ok, _ = record_microphone()
    sys_ok, _ = record_system()

    banner("VERDICT")
    print(f"   Microphone (you):        {'YES' if mic_ok else 'NO'}")
    print(f"   System audio (them):     {'YES' if sys_ok else 'NO'}")
    print()
    if mic_ok and sys_ok:
        print("   ==> FULL two-way capture works here. The voice-recorder workflow is")
        print("       feasible: we can record both sides and run STT + AI meeting notes.")
    elif mic_ok and not sys_ok:
        print("   ==> Only YOUR mic is capturable; the OTHER participants (system audio)")
        print("       are not. In this AVD, a recorder could only capture your side.")
        print("       Options: enable AVD audio redirection for apps, or use the meeting")
        print("       host's recording/transcript instead.")
    elif not mic_ok and sys_ok:
        print("   ==> System audio works but the mic did not (permission/redirection).")
    else:
        print("   ==> Neither source captured. Ensure audio was playing and that this")
        print("       AVD permits audio capture, then re-run.")
    print("\n   Listen to mic.wav and system.wav next to this program to confirm.\n")
    input("   Press Enter to exit...")


if __name__ == "__main__":
    main()
