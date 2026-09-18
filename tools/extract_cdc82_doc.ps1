$ErrorActionPreference = 'Stop'
# Liệt kê bằng .NET để tránh lỗi mã hóa tiếng Việt trong console
$files = [System.IO.Directory]::EnumerateFiles('D:\Teacher OS\HSG', '*.doc')
$src = $null
foreach ($f in $files) {
    $name = [System.IO.Path]::GetFileName($f)
    if ($name -like 'CDC82*') { $src = $f; break }
}
if (-not $src) {
    # dump danh sách file bắt đầu CDC để chẩn đoán
    $all = [System.IO.Directory]::EnumerateFiles('D:\Teacher OS\HSG') | Where-Object { [System.IO.Path]::GetFileName($_) -like 'CDC*' }
    [System.IO.File]::WriteAllLines('C:\Users\Gauu\.openclaw\workspace\teacher-os-chat-expert\hsg_slider\out\cdc82_diag.txt', $all, (New-Object System.Text.UTF8Encoding($false)))
    Write-Output 'NOT_FOUND_DUMPED'
    exit 1
}
$out = 'C:\Users\Gauu\.openclaw\workspace\teacher-os-chat-expert\hsg_slider\extracted\CDC82_chu_quyen_bien_dong.txt'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($src, $false, $true)
    $tmp = Join-Path $env:TEMP 'cdc82_export.txt'
    $doc.SaveAs([ref]$tmp, [ref]7)  # wdFormatEncodedText (7) -> UTF-16 with BOM
    $doc.Close($false)
    $content = [System.IO.File]::ReadAllText($tmp, [System.Text.Encoding]::Unicode)
    [System.IO.File]::WriteAllText($out, $content, (New-Object System.Text.UTF8Encoding($false)))
    Remove-Item $tmp -ErrorAction SilentlyContinue
    Write-Output "OK $out ($($content.Length) chars)"
} finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
