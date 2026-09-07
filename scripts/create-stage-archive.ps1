#requires -Version 7.0

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$')]
    [string]$Stage,

    [Parameter()]
    [string]$OutputPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$InputRoot = 'C:\Users\artot\OneDrive\Desktop\Página_Web'
$KnownPastedRequest = 'C:\Users\artot\.codex\attachments\735e9299-6e6f-4fc5-823f-0f6c7d513792\pasted-text.txt'
$ExpectedInputCount = 8
$MaximumFileBytes = 128MB
$MaximumArchiveSourceBytes = 512MB
$MaximumTextScanBytes = 4MB
$ExpectedTrackedPlaywrightEvidenceCount = 5
$ExpectedFinalEvidenceCount = 63
$TrackedPlaywrightEvidence = @(
    'output/playwright/pv95/production-holding-1920.png',
    'output/playwright/pv95/production-holding-320.png',
    'output/playwright/pv95/smoke-summary.json',
    'output/playwright/pv95/synthetic-preview-1920.png',
    'output/playwright/pv95/synthetic-preview-320-full.png'
)
$FinalEvidence = @(
    'output/playwright/final-100-preview-desktop.png',
    'output/playwright/final-100-preview-mobile.png',
    'output/playwright/final-100-sofia-desktop.png',
    'output/playwright/final-100-sofia-mobile.png',
    'output/audit-20260828-final/multilingual-site/audit.json',
    'output/audit-20260828-final/multilingual-site/report.md',
    'output/audit-20260828-final/ue-es/applicability-resolver-2026-08-28.json',
    'output/audit-20260828-final/ue-es/catalog-validation-2026-08-28.json',
    'output/audit-20260828-final/ue-es/current-report-schema-validation-2026-08-28.json',
    'output/audit-20260828-final/ue-es/MANIFEST.sha256',
    'output/audit-20260828-final/ue-es/profile-input-2026-08-28.json',
    'output/audit-20260828-final/ue-es/README.md',
    'output/audit-20260828-final/ue-es/refresh-summary-2026-08-28.json',
    'output/audit-20260828-final/ue-es/source-freshness-strict-2026-08-28.json',
    'output/release/build-artifact-report.json',
    'output/release/standalone-artifact-report.json',
    'output/release/sbom.cdx.json',
    'output/audit-20260829-revalidation/ux/01-home-hero-desktop-accepted-v2.png',
    'output/audit-20260829-revalidation/ux/02-catalog-desktop-accepted.png',
    'output/audit-20260829-revalidation/ux/03-filter-empty-state-desktop.png',
    'output/audit-20260829-revalidation/ux/04-sofia-profile-desktop.png',
    'output/audit-20260829-revalidation/ux/05-home-mobile.png',
    'output/audit-20260829-revalidation/ux/06-sofia-profile-mobile.png',
    'output/audit-20260829-revalidation/ux/07-catalog-mobile.png',
    'output/audit-20260829-revalidation/ux/08-profile-cards-mobile.png',
    'output/audit-20260829-revalidation/ue-es/applicability.json',
    'output/audit-20260829-revalidation/ue-es/source-freshness.json',
    'output/audits/multilingual-services/audit-summary.md',
    'output/audits/multilingual-services/catalogs-audit.json',
    'output/audits/multilingual-services/catalogs-audit.md',
    'output/audits/multilingual-services/preview-http-observations.json',
    'output/audits/multilingual-services/public-site-audit.json',
    'output/audits/multilingual-services/public-site-audit.md',
    'output/audits/multilingual-services/site-inventory.json',
    'output/audits/eu-spain-services/audit-report.md',
    'output/audits/eu-spain-services/profile.json',
    'output/audits/eu-spain-services/resolver-output.json',
    'output/audits/eu-spain-services/retest-evidence.json',
    'output/design-qa/services-desktop-top.png',
    'output/design-qa/services-desktop-catalog.png',
    'output/design-qa/services-desktop-faq.png',
    'output/design-qa/service-detail-desktop-top.png',
    'output/design-qa/services-mobile-top.png',
    'output/design-qa/service-detail-mobile.png',
    'output/design-qa/service-mobile-menu-open-final.png',
    'output/design-qa/services-desktop-fr-locales.png',
    'output/design-qa/services-reference-vs-implementation.png',
    'output/design-qa/services-symbolic-desktop-top.png',
    'output/design-qa/service-symbolic-detail-desktop.png',
    'output/design-qa/services-symbolic-mobile-top.png',
    'output/design-qa/services-unique-assets-contact-sheet.png',
    'output/design-qa/services-unique-catalog-desktop.png',
    'output/design-qa/services-unique-catalog-mobile.png',
    'output/design-qa/services-reference-vs-implementation-unique.png',
    'output/design-qa/cities-reference-before.png',
    'output/design-qa/cities-reference-desktop.png',
    'output/design-qa/cities-reference-mobile.png',
    'output/design-qa/cities-services-desktop.png',
    'output/design-qa/cities-services-tablet-1024.png',
    'output/design-qa/cities-services-tablet-768.png',
    'output/design-qa/cities-services-mobile.png',
    'output/design-qa/cities-reference-contact-sheet.png',
    'output/design-qa/cities-reference-comparison.png'
)

function Get-AbsolutePath {
    param([Parameter(Mandatory = $true)][string]$Path)

    if ([string]::IsNullOrWhiteSpace($Path)) {
        throw 'A non-empty path is required.'
    }
    return [System.IO.Path]::GetFullPath($Path)
}

function Test-IsChildPath {
    param(
        [Parameter(Mandatory = $true)][string]$Parent,
        [Parameter(Mandatory = $true)][string]$Candidate
    )

    $relative = [System.IO.Path]::GetRelativePath(
        (Get-AbsolutePath -Path $Parent),
        (Get-AbsolutePath -Path $Candidate)
    )
    return (
        $relative -ne '.' -and
        $relative -ne '..' -and
        -not $relative.StartsWith("..$([System.IO.Path]::DirectorySeparatorChar)") -and
        -not $relative.StartsWith("..$([System.IO.Path]::AltDirectorySeparatorChar)") -and
        -not [System.IO.Path]::IsPathRooted($relative)
    )
}

