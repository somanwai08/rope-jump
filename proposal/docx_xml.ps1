# docx_xml.ps1 - XML string helpers (ASCII only, dot-sourced by build_docx.ps1)

function XEsc([string]$s) {
    return $s.Replace("&","&amp;").Replace("<","&lt;").Replace(">","&gt;")
}

function RunsOf([string]$text, [bool]$boldAll) {
    $segs = $text -split [regex]::Escape("**")
    $sb = New-Object System.Text.StringBuilder
    for ($i = 0; $i -lt $segs.Count; $i++) {
        if ($segs[$i].Length -eq 0) { continue }
        $b = $boldAll -or (($i % 2) -eq 1)
        [void]$sb.Append("<w:r>")
        if ($b) { [void]$sb.Append("<w:rPr><w:b/></w:rPr>") }
        [void]$sb.Append('<w:t xml:space="preserve">')
        [void]$sb.Append((XEsc $segs[$i]))
        [void]$sb.Append("</w:t></w:r>")
    }
    return $sb.ToString()
}

function Para([string]$style, [string]$text) {
    $pr = ""
    if ($style -ne "") { $pr = '<w:pStyle w:val="' + $style + '"/>' }
    return "<w:p><w:pPr>" + $pr + "</w:pPr>" + (RunsOf $text $false) + "</w:p>"
}

function BorderXml([string]$color) {
    $sides = @("top","left","bottom","right","insideH","insideV")
    $r = ""
    foreach ($s in $sides) {
        $r += '<w:' + $s + ' w:val="single" w:sz="4" w:space="0" w:color="' + $color + '"/>'
    }
    return $r
}
