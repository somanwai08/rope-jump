# vendor_download.ps1 - fetch MediaPipe Tasks Vision runtime + pose model for offline use (ASCII only)
$ErrorActionPreference = "Continue"
$dir = $PSScriptRoot
$wasmDir = Join-Path $dir "vendor\tasks-vision\wasm"
$modelDir = Join-Path $dir "assets\models"
New-Item -ItemType Directory -Force -Path $wasmDir, $modelDir | Out-Null
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14"
$files = @(
  @{ u = "$base/vision_bundle.mjs";                    o = Join-Path $dir "vendor\tasks-vision\vision_bundle.mjs" },
  @{ u = "$base/wasm/vision_wasm_internal.js";         o = Join-Path $wasmDir "vision_wasm_internal.js" },
  @{ u = "$base/wasm/vision_wasm_internal.wasm";       o = Join-Path $wasmDir "vision_wasm_internal.wasm" },
  @{ u = "$base/wasm/vision_wasm_nosimd_internal.js";  o = Join-Path $wasmDir "vision_wasm_nosimd_internal.js" },
  @{ u = "$base/wasm/vision_wasm_nosimd_internal.wasm";o = Join-Path $wasmDir "vision_wasm_nosimd_internal.wasm" },
  @{ u = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"; o = Join-Path $modelDir "pose_landmarker_lite.task" }
)
foreach ($f in $files) {
  try {
    Invoke-WebRequest -Uri $f.u -OutFile $f.o -UseBasicParsing -TimeoutSec 300
    "OK   {0}  {1:N0} bytes" -f (Split-Path $f.o -Leaf), (Get-Item $f.o).Length
  } catch {
    "FAIL {0} : {1}" -f (Split-Path $f.u -Leaf), $_.Exception.Message
  }
}
"DONE"
