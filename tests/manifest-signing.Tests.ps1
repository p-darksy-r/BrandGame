# Copyright (c) 2026 p-darksy-r. BrandGame.
# Invoked by signing.Tests.ps1 with a temporary workspace and certificate store doubles.
param([Parameter(Mandatory=$true)][string]$Fixture)
$ErrorActionPreference = 'Stop'
$sourceRoot = Join-Path $PSScriptRoot '..'
foreach ($dir in @('scripts/lib','src/updater')) {
    [IO.Directory]::CreateDirectory((Join-Path $Fixture $dir)) | Out-Null
}
foreach ($script in @('scripts/sign-release.ps1','scripts/lib/Signing.ps1')) {
    Copy-Item -LiteralPath (Join-Path $sourceRoot $script) -Destination (Join-Path $Fixture $script)
}
[IO.File]::WriteAllText((Join-Path $Fixture 'VERSION'), '1.0.0')
$package = Join-Path $Fixture 'BrandGame-1.0.0-win-x64.zip'
[IO.File]::WriteAllText($package, 'fixture')
$signScript = Join-Path $Fixture 'scripts/sign-release.ps1'
$manifestPath = Join-Path $Fixture 'release-manifest.json'
$signaturePath = Join-Path $Fixture 'release-manifest.sig'
$originalPublisher = $env:BRANDGAME_SIGNING_THUMBPRINT
$originalManifest = $env:BRANDGAME_MANIFEST_THUMBPRINT
$keys = @()
$certificates = @()
try {
    foreach ($label in @('test-publisher', 'test-manifest')) {
        $key = [Security.Cryptography.RSACng]::new(2048)
        $keys += $key
        $request = [Security.Cryptography.X509Certificates.CertificateRequest]::new(
            "CN=$label", $key, [Security.Cryptography.HashAlgorithmName]::SHA256, [Security.Cryptography.RSASignaturePadding]::Pkcs1)
        $certificates += $request.CreateSelfSigned([DateTimeOffset]::UtcNow.AddDays(-1), [DateTimeOffset]::UtcNow.AddDays(7))
    }
    # Isolate only the certificate store lookup. Sign and verify the real manifest bytes.
    function Get-ChildItem {
        param([string]$Path,[switch]$CodeSigningCert)
        if ($Path -eq 'Cert:\CurrentUser\My' -and $CodeSigningCert) { $certificates }
    }
    [IO.File]::WriteAllText((Join-Path $Fixture 'src/updater/release-public-key.xml'), $keys[1].ToXmlString($false))
    $env:BRANDGAME_SIGNING_THUMBPRINT = $certificates[0].Thumbprint
    $env:BRANDGAME_MANIFEST_THUMBPRINT = $null
    & $signScript -Package $package
    $bytes = [IO.File]::ReadAllBytes($manifestPath)
    $signature = [IO.File]::ReadAllBytes($signaturePath)
    if (-not $keys[1].VerifyData($bytes, $signature, [Security.Cryptography.HashAlgorithmName]::SHA256,
        [Security.Cryptography.RSASignaturePadding]::Pkcs1)) { throw 'O manifesto nao usa a chave RSA original.' }
    Write-Host 'PASS changing the Authenticode publisher preserves the independently pinned manifest signature'

    $env:BRANDGAME_MANIFEST_THUMBPRINT = $certificates[0].Thumbprint
    [IO.File]::AppendAllText($package, ' changed')
    Assert-Rejected { & $signScript -Package $package }
    if ([Convert]::ToBase64String([IO.File]::ReadAllBytes($manifestPath)) -cne [Convert]::ToBase64String($bytes) -or
        [Convert]::ToBase64String([IO.File]::ReadAllBytes($signaturePath)) -cne [Convert]::ToBase64String($signature)) {
        throw 'Uma chave incompativel alterou o manifesto ou a assinatura.'
    }
    Write-Host 'PASS a mismatched manifest certificate cannot replace an existing signed release manifest'
} finally {
    $env:BRANDGAME_SIGNING_THUMBPRINT = $originalPublisher
    $env:BRANDGAME_MANIFEST_THUMBPRINT = $originalManifest
    foreach ($cert in $certificates) { $cert.Dispose() }
    foreach ($key in $keys) { $key.Dispose() }
}
