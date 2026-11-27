// Copyright (c) 2026 p-darksy-r. BrandGame.
using System.Net;
using System.Text.Json;
using BrandGame.Services;

internal static class UpdateAvailabilityChecks
{
    internal static async Task RunAsync(Action<bool, string> check)
    {
        const string page = UpdateAvailability.ReleasesPage;
        check(UpdateAvailability.CanOpenReleasesPage(AppPaths.StartPage, page, true),
            "the official release link accepts a user gesture from the game");
        check(!UpdateAvailability.CanOpenReleasesPage(AppPaths.StartPage, page, false) &&
            !UpdateAvailability.CanOpenReleasesPage("https://foreign.example/", page, true) &&
            !UpdateAvailability.CanOpenReleasesPage(AppPaths.StartPage, page + "?other", true),
            "automatic, foreign and noncanonical release links stay blocked");

        string[] assets = ["release-manifest.json", "release-manifest.sig", "BrandGame-3.8.0-win-x64.zip"];
        var listing = JsonSerializer.Serialize(new[] { new {
            tag_name = "v3.8.0", draft = false, prerelease = true,
            assets = assets.Select(name => new { name, state = "uploaded", browser_download_url = $"{page}/download/v3.8.0/{name}" })
        } });
        var gate = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        int requests = 0;
        using var service = new UpdateAvailability(new MetadataHandler(async (request, token) => {
            requests++;
            await gate.Task.WaitAsync(token);
            var content = request.RequestUri!.AbsolutePath switch
            {
                "/repos/p-darksy-r/BrandGame/releases" => new StringContent(listing),
                "/p-darksy-r/BrandGame/releases/download/v3.8.0/release-manifest.json" => new StringContent("{}"),
                "/p-darksy-r/BrandGame/releases/download/v3.8.0/release-manifest.sig" => new StringContent("invalid"),
                _ => throw new InvalidOperationException("Unexpected download " + request.RequestUri)
            };
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = content };
        }));
        var pending = service.CheckAsync();
        check(ReferenceEquals(pending, service.CheckAsync()) && requests == 1, "concurrent settings checks share one metadata query");
        gate.SetResult();
        bool rejected = false;
        try { await pending; } catch (InvalidDataException) { rejected = true; }
        check(rejected && requests == 3, "an unauthenticated version is rejected after checking metadata only");
        listing = "[]";
        check(await service.CheckAsync() == null && requests == 4, "checking again after a failure handles an empty release list");
    }

    private sealed class MetadataHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> send) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token) => send(request, token);
    }
}
