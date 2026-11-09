#!/usr/bin/env bash
# run.sh - start the Air Jump Rope demo server and open the browser (macOS / Linux)
cd "$(dirname "$0")" || exit 1
PORT=8000
URL="http://localhost:$PORT/"

open_browser() {
  if command -v open >/dev/null 2>&1; then
    open "$URL"                       # macOS
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL"                   # Linux
  else
    echo "Open $URL in your browser."
  fi
}

echo "Starting server at $URL  (Ctrl+C to stop)"
if command -v python3 >/dev/null 2>&1; then
  open_browser
  python3 server.py "$PORT"
elif command -v python >/dev/null 2>&1; then
  open_browser
  python server.py "$PORT"
elif command -v node >/dev/null 2>&1; then
  open_browser
  node server.cjs "$PORT"
else
  echo "ERROR: python3 / python / node were not found."
  echo "Install one of them first (macOS: brew install python3) and run again."
  exit 1
fi
