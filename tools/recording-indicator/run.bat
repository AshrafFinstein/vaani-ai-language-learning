@echo off
REM On-screen recording indicator (uses built-in tkinter; no install needed).
cd /d "%~dp0"
py -3.11 indicator.py 2>nul || py -3 indicator.py 2>nul || python indicator.py
