#!/usr/bin/env python3
"""Tiny static file server with correct MIME types for the MediaPipe demo.

Usage: python3 server.py [port]   (default port: 8000)
Works on Windows / macOS / Linux with Python 3.7+ (no dependencies).
"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)

# MediaPipe needs text/javascript for .mjs and application/wasm for .wasm.
# (python -m http.server may serve .mjs with the wrong MIME on older Pythons,
# which makes the browser reject the ES module - so we ship our own server.)
SimpleHTTPRequestHandler.extensions_map.update({
    ".mjs": "text/javascript",
    ".js": "text/javascript",
    ".wasm": "application/wasm",
    ".task": "application/octet-stream",
    ".css": "text/css",
    ".json": "application/json",
    ".html": "text/html",
})

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print("Serving {} at http://localhost:{}/  (Ctrl+C to stop)".format(ROOT, port))
    try:
        ThreadingHTTPServer(("127.0.0.1", port), SimpleHTTPRequestHandler).serve_forever()
    except KeyboardInterrupt:
        pass
