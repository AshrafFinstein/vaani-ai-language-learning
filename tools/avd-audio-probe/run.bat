@echo off
REM ============================================================
REM  AVD Audio Capture Probe - one-click runner
REM  Double-click this file inside your AVD session.
REM  Have a Teams call (someone talking) or a video PLAYING first.
REM ============================================================
setlocal
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 (
  echo.
  echo   Python was not found on this machine.
  echo   Install Python 3.11+ from https://www.python.org/downloads/
  echo   ^(tick "Add python.exe to PATH" during install^), then run this again.
  echo.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo   First run: creating a local Python environment...
  python -m venv .venv
)

call ".venv\Scripts\activate.bat"
echo   Installing dependencies (first run only)...
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt
if errorlevel 1 (
  echo   Could not install dependencies ^(no internet?^). See README.md.
  pause
  exit /b 1
)

echo.
echo   Starting the probe. PLAY SOME AUDIO NOW (Teams call / video).
echo.
python avd_audio_probe.py
endlocal