function Assert-SafePathChain {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$StopRoot
    )

    $fullPath = Get-AbsolutePath -Path $Path
    $fullRoot = Get-AbsolutePath -Path $StopRoot
    if (
        -not [string]::Equals(
            $fullPath,
            $fullRoot,
            [System.StringComparison]::OrdinalIgnoreCase
        ) -and
        -not (Test-IsChildPath -Parent $fullRoot -Candidate $fullPath)
    ) {
        throw "Unsafe path outside its expected root: $Path"
    }

    $current = $fullPath
    while ($true) {
        $entry = Get-Item -LiteralPath $current -Force
        if (($entry.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw "Reparse points and symbolic links are not accepted: $Path"
        }
        if (
            [string]::Equals(
                $current,
                $fullRoot,
                [System.StringComparison]::OrdinalIgnoreCase
            )
        ) {
            break
        }
        $parent = [System.IO.Directory]::GetParent($current)
        if ($null -eq $parent) {
            throw "The expected path root was not reached: $Path"
        }
        $current = $parent.FullName
    }
}

function Assert-SafeRegularFile {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$StopRoot
    )

    Assert-SafePathChain -Path $Path -StopRoot $StopRoot
    $entry = Get-Item -LiteralPath $Path -Force
    if ($entry.PSIsContainer -or $entry.Length -lt 0 -or $entry.Length -gt $MaximumFileBytes) {
        throw "A bounded regular file is required: $Path"
    }
}

