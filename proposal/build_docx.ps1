# build_docx.ps1  (ASCII only - PowerShell 5.1 safe)
# Builds the proposal .docx directly as Open XML (zip). No Word COM needed.
# Content: content1.txt..content5.txt (UTF-8). Output name: first line of outname.txt.
# Markup: TITLE| SUBT| SLOG| H2| H3| P| SUB| LI| SP| PRE| TBLW| TBLH| TBL|
#         row cells separated by '::' ; **bold** supported inline.

$ErrorActionPreference = "Stop"
$dir = $PSScriptRoot
. (Join-Path $dir "docx_xml.ps1")
. (Join-Path $dir "docx_tables.ps1")
. (Join-Path $dir "docx_zip.ps1")

$files = Get-ChildItem -LiteralPath $dir -Filter "content*.txt" | Sort-Object Name
if ($files.Count -eq 0) { throw "No content*.txt found in $dir" }
$lines = @()
foreach ($f in $files) { $lines += [System.IO.File]::ReadAllLines($f.FullName, [System.Text.Encoding]::UTF8) }

foreach ($raw in $lines) {
    $line = "$raw".TrimEnd()
    if ($line.Trim().Length -eq 0) { continue }
    $m = $line -split '\|', 2
    if ($m.Count -lt 2) { continue }
    $kind = "$($m[0])".Trim()
    $rest = "$($m[1])"
    if ($kind -eq "TBLW") {
        FlushTable; FlushPre
        $script:tblWidths = @($rest -split '::' | ForEach-Object { [double]$_.Trim() })
    }
    elseif ($kind -eq "TBLH") {
        if ($script:tblRows.Count -eq 0) { FlushPre; $script:tblHeader = $true }
        $script:tblRows += ,@($rest -split '::')
    }
    elseif ($kind -eq "TBL") {
        if ($script:tblRows.Count -eq 0) { FlushPre }
        $script:tblRows += ,@($rest -split '::')
    }
    elseif ($kind -eq "PRE") {
        FlushTable
        $script:preLines += $rest
    }
    else {
        FlushTable; FlushPre
        $p = ""
        if     ($kind -eq "TITLE") { $p = Para "Title"    $rest }
        elseif ($kind -eq "SUBT")  { $p = Para "SubTitle" $rest }
        elseif ($kind -eq "SLOG")  { $p = Para "Slogan"   $rest }
        elseif ($kind -eq "H2")    { $p = Para "Heading2" $rest }
        elseif ($kind -eq "H3")    { $p = Para "Heading3" $rest }
        elseif ($kind -eq "P")     { $p = Para ""         $rest }
        elseif ($kind -eq "SUB")   { $p = Para "Note"     $rest }
        elseif ($kind -eq "LI")    { $p = Para "Bullet"   $rest }
        elseif ($kind -eq "SP")    { $p = '<w:p/>' }
        if ($p -ne "") { [void]$script:body.Append($p) }
    }
}
FlushTable; FlushPre

$docXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
$docXml += $script:body.ToString()
$docXml += '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>'

$xmlCheck = New-Object System.Xml.XmlDocument
$xmlCheck.LoadXml($docXml)   # throws if not well-formed

$outName = ([System.IO.File]::ReadAllLines((Join-Path $dir "outname.txt"), [System.Text.Encoding]::UTF8) | Select-Object -First 1)
$outName = "$outName".Trim()
if ([string]::IsNullOrWhiteSpace($outName)) { throw "outname.txt is empty" }
$outPath = Join-Path $dir $outName

$map = @(
    @("[Content_Types].xml", (ReadTpl $dir "tpl_content_types.xml")),
    @("_rels/.rels",         (ReadTpl $dir "tpl_rels.xml")),
    @("docProps/core.xml",   (ReadTpl $dir "tpl_core.xml")),
    @("docProps/app.xml",    (ReadTpl $dir "tpl_app.xml")),
    @("word/_rels/document.xml.rels", (ReadTpl $dir "tpl_doc_rels.xml")),
    @("word/styles.xml",     (ReadTpl $dir "tpl_styles.xml")),
    @("word/document.xml",   $docXml)
)

WriteDocx $outPath $map
