# Copyright (c) 2026 p-darksy-r. BrandGame.
$ErrorActionPreference = 'Stop'
$diagnostic = Join-Path $PSScriptRoot '../scripts/diagnose-windows.ps1'
$updaterPath = Join-Path $PSScriptRoot 'update.exe'
$gamePath = Join-Path $PSScriptRoot 'app/BrandGame.exe'
$updaterHash = 'AB' * 32
$gameHash = 'CD' * 32

# These commands are scoped to this test script. No binary, event log or system setting is changed.
function Get-FileHash($LiteralPath, $Algorithm) {
    $hash = if ($LiteralPath -eq $updaterPath) { $updaterHash } else { $gameHash }
    [pscustomobject]@{ Hash = $hash }
}
function Get-AuthenticodeSignature($LiteralPath) {
    [pscustomobject]@{ Status = 'NotSigned'; SignerCertificate = $null; TimeStamperCertificate = $null }
}
function Get-MpComputerStatus {
    if ($denyAccess) { throw 'Defender unavailable' }
    [pscustomobject]@{ SmartAppControlState = 'On' }
}
function Get-WinEvent($FilterHashtable) {
    if ($FilterHashtable.Id -ne 3077) { throw 'Filter must select enforced blocks' }
    if ($denyAccess) { throw 'Log unavailable' }
    $fixtureEvents
}
function New-Block($path, $flatHash, $imageHash, $id) {
    $escapedPath = [Security.SecurityElement]::Escape($path)
    $event = [pscustomobject]@{
        RecordId = $id; TimeCreated = Get-Date
        XmlText = "<Event><EventData><Data Name='File Name'>$escapedPath</Data><Data Name='SHA256 Hash'>$imageHash</Data><Data Name='SHA256 Flat Hash'>$flatHash</Data><Data Name='PolicyName'>TestPolicy</Data></EventData></Event>"
    }
    $event | Add-Member -MemberType ScriptMethod -Name ToXml -Value { $this.XmlText }
    $event
}
$denyAccess = $false
$fixtureEvents = @(
    (New-Block $updaterPath ('EF' * 32) $updaterHash 6)
    (New-Block (Join-Path $PSScriptRoot 'other/update.exe') $updaterHash $null 5)
    (New-Block $gamePath $updaterHash $null 4)
    (New-Block $gamePath $null $gameHash 3)
)
$report = & $diagnostic -InstallRoot $PSScriptRoot -AsObject
if (@($report.Binaries | Where-Object LatestBlock).Count -ne 0 -or $report.EventLog -ne 'Disponível') {
    throw 'A stale version, image digest or block for another path was attributed to an installed file.'
}
Write-Host 'PASS stale hash, image-only digest and different install path are ignored'

$fixtureEvents += @(
    (New-Block $updaterPath.ToUpperInvariant() $updaterHash.ToLowerInvariant() $null 2)
    (New-Block $updaterPath $updaterHash $null 1)
)
$report = & $diagnostic -InstallRoot $PSScriptRoot -AsObject
if ($report.Binaries[0].LatestBlock.RecordId -ne 2 -or $report.Binaries[0].LatestBlock.Policy -ne 'TestPolicy' -or
    $report.Binaries[1].LatestBlock -or $report.SmartAppControl -ne 'On') {
    throw 'The newest block of the current file was not identified.'
}
Write-Host 'PASS the latest matching path and full-file SHA-256 identify the block'

$denyAccess = $true
$report = & $diagnostic -InstallRoot $PSScriptRoot -AsObject
if ($report.EventLog -notlike 'Indisponível*' -or $report.SmartAppControl -ne 'Indisponível' -or
    $report.Binaries[0].SHA256 -ne $updaterHash -or $report.Binaries[0].LatestBlock) {
    throw 'An inaccessible log or Defender query must leave a useful but inconclusive file report.'
}
Write-Host 'PASS unavailable Windows services preserve file details and do not claim a block'
