@echo off
rem run.bat - start the Air Jump Rope demo server and open the browser (ASCII only)
cd /d "%~dp0"

rem 1) Python launcher (real installs usually have it)
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 -c "import sys; sys.exit(0 if sys.version_info>=(3,0) else 1)" >nul 2>nul
  if not errorlevel 1 (
    start "" "http://localhost:8000/"
    echo Starting server with Python launcher... press Ctrl+C to stop.
    py -3 server.py 8000
    goto :eof
  )
)

rem 2) python on PATH - beware the Microsoft Store alias stub
where python >nul 2>nul
if %errorlevel%==0 (
  python -c "import sys; sys.exit(0 if sys.version_info>=(3,0) else 1)" >nul 2>nul
  if not errorlevel 1 (
    start "" "http://localhost:8000/"
    echo Starting server with Python... press Ctrl+C to stop.
    python server.py 8000
    goto :eof
  )
)

rem 3) No usable Python - built-in PowerShell server (zero dependencies)
echo Python 3 not found - using built-in PowerShell server...
start "" "http://localhost:8000/"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
