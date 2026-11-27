# Copyright (c) 2026 p-darksy-r. BrandGame.
[CmdletBinding()]
param(
    [string]$InstallRoot = (Join-Path $PSScriptRoot '..'),
    [ValidateRange(1, 365)][int]$LookbackDays = 7,
    [switch]$AsObject
)
$ErrorActionPreference = 'Stop'
$since = (Get-Date).AddDays(-$LookbackDays)
$root = (Get-Item -LiteralPath $InstallRoot).FullName
$volumes = @{}

function Get-VolumeGuid([string]$volumeRoot) {
    if (!$volumes.ContainsKey($volumeRoot)) {
        # /L only looks up the volume GUID. It does not create or remove mount points.
        $match = $null
        try {
            $lines = & (Join-Path $env:SystemRoot 'System32/mountvol.exe') $volumeRoot /L 2>$null
            $match = $lines | ForEach-Object { $_.Trim() } |
                Where-Object { $_ -match '^\\\\\?\\Volume\{[a-fA-F0-9-]{36}\}\\$' } | Select-Object -First 1
        } catch { }
        $volumes[$volumeRoot] = $match
    }
    return $volumes[$volumeRoot]
}

function Test-SameBinaryPath([string]$eventPath, [string]$path) {
    if ($eventPath -ieq $path) { return $true }
    if ($eventPath -notmatch '^(\\Device\\HarddiskVolume[0-9]+)(\\.+)$') { return $false }
    $ntRoot = $Matches[1]
    $suffix = $Matches[2]
    if ($path -notmatch '^([A-Za-z]:)(\\.+)$' -or $suffix -ine $Matches[2]) { return $false }
    $drive = $Matches[1]
    $nativeGuid = Get-VolumeGuid ("\\?\GLOBALROOT" + $ntRoot + '\')
    return $nativeGuid -and ($nativeGuid -ieq (Get-VolumeGuid ($drive + '\')))
}

$binaries = foreach ($relative in @('update.exe', 'app/BrandGame.exe')) {
    $path = [IO.Path]::GetFullPath((Join-Path $root $relative))
    $record = [pscustomobject]@{
        Path = $path; SHA256 = $null; Signature = $null; Publisher = $null; SelfIssued = $null
        Timestamped = $null; ReadError = $null; LatestBlock = $null
    }
    try {
        $record.SHA256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
        $signature = Get-AuthenticodeSignature -LiteralPath $path
        $record.Signature = [string]$signature.Status
        $record.Timestamped = [bool]$signature.TimeStamperCertificate
        if ($signature.SignerCertificate) {
            $record.Publisher = $signature.SignerCertificate.Subject
            $record.SelfIssued = $record.Publisher -eq $signature.SignerCertificate.Issuer
        }
    } catch { $record.ReadError = $_.Exception.Message }
    $record
}

$sac = 'Indisponível'
try {
    $state = (Get-MpComputerStatus).SmartAppControlState
    if ($null -ne $state) { $sac = [string]$state }
} catch { }

$logStatus = 'Disponível'
try {
    Get-WinEvent -FilterHashtable @{
        LogName = 'Microsoft-Windows-CodeIntegrity/Operational'; Id = 3077; StartTime = $since
    } | ForEach-Object {
        $eventRecord = $_
        $fields = @{}
        foreach ($field in ([xml]$eventRecord.ToXml()).Event.EventData.Data) {
            $fields[[string]$field.Name] = $field.'#text'
        }
        # Events arrive newest first. The Authenticode image hash is not the hash of the whole file.
        foreach ($binary in $binaries) {
            if ($binary.LatestBlock -or !$binary.SHA256 -or $binary.SHA256 -ine $fields['SHA256 Flat Hash']) { continue }
            if (Test-SameBinaryPath $fields['File Name'] $binary.Path) {
                $binary.LatestBlock = [pscustomobject]@{
                    EventId = 3077; RecordId = $eventRecord.RecordId; Time = $eventRecord.TimeCreated
                    Policy = $fields['PolicyName']; Status = $fields['Status']
                }
            }
        }
    }
} catch {
    if ($_.FullyQualifiedErrorId -notlike 'NoMatchingEventsFound*') { $logStatus = "Indisponível: $($_.Exception.Message)" }
}

if ($AsObject) {
    [pscustomobject]@{ SmartAppControl = $sac; Since = $since; EventLog = $logStatus; Binaries = $binaries }
    return
}
"Smart App Control: $sac"
"Registo CodeIntegrity desde $($since.ToString('yyyy-MM-dd HH:mm')): $logStatus"
foreach ($binary in $binaries) {
    ''
    $binary.Path
    if ($binary.ReadError) { "  Erro de leitura: $($binary.ReadError)" }
    if ($binary.SHA256) { "  SHA-256: $($binary.SHA256)" }
    if ($binary.Signature) { "  Assinatura: $($binary.Signature)" }
    if ($binary.Publisher) {
        "  Editor: $($binary.Publisher)"
        "  Autoemitido: $($binary.SelfIssued); com carimbo de tempo: $($binary.Timestamped)"
    }
    if ($binary.LatestBlock) {
        $block = $binary.LatestBlock
        "  Bloqueio confirmado (3077): $($block.Time.ToString('yyyy-MM-dd HH:mm:ss')), $($block.Policy), $($block.Status)"
    } elseif ($binary.SHA256 -and $logStatus -eq 'Disponível') {
        '  Nenhum evento 3077 confirmado para este caminho e SHA-256 no período consultado.'
    }
}
