#!/usr/bin/env bash
# vendor_download.sh - fetch MediaPipe runtime + pose model for offline use (macOS/Linux)
set -u
cd "$(dirname "$0")"
mkdir -p vendor/tasks-vision/wasm assets/models

BASE="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14"
MODEL="https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"

fetch() {
  if curl -fsSL --retry 2 -o "$2" "$1"; then
    echo "OK   $(basename "$2")  $(wc -c < "$2" | tr -d ' ') bytes"
  else
    echo "FAIL $(basename "$1")"
  fi
}

fetch "$BASE/vision_bundle.mjs"                     "vendor/tasks-vision/vision_bundle.mjs"
fetch "$BASE/wasm/vision_wasm_internal.js"          "vendor/tasks-vision/wasm/vision_wasm_internal.js"
fetch "$BASE/wasm/vision_wasm_internal.wasm"        "vendor/tasks-vision/wasm/vision_wasm_internal.wasm"
fetch "$BASE/wasm/vision_wasm_nosimd_internal.js"   "vendor/tasks-vision/wasm/vision_wasm_nosimd_internal.js"
fetch "$BASE/wasm/vision_wasm_nosimd_internal.wasm" "vendor/tasks-vision/wasm/vision_wasm_nosimd_internal.wasm"
fetch "$MODEL"                                      "assets/models/pose_landmarker_lite.task"
echo "DONE"
