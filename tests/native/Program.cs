// Copyright (c) 2026 p-darksy-r. BrandGame.
using System.Text.Json;
using BrandGame.Services;

int passed = 0;
void Check(bool value, string message)
{
    if (!value) throw new Exception(message);
    Console.WriteLine("PASS " + message);
    passed++;
}

using (var engine = new GameEngine())
using (var cases = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "matching-cases.json"))))
{
    foreach (var item in cases.RootElement.EnumerateArray())
    {
        var result = engine.Evaluate(item.GetProperty("guess").GetString()!, item.GetProperty("answer").GetString()!, item.GetProperty("elapsed").GetInt32());
        Check(Math.Abs(result.match - item.GetProperty("match").GetDouble()) < 0.00001 &&
            result.correct == item.GetProperty("correct").GetBoolean() && result.score == item.GetProperty("score").GetInt32(),
            "shared scoring: " + item.GetProperty("guess").GetString());
    }
}
Check(AppPaths.IsTrustedPage("https://app.brandgame.local/index.html"), "local web origin accepted");
foreach (var source in new[] { "http://app.brandgame.local/", "https://app.brandgame.local.evil/", "https://evil/", "file:///index.html", "https://app.brandgame.local:444/", "https://user@app.brandgame.local/" })
    Check(!AppPaths.IsTrustedPage(source), "foreign origin rejected: " + source);

