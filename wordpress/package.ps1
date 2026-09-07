[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$wpRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$repoRoot = [IO.Path]::GetFullPath((Join-Path $wpRoot '..'))
$themeRoot = Join-Path $wpRoot 'dist\pecadosvip'
$pluginRoot = Join-Path $wpRoot 'dist\pecadosvip-content'
if (!(Test-Path -LiteralPath (Join-Path $themeRoot 'content\manifest.json'))) { throw 'Primero ejecuta npm run build.' }
Push-Location $wpRoot
try { node verify-native.mjs; if ($LASTEXITCODE -ne 0) { throw 'No se ha superado la verificación del tema y del plugin.' } } finally { Pop-Location }
$stamp = [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmssZ')
$archiveRoot = Join-Path $repoRoot 'stage-archives'
[IO.Directory]::CreateDirectory($archiveRoot) | Out-Null
$themeZip = Join-Path $archiveRoot "pecadosvip-wordpress-tema-$stamp.zip"
$pluginZip = Join-Path $archiveRoot "pecadosvip-wordpress-contenidos-$stamp.zip"
$sourceZip = Join-Path $archiveRoot "pecadosvip-proyecto-completo-wordpress-$stamp.zip"

function Add-FileToZip($archive, [string]$path, [string]$entry) {
    if ($entry.Contains('..') -or $entry.StartsWith('/')) { throw "Ruta inválida: $entry" }
    if ((Get-Item -LiteralPath $path).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Enlace no permitido: $path" }
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $path, $entry.Replace('\','/'), [IO.Compression.CompressionLevel]::Fastest) | Out-Null
}
function Add-TextToZip($archive, [string]$entry, [string]$text) {
    $item = $archive.CreateEntry($entry, [IO.Compression.CompressionLevel]::Fastest)
    $writer = [IO.StreamWriter]::new($item.Open(), [Text.UTF8Encoding]::new($false))
    try { $writer.Write($text) } finally { $writer.Dispose() }
}
function Get-ArchiveHash([string]$path) {
    $stream = [IO.File]::OpenRead($path)
    $hasher = [Security.Cryptography.SHA256]::Create()
    try { [BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-','') }
    finally { $stream.Dispose(); $hasher.Dispose() }
}

$themeFiles = @(Get-ChildItem -LiteralPath $themeRoot -File -Recurse)
$pluginFiles = @(Get-ChildItem -LiteralPath $pluginRoot -File -Recurse)
$zip = [IO.Compression.ZipFile]::Open($themeZip, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in $themeFiles) {
        $relative = $file.FullName.Substring($themeRoot.Length + 1)
        Add-FileToZip $zip $file.FullName "pecadosvip/$relative"
    }
    Add-FileToZip $zip (Join-Path $wpRoot 'LEEME_PRIMERO.md') 'pecadosvip/LEEME_PRIMERO.md'
} finally { $zip.Dispose() }

$zip = [IO.Compression.ZipFile]::Open($pluginZip, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in $pluginFiles) {
        $relative = $file.FullName.Substring($pluginRoot.Length + 1)
        Add-FileToZip $zip $file.FullName "pecadosvip-content/$relative"
    }
} finally { $zip.Dispose() }

$manifestInfo = node (Join-Path $wpRoot 'artifact-info.mjs') (Join-Path $themeRoot 'content\manifest.json')
if ($LASTEXITCODE -ne 0) { throw 'No se pudo leer el manifiesto.' }
$manifest = $manifestInfo | ConvertFrom-Json
$ownGit = $false
if (Test-Path -LiteralPath (Join-Path $repoRoot '.git')) {
    $gitTop = git -C $repoRoot rev-parse --show-toplevel 2>$null
    $ownGit = $LASTEXITCODE -eq 0 -and [IO.Path]::GetFullPath($gitTop.Trim()).Equals($repoRoot, [StringComparison]::OrdinalIgnoreCase)
}
if ($ownGit) {
    $sourcePaths = @(git -C $repoRoot -c core.quotepath=false ls-files --cached --others --exclude-standard)
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo inventariar Git.' }
} else {
    function Get-SourcePaths([string]$folder) {
        foreach ($item in Get-ChildItem -LiteralPath $folder -Force) {
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { continue }
            if ($item.PSIsContainer) {
                if ($item.Name -notin @('node_modules','.git','.build','dist','output','outputs','stage-archives')) { Get-SourcePaths $item.FullName }
            } else { $item.FullName.Substring($repoRoot.Length + 1).Replace('\','/') }
        }
    }
    $sourcePaths = @(Get-SourcePaths $repoRoot)
}
$zip = [IO.Compression.ZipFile]::Open($sourceZip, [IO.Compression.ZipArchiveMode]::Create)
$seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
try {
    foreach ($relative in $sourcePaths) {
        if ($relative -in @('MANIFIESTO_WORDPRESS.json', 'LEEME_PRIMERO_WORDPRESS.md')) { continue }
        if ($relative -match '(^|/)(node_modules|\.git|stage-archives|\.build|dist|output|outputs)(/|$)' -or
            $relative -match '(^|/)\.env(\.|$)' -and $relative -notmatch '\.env\.example$' -or
            $relative -match '(?i)\.(zip|pem|key|pfx|p12)$') { continue }
        $file = Join-Path $repoRoot $relative
        if ((Test-Path -LiteralPath $file -PathType Leaf) -and $seen.Add($relative)) { Add-FileToZip $zip $file $relative }
    }
    foreach ($file in $themeFiles) {
        $relative = 'wordpress/dist/pecadosvip/' + $file.FullName.Substring($themeRoot.Length + 1).Replace('\','/')
        if ($seen.Add($relative)) { Add-FileToZip $zip $file.FullName $relative }
    }
    foreach ($file in $pluginFiles) {
        $relative = 'wordpress/dist/pecadosvip-content/' + $file.FullName.Substring($pluginRoot.Length + 1).Replace('\','/')
        if ($seen.Add($relative)) { Add-FileToZip $zip $file.FullName $relative }
    }
    Add-FileToZip $zip (Join-Path $wpRoot 'LEEME_PRIMERO.md') 'LEEME_PRIMERO_WORDPRESS.md'
    $info = [ordered]@{
        generatedAt = [DateTime]::UtcNow.ToString('o')
        sourceCommit = $manifest.sourceCommit
        seedRecordCount = $manifest.recordCount
        mode = $manifest.mode
        editorialSource = 'Base de datos de WordPress despues de importar; no sincroniza con el CMS original.'
        originalApplicationAndBackendChanged = $false
        originalBuildConfigChanges = @('tsconfig.json: excluir wordpress', 'eslint.config.mjs: excluir wordpress/**')
        wordpressRuntime = 'Consultar wordpress/VALIDACION.md: el build estatico no certifica las pruebas runtime.'
        excludes = @('node_modules', '.git', 'secretos .env', 'datos locales CMS', 'ZIP anteriores', 'resultados temporales')
        themeZipSha256 = Get-ArchiveHash $themeZip
        pluginZipSha256 = Get-ArchiveHash $pluginZip
        liveDatabaseIncluded = $false
        liveUploadsIncluded = $false
    } | ConvertTo-Json -Depth 5
    Add-TextToZip $zip 'MANIFIESTO_WORDPRESS.json' $info
} finally { $zip.Dispose() }

foreach ($file in @($themeZip, $pluginZip, $sourceZip)) {
    $check = [IO.Compression.ZipFile]::OpenRead($file)
    try {
        if ($check.Entries.Count -lt 1) { throw 'ZIP vacío.' }
        if ($file -eq $pluginZip -and !$check.GetEntry('pecadosvip-content/pecadosvip-content.php')) { throw 'Falta el plugin instalable.' }
        if ($file -eq $themeZip -and !$check.GetEntry('pecadosvip/content/seed.json')) { throw 'Falta el contenido inicial.' }
        if ($file -eq $sourceZip -and !$check.GetEntry('MANIFIESTO_WORDPRESS.json')) { throw 'Falta el manifiesto.' }
        $names = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
        foreach ($entry in $check.Entries) {
            if (!$names.Add($entry.FullName) -or $entry.FullName.Contains('..') -or $entry.FullName.StartsWith('/')) { throw 'ZIP con ruta no válida.' }
            $stream = $entry.Open()
            try { $stream.CopyTo([IO.Stream]::Null) } finally { $stream.Dispose() }
        }
        [pscustomobject]@{ Path=$file; Entries=$check.Entries.Count; Bytes=(Get-Item -LiteralPath $file).Length; SHA256=(Get-ArchiveHash $file) } | ConvertTo-Json
    } finally { $check.Dispose() }
}
