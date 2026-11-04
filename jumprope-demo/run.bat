@echo off
rem run.bat - start the Air Jump Rope demo server and open the browser (ASCII only)
cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:8000/"
  echo Starting server with Python... press Ctrl+C to stop.
  python -m http.server 8000
  goto :eof
)

where py >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:8000/"
  echo Starting server with Python launcher... press Ctrl+C to stop.
  py -3 -m http.server 8000
  goto :eof
)

echo Python not found - using built-in PowerShell server...
start "" "http://localhost:8000/"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
