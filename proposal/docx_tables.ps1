# docx_tables.ps1 - table & pre-block builders (ASCII only, dot-sourced by build_docx.ps1)

$script:tblRows   = @()
$script:tblHeader = $false
$script:tblWidths = @()
$script:preLines  = @()
$script:body      = New-Object System.Text.StringBuilder

function FlushTable {
    if ($script:tblRows.Count -eq 0) { $script:tblWidths = @(); return }
    $n = ($script:tblRows[0]).Count
    $pct = New-Object 'double[]' $n
    $ok = ($script:tblWidths.Count -eq $n)
    for ($i = 0; $i -lt $n; $i++) {
        if ($ok) { $pct[$i] = [double]$script:tblWidths[$i] } else { $pct[$i] = 100.0 / $n }
    }
    $sum = 0.0; for ($i = 0; $i -lt $n; $i++) { $sum += $pct[$i] }
    for ($i = 0; $i -lt $n; $i++) { $pct[$i] = $pct[$i] * 100.0 / $sum }
    $w50  = New-Object 'int[]' $n
    $colw = New-Object 'int[]' $n
    $a50 = 0; $adxa = 0
    for ($i = 0; $i -lt $n - 1; $i++) {
        $w50[$i]  = [int][math]::Round($pct[$i] * 50)
        $colw[$i] = [int][math]::Round(9638 * $pct[$i] / 100.0)
        $a50 += $w50[$i]; $adxa += $colw[$i]
    }
    $w50[$n-1]  = 5000 - $a50
    $colw[$n-1] = 9638 - $adxa

    $t = '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>'
    $t += BorderXml "909090"
    $t += '</w:tblBorders></w:tblPr><w:tblGrid>'
    for ($i = 0; $i -lt $n; $i++) { $t += '<w:gridCol w:w="' + $colw[$i] + '"/>' }
    $t += '</w:tblGrid>'
    $isHead = $script:tblHeader
    $rowIdx = 0
    foreach ($row in $script:tblRows) {
        $t += '<w:tr>'
        $headRow = ($isHead -and $rowIdx -eq 0)
        if ($headRow) { $t += '<w:trPr><w:tblHeader/></w:trPr>' }
        $c = 0
        foreach ($cell in $row) {
            $wv = 0; if ($c -lt $n) { $wv = $w50[$c] }
            $t += '<w:tc><w:tcPr><w:tcW w:w="' + $wv + '" w:type="pct"/>'
            if ($headRow) { $t += '<w:shd w:val="clear" w:color="auto" w:fill="DCE6F1"/>' }
            $t += '</w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr>' + (RunsOf $cell $headRow) + '</w:p></w:tc>'
            $c++
        }
        $t += '</w:tr>'
        $rowIdx++
    }
    $t += '</w:tbl><w:p/>'
    [void]$script:body.Append($t)
    $script:tblRows = @(); $script:tblHeader = $false; $script:tblWidths = @()
}

function FlushPre {
    if ($script:preLines.Count -eq 0) { return }
    $t = '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>'
    $t += BorderXml "CCCCCC"
    $t += '</w:tblBorders><w:shd w:val="clear" w:color="auto" w:fill="F5F5F5"/></w:tblPr>'
    $t += '<w:tblGrid><w:gridCol w:w="9638"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="5000" w:type="pct"/></w:tcPr>'
    foreach ($ln in $script:preLines) {
        $t += '<w:p><w:pPr><w:pStyle w:val="Code"/></w:pPr><w:r><w:t xml:space="preserve">' + (XEsc $ln) + '</w:t></w:r></w:p>'
    }
    $t += '</w:tc></w:tr></w:tbl><w:p/>'
    [void]$script:body.Append($t)
    $script:preLines = @()
}
