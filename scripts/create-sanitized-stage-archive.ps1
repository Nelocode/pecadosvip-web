[CmdletBinding()]
param(
    [ValidatePattern('^[a-z0-9][a-z0-9-]{0,63}$')]
    [string]$Stage = 'current'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$archiveDirectory = Join-Path $repoRoot 'stage-archives'
$timestamp = [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmssZ')
$archivePath = Join-Path $archiveDirectory "pecadosvip-source-$Stage-$timestamp.zip"
$repoPrefix = $repoRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$generatedEntryNames = @(
    'LEEME_PRIMERO_SUBIR_PROYECTO.md',
    'INVENTARIO_ARCHIVO_ETAPA.tsv',
    'EXCLUSIONES_ARCHIVO_ETAPA.txt',
    'MANIFIESTO_ARCHIVO_ETAPA.json'
)

function Normalize-ArchivePath {
    param([Parameter(Mandatory)][string]$Path)

    $normalized = $Path.Replace([System.IO.Path]::DirectorySeparatorChar, '/')
    while ($normalized.StartsWith('./', [System.StringComparison]::Ordinal)) {
        $normalized = $normalized.Substring(2)
    }
    return $normalized
}

function Test-ExcludedPath {
    param([Parameter(Mandatory)][string]$RelativePath)

    $normalized = Normalize-ArchivePath -Path $RelativePath
    $excludedPrefixes = @(
        '.git/',
        '.next/',
        '.vinext/',
        '.wrangler/',
        'dist/',
        'node_modules/',
        'output/',
        'stage-archives/'
    )

    foreach ($prefix in $excludedPrefixes) {
        if ($normalized.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            return $true
        }
    }

    if ($normalized -match '(^|/)\.env($|\.)') { return $true }
    if ($normalized -match '(^|/)(backups?|cms-data|local-cms-data|private-data|project-inputs)(/|$)') { return $true }
    if ($normalized -match '(?i)\.(key|pem|p12|pfx|zip)$') { return $true }
    if ($normalized -match '(^|/)(id_rsa|id_ed25519)(\.|$)') { return $true }

    return $false
}

function Add-StringEntry {
    param(
        [Parameter(Mandatory)][System.IO.Compression.ZipArchive]$Archive,
        [Parameter(Mandatory)][string]$EntryName,
        [Parameter(Mandatory)][string]$Content
    )

    $entry = $Archive.CreateEntry($EntryName, [System.IO.Compression.CompressionLevel]::Optimal)
    $stream = $entry.Open()
    $writer = [System.IO.StreamWriter]::new($stream, [System.Text.UTF8Encoding]::new($false))
    try {
        $writer.Write($Content)
    }
    finally {
        $writer.Dispose()
    }
}

$gitRoot = [System.IO.Path]::GetFullPath((git -C $repoRoot rev-parse --show-toplevel).Trim())
if (-not $gitRoot.Equals($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "The script must run inside the expected Git repository: $repoRoot"
}

$gitPaths = @(git -C $repoRoot ls-files --cached --others --exclude-standard)
if ($LASTEXITCODE -ne 0) {
    throw 'git ls-files failed.'
}

$included = [System.Collections.Generic.List[object]]::new()
$excluded = [System.Collections.Generic.List[string]]::new()
$seen = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
$totalBytes = 0L
$maximumFileBytes = 64MB
$maximumArchiveSourceBytes = 400MB

foreach ($relativePath in $gitPaths) {
    if ([string]::IsNullOrWhiteSpace($relativePath)) { continue }
    $normalized = Normalize-ArchivePath -Path $relativePath

    if ($generatedEntryNames -contains $normalized) {
        $excluded.Add("$normalized (regenerated for this archive)")
        continue
    }

    if (Test-ExcludedPath -RelativePath $normalized) {
        $excluded.Add($normalized)
        continue
    }

    if ([System.IO.Path]::IsPathRooted($normalized) -or $normalized -match '(^|/)\.\.(/|$)') {
        throw "Unsafe candidate path: $normalized"
    }

    $absolutePath = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $normalized))
    if (-not $absolutePath.StartsWith($repoPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Candidate escapes the repository: $normalized"
    }

    if (-not (Test-Path -LiteralPath $absolutePath -PathType Leaf)) {
        $excluded.Add("$normalized (deleted or unavailable in the working tree)")
        continue
    }

    $item = Get-Item -LiteralPath $absolutePath -Force
    if ($item.PSIsContainer) { continue }
    if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw "Reparse points are not allowed in the source archive: $normalized"
    }
    if ($item.Length -gt $maximumFileBytes) {
        throw "File exceeds the 64 MiB source-archive limit: $normalized"
    }
    if (-not $seen.Add($normalized)) {
        throw "Duplicate archive path: $normalized"
    }

    $totalBytes += $item.Length
    if ($totalBytes -gt $maximumArchiveSourceBytes) {
        throw 'The selected source exceeds the 400 MiB aggregate limit.'
    }

    $included.Add([pscustomobject]@{
        Path = $normalized
        AbsolutePath = $absolutePath
        Bytes = $item.Length
        Sha256 = (Get-FileHash -LiteralPath $absolutePath -Algorithm SHA256).Hash.ToUpperInvariant()
    })
}

if ($included.Count -eq 0) {
    throw 'No source files were selected.'
}

$textExtensions = [System.Collections.Generic.HashSet[string]]::new(
    [string[]]@('.css', '.csv', '.html', '.js', '.json', '.lock', '.md', '.mjs', '.ps1', '.svg', '.toml', '.ts', '.tsx', '.txt', '.xml', '.yaml', '.yml'),
    [System.StringComparer]::OrdinalIgnoreCase
)
$secretPatterns = @(
    '-----BEGIN (?:RSA |OPENSSH |EC |DSA |PGP )?PRIVATE KEY-----',
    '(?<![A-Z0-9])AKIA[A-Z0-9]{16}(?![A-Z0-9])',
    '(?<![A-Za-z0-9])gh[pousr]_[A-Za-z0-9]{30,}(?![A-Za-z0-9])',
    '(?<![A-Za-z0-9])sk-(?:proj-)?[A-Za-z0-9_-]{24,}(?![A-Za-z0-9_-])'
)

foreach ($file in $included) {
    $extension = [System.IO.Path]::GetExtension($file.Path)
    if (-not $textExtensions.Contains($extension) -or $file.Bytes -gt 5MB) { continue }
    $content = [System.IO.File]::ReadAllText($file.AbsolutePath)
    foreach ($pattern in $secretPatterns) {
        if ($content -match $pattern) {
            throw "High-confidence secret pattern detected in $($file.Path)."
        }
    }
}

New-Item -ItemType Directory -Path $archiveDirectory -Force | Out-Null
if (Test-Path -LiteralPath $archivePath) {
    throw "Refusing to overwrite an existing archive: $archivePath"
}

$branch = (git -C $repoRoot branch --show-current).Trim()
$head = (git -C $repoRoot rev-parse HEAD).Trim()
$remote = (git -C $repoRoot remote get-url origin 2>$null)
if ($LASTEXITCODE -ne 0) { $remote = 'NO_CONFIGURADO' }
$remote = "$remote".Trim()
$dirty = -not [string]::IsNullOrWhiteSpace((git -C $repoRoot status --short))

$simpleGuide = @"
# LEEME PRIMERO — subir PecadosVip sin complicaciones

Este ZIP es una copia **sanitizada y solo de código/recursos del proyecto**. No contiene .git, dependencias instaladas, builds, outputs de auditoría, archivos .env, credenciales, datos CMS reales, backups ni ZIPs anteriores.

## Opción A — subir a GitHub

1. Descomprime este ZIP en una carpeta nueva.
2. Abre PowerShell dentro de esa carpeta.
3. Ejecuta:

    git init
    git add .
    git commit -m "Actualizar proyecto PecadosVip"
    git branch -M main
    git remote add origin https://github.com/Nelocode/pecadosvip.git
    git push -u origin main

Si el repositorio ya existe y no está vacío, clónalo primero y copia dentro el contenido descomprimido; no uses push --force.

## Opción B — ejecutar y revisar localmente

    corepack enable
    pnpm install --frozen-lockfile
    pnpm run dev

Abre http://localhost:3000/es. También están disponibles /en, /fr y /it.
El preview interno /preview-local-sintetico sigue reservado al modo de desarrollo.

## Opción C — EasyPanel con Dockerfile

1. Conecta el repositorio de GitHub a EasyPanel.
2. Selecciona la rama correcta.
3. Usa **Dockerfile** en la raíz y expón el puerto 3000.
4. Configura los valores NEXT_PUBLIC_* durante el build; cambiarlos solo en runtime no recompila el cliente.
5. Revisa el healthcheck y los logs antes de asociar dominio/TLS.

Importante: el build público sirve una **beta sintética y no indexable**. Permite navegar por inicio, perfiles y servicios en cuatro idiomas, pero mantiene desactivados contacto, reservas, pagos y analítica. No constituye activación comercial. Antes de ofrecer servicios reales hacen falta contenido aprobado, derechos/consentimientos, textos legales, revisión lingüística humana, UAT y autorizaciones separadas para canales comerciales e indexación.

## Estado de esta copia

- Rama local observada: $branch
- HEAD base: $head
- Remoto observado: $remote
- Árbol con cambios locales incluidos: $dirty
- Fecha UTC: $timestamp

---

## Guía técnica completa del repositorio

"@
if (
    $simpleGuide.IndexOf([char]0x00C3) -ge 0 -or
    $simpleGuide.IndexOf([char]0x00E2) -ge 0
) {
    # Windows PowerShell 5.1 may parse a UTF-8 script without BOM as Windows-1252.
    # Repair that source-decoding artifact before writing the UTF-8 guide into the ZIP.
    $simpleGuide = [System.Text.Encoding]::UTF8.GetString(
        [System.Text.Encoding]::GetEncoding(1252).GetBytes($simpleGuide)
    )
}
$fullGuide = [System.IO.File]::ReadAllText((Join-Path $repoRoot 'SUBIR_PROYECTO.md'))
$guide = $simpleGuide + $fullGuide

$inventoryLines = [System.Collections.Generic.List[string]]::new()
$inventoryLines.Add("path`tbytes`tsha256")
foreach ($file in $included) {
    $inventoryLines.Add("$($file.Path)`t$($file.Bytes)`t$($file.Sha256)")
}
$inventory = ($inventoryLines -join "`n") + "`n"

$exclusionReport = @(
    'Excluded by policy:',
    '- .git, node_modules, .next, .vinext, .wrangler, dist',
    '- output and previous stage-archives',
    '- .env files, private-key containers and ZIPs',
    '- local CMS data, backups, private data and external project inputs',
    '',
    'Candidate paths skipped:'
) + @($excluded | Sort-Object -Unique)
$exclusionText = ($exclusionReport -join "`n") + "`n"

$manifest = [ordered]@{
    schema = 'pecadosvip.sanitized-source-stage'
    version = 1
    stage = $Stage
    createdAtUtc = [DateTime]::UtcNow.ToString('o')
    branch = $branch
    head = $head
    remote = $remote
    includesLocalChanges = $dirty
    publicSyntheticBeta = $true
    commercialProductionActivation = $false
    indexingEnabled = $false
    productionActivation = $false
    sourceFileCount = $included.Count
    sourceBytes = $totalBytes
    requiredFirstRead = 'LEEME_PRIMERO_SUBIR_PROYECTO.md'
    exclusions = @('.git', 'dependencies', 'builds', 'output', 'archives', '.env', 'credentials', 'CMS data', 'backups', 'external project inputs')
}
$manifestJson = ($manifest | ConvertTo-Json -Depth 4) + "`n"

Add-Type -AssemblyName System.IO.Compression
$archiveStream = [System.IO.File]::Open($archivePath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
$archive = [System.IO.Compression.ZipArchive]::new($archiveStream, [System.IO.Compression.ZipArchiveMode]::Create, $false)
try {
    foreach ($file in $included) {
        $entry = $archive.CreateEntry($file.Path, [System.IO.Compression.CompressionLevel]::Optimal)
        $entryStream = $entry.Open()
        $sourceStream = [System.IO.File]::OpenRead($file.AbsolutePath)
        try {
            $sourceStream.CopyTo($entryStream)
        }
        finally {
            $sourceStream.Dispose()
            $entryStream.Dispose()
        }
    }

    Add-StringEntry -Archive $archive -EntryName 'LEEME_PRIMERO_SUBIR_PROYECTO.md' -Content $guide
    Add-StringEntry -Archive $archive -EntryName 'INVENTARIO_ARCHIVO_ETAPA.tsv' -Content $inventory
    Add-StringEntry -Archive $archive -EntryName 'EXCLUSIONES_ARCHIVO_ETAPA.txt' -Content $exclusionText
    Add-StringEntry -Archive $archive -EntryName 'MANIFIESTO_ARCHIVO_ETAPA.json' -Content $manifestJson
}
finally {
    $archive.Dispose()
    $archiveStream.Dispose()
}

$verificationStream = [System.IO.File]::OpenRead($archivePath)
$verificationArchive = [System.IO.Compression.ZipArchive]::new($verificationStream, [System.IO.Compression.ZipArchiveMode]::Read, $false)
try {
    $entryNames = @($verificationArchive.Entries | ForEach-Object { $_.FullName })
    if ($entryNames.Count -ne ($included.Count + 4)) {
        throw 'Archive entry count does not match the source inventory.'
    }
    if (($entryNames | Sort-Object -Unique).Count -ne $entryNames.Count) {
        throw 'Archive contains duplicate entry names.'
    }
    foreach ($entryName in $entryNames) {
        if ([System.IO.Path]::IsPathRooted($entryName) -or $entryName -match '(^|/)\.\.(/|$)' -or $entryName.Contains('\')) {
            throw "Unsafe ZIP entry: $entryName"
        }
        if (Test-ExcludedPath -RelativePath $entryName) {
            throw "Excluded entry was added to the ZIP: $entryName"
        }
    }
    foreach ($required in $generatedEntryNames) {
        if ($entryNames -notcontains $required) {
            throw "Required ZIP entry is missing: $required"
        }
    }
}
finally {
    $verificationArchive.Dispose()
    $verificationStream.Dispose()
}

$archiveInfo = Get-Item -LiteralPath $archivePath
$archiveHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToUpperInvariant()

[ordered]@{
    result = 'sanitized-source-stage-created'
    archivePath = $archiveInfo.FullName
    archiveBytes = $archiveInfo.Length
    archiveSha256 = $archiveHash
    sourceFileCount = $included.Count
    sourceBytes = $totalBytes
    excludedCandidateCount = $excluded.Count
    branch = $branch
    head = $head
    includesLocalChanges = $dirty
    publicSyntheticBeta = $true
    commercialProductionActivation = $false
    indexingEnabled = $false
    productionActivation = $false
} | ConvertTo-Json -Depth 3
