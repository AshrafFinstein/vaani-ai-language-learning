@echo off
REM Vaani Meeting Recorder (mic-first). Double-click inside your AVD session.
setlocal
cd /d "%~dp0"

set "PY="
py -3.11 --version >nul 2>&1 && set "PY=py -3.11"
if not defined PY ( py -3 --version >nul 2>&1 && set "PY=py -3" )
if not defined PY ( python --version >nul 2>&1 && set "PY=python" )
if not defined PY (
  echo   No Python found. Install Python 3.11+ from https://www.python.org/downloads/
  echo   ^(tick "Add python.exe to PATH"^), then run again.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" ( %PY% -m venv .venv )
".venv\Scripts\python.exe" -m pip install --quiet --upgrade pip
".venv\Scripts\python.exe" -m pip install --quiet -r requirements.txt
if errorlevel 1 ( echo   Could not install dependencies. & pause & exit /b 1 )

".venv\Scripts\python.exe" recorder.py
endlocal
