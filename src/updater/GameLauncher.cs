// Copyright (c) 2026 p-darksy-r. BrandGame.
using System.ComponentModel;
using System.Diagnostics;

namespace BrandGame.Updater;

internal static class GameLauncher
{
    internal static int Start(string root, Func<ProcessStartInfo, Process?>? start = null, TextWriter? error = null)
    {
        error ??= Console.Error;
        try
        {
            var executable = PackageInstaller.SafePath(root, "app/BrandGame.exe");
            var info = new ProcessStartInfo(executable) { UseShellExecute = true, WorkingDirectory = Path.GetDirectoryName(executable)! };
            using var process = (start ?? Process.Start)(info);
            return 0;
        }
        catch (Win32Exception ex) when (ex.NativeErrorCode == 4551)
        {
            error.WriteLine("O Controlo de Aplicações do Windows bloqueou o arranque do BrandGame.exe (4551).");
        }
        catch (Exception ex)
        {
            error.WriteLine($"Não foi possível abrir o jogo instalado. {ex.Message}");
        }

        try
        {
            var web = PackageInstaller.SafePath(root, "app/web/index.html");
            if (File.Exists(web)) error.WriteLine($"Para jogar no navegador, abra o ficheiro local {web}");
        }
        catch (IOException) { /* A linked or inaccessible path must not be offered to the player. */ }
        catch (UnauthorizedAccessException) { }
        return 2;
    }
}
