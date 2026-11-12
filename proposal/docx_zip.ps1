# docx_zip.ps1 - zip writer & validation (ASCII only, dot-sourced by build_docx.ps1)

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function ReadTpl([string]$dir, [string]$n) {
    return [System.IO.File]::ReadAllText((Join-Path $dir $n), [System.Text.Encoding]::UTF8)
}

function WriteDocx([string]$outPath, $map) {
    if (Test-Path -LiteralPath $outPath) { Remove-Item -LiteralPath $outPath -Force }
    $fs  = [System.IO.File]::Open($outPath, [System.IO.FileMode]::CreateNew)
    $zip = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($e in $map) {
            $entry = $zip.CreateEntry($e[0], [System.IO.Compression.CompressionLevel]::Optimal)
            $sw = New-Object System.IO.StreamWriter($entry.Open(), (New-Object System.Text.UTF8Encoding($false)))
            try { $sw.Write($e[1]) } finally { $sw.Dispose() }
        }
    } finally { $zip.Dispose(); $fs.Dispose() }

    if (-not (Test-Path -LiteralPath $outPath)) { throw "docx was not created" }
    $f = Get-Item -LiteralPath $outPath
    Write-Output ("CREATED: " + $f.FullName)
    Write-Output ("SIZE_BYTES: " + $f.Length)

    $za = [System.IO.Compression.ZipFile]::OpenRead($outPath)
    try {
        Write-Output ("ZIP_ENTRIES: " + $za.Entries.Count)
        foreach ($en in $za.Entries) { Write-Output ("  - " + $en.FullName + " (" + $en.Length + " bytes)") }
        $de = $za.GetEntry("word/document.xml")
        $sr = New-Object System.IO.StreamReader($de.Open(), [System.Text.Encoding]::UTF8)
        $txt = $sr.ReadToEnd(); $sr.Dispose()
        Write-Output ("DOC_TABLES: " + ([regex]::Matches($txt, "<w:tbl>")).Count)
        Write-Output ("DOC_PARAGRAPHS: " + ([regex]::Matches($txt, "<w:p>")).Count)
    } finally { $za.Dispose() }
    Write-Output "BUILD_OK"
}
