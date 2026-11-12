$files = Get-ChildItem "e:\ANTIGRAVITY\Smart governance\*.html"
foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName)
    $changed = $false

    if ($content -notmatch 'responsive\.css') {
        $content = $content.Replace('</head>', "    <link rel=`"stylesheet`" href=`"assets/css/responsive.css`">`n</head>")
        $changed = $true
    }
    if ($content -notmatch 'responsive\.js') {
        $content = $content.Replace('</body>', "    <script src=`"assets/js/responsive.js`"></script>`n</body>")
        $changed = $true
    }

    if ($changed) {
        [System.IO.File]::WriteAllText($f.FullName, $content)
        Write-Output "Fixed: $($f.Name)"
    } else {
        Write-Output "OK: $($f.Name)"
    }
}
