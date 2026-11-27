// Copyright (c) 2026 p-darksy-r. BrandGame.
using System.Net.Http;
using BrandGame.Updater;

namespace BrandGame.Services;

internal sealed class UpdateAvailability(HttpMessageHandler? handler = null) : IDisposable
{
    internal const string ReleasesPage = "https://github.com/" + ReleaseClient.Repository + "/releases";
    private readonly ReleaseClient releases = new(handler);
    private Task<string?>? currentCheck;

    // WebView2 dispatches bridge requests on the window thread. Multiple clicks share the same query.
    internal Task<string?> CheckAsync()
    {
        if (currentCheck == null || currentCheck.IsCompleted) currentCheck = FindVersionAsync();
        return currentCheck;
    }

    private async Task<string?> FindVersionAsync()
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(20));
        var release = await releases.FindLatestAsync(preview: true, timeout.Token);
        if (release == null) return null;
        var manifest = await releases.GetManifestAsync(release, timeout.Token);
        return manifest.Version;
    }

    internal static bool CanOpenReleasesPage(string source, string destination, bool userInitiated) =>
        userInitiated && destination == ReleasesPage && AppPaths.IsTrustedPage(source);

    public void Dispose() => releases.Dispose();
}