var workspace = Path.GetFullPath(Directory.GetCurrentDirectory());
var fixture = Path.GetFullPath(Path.Combine(workspace, "artifacts", "native-tests-" + Guid.NewGuid().ToString("N")));
if (!fixture.StartsWith(workspace + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) throw new Exception("Invalid test path");
Directory.CreateDirectory(fixture);
try
{
    var path = Path.Combine(fixture, "save.json");
    var saves = new SaveStore(path);
    Check(await saves.LoadAsync() == "null", "new profile has no save");
    using var first = JsonDocument.Parse("{\"globalScore\":42,\"name\":\"</script>\"}");
    using var second = JsonDocument.Parse("{\"globalScore\":75}");
    await saves.WriteAsync(first.RootElement);
    await saves.WriteAsync(second.RootElement);
    Check(JsonDocument.Parse(await saves.LoadAsync()).RootElement.GetProperty("globalScore").GetInt32() == 75, "latest save persisted");
    Check(File.Exists(path + ".bak"), "previous save backed up");
    await File.WriteAllTextAsync(path, "broken json");
    Check(JsonDocument.Parse(await saves.LoadAsync()).RootElement.GetProperty("globalScore").GetInt32() == 42, "corrupt save recovers backup");
    await Task.WhenAll(Enumerable.Range(0, 20).Select(async index =>
    {
        using var value = JsonDocument.Parse($"{{\"globalScore\":{index}}}");
        await saves.WriteAsync(value.RootElement);
    }));
    Check(JsonDocument.Parse(await saves.LoadAsync()).RootElement.ValueKind == JsonValueKind.Object, "concurrent writes remain valid JSON");
    Check(!Directory.EnumerateFiles(fixture, "*.tmp").Any(), "temporary save files cleaned");
    using var array = JsonDocument.Parse("[]");
    bool rejected = false;
    try { await saves.WriteAsync(array.RootElement); } catch (InvalidDataException) { rejected = true; }
    Check(rejected, "non-object saves rejected");

    var roaming = Path.Combine(fixture, "roaming");
    var previousSave = Path.Combine(roaming, "BrandGame_V3", "save_data_v3_custom.json");
    Directory.CreateDirectory(Path.GetDirectoryName(previousSave)!);
    const string previousJson = "{\"globalScore\":123,\"language\":\"es\",\"theme\":\"forest\",\"customLevels\":[{\"name\":\"My room\"}]}";
    await File.WriteAllTextAsync(previousSave, previousJson);
    await File.WriteAllTextAsync(previousSave + ".bak", "{\"globalScore\":100}");
    var migratedSave = AppPaths.PrepareSaveFile(roaming);
    Check(migratedSave == Path.Combine(roaming, "BrandGame", "save.json") &&
        await File.ReadAllTextAsync(migratedSave) == previousJson, "renamed save preserves progress, preferences and rooms");
    Check(await File.ReadAllTextAsync(previousSave) == previousJson &&
        await File.ReadAllTextAsync(migratedSave + ".bak") == await File.ReadAllTextAsync(previousSave + ".bak"),
        "save migration retains the original and its backup");
    await File.WriteAllTextAsync(migratedSave, "{\"globalScore\":456}");
    AppPaths.PrepareSaveFile(roaming);
    Check(JsonDocument.Parse(await new SaveStore(migratedSave).LoadAsync()).RootElement.GetProperty("globalScore").GetInt32() == 456,
        "new save takes precedence over the legacy save on later starts");
    File.Delete(migratedSave);
    await File.WriteAllTextAsync(migratedSave + ".bak", "{\"globalScore\":450}");
    Check(JsonDocument.Parse(await new SaveStore(AppPaths.PrepareSaveFile(roaming)).LoadAsync()).RootElement.GetProperty("globalScore").GetInt32() == 450,
        "a surviving current backup takes precedence over an obsolete legacy primary");

    var damagedRoaming = Path.Combine(fixture, "damaged-roaming");
    var damagedLegacy = Path.Combine(damagedRoaming, "BrandGame_V3", "save_data_v3_custom.json");
    Directory.CreateDirectory(Path.GetDirectoryName(damagedLegacy)!);
    await File.WriteAllTextAsync(damagedLegacy, "damaged");
    await File.WriteAllTextAsync(damagedLegacy + ".bak", "{\"globalScore\":88}");
    var damagedMigration = AppPaths.PrepareSaveFile(damagedRoaming);
    Check(JsonDocument.Parse(await new SaveStore(damagedMigration).LoadAsync()).RootElement.GetProperty("globalScore").GetInt32() == 88 &&
        await File.ReadAllTextAsync(damagedLegacy) == "damaged", "damaged legacy saves recover the migrated backup without altering originals");

    var backupRoaming = Path.Combine(fixture, "backup-roaming");
    var loneBackup = Path.Combine(backupRoaming, "BrandGame_V3", "save_data_v3_custom.json.bak");
    Directory.CreateDirectory(Path.GetDirectoryName(loneBackup)!);
    await File.WriteAllTextAsync(loneBackup, "{\"globalScore\":77}");
    var backupMigration = AppPaths.PrepareSaveFile(backupRoaming);
    Check(JsonDocument.Parse(await new SaveStore(backupMigration).LoadAsync()).RootElement.GetProperty("globalScore").GetInt32() == 77 &&
        File.Exists(loneBackup), "a surviving legacy backup is recovered when the primary save is missing");

    var lockedRoaming = Path.Combine(fixture, "locked-roaming");
    var lockedLegacy = Path.Combine(lockedRoaming, "BrandGame_V3", "save_data_v3_custom.json");
    Directory.CreateDirectory(Path.GetDirectoryName(lockedLegacy)!);
    await File.WriteAllTextAsync(lockedLegacy, previousJson);
    await File.WriteAllTextAsync(lockedLegacy + ".bak", "{\"globalScore\":40}");
    bool saveMigrationFailed = false;
    using (var locked = File.Open(lockedLegacy, FileMode.Open, FileAccess.Read, FileShare.None))
    {
        try { AppPaths.PrepareSaveFile(lockedRoaming); } catch (IOException) { saveMigrationFailed = true; }
    }
    Check(saveMigrationFailed && !File.Exists(Path.Combine(lockedRoaming, "BrandGame", "save.json")) &&
        await File.ReadAllTextAsync(lockedLegacy) == previousJson, "a locked legacy save cannot publish a partial migrated save or change the original");
    Check(await File.ReadAllTextAsync(AppPaths.PrepareSaveFile(lockedRoaming)) == previousJson, "save migration can retry after the legacy file is unlocked");

    var local = Path.Combine(fixture, "local");
    var temporary = Path.Combine(fixture, "temporary");
    var previousProfile = Path.Combine(local, "BrandGame_V3", "WebView2");
    var temporaryProfile = Path.Combine(temporary, "BrandGame_V3_UserData");
    Directory.CreateDirectory(Path.Combine(previousProfile, "Default"));
    Directory.CreateDirectory(temporaryProfile);
    await File.WriteAllTextAsync(Path.Combine(previousProfile, "Default", "Preferences"), "current settings");
    await File.WriteAllTextAsync(Path.Combine(temporaryProfile, "older-profile"), "old settings");
    var profile = AppPaths.PrepareBrowserProfile(local, temporary);
    Check(profile == Path.Combine(local, "BrandGame", "WebView2") &&
        await File.ReadAllTextAsync(Path.Combine(profile, "Default", "Preferences")) == "current settings" &&
        File.Exists(Path.Combine(previousProfile, "Default", "Preferences")), "browser migration copies nested settings and retains the original profile");
    Check(!File.Exists(Path.Combine(profile, "older-profile")), "the recent browser profile takes precedence over the temporary legacy profile");
    await File.WriteAllTextAsync(Path.Combine(profile, "Default", "Preferences"), "new settings");
    await File.WriteAllTextAsync(Path.Combine(previousProfile, "old-only"), "do not merge");
    AppPaths.PrepareBrowserProfile(local, temporary);
    Check(await File.ReadAllTextAsync(Path.Combine(profile, "Default", "Preferences")) == "new settings" &&
        !File.Exists(Path.Combine(profile, "old-only")), "existing browser profiles are neither replaced nor merged with legacy data");
    var oldestProfile = AppPaths.PrepareBrowserProfile(Path.Combine(fixture, "fresh-local"), temporary);
    Check(await File.ReadAllTextAsync(Path.Combine(oldestProfile, "older-profile")) == "old settings" &&
        File.Exists(Path.Combine(temporaryProfile, "older-profile")), "temporary legacy browser profiles migrate when no newer profile exists");

    var lockedLocal = Path.Combine(fixture, "locked-local");
    var lockedOldProfile = Path.Combine(lockedLocal, "BrandGame_V3", "WebView2");
    Directory.CreateDirectory(lockedOldProfile);
    var lockedSettings = Path.Combine(lockedOldProfile, "Preferences");
    await File.WriteAllTextAsync(lockedSettings, "locked settings");
    bool profileMigrationFailed = false;
    using (var locked = File.Open(lockedSettings, FileMode.Open, FileAccess.Read, FileShare.None))
    {
        try { AppPaths.PrepareBrowserProfile(lockedLocal, temporary); } catch (IOException) { profileMigrationFailed = true; }
    }
    Check(profileMigrationFailed && !Directory.Exists(Path.Combine(lockedLocal, "BrandGame", "WebView2")) &&
        await File.ReadAllTextAsync(lockedSettings) == "locked settings", "a locked browser profile cannot publish a partial migration or change the original");
    Check(await File.ReadAllTextAsync(Path.Combine(AppPaths.PrepareBrowserProfile(lockedLocal, temporary), "Preferences")) == "locked settings",
        "browser migration can retry after the old profile is unlocked");
    Check(!Directory.EnumerateFileSystemEntries(fixture, "*.migration-*", SearchOption.AllDirectories).Any(),
        "save and browser migration staging files are cleaned");

    var originalOverride = Environment.GetEnvironmentVariable("BRANDGAME_PROFILE_ROOT");
    try
    {
        var isolated = Path.Combine(fixture, "isolated-profile");
        Environment.SetEnvironmentVariable("BRANDGAME_PROFILE_ROOT", isolated);
        Check(AppPaths.SaveFile == Path.Combine(isolated, "save.json") &&
            AppPaths.PrepareBrowserProfile() == Path.Combine(isolated, "WebView2"), "test profile overrides bypass real user paths and migration");
    }
    finally { Environment.SetEnvironmentVariable("BRANDGAME_PROFILE_ROOT", originalOverride); }
}
finally { Directory.Delete(fixture, recursive: true); }
Console.WriteLine($"{passed} native checks passed.");
