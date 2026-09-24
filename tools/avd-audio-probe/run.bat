@echo off
REM ============================================================
REM  AVD Audio Capture Probe - one-click runner
REM  Double-click this file inside your AVD session.
REM  Have a Teams call (someone talking) or a video PLAYING first.
REM ============================================================
setlocal
cd /d "%~dp0"

REM --- Find a Python: prefer the 'py' launcher (3.11), then py -3, then python.exe ---
set "PY="
py -3.11 --version >nul 2>&1 && set "PY=py -3.11"
if not defined PY ( py -3 --version >nul 2>&1 && set "PY=py -3" )
if not defined PY ( python --version >nul 2>&1 && set "PY=python" )
if not defined PY (
  if exist "C:\Program Files\Python311\python.exe" set "PY=""C:\Program Files\Python311\python.exe"""
)
if not defined PY (
  echo.
  echo   No usable Python found.
  echo   Install Python 3.11+ from https://www.python.org/downloads/
  echo   ^(tick "Add python.exe to PATH" during install^), then run this again.
  echo.
  pause
  exit /b 1
)
echo   Using Python via: %PY%

if not exist ".venv\Scripts\python.exe" (
  echo   First run: creating a local Python environment...
  %PY% -m venv .venv
)
if not exist ".venv\Scripts\python.exe" (
  echo   Could not create the environment. See README.md.
  pause
  exit /b 1
)

echo   Installing dependencies (first run only)...
".venv\Scripts\python.exe" -m pip install --quiet --upgrade pip
".venv\Scripts\python.exe" -m pip install --quiet -r requirements.txt
if errorlevel 1 (
  echo   Could not install dependencies ^(no internet?^). See README.md.
  pause
  exit /b 1
)

echo.
echo   Starting the probe. PLAY SOME AUDIO NOW (Teams call / video).
echo.
".venv\Scripts\python.exe" avd_audio_probe.py
endlocal
