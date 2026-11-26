// Copyright (c) 2026 p-darksy-r. BrandGame.
using System.Text.Json;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace BrandGame.Services;

internal sealed class NativeBridge(MainWindow window, WebView2 webView, GameEngine engine, SaveStore saves)
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    internal async void OnMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        if (!AppPaths.IsTrustedPage(e.Source)) return;
        NativeRequest? request = null;
        try
        {
            string json = e.WebMessageAsJson;
            // Import can include two bounded saves, and JSON strings may be escaped during transport.
            if (json.Length > 6 * SaveStore.MaximumBytes + 4096) throw new InvalidDataException("Mensagem demasiado grande.");
            request = JsonSerializer.Deserialize<NativeRequest>(json, JsonOptions);
            if (request == null) return;
            if (request.RequestId is > 0)
            {
                object? value;
                switch (request.Action)
                {
                    case "previous_progress":
                        value = await saves.LoadPreviousAsync();
                        break;
                    case "replace_progress" when request.Data.HasValue && request.Current.HasValue:
                        await saves.ReplaceProgressAsync(request.Data.Value, request.Current.Value);
                        value = true;
                        break;
                    case "reset_progress" when request.Data.HasValue:
                        await saves.ResetAsync(request.Data.Value);
                        value = true;
                        break;
                    case "export_progress" when request.Text != null:
                        value = await ExportAsync(request.Text);
                        break;
                    default:
                        throw new InvalidDataException("Operação desconhecida.");
                }
                await ProgressReplyAsync(request.RequestId.Value, true, value);
                return;
            }
            switch (request.Action)
            {
                case "exit_app":
                    window.Close();
                    return;
                case "resize_window" when request.Width.HasValue && request.Height.HasValue:
                    window.ResizeGameWindow(request.Width.Value, request.Height.Value);
                    return;
                case "load_save":
                    await ReplyAsync("onSaveLoaded", await saves.LoadAsync());
                    return;
                case "write_save" when request.Data.HasValue:
                    await saves.WriteAsync(request.Data.Value);
                    return;
            }
            if (request.UserGuess != null && request.CorrectAnswer != null && request.TimeElapsed.HasValue)
            {
                if (request.UserGuess.Length > 256 || request.CorrectAnswer.Length > 256)
                    throw new InvalidDataException("A resposta pode ter no máximo 256 caracteres.");
                MatchResult result = engine.Evaluate(request.UserGuess, request.CorrectAnswer, request.TimeElapsed.Value);
                await ReplyAsync("onMatchResult", JsonSerializer.Serialize(result));
            }
        }
        catch (Exception ex)
        {
            if (request?.RequestId is > 0)
            {
                await ProgressReplyAsync(request.RequestId.Value, false, null);
                return;
            }
            if (!window.IsDisposed)
                MessageBox.Show(window, ex.Message, "BrandGame — erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private async Task<bool> ExportAsync(string text)
    {
        if (System.Text.Encoding.UTF8.GetByteCount(text) > SaveStore.MaximumBytes + 4096)
            throw new InvalidDataException("O ficheiro de progresso excede o limite.");
        using var dialog = new SaveFileDialog
        {
            FileName = $"BrandGame-{DateTime.Today:yyyy-MM-dd}.json", DefaultExt = "json", AddExtension = true,
            Filter = "BrandGame (*.json)|*.json", OverwritePrompt = true, RestoreDirectory = true
        };
        if (dialog.ShowDialog(window) != DialogResult.OK) return false;
        if (!Path.GetExtension(dialog.FileName).Equals(".json", StringComparison.OrdinalIgnoreCase) ||
            Path.GetDirectoryName(dialog.FileName)!.Equals(Path.GetDirectoryName(AppPaths.SaveFile), StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("Escolhe outro ficheiro JSON para a cópia de segurança.");
        await SaveStore.WriteAtomicAsync(dialog.FileName, text);
        return true;
    }

    private Task ProgressReplyAsync(int id, bool ok, object? value) =>
        ReplyAsync("onProgressFileResult", JsonSerializer.Serialize(new { id, ok, value }));

    private async Task ReplyAsync(string callback, string json)
    {
        if (!webView.IsDisposed && webView.CoreWebView2 != null &&
            AppPaths.IsTrustedPage(webView.CoreWebView2.Source))
            await webView.ExecuteScriptAsync($"window.{callback}({json})");
    }
}

internal sealed class NativeRequest
{
    public int? RequestId { get; set; }
    public string? Text { get; set; }
    public JsonElement? Current { get; set; }
    public string? Action { get; set; }
    public JsonElement? Data { get; set; }
    public string? UserGuess { get; set; }
    public string? CorrectAnswer { get; set; }
    public int? TimeElapsed { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public bool? Value { get; set; }
}
