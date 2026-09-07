#requires -Version 7.0

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$')]
    [string]$Stage
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$EvidenceRoot = [System.IO.Path]::GetFullPath((Join-Path $RepoRoot 'evidence'))
$OutputRoot = [System.IO.Path]::GetFullPath((Join-Path $EvidenceRoot $Stage))

if (Test-Path -LiteralPath $OutputRoot) {
    throw "The evidence destination already exists: $OutputRoot"
}

$git = @(Get-Command git.exe -CommandType Application -All -ErrorAction Stop)[0].Source
$pnpm = @(Get-Command pnpm.cmd -CommandType Application -All -ErrorAction Stop)[0].Source
$node = @(Get-Command node.exe -CommandType Application -All -ErrorAction Stop)[0].Source
$modulesMetadataPath = Join-Path $RepoRoot 'node_modules\.modules.yaml'
if (-not (Test-Path -LiteralPath $modulesMetadataPath -PathType Leaf)) {
    throw 'node_modules metadata is unavailable. Run pnpm install with the intended store before capturing evidence.'
}
$modulesMetadata = Get-Content -LiteralPath $modulesMetadataPath -Raw | ConvertFrom-Json
$activeVersionedStore = [System.IO.Path]::GetFullPath([string]$modulesMetadata.storeDir)
$activeStoreParent = [System.IO.Directory]::GetParent($activeVersionedStore)
if (
    $null -eq $activeStoreParent -or
    -not (Test-Path -LiteralPath $activeVersionedStore -PathType Container)
) {
    throw 'The active pnpm store recorded by node_modules is unavailable.'
}
$activeStoreRoot = $activeStoreParent.FullName
$requiredBins = @('eslint.cmd', 'tsc.cmd', 'vinext.cmd')
foreach ($requiredBin in $requiredBins) {
    $binPath = Join-Path $RepoRoot "node_modules\.bin\$requiredBin"
    if (-not (Test-Path -LiteralPath $binPath -PathType Leaf)) {
        throw "Required local dependency executable is unavailable: $requiredBin"
    }
}

$commit = (& $git -C $RepoRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $commit -notmatch '^[a-f0-9]{40}$') {
    throw 'Unable to resolve the candidate Git commit.'
}
$statusBefore = @(& $git -C $RepoRoot status --porcelain=v1 --untracked-files=all)
if ($LASTEXITCODE -ne 0) {
    throw 'Unable to inspect the candidate working tree.'
}
if ($statusBefore.Count -ne 0) {
    throw 'Evidence capture requires a clean working tree. Commit the intended checkpoint first.'
}

[void](New-Item -ItemType Directory -Path $OutputRoot)

function Invoke-EvidenceCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    $startedAt = Get-Date -AsUTC
    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $pnpm
    $startInfo.WorkingDirectory = $RepoRoot
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.StandardOutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $startInfo.StandardErrorEncoding = [System.Text.UTF8Encoding]::new($false)
    $startInfo.Environment['CI'] = '1'
    $startInfo.Environment['NO_COLOR'] = '1'
    $startInfo.Environment['PNPM_CONFIG_STORE_DIR'] = $activeStoreRoot
    # Prevent pnpm from mutating node_modules during an evidence run. The
    # metadata, store and required local binaries were already checked above.
    $startInfo.Environment['PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN'] = 'false'
    foreach ($argument in $Arguments) {
        [void]$startInfo.ArgumentList.Add($argument)
    }

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    try {
        if (-not $process.Start()) {
            throw "Unable to start evidence command: $Name"
        }
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        $process.WaitForExit()
        $stdout = $stdoutTask.GetAwaiter().GetResult()
        $stderr = $stderrTask.GetAwaiter().GetResult()
        $exitCode = $process.ExitCode
    }
    finally {
        $process.Dispose()
    }

    $finishedAt = Get-Date -AsUTC
    $logPath = Join-Path $OutputRoot "$Name.log"
    $header = @(
        "command: pnpm $($Arguments -join ' ')"
        "candidateCommit: $commit"
        "startedAtUtc: $($startedAt.ToString('o'))"
        "finishedAtUtc: $($finishedAt.ToString('o'))"
        "exitCode: $exitCode"
        '--- stdout ---'
    ) -join "`n"
    $log = "$header`n$stdout`n--- stderr ---`n$stderr"
    [System.IO.File]::WriteAllText($logPath, $log, [System.Text.UTF8Encoding]::new($false))

    $entry = Get-Item -LiteralPath $logPath
    $result = [pscustomobject][ordered]@{
        name = $Name
        command = "pnpm $($Arguments -join ' ')"
        exitCode = $exitCode
        startedAtUtc = $startedAt.ToString('o')
        finishedAtUtc = $finishedAt.ToString('o')
        logPath = "$Name.log"
        logBytes = $entry.Length
        logSha256 = (Get-FileHash -LiteralPath $logPath -Algorithm SHA256).Hash.ToUpperInvariant()
    }
    if ($exitCode -ne 0) {
        throw "Evidence command failed with exit code $exitCode. See $logPath"
    }
    return $result
}