function Assert-NoReparseDescendants {
    param([Parameter(Mandatory = $true)][string]$Path)

    $queue = [System.Collections.Generic.Queue[string]]::new()
    $queue.Enqueue((Get-AbsolutePath -Path $Path))
    while ($queue.Count -gt 0) {
        $current = $queue.Dequeue()
        $entry = Get-Item -LiteralPath $current -Force
        if (($entry.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw "Reparse points are not accepted in generated content: $current"
        }
        if ($entry.PSIsContainer) {
            foreach ($child in [System.IO.Directory]::EnumerateFileSystemEntries($current)) {
                $queue.Enqueue($child)
            }
        }
    }
}

function Invoke-CapturedProcess {
    param(
        [Parameter(Mandatory = $true)][string]$FileName,
        [Parameter(Mandatory = $true)][string[]]$ArgumentList,
        [Parameter(Mandatory = $true)][string]$WorkingDirectory
    )

    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $FileName
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.WorkingDirectory = Get-AbsolutePath -Path $WorkingDirectory
    $startInfo.StandardOutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $startInfo.StandardErrorEncoding = [System.Text.UTF8Encoding]::new($false)
    $startInfo.Environment['GIT_CONFIG_NOSYSTEM'] = '1'
    $startInfo.Environment['GIT_CONFIG_GLOBAL'] = 'NUL'
    $startInfo.Environment['GIT_OPTIONAL_LOCKS'] = '0'
    $startInfo.Environment['GIT_TERMINAL_PROMPT'] = '0'
    foreach ($argument in $ArgumentList) {
        [void]$startInfo.ArgumentList.Add($argument)
    }

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    try {
        if (-not $process.Start()) {
            throw "Unable to start $FileName."
        }
        $standardOutput = $process.StandardOutput.ReadToEndAsync()
        $standardError = $process.StandardError.ReadToEndAsync()
        $process.WaitForExit()
        $stdout = $standardOutput.GetAwaiter().GetResult()
        $stderr = $standardError.GetAwaiter().GetResult()
        if ($process.ExitCode -ne 0) {
            $safeError = $stderr.Trim()
            if ([string]::IsNullOrWhiteSpace($safeError)) {
                $safeError = "$FileName exited with code $($process.ExitCode)."
            }
            throw $safeError
        }
        return $stdout
    }
    finally {
        $process.Dispose()
    }
}

function Resolve-TrustedGitExecutable {
    param(
        [Parameter(Mandatory = $true)][string]$RepositoryRoot,
        [Parameter(Mandatory = $true)][string]$TemporaryBase
    )

    $seen = [System.Collections.Generic.HashSet[string]]::new(
        [System.StringComparer]::OrdinalIgnoreCase
    )
    $commands = @(Get-Command git.exe -CommandType Application -All -ErrorAction Stop)
    foreach ($command in $commands) {
        $candidate = Get-AbsolutePath -Path $command.Source
        if (-not $seen.Add($candidate)) {
            continue
        }
        if (
            [string]::Equals($candidate, $RepositoryRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
            (Test-IsChildPath -Parent $RepositoryRoot -Candidate $candidate) -or
            [string]::Equals($candidate, $TemporaryBase, [System.StringComparison]::OrdinalIgnoreCase) -or
            (Test-IsChildPath -Parent $TemporaryBase -Candidate $candidate)
        ) {
            continue
        }
        $entry = Get-Item -LiteralPath $candidate -Force
        if (
            $entry.PSIsContainer -or
            ($entry.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0 -or
            $entry.VersionInfo.ProductName -notmatch '^Git'
        ) {
            continue
        }
        $signature = Get-AuthenticodeSignature -LiteralPath $candidate
        if ($signature.Status -eq [System.Management.Automation.SignatureStatus]::Valid) {
            return $candidate
        }
    }
    throw 'No trusted, signed Git executable was found outside the repository and temporary directory.'
}

function Get-GitNullPaths {
    param(
        [Parameter(Mandatory = $true)][string]$RepositoryRoot,
        [Parameter(Mandatory = $true)][string]$GitExecutable,
        [Parameter(Mandatory = $true)][string[]]$GitArguments
    )

    $arguments = @('-C', $RepositoryRoot) + $GitArguments
    $output = Invoke-CapturedProcess -FileName $GitExecutable -ArgumentList $arguments -WorkingDirectory $RepositoryRoot
    if ([string]::IsNullOrEmpty($output)) {
        return @()
    }
    return @(
        $output.Split(
            [char]0,
            [System.StringSplitOptions]::RemoveEmptyEntries
        )
    )
}

function Get-RepositoryExclusionReason {
    param([Parameter(Mandatory = $true)][string]$RepositoryPath)

    $normalized = $RepositoryPath.Replace('\', '/').TrimStart('/')
    $segments = @($normalized.Split('/', [System.StringSplitOptions]::RemoveEmptyEntries))
    $blockedSegments = @(
        '.git',
        'node_modules',
        '.pnpm-store',
        '.cache',
        '.next',
        '.vinext',
        '.vite',
        '.vite-temp',
        '.turbo',
        '.wrangler',
        '.playwright-cli',
        'coverage',
        'dist',
        'build',
        'out',
        'output',
        'outputs',
        'work',
        'stage-archives',
        '.local-cms',
        'local-cms-data',
        'cms-data',
        'cms-dev',
        'cms-backups',
        'local-media'
    )
    foreach ($segment in $segments) {
        if ($blockedSegments -contains $segment.ToLowerInvariant()) {
            return "Excluded directory: $segment"
        }
    }

    $leaf = [System.IO.Path]::GetFileName($normalized)
    $leafLower = $leaf.ToLowerInvariant()
    if ($leafLower.StartsWith('.env', [System.StringComparison]::Ordinal)) {
        return 'Environment files are excluded.'
    }
    if ($leafLower -in @('.npmrc', '.netrc', 'profiles.json', 'cms-state.json', 'media-index.json', 'media-metadata.json')) {
        return 'Credential or local CMS data filename is excluded.'
    }
    if ([System.IO.Path]::GetExtension($leafLower) -in @('.pem', '.key', '.pfx', '.p12', '.jks', '.keystore')) {
        return 'Private key and certificate container files are excluded.'
    }
    if ($leafLower -match '(^|[._-])(token|tokens|secret|secrets|credential|credentials)([._-]|$)') {
        return 'Token and credential files are excluded.'
    }
    if ($leafLower -in @('next-env.d.ts', 'tsconfig.tsbuildinfo')) {
        return 'Generated build metadata is excluded.'
    }
    return $null
}

function Get-ExplicitExclusionOverride {
    param([Parameter(Mandatory = $true)][string]$RepositoryPath)

    $normalized = $RepositoryPath.Replace('\', '/')
    if ($normalized -eq '.env.example') {
        return [pscustomobject]@{
            sourceKind = 'repository-tracked-safe-env-template'
            justification = 'Included explicit safe template: values are empty or fail-closed booleans.'
        }
    }
    if ($TrackedPlaywrightEvidence -contains $normalized) {
        return [pscustomobject]@{
            sourceKind = 'repository-tracked-qa-evidence'
            justification = 'Included explicit versioned Playwright QA evidence required for handoff.'
        }
    }
    if ($FinalEvidence -contains $normalized) {
        return [pscustomobject]@{
            sourceKind = 'repository-generated-final-evidence'
            justification = 'Included explicit bounded final QA, release or compliance evidence required for this stage handoff.'
        }
    }
    return $null
}

function Assert-NoHighConfidenceSecret {
    param([Parameter(Mandatory = $true)][string]$Path)

    $entry = Get-Item -LiteralPath $Path -Force
    $textExtensions = @(
        '.bat', '.cjs', '.cmd', '.conf', '.css', '.csv', '.graphql', '.html',
        '.ini', '.js', '.json', '.jsx', '.log', '.md', '.mjs', '.patch', '.properties', '.ps1',
        '.sh', '.sha256', '.svg', '.toml', '.tsv', '.txt', '.ts', '.tsx', '.xml', '.yaml', '.yml',
        '.dockerfile', '.dockerignore', '.example', '.gitattributes', '.gitignore'
    )
    $binaryExtensions = @(
        '.docx', '.gif', '.ico', '.jpeg', '.jpg', '.mp4', '.pdf', '.png',
        '.webp', '.woff', '.woff2'
    )
    $extension = [System.IO.Path]::GetExtension($entry.Name).ToLowerInvariant()
    if ($entry.Name.ToLowerInvariant() -eq 'dockerfile') {
        $extension = '.dockerfile'
    }
    if ($entry.Name.ToLowerInvariant() -eq '.gitattributes') {
        $extension = '.gitattributes'
    }
    if ($entry.Name.ToLowerInvariant() -eq '.gitkeep') {
        $markerText = [System.IO.File]::ReadAllText($entry.FullName)
        if (
            $entry.Length -gt 2 -or
            $markerText -notin @('', "`n", "`r`n")
        ) {
            throw 'A .gitkeep marker must be empty or contain only one newline.'
        }
        return
    }
    if ($extension -in $binaryExtensions) {
        return
    }
    if ($extension -notin $textExtensions) {
        throw "Unclassified file type cannot be scanned safely: $($entry.Name)"
    }
    if ($entry.Length -gt $MaximumTextScanBytes) {
        throw "Text candidate exceeds the 4 MiB fail-closed scan limit: $($entry.Name)"
    }

    $text = [System.IO.File]::ReadAllText($entry.FullName)
    $patterns = @(
        '-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----',
        '(?<![A-Za-z0-9])gh[pousr]_[A-Za-z0-9]{30,}',
        '(?<![A-Za-z0-9])sk-(?:proj-)?[A-Za-z0-9_-]{20,}',
        '(?<![A-Z0-9])AKIA[0-9A-Z]{16}(?![A-Z0-9])',
        '(?<![A-Za-z0-9])AIza[0-9A-Za-z_-]{30,}',
        '(?<![A-Za-z0-9])npm_[A-Za-z0-9]{20,}',
        '(?<![A-Za-z0-9])xox[baprs]-[A-Za-z0-9-]{20,}',
        '(?<![A-Za-z0-9])(?:sk|rk)_live_[A-Za-z0-9]{16,}',
        '(?<![A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}',
        '(?i)(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?)://[^:\s/]+:[^@\s/]{8,}@',
        '(?im)(?:api[_-]?key|access[_-]?token|auth[_-]?token|password|passwd|secret)\s*[:=]\s*["'']?[A-Za-z0-9+/_=-]{20,}'
    )
    foreach ($pattern in $patterns) {
        if ($text -match $pattern) {
            throw "A high-confidence secret pattern was detected in an included file: $($entry.Name)"
        }
    }
}

function Convert-ToSafeArchivePath {
    param([Parameter(Mandatory = $true)][string]$Path)

    $normalized = $Path.Replace('\', '/').Trim()
    if (
        [string]::IsNullOrWhiteSpace($normalized) -or
        $normalized.StartsWith('/') -or
        [System.IO.Path]::IsPathRooted($normalized) -or
        $normalized.Split('/') -contains '..'
    ) {
        throw "Unsafe archive-relative path: $Path"
    }
    return $normalized
}

function Add-PayloadFile {
    param(
        [Parameter(Mandatory = $true)][string]$SourcePath,
        [Parameter(Mandatory = $true)][string]$SourceRoot,
        [Parameter(Mandatory = $true)][string]$ArchivePath,
        [Parameter(Mandatory = $true)][string]$SourceKind,
        [Parameter()][string]$ExpectedSha256
    )

    Assert-SafeRegularFile -Path $SourcePath -StopRoot $SourceRoot
    Assert-NoHighConfidenceSecret -Path $SourcePath
    $safeArchivePath = Convert-ToSafeArchivePath -Path $ArchivePath
    if (-not $script:ArchivePaths.Add($safeArchivePath)) {
        throw "Duplicate archive path: $safeArchivePath"
    }

    $sourceEntry = Get-Item -LiteralPath $SourcePath -Force
    $sourceHash = (Get-FileHash -LiteralPath $SourcePath -Algorithm SHA256).Hash.ToUpperInvariant()
    if (
        -not [string]::IsNullOrWhiteSpace($ExpectedSha256) -and
        -not [string]::Equals(
            $sourceHash,
            $ExpectedSha256.ToUpperInvariant(),
            [System.StringComparison]::Ordinal
        )
    ) {
        throw "SHA-256 mismatch for required input: $safeArchivePath"
    }

    $script:TotalSourceBytes += $sourceEntry.Length
    if ($script:TotalSourceBytes -gt $MaximumArchiveSourceBytes) {
        throw 'The archive source exceeds the 512 MiB safety limit.'
    }

    $destination = Get-AbsolutePath -Path (
        Join-Path $script:PayloadRoot ($safeArchivePath.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
    )
    if (-not (Test-IsChildPath -Parent $script:PayloadRoot -Candidate $destination)) {
        throw "Unsafe archive destination: $safeArchivePath"
    }
    $destinationParent = [System.IO.Path]::GetDirectoryName($destination)
    [void](New-Item -ItemType Directory -Path $destinationParent -Force)
    Assert-SafePathChain -Path $destinationParent -StopRoot $script:PayloadRoot
    Copy-Item -LiteralPath $SourcePath -Destination $destination
    Assert-SafePathChain -Path $destination -StopRoot $script:PayloadRoot

    $destinationHash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToUpperInvariant()
    $destinationEntry = Get-Item -LiteralPath $destination -Force
    if (
        $destinationHash -ne $sourceHash -or
        $destinationEntry.Length -ne $sourceEntry.Length
    ) {
        throw "Copied file verification failed: $safeArchivePath"
    }
    Assert-NoHighConfidenceSecret -Path $destination
    $script:Inventory.Add([pscustomobject][ordered]@{
        archive_path = $safeArchivePath
        source_kind = $SourceKind
        size_bytes = $destinationEntry.Length
        sha256 = $destinationHash
    })
}

function Add-GeneratedTextFile {
    param(
        [Parameter(Mandatory = $true)][string]$ArchivePath,
        [Parameter(Mandatory = $true)][string]$Content,
        [Parameter(Mandatory = $true)][string]$SourceKind
    )

    $safeArchivePath = Convert-ToSafeArchivePath -Path $ArchivePath
    if (-not $script:ArchivePaths.Add($safeArchivePath)) {
        throw "Duplicate archive path: $safeArchivePath"
    }
    $destination = Get-AbsolutePath -Path (
        Join-Path $script:PayloadRoot ($safeArchivePath.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
    )
    if (-not (Test-IsChildPath -Parent $script:PayloadRoot -Candidate $destination)) {
        throw "Unsafe generated destination: $safeArchivePath"
    }
    [void](New-Item -ItemType Directory -Path ([System.IO.Path]::GetDirectoryName($destination)) -Force)
    Assert-SafePathChain -Path ([System.IO.Path]::GetDirectoryName($destination)) -StopRoot $script:PayloadRoot
    [System.IO.File]::WriteAllText(
        $destination,
        $Content,
        [System.Text.UTF8Encoding]::new($false)
    )
    $entry = Get-Item -LiteralPath $destination -Force
    $script:Inventory.Add([pscustomobject][ordered]@{
        archive_path = $safeArchivePath
        source_kind = $SourceKind
        size_bytes = $entry.Length
        sha256 = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToUpperInvariant()
    })
}

function Assert-ZipMatchesInventory {
    param(
        [Parameter(Mandatory = $true)][string]$ZipPath,
        [Parameter(Mandatory = $true)][string]$InventoryPath,
        [Parameter(Mandatory = $true)][System.Collections.IEnumerable]$InventoryRows
    )

    $zipEntry = Get-Item -LiteralPath $ZipPath -Force
    if (
        $zipEntry.PSIsContainer -or
        ($zipEntry.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0
    ) {
        throw 'The temporary ZIP must be a regular non-reparse file.'
    }
    $expected = [System.Collections.Generic.Dictionary[string, object]]::new(
        [System.StringComparer]::OrdinalIgnoreCase
    )
    foreach ($row in $InventoryRows) {
        $path = Convert-ToSafeArchivePath -Path ([string]$row.archive_path)
        if ($expected.ContainsKey($path)) {
            throw "Duplicate inventory row: $path"
        }
        $expected[$path] = [pscustomobject]@{
            size = [long]$row.size_bytes
            sha256 = ([string]$row.sha256).ToUpperInvariant()
        }
    }
    $inventoryEntry = Get-Item -LiteralPath $InventoryPath -Force
    $expected['ARCHIVE_INVENTORY.csv'] = [pscustomobject]@{
        size = $inventoryEntry.Length
        sha256 = (Get-FileHash -LiteralPath $InventoryPath -Algorithm SHA256).Hash.ToUpperInvariant()
    }

    $seen = [System.Collections.Generic.HashSet[string]]::new(
        [System.StringComparer]::OrdinalIgnoreCase
    )
    $archive = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
    try {
        foreach ($entry in $archive.Entries) {
            if ([string]::IsNullOrWhiteSpace($entry.Name)) {
                throw "Unexpected directory-only ZIP entry: $($entry.FullName)"
            }
            $entryPath = Convert-ToSafeArchivePath -Path $entry.FullName.Replace('\', '/')
            if (-not $seen.Add($entryPath)) {
                throw "Duplicate ZIP entry: $entryPath"
            }
            if (-not $expected.ContainsKey($entryPath)) {
                throw "ZIP entry is not present in the inventory: $entryPath"
            }
            $expectedEntry = $expected[$entryPath]
            if ($entry.Length -ne $expectedEntry.size) {
                throw "ZIP entry size mismatch: $entryPath"
            }
            $stream = $entry.Open()
            try {
                $entryHash = (Get-FileHash -InputStream $stream -Algorithm SHA256).Hash.ToUpperInvariant()
            }
            finally {
                $stream.Dispose()
            }
            if ($entryHash -ne $expectedEntry.sha256) {
                throw "ZIP entry SHA-256 mismatch: $entryPath"
            }
        }
    }
    finally {
        $archive.Dispose()
    }
    if ($seen.Count -ne $expected.Count) {
        throw "ZIP entry count mismatch: expected $($expected.Count), observed $($seen.Count)."
    }
}

function Remove-SafeTemporaryDirectory {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$TemporaryBase
    )

    $fullPath = Get-AbsolutePath -Path $Path
    $fullBase = Get-AbsolutePath -Path $TemporaryBase
    $leaf = [System.IO.Path]::GetFileName($fullPath)
    if (
        -not (Test-IsChildPath -Parent $fullBase -Candidate $fullPath) -or
        $leaf -notmatch '^pvsa-[a-f0-9]{16}$'
    ) {
        throw "Refusing unsafe temporary cleanup target: $fullPath"
    }
    if (Test-Path -LiteralPath $fullPath) {
        $entry = Get-Item -LiteralPath $fullPath -Force
        if (
            -not $entry.PSIsContainer -or
            ($entry.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0
        ) {
            throw "Refusing unsafe temporary cleanup entry: $fullPath"
        }
        Assert-NoReparseDescendants -Path $fullPath
        Remove-Item -LiteralPath $fullPath -Recurse -Force
    }
}

$RepoRoot = Get-AbsolutePath -Path (Join-Path $PSScriptRoot '..')
$ManifestPath = Get-AbsolutePath -Path (Join-Path $RepoRoot 'INPUT_MANIFEST.csv')
$ArchiveRoot = Get-AbsolutePath -Path (Join-Path $RepoRoot 'stage-archives')
$TemporaryBase = Get-AbsolutePath -Path ([System.IO.Path]::GetTempPath())
$InputRootFull = Get-AbsolutePath -Path $InputRoot
$GitExecutable = Resolve-TrustedGitExecutable -RepositoryRoot $RepoRoot -TemporaryBase $TemporaryBase

if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot '.git') -PathType Container)) {
    throw 'The script must run from its original Git working tree.'
}
$reportedGitRoot = (
    Invoke-CapturedProcess -FileName $GitExecutable -ArgumentList @(
        '-C', $RepoRoot, 'rev-parse', '--show-toplevel'
    ) -WorkingDirectory $RepoRoot
).Trim()
if (
    -not [string]::Equals(
        (Get-AbsolutePath -Path $reportedGitRoot),
        $RepoRoot,
        [System.StringComparison]::OrdinalIgnoreCase
    )
) {
    throw 'The script directory does not match the Git repository root.'
}

Assert-SafeRegularFile -Path $ManifestPath -StopRoot $RepoRoot
Assert-SafePathChain -Path $InputRootFull -StopRoot $InputRootFull
$manifestInitialHash = (Get-FileHash -LiteralPath $ManifestPath -Algorithm SHA256).Hash.ToUpperInvariant()
$inputRows = @(Import-Csv -LiteralPath $ManifestPath)
if ($inputRows.Count -ne $ExpectedInputCount) {
    throw "INPUT_MANIFEST.csv must contain exactly $ExpectedInputCount required inputs."
}

foreach ($row in $inputRows) {
    if (
        [string]::IsNullOrWhiteSpace($row.path) -or
        $row.sha256 -notmatch '^[A-Fa-f0-9]{64}$'
    ) {
        throw 'INPUT_MANIFEST.csv contains an invalid path or SHA-256 value.'
    }
    $source = Get-AbsolutePath -Path (Join-Path $InputRootFull $row.path)
    if (-not (Test-IsChildPath -Parent $InputRootFull -Candidate $source)) {
        throw "Manifest input escapes the approved input root: $($row.path)"
    }
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "Required manifest input is missing: $($row.path)"
    }
    Assert-SafeRegularFile -Path $source -StopRoot $InputRootFull
    $actualHash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToUpperInvariant()
    if ($actualHash -ne $row.sha256.ToUpperInvariant()) {
        throw "SHA-256 mismatch for required manifest input: $($row.path)"
    }
}

[void](New-Item -ItemType Directory -Path $ArchiveRoot -Force)
Assert-SafePathChain -Path $ArchiveRoot -StopRoot $RepoRoot

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $archiveName = 'pecadosvip-stage-{0}-{1}.zip' -f $Stage, (Get-Date -AsUTC -Format 'yyyyMMdd-HHmmssZ')
    $ArchivePath = Get-AbsolutePath -Path (Join-Path $ArchiveRoot $archiveName)
}
elseif ([System.IO.Path]::IsPathRooted($OutputPath)) {
    $ArchivePath = Get-AbsolutePath -Path $OutputPath
}
else {
    if ([System.IO.Path]::GetFileName($OutputPath) -ne $OutputPath) {
        throw 'A relative OutputPath must be a ZIP filename without directories.'
    }
    $ArchivePath = Get-AbsolutePath -Path (Join-Path $ArchiveRoot $OutputPath)
}

if (
    -not [string]::Equals(
        [System.IO.Path]::GetDirectoryName($ArchivePath),
        $ArchiveRoot,
        [System.StringComparison]::OrdinalIgnoreCase
    ) -or
    [System.IO.Path]::GetExtension($ArchivePath) -ne '.zip'
) {
    throw 'OutputPath must be a .zip file directly inside stage-archives.'
}
if (Test-Path -LiteralPath $ArchivePath) {
    throw "The output archive already exists: $ArchivePath"
}

$trackedPaths = @(
    Get-GitNullPaths -RepositoryRoot $RepoRoot -GitExecutable $GitExecutable -GitArguments @(
        'ls-files', '--cached', '-z'
    )
)
$untrackedPaths = @(
    Get-GitNullPaths -RepositoryRoot $RepoRoot -GitExecutable $GitExecutable -GitArguments @(
        'ls-files', '--others', '--exclude-standard', '-z'
    )
)
$candidateKinds = [System.Collections.Generic.Dictionary[string, string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
)
foreach ($path in $trackedPaths) {
    $candidateKinds[$path] = 'repository-tracked'
}
foreach ($path in $untrackedPaths) {
    if (-not $candidateKinds.ContainsKey($path)) {
        $candidateKinds[$path] = 'repository-untracked'
    }
}
if ($FinalEvidence.Count -ne $ExpectedFinalEvidenceCount) {
    throw "The final evidence allowlist must contain exactly $ExpectedFinalEvidenceCount paths."
}
foreach ($finalEvidencePath in $FinalEvidence) {
    $finalEvidenceSource = Get-AbsolutePath -Path (
        Join-Path $RepoRoot ($finalEvidencePath.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
    )
    if (-not (Test-Path -LiteralPath $finalEvidenceSource -PathType Leaf)) {
        throw "Required final evidence is unavailable: $finalEvidencePath"
    }
    if (-not $candidateKinds.ContainsKey($finalEvidencePath)) {
        $candidateKinds[$finalEvidencePath] = 'repository-generated-final-evidence'
    }
}
if ($TrackedPlaywrightEvidence.Count -ne $ExpectedTrackedPlaywrightEvidenceCount) {
    throw "The explicit Playwright evidence allowlist must contain exactly $ExpectedTrackedPlaywrightEvidenceCount paths."
}
foreach ($requiredTrackedPath in @('.env.example') + $TrackedPlaywrightEvidence) {
    if (
        -not $candidateKinds.ContainsKey($requiredTrackedPath) -or
        $candidateKinds[$requiredTrackedPath] -ne 'repository-tracked'
    ) {
        throw "Required tracked archive input is unavailable: $requiredTrackedPath"
    }
}

$script:Inventory = [System.Collections.Generic.List[object]]::new()
$script:Exclusions = [System.Collections.Generic.List[object]]::new()
$script:ArchivePaths = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
)
$script:TotalSourceBytes = [long]0

$policyExclusions = @(
    @('.git/**', 'Git history and metadata are never packaged.'),
    @('node_modules and package caches', 'Dependencies and caches are regenerated from the lockfile.'),
    @('build, coverage and output directories', "Generated artifacts are excluded except the $ExpectedTrackedPlaywrightEvidenceCount explicitly allowlisted tracked Playwright files and $ExpectedFinalEvidenceCount bounded final evidence files."),
    @('.env* and credential containers', 'Environment files, keys, JKS and keystores are excluded except the explicit safe tracked .env.example template.'),
    @('token or credential filenames', 'Local credentials and tokens are excluded.'),
    @('stage-archives/**', 'An archive never contains earlier archives.'),
    @('local CMS state, media and backups', 'Local runtime data and personal content are excluded.')
)
foreach ($policy in $policyExclusions) {
    $script:Exclusions.Add([pscustomobject][ordered]@{
        kind = 'policy'
        path_or_pattern = $policy[0]
        reason = $policy[1]
    })
}

$temporaryName = 'pvsa-{0}' -f ([System.Guid]::NewGuid().ToString('N').Substring(0, 16))
$TemporaryRoot = Get-AbsolutePath -Path (Join-Path $TemporaryBase $temporaryName)
$script:PayloadRoot = Get-AbsolutePath -Path (Join-Path $TemporaryRoot 'payload')
$TemporaryZip = Get-AbsolutePath -Path (Join-Path $TemporaryRoot 'candidate.zip')

try {
    if (Test-Path -LiteralPath $TemporaryRoot) {
        throw 'The randomly selected temporary directory already exists.'
    }
    [void](New-Item -ItemType Directory -Path $TemporaryRoot)
    Assert-SafePathChain -Path $TemporaryRoot -StopRoot $TemporaryRoot
    [void](New-Item -ItemType Directory -Path $script:PayloadRoot)
    Assert-SafePathChain -Path $script:PayloadRoot -StopRoot $TemporaryRoot

    foreach ($entry in $candidateKinds.GetEnumerator() | Sort-Object Key) {
        $repositoryPath = $entry.Key.Replace('\', '/')
        $sourceKind = $entry.Value
        $reason = Get-RepositoryExclusionReason -RepositoryPath $repositoryPath
        if ($null -ne $reason) {
            $override = Get-ExplicitExclusionOverride -RepositoryPath $repositoryPath
            if ($entry.Value -eq 'repository-tracked' -and $null -eq $override) {
                throw "Tracked file matches an exclusion without an explicit allowlist: $repositoryPath ($reason)"
            }
            if ($null -ne $override) {
                $sourceKind = $override.sourceKind
                $script:Exclusions.Add([pscustomobject][ordered]@{
                    kind = 'tracked-allowlist-inclusion'
                    path_or_pattern = $repositoryPath
                    reason = "$reason Override: $($override.justification)"
                })
            }
            else {
                $script:Exclusions.Add([pscustomobject][ordered]@{
                    kind = $entry.Value
                    path_or_pattern = $repositoryPath
                    reason = $reason
                })
                continue
            }
        }

        $source = Get-AbsolutePath -Path (
            Join-Path $RepoRoot ($repositoryPath.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
        )
        if (-not (Test-IsChildPath -Parent $RepoRoot -Candidate $source)) {
            throw "Repository path escapes the working tree: $repositoryPath"
        }
        if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
            if ($entry.Value -eq 'repository-tracked') {
                throw "Tracked path is absent from the current working tree: $repositoryPath"
            }
            $script:Exclusions.Add([pscustomobject][ordered]@{
                kind = $entry.Value
                path_or_pattern = $repositoryPath
                reason = 'Tracked path is absent from the current working tree.'
            })
            continue
        }

        $expectedHash = $null
        if ($repositoryPath -eq 'INPUT_MANIFEST.csv') {
            $expectedHash = $manifestInitialHash
        }
        $copyParameters = @{
            SourcePath = $source
            SourceRoot = $RepoRoot
            ArchivePath = "repository/$repositoryPath"
            SourceKind = $sourceKind
            ExpectedSha256 = $expectedHash
        }
        Add-PayloadFile @copyParameters
    }

    foreach ($row in $inputRows | Sort-Object path) {
        $source = Get-AbsolutePath -Path (Join-Path $InputRootFull $row.path)
        $inputParameters = @{
            SourcePath = $source
            SourceRoot = $InputRootFull
            ArchivePath = ('project-inputs/{0}' -f $row.path.Replace('\', '/'))
            SourceKind = 'required-client-input'
            ExpectedSha256 = $row.sha256
        }
        Add-PayloadFile @inputParameters
    }

    if (Test-Path -LiteralPath $KnownPastedRequest -PathType Leaf) {
        $knownRequestRoot = Get-AbsolutePath -Path ([System.IO.Path]::GetDirectoryName($KnownPastedRequest))
        $requestParameters = @{
            SourcePath = $KnownPastedRequest
            SourceRoot = $knownRequestRoot
            ArchivePath = 'project-inputs/solicitud-original/pasted-text.txt'
            SourceKind = 'optional-pasted-request'
        }
        Add-PayloadFile @requestParameters
    }
    else {
        $script:Exclusions.Add([pscustomobject][ordered]@{
            kind = 'optional-input'
            path_or_pattern = 'project-inputs/solicitud-original/pasted-text.txt'
            reason = 'The known optional pasted request was not present.'
        })
    }

    $generatedAt = Get-Date -AsUTC -Format 'yyyy-MM-ddTHH:mm:ssZ'
    $readme = @"
# CONFIDENCIAL — LEEME PRIMERO — PecadosVip, etapa $Stage

CLASIFICACIÓN: CONFIDENCIAL. El ZIP completo contiene código, documentos, notas, imágenes del cliente y la solicitud original. Es una copia de trabajo para revisión; no es un despliegue, no activa producción y no autoriza publicar contenido.

Almacénalo cifrado, con acceso restringido únicamente a personas autorizadas, y transmítelo solo mediante un canal cifrado aprobado. No subas el ZIP completo como GitHub Release, artefacto de Actions, adjunto público ni enlace de nube abierto.

Por defecto se crea dentro de stage-archives, que en este equipo vive bajo OneDrive. Después de guardar el SHA-256 externo, mueve el ZIP a una ubicación local cifrada y no sincronizada; vuelve a calcular el hash tras moverlo y elimina la copia de OneDrive conforme a la política aplicable.

Antes de extraerlo, compara Get-FileHash -Algorithm SHA256 con archiveSha256 comunicado por quien creó el paquete mediante un canal independiente. El inventario interno detecta corrupción, pero no autentica al remitente. No ejecutes scripts, pnpm ni Git si ese SHA externo no coincide.

## 1. Validar el ZIP

1. Extrae todo el ZIP en una carpeta nueva.
2. Abre PowerShell dentro de la carpeta extraída.
3. Ejecuta:

    pwsh -NoProfile -File .\VALIDAR_ARCHIVO.ps1

Debe aparecer: INTEGRIDAD INTERNA CORRECTA. Si aparece cualquier error, detente y no uses ni subas esa copia.

## 2. Validar el proyecto

En la misma ventana ejecuta:

    Set-Location .\repository
    node --version
    pnpm --version
    pnpm install --frozen-lockfile
    pnpm run release:verify

Node debe ser 22.13.0 o superior. No continúes si install o validate falla.

## 3. Previsualizar

Para la aplicación cerrada por defecto:

    pnpm run dev

Abre únicamente la dirección local que muestre la terminal. Para el preview ficticio y no indexable:

    pnpm run dev:preview

Detén cada servidor con Ctrl+C. No introduzcas perfiles, tokens, documentos ni contactos reales.

## 4. Subir a GitHub de forma segura

Sube solamente la carpeta repository. La carpeta project-inputs contiene material del cliente y no debe entrar al historial salvo autorización separada.

1. En GitHub crea un repositorio vacío y PRIVADO.
2. Dentro de repository ejecuta:

    git init
    git add .
    git status --short
    git commit -m "PecadosVip stage $Stage"
    git branch -M main
    git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
    git remote -v
    gh repo view TU_USUARIO/TU_REPOSITORIO --json visibility
    git push -u origin main

Antes del push confirma que origin es el repositorio correcto y que visibility muestra PRIVATE. Si no tienes GitHub CLI, compruébalo en la interfaz web autenticada. Si Git rechaza el push porque el remoto ya tiene historial, detente, clona ese remoto en otra carpeta y reconcilia los cambios. No uses push --force ni force-with-lease.

## 5. Abrirla como web o preparar hosting

La guía completa está en repository\SUBIR_PROYECTO.md. Separa GitHub privado, vista local, EasyPanel mediante Docker y preparación futura de Cloudflare Workers.

Para verla solo en este PC:

    Set-Location .\repository
    pnpm run dev

Para el preview ficticio y no indexable:

    pnpm run dev:preview

No uses GitHub Pages para este checkpoint: la aplicación usa renderizado y rutas de servidor. Para EasyPanel usa la raíz `/`, el archivo `Dockerfile` y el puerto `3000`, siempre desde un commit remoto que contenga esos archivos. La preparación de EasyPanel y Cloudflare está documentada, pero cualquier hosting, URL pública, DNS o despliegue necesita autorización nueva; el holding no levanta los gates del producto.

## Límite obligatorio: NO-GO

- productionActivation permanece en false.
- Este ZIP no acredita aprobación legal, derechos de imágenes, consentimiento, identidad, UAT, staging ni producción.
- No habilites indexación, contacto, analítica, pagos, reservas ni datos reales.
- No despliegues ni cambies DNS, hosting o proveedores usando solo este archivo.
- Los insumos gráficos son referencias, no prueba de selección o aceptación.
- El ZIP completo es CONFIDENCIAL y nunca debe publicarse como release o artefacto.

## Riesgo local residual

Las comprobaciones reducen, pero no eliminan, carreras TOCTOU: otro proceso con acceso a la misma cuenta podría modificar fuentes, temporales o destino entre comprobaciones. Ejecuta el empaquetado en una sesión local confiable, detén escritores del CMS y sincronizadores durante la captura cuando sea seguro hacerlo, y conserva/compara el SHA-256 final por un canal independiente.

Generado: $generatedAt. Etapa declarada: $Stage.
El inventario cubre todos los archivos excepto ARCHIVE_INVENTORY.csv, que se excluye para evitar un hash autorreferencial.
"@
    $readmeParameters = @{
        ArchivePath = 'LEEME_PRIMERO.md'
        Content = $readme
        SourceKind = 'generated-guide'
    }
    Add-GeneratedTextFile @readmeParameters

    $verifier = @'
#requires -Version 7.0
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$queue = [System.Collections.Generic.Queue[string]]::new()
$queue.Enqueue($root)
while ($queue.Count -gt 0) {
    $current = $queue.Dequeue()
    $entry = Get-Item -LiteralPath $current -Force
    if (($entry.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw "No se permiten enlaces ni reparse points: $current"
    }
    if ($entry.PSIsContainer) {
        foreach ($child in [System.IO.Directory]::EnumerateFileSystemEntries($current)) {
            $queue.Enqueue($child)
        }
    }
}
$inventoryPath = Join-Path $root 'ARCHIVE_INVENTORY.csv'
if (-not (Test-Path -LiteralPath $inventoryPath -PathType Leaf)) {
    throw 'Falta ARCHIVE_INVENTORY.csv.'
}
$rows = @(Import-Csv -LiteralPath $inventoryPath)
$expected = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
)
foreach ($row in $rows) {
    $relative = [string]$row.archive_path
    if ([string]::IsNullOrWhiteSpace($relative) -or [System.IO.Path]::IsPathRooted($relative)) {
        throw "Ruta insegura en inventario: $relative"
    }
    $path = [System.IO.Path]::GetFullPath(
        (Join-Path $root ($relative.Replace('/', [System.IO.Path]::DirectorySeparatorChar)))
    )
    $fromRoot = [System.IO.Path]::GetRelativePath($root, $path)
    if ($fromRoot -eq '..' -or $fromRoot.StartsWith("..$([System.IO.Path]::DirectorySeparatorChar)")) {
        throw "Ruta fuera del archivo: $relative"
    }
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Falta archivo inventariado: $relative"
    }
    $item = Get-Item -LiteralPath $path -Force
    if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw "No se permiten enlaces: $relative"
    }
    if ($item.Length -ne [long]$row.size_bytes) {
        throw "Tamaño incorrecto: $relative"
    }
    $hash = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
    if ($hash -ne $row.sha256) {
        throw "SHA-256 incorrecto: $relative"
    }
    [void]$expected.Add($relative.Replace('\', '/'))
}
$actual = @(
    Get-ChildItem -LiteralPath $root -File -Recurse -Force |
        ForEach-Object {
            [System.IO.Path]::GetRelativePath($root, $_.FullName).Replace('\', '/')
        } |
        Where-Object { $_ -ne 'ARCHIVE_INVENTORY.csv' }
)
foreach ($relative in $actual) {
    if (-not $expected.Contains($relative)) {
        throw "Archivo no inventariado: $relative"
    }
}
if ($actual.Count -ne $expected.Count) {
    throw 'El número de archivos no coincide con el inventario.'
}
Write-Host "INTEGRIDAD INTERNA CORRECTA: $($expected.Count) archivos verificados." -ForegroundColor Green
'@
    $verifierParameters = @{
        ArchivePath = 'VALIDAR_ARCHIVO.ps1'
        Content = $verifier
        SourceKind = 'generated-verifier'
    }
    Add-GeneratedTextFile @verifierParameters

    $exclusionPath = Join-Path $script:PayloadRoot 'ARCHIVE_EXCLUSIONS.csv'
    $script:Exclusions |
        Sort-Object kind, path_or_pattern |
        Export-Csv -LiteralPath $exclusionPath -NoTypeInformation -UseQuotes Always -Encoding utf8NoBOM
    $exclusionEntry = Get-Item -LiteralPath $exclusionPath -Force
    if (-not $script:ArchivePaths.Add('ARCHIVE_EXCLUSIONS.csv')) {
        throw 'Duplicate ARCHIVE_EXCLUSIONS.csv path.'
    }
    $script:Inventory.Add([pscustomobject][ordered]@{
        archive_path = 'ARCHIVE_EXCLUSIONS.csv'
        source_kind = 'generated-exclusion-report'
        size_bytes = $exclusionEntry.Length
        sha256 = (Get-FileHash -LiteralPath $exclusionPath -Algorithm SHA256).Hash.ToUpperInvariant()
    })

    $inventoryPath = Join-Path $script:PayloadRoot 'ARCHIVE_INVENTORY.csv'
    $script:Inventory |
        Sort-Object archive_path |
        Export-Csv -LiteralPath $inventoryPath -NoTypeInformation -UseQuotes Always -Encoding utf8NoBOM

    Assert-NoReparseDescendants -Path $script:PayloadRoot
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory(
        $script:PayloadRoot,
        $TemporaryZip,
        [System.IO.Compression.CompressionLevel]::Optimal,
        $false
    )
    if (-not (Test-Path -LiteralPath $TemporaryZip -PathType Leaf)) {
        throw 'ZIP creation did not produce a regular file.'
    }
    Assert-ZipMatchesInventory `
        -ZipPath $TemporaryZip `
        -InventoryPath $inventoryPath `
        -InventoryRows $script:Inventory
    if (Test-Path -LiteralPath $ArchivePath) {
        throw "The output archive appeared during packaging: $ArchivePath"
    }
    $archiveBytes = (Get-Item -LiteralPath $TemporaryZip -Force).Length
    $archiveSha256 = (Get-FileHash -LiteralPath $TemporaryZip -Algorithm SHA256).Hash.ToUpperInvariant()
    $resultJson = [pscustomobject][ordered]@{
        result = 'stage-archive-created'
        stage = $Stage
        productionActivation = $false
        archivePath = $ArchivePath
        archiveBytes = $archiveBytes
        archiveSha256 = $archiveSha256
        inventoryEntries = $script:Inventory.Count
        requiredInputs = $inputRows.Count
        optionalPastedRequestIncluded = (Test-Path -LiteralPath $KnownPastedRequest -PathType Leaf)
    } | ConvertTo-Json -Compress
    [System.IO.File]::Move($TemporaryZip, $ArchivePath)
    try {
        $finalEntry = Get-Item -LiteralPath $ArchivePath -Force
        $finalSha256 = (Get-FileHash -LiteralPath $ArchivePath -Algorithm SHA256).Hash.ToUpperInvariant()
        if (
            $finalEntry.PSIsContainer -or
            ($finalEntry.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0 -or
            $finalEntry.Length -ne $archiveBytes -or
            $finalSha256 -ne $archiveSha256
        ) {
            throw 'Final archive verification did not match the validated temporary ZIP.'
        }
    }
    catch {
        if (Test-Path -LiteralPath $ArchivePath) {
            [System.IO.File]::Delete($ArchivePath)
        }
        throw
    }
    $resultJson
}
finally {
    Remove-SafeTemporaryDirectory -Path $TemporaryRoot -TemporaryBase $TemporaryBase
}
