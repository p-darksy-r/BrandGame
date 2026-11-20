// Copyright (c) 2026 p-darksy-r. BrandGame.
namespace BrandGame.Services;

internal static class AppPaths
{
    internal const string WebHost = "app.brandgame.local";
    internal const string StartPage = "https://" + WebHost + "/index.html";

    // Test profiles never read or migrate a player's real data.
    private static string? TestProfile => Environment.GetEnvironmentVariable("BRANDGAME_PROFILE_ROOT") is { Length: > 0 } value
        ? Path.GetFullPath(value) : null;

    internal static string SaveFile => TestProfile is { } testProfile ? Path.Combine(testProfile, "save.json") :
        PrepareSaveFile(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData));

    internal static string PrepareSaveFile(string roamingDirectory)
    {
        string path = Path.Combine(roamingDirectory, "BrandGame", "save.json");
        if (File.Exists(path) || File.Exists(path + ".bak")) return path;
        string legacy = Path.Combine(roamingDirectory, "BrandGame_V3", "save_data_v3_custom.json");
        if (!File.Exists(legacy) && !File.Exists(legacy + ".bak")) return path;

        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        // Prepare the primary before publishing either file. A locked primary must not
        // leave a partial migration that looks like a surviving current backup.
        string staged = path + ".migration-" + Guid.NewGuid().ToString("N");
        try
        {
            if (File.Exists(legacy)) File.Copy(legacy, staged);
            CopyFileIfMissing(legacy + ".bak", path + ".bak");
            if (File.Exists(staged)) MoveIfMissing(staged, path);
        }
        finally { if (File.Exists(staged)) File.Delete(staged); }
        return path;
    }

    private static void CopyFileIfMissing(string source, string target)
    {
        if (!File.Exists(source) || File.Exists(target)) return;
        string staging = target + ".migration-" + Guid.NewGuid().ToString("N");
        try
        {
            File.Copy(source, staging, overwrite: false);
            MoveIfMissing(staging, target);
        }
        finally { if (File.Exists(staging)) File.Delete(staging); }
    }

    private static void MoveIfMissing(string staged, string target)
    {
        try { File.Move(staged, target, overwrite: false); }
        catch (IOException) when (File.Exists(target)) { } // Another instance completed the migration.
    }

    internal static bool IsTrustedPage(string source) =>
        Uri.TryCreate(source, UriKind.Absolute, out var uri) &&
        uri.Scheme == Uri.UriSchemeHttps &&
        uri.Host.Equals(WebHost, StringComparison.OrdinalIgnoreCase) &&
        uri.IsDefaultPort && string.IsNullOrEmpty(uri.UserInfo);

    internal static string GetWebDirectory()
    {
        string path = Path.Combine(AppContext.BaseDirectory, "web");
        if (!File.Exists(Path.Combine(path, "index.html")))
            throw new FileNotFoundException("Falta web/index.html. Executa update.exe na raiz do projeto.");
        return path;
    }

    internal static string PrepareBrowserProfile()
    {
        if (TestProfile is { } testProfile)
        {
            string isolated = Path.Combine(testProfile, "WebView2");
            Directory.CreateDirectory(isolated);
            return isolated;
        }
        return PrepareBrowserProfile(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), Path.GetTempPath());
    }

    internal static string PrepareBrowserProfile(string localDirectory, string temporaryDirectory)
    {
        string path = Path.Combine(localDirectory, "BrandGame", "WebView2");
        string previous = Path.Combine(localDirectory, "BrandGame_V3", "WebView2");
        string legacy = Directory.Exists(previous) ? previous : Path.Combine(temporaryDirectory, "BrandGame_V3_UserData");
        if (!Directory.Exists(path) && Directory.Exists(legacy))
        {
            // Copy the previous browser settings; the original profile remains intact.
            string staging = path + ".migration-" + Guid.NewGuid().ToString("N");
            try
            {
                Directory.CreateDirectory(staging);
                CopyProfile(legacy, staging);
                try { Directory.Move(staging, path); }
                catch (IOException) when (Directory.Exists(path)) { } // Never replace an existing profile.
            }
            finally { if (Directory.Exists(staging)) Directory.Delete(staging, recursive: true); }
        }
        Directory.CreateDirectory(path);
        return path;
    }

    private static void CopyProfile(string source, string target)
    {
        foreach (string file in Directory.EnumerateFiles(source))
        {
            if ((File.GetAttributes(file) & FileAttributes.ReparsePoint) != 0) continue;
            File.Copy(file, Path.Combine(target, Path.GetFileName(file)), overwrite: false);
        }
        foreach (string directory in Directory.EnumerateDirectories(source))
        {
            if ((File.GetAttributes(directory) & FileAttributes.ReparsePoint) != 0) continue;
            string destination = Path.Combine(target, Path.GetFileName(directory));
            Directory.CreateDirectory(destination);
            CopyProfile(directory, destination);
        }
    }
}