$nodeVersion = (& $node --version).Trim()
$pnpmVersion = (& $pnpm --version).Trim()
$capturedAt = Get-Date -AsUTC
$commands = @(
    Invoke-EvidenceCommand -Name 'release-verify' -Arguments @('run', 'release:verify')
    Invoke-EvidenceCommand -Name 'pnpm-audit-production' -Arguments @('audit', '--prod', '--audit-level=moderate')
)

$releaseArtifactSources = [ordered]@{
    'sbom.cdx.json' = Join-Path $RepoRoot 'output\release\sbom.cdx.json'
    'build-artifact-report.json' = Join-Path $RepoRoot 'output\release\build-artifact-report.json'
    'standalone-artifact-report.json' = Join-Path $RepoRoot 'output\release\standalone-artifact-report.json'
}
$releaseArtifacts = @()
foreach ($artifactName in $releaseArtifactSources.Keys) {
    $sourcePath = [System.IO.Path]::GetFullPath([string]$releaseArtifactSources[$artifactName])
    $sourceInfo = Get-Item -LiteralPath $sourcePath -Force -ErrorAction Stop
    if (-not $sourceInfo.PSIsContainer -and -not ($sourceInfo.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
        $destinationPath = Join-Path $OutputRoot $artifactName
        Copy-Item -LiteralPath $sourcePath -Destination $destinationPath
        $destinationInfo = Get-Item -LiteralPath $destinationPath
        $releaseArtifacts += [pscustomobject][ordered]@{
            name = $artifactName
            bytes = $destinationInfo.Length
            sha256 = (Get-FileHash -LiteralPath $destinationPath -Algorithm SHA256).Hash.ToUpperInvariant()
        }
        continue
    }
    throw "Release artifact must be a regular file: $sourcePath"
}

$scorecardPath = Join-Path $RepoRoot 'LOCAL_TECHNICAL_SCORECARD.json'
$scorecardInfo = Get-Item -LiteralPath $scorecardPath -Force -ErrorAction Stop
if ($scorecardInfo.PSIsContainer -or ($scorecardInfo.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
    throw "Local technical scorecard must be a regular file: $scorecardPath"
}
$scorecard = Get-Content -LiteralPath $scorecardPath -Raw | ConvertFrom-Json
$scorecardEvidence = [pscustomobject][ordered]@{
    path = 'LOCAL_TECHNICAL_SCORECARD.json'
    sha256 = (Get-FileHash -LiteralPath $scorecardPath -Algorithm SHA256).Hash.ToUpperInvariant()
    declaredScore = [int]$scorecard.declared_score
    denominator = [int]$scorecard.denominator
    strictRequirementsVerified = [int]$scorecard.separation.strict_requirements.verified
    strictRequirementsTotal = [int]$scorecard.separation.strict_requirements.total
    publicLegalRelease = [string]$scorecard.separation.public_legal_release
}

$manifest = [pscustomobject][ordered]@{
    schema = 'pecadosvip.stage-evidence'
    version = 2
    stage = $Stage
    capturedAtUtc = $capturedAt.ToString('o')
    candidateCommit = $commit
    workingTreeCleanBeforeCapture = $true
    environment = [pscustomobject][ordered]@{
        operatingSystem = [System.Runtime.InteropServices.RuntimeInformation]::OSDescription
        architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
        node = $nodeVersion
        pnpm = $pnpmVersion
        pnpmStoreConfiguredFromModulesMetadata = $true
    }
    commands = $commands
    scorecard = $scorecardEvidence
    releaseArtifacts = $releaseArtifacts
    limits = @(
        'Local execution only; no deployed runtime was tested.'
        'The local CycloneDX SBOM records the lockfile graph; it is not provenance, VEX, reachability or a pentest result.'
        'Package audit is time-bound and does not prove reachability, provenance, VEX or pentest results.'
        'A green validate result is not UAT, legal approval, visual acceptance or production readiness.'
    )
}
$manifestPath = Join-Path $OutputRoot 'evidence-manifest.json'
[System.IO.File]::WriteAllText(
    $manifestPath,
    (($manifest | ConvertTo-Json -Depth 8) + "`n"),
    [System.Text.UTF8Encoding]::new($false)
)

[pscustomobject][ordered]@{
    result = 'stage-evidence-captured'
    stage = $Stage
    candidateCommit = $commit
    evidencePath = $OutputRoot
    manifestSha256 = (Get-FileHash -LiteralPath $manifestPath -Algorithm SHA256).Hash.ToUpperInvariant()
    commandsPassed = $commands.Count
} | ConvertTo-Json -Compress
