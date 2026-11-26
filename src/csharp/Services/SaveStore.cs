// Copyright (c) 2026 p-darksy-r. BrandGame.
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace BrandGame.Services;

internal sealed class SaveStore(string path)
{
    internal const int MaximumBytes = 4 * 1024 * 1024;
    private const string SlotProperty = "_brandGameRestoreSlot";
    private static readonly JsonSerializerOptions DiskJson = new() { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping };
    private readonly SemaphoreSlim writeLock = new(1, 1);

    internal async Task<string> LoadAsync()
    {
        await writeLock.WaitAsync();
        try
        {
            var record = await ReadCurrentAsync();
            record?.Remove(SlotProperty);
            return record?.ToJsonString() ?? "null";
        }
        finally { writeLock.Release(); }
    }

    internal async Task WriteAsync(JsonElement data)
    {
        var next = ParseSave(data);
        await writeLock.WaitAsync();
        try
        {
            int? slot = GetSlot(await ReadCurrentAsync());
            if (slot.HasValue) next[SlotProperty] = slot.Value;
            await WriteAtomicAsync(path, next.ToJsonString(DiskJson), path + ".bak");
        }
        finally { writeLock.Release(); }
    }

    internal async Task ReplaceProgressAsync(JsonElement data, JsonElement fallback)
    {
        var next = ParseSave(data);
        await writeLock.WaitAsync();
        try
        {
            var previous = await ReadCurrentAsync() ?? ParseSave(fallback);
            int slot = GetSlot(previous) == 0 ? 1 : 0;
            previous.Remove(SlotProperty);
            // Publish the restore pointer only when both snapshots are on disk. The
            // alternative slot also keeps recovery from the ordinary .bak consistent.
            await WriteAtomicAsync(SlotPath(slot), previous.ToJsonString(DiskJson));
            next[SlotProperty] = slot;
            await WriteAtomicAsync(path, next.ToJsonString(DiskJson), path + ".bak");
        }
        finally { writeLock.Release(); }
    }

    internal async Task<JsonObject?> LoadPreviousAsync()
    {
        await writeLock.WaitAsync();
        try
        {
            int? slot = GetSlot(await ReadCurrentAsync());
            return slot.HasValue ? await ReadRecordAsync(SlotPath(slot.Value)) : null;
        }
        finally { writeLock.Release(); }
    }

    internal async Task ResetAsync(JsonElement data)
    {
        var next = ParseSave(data);
        await writeLock.WaitAsync();
        try
        {
            await WriteAtomicAsync(path, next.ToJsonString(DiskJson));
            // The new save has no restore pointer. Delete unreferenced historical
            // files where possible; a locked file cannot make this save recoverable in the UI.
            foreach (string obsolete in new[] { path + ".bak", SlotPath(0), SlotPath(1) })
            {
                try { File.Delete(obsolete); }
                catch (IOException) { }
                catch (UnauthorizedAccessException) { }
            }
        }
        finally { writeLock.Release(); }
    }

    private string SlotPath(int slot) => path + ".before-import-" + slot + ".json";

    private static int? GetSlot(JsonObject? data) =>
        data?[SlotProperty] is JsonValue id && id.TryGetValue<int>(out var slot) && slot is 0 or 1 ? slot : null;

    private static JsonObject ParseSave(JsonElement element)
    {
        if (element.ValueKind != JsonValueKind.Object) throw new InvalidDataException("O progresso deve ser um objeto JSON.");
        var data = JsonNode.Parse(element.GetRawText())!.AsObject();
        data.Remove(SlotProperty);
        if (Encoding.UTF8.GetByteCount(data.ToJsonString(DiskJson)) > MaximumBytes)
            throw new InvalidDataException("O progresso excede o tamanho máximo.");
        return data;
    }

    private async Task<JsonObject?> ReadCurrentAsync()
    {
        if (!File.Exists(path)) return File.Exists(path + ".bak") ? await ReadRecordAsync(path + ".bak") : null;
        try { return await ReadRecordAsync(path); }
        catch (Exception ex) when (ex is JsonException or InvalidDataException)
        {
            if (File.Exists(path + ".bak")) return await ReadRecordAsync(path + ".bak");
            throw new InvalidDataException("O progresso guardado está danificado. O ficheiro original foi preservado.", ex);
        }
    }

    private static async Task<JsonObject> ReadRecordAsync(string source)
    {
        if (new FileInfo(source).Length > MaximumBytes + 64) throw new InvalidDataException("O progresso excede o tamanho máximo.");
        return JsonNode.Parse(await File.ReadAllTextAsync(source)) as JsonObject ?? throw new InvalidDataException("Formato de progresso inválido.");
    }

    internal static async Task WriteAtomicAsync(string destination, string text, string? backup = null)
    {
        string temporary = destination + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
            await File.WriteAllTextAsync(temporary, text, new UTF8Encoding(false));
            if (File.Exists(destination)) File.Replace(temporary, destination, backup);
            else File.Move(temporary, destination);
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }
}
