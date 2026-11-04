# serve.ps1 - zero-dependency static file server for the demo (ASCII only)
# Works on any Windows box (uses .NET TcpListener; no Python/Node needed).
# Usage:  powershell -ExecutionPolicy Bypass -File serve.ps1
# Then open http://localhost:8000/

$ErrorActionPreference = "Continue"
$root = $PSScriptRoot
$port = 8000

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".htm"  = "text/html; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".mjs"  = "text/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".json" = "application/json"
  ".wasm" = "application/wasm"
  ".task" = "application/octet-stream"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
  ".txt"  = "text/plain; charset=utf-8"
  ".md"   = "text/plain; charset=utf-8"
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $port)
$listener.Start()
Write-Output ("Serving " + $root)
Write-Output ("Open http://localhost:" + $port + "/  (Ctrl+C to stop)")

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $client.ReceiveTimeout = 5000
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $reqLine = $reader.ReadLine()
    if ($reqLine -and $reqLine -match "^GET\s+(\S+)\s+HTTP") {
      $urlPath = $Matches[1].Split("?")[0]
      if ($urlPath -eq "/") { $urlPath = "/index.html" }
      $rel = [System.Uri]::UnescapeDataString($urlPath).Replace("/", "\").TrimStart("\")
      $full = Join-Path $root $rel
      $rootFull = (Get-Item $root).FullName
      $isFile = (Test-Path -LiteralPath $full -PathType Leaf)
      $inside = $false
      if ($isFile) { $inside = ((Get-Item -LiteralPath $full).FullName).StartsWith($rootFull) }
      if (-not ($isFile -and $inside)) {
        $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $hdr = "HTTP/1.1 404 Not Found`r`nContent-Length: " + $body.Length + "`r`nConnection: close`r`n`r`n"
        $hb = [System.Text.Encoding]::ASCII.GetBytes($hdr)
        $stream.Write($hb, 0, $hb.Length)
        $stream.Write($body, 0, $body.Length)
      } else {
        $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
        $ct = "application/octet-stream"
        if ($mime.ContainsKey($ext)) { $ct = $mime[$ext] }
        $bytes = [System.IO.File]::ReadAllBytes($full)
        $hdr = "HTTP/1.1 200 OK`r`nContent-Type: " + $ct + "`r`nContent-Length: " + $bytes.Length + "`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
        $hb = [System.Text.Encoding]::ASCII.GetBytes($hdr)
        $stream.Write($hb, 0, $hb.Length)
        $stream.Write($bytes, 0, $bytes.Length)
      }
      $stream.Flush()
    }
  } catch {
    Write-Output ("ERR: " + $_.Exception.Message)
  } finally {
    $client.Close()
  }
}
