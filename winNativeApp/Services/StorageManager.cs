using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using HttpDebug.Models;

namespace HttpDebug.Services;

public class StorageManager
{
    public static StorageManager Shared { get; } = new();

    private readonly JsonSerializerOptions _opts = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private const int MaxHistory = 500;

    private string StorageDir
    {
        get
        {
            var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            var dir = Path.Combine(home, ".httpdebug");
            Directory.CreateDirectory(dir);
            return dir;
        }
    }

    private string CollectionsDir
    {
        get
        {
            var dir = Path.Combine(StorageDir, "collections");
            Directory.CreateDirectory(dir);
            return dir;
        }
    }

    private string SettingsFile => Path.Combine(StorageDir, "settings.json");
    private string HistoryFile => Path.Combine(StorageDir, "history.json");

    // Settings
    public AppSettings LoadSettings()
    {
        try
        {
            if (File.Exists(SettingsFile))
                return JsonSerializer.Deserialize<AppSettings>(File.ReadAllText(SettingsFile), _opts) ?? new AppSettings();
        }
        catch { }
        return new AppSettings();
    }

    public void SaveSettings(AppSettings settings)
    {
        try { File.WriteAllText(SettingsFile, JsonSerializer.Serialize(settings, _opts)); } catch { }
    }

    // Collections
    public List<RequestCollection> ListCollections()
    {
        var list = new List<RequestCollection>();
        try
        {
            foreach (var file in Directory.EnumerateFiles(CollectionsDir, "*.json"))
            {
                try
                {
                    var col = JsonSerializer.Deserialize<RequestCollection>(File.ReadAllText(file), _opts);
                    if (col != null) list.Add(col);
                }
                catch { }
            }
        }
        catch { }
        return list.OrderBy(c => c.CreatedAt).ToList();
    }

    public void SaveCollection(RequestCollection collection)
    {
        try
        {
            var file = Path.Combine(CollectionsDir, $"{collection.Id}.json");
            File.WriteAllText(file, JsonSerializer.Serialize(collection, _opts));
        }
        catch { }
    }

    public void DeleteCollection(Guid id)
    {
        try
        {
            var file = Path.Combine(CollectionsDir, $"{id}.json");
            if (File.Exists(file)) File.Delete(file);
        }
        catch { }
    }

    public RequestCollection? ImportCollection(string path)
    {
        try
        {
            var col = JsonSerializer.Deserialize<RequestCollection>(File.ReadAllText(path), _opts);
            if (col == null) return null;
            col.Id = Guid.NewGuid();
            SaveCollection(col);
            return col;
        }
        catch { return null; }
    }

    public string ExportCollection(RequestCollection collection)
        => JsonSerializer.Serialize(collection, _opts);

    // History
    public List<HistoryEntry> LoadHistory()
    {
        try
        {
            if (File.Exists(HistoryFile))
                return JsonSerializer.Deserialize<List<HistoryEntry>>(File.ReadAllText(HistoryFile), _opts) ?? new();
        }
        catch { }
        return new List<HistoryEntry>();
    }

    public void SaveHistory(IEnumerable<HistoryEntry> entries)
    {
        try
        {
            var trimmed = entries.Take(MaxHistory).ToList();
            File.WriteAllText(HistoryFile, JsonSerializer.Serialize(trimmed, _opts));
        }
        catch { }
    }

    public void ClearHistory()
    {
        try { if (File.Exists(HistoryFile)) File.Delete(HistoryFile); } catch { }
    }
}
