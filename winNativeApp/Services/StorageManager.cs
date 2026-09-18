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
    private readonly string _settingsDirectory;
    private string _storageDirectory;

    public StorageManager(string? settingsDirectory = null)
    {
        _settingsDirectory = Path.GetFullPath(settingsDirectory ?? Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".httpdebug"));
        _storageDirectory = _settingsDirectory;
    }

    public string CurrentStoragePath => _storageDirectory;

    private string StorageDir
    {
        get
        {
            Directory.CreateDirectory(_storageDirectory);
            return _storageDirectory;
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

    private string SettingsFile => Path.Combine(_settingsDirectory, "settings.json");
    private string HistoryFile => Path.Combine(StorageDir, "history.json");

    // Settings
    public AppSettings LoadSettings()
    {
        try
        {
            if (File.Exists(SettingsFile))
            {
                var settings = JsonSerializer.Deserialize<AppSettings>(File.ReadAllText(SettingsFile), _opts) ?? new AppSettings();
                _storageDirectory = ResolveStoragePath(settings.StoragePath);
                settings.StoragePath = _storageDirectory;
                return settings;
            }
        }
        catch { }
        _storageDirectory = _settingsDirectory;
        return new AppSettings { StoragePath = _storageDirectory };
    }

    public void SaveSettings(AppSettings settings)
    {
        var destination = ResolveStoragePath(settings.StoragePath);
        var copiedFiles = new List<string>();
        string? temporarySettings = null;
        try
        {
            Directory.CreateDirectory(destination);
            var probe = Path.Combine(destination, $".httpdebug-write-{Guid.NewGuid():N}");
            using (new FileStream(probe, FileMode.CreateNew, FileAccess.Write, FileShare.None, 1, FileOptions.DeleteOnClose)) { }

            if (!string.Equals(destination, _storageDirectory, StringComparison.OrdinalIgnoreCase))
            {
                var destinationCollections = Path.Combine(destination, "collections");
                if (File.Exists(Path.Combine(destination, "history.json")) ||
                    (Directory.Exists(destinationCollections) && Directory.EnumerateFileSystemEntries(destinationCollections).Any()))
                    throw new IOException("The selected folder already contains history or collections. Choose an empty data folder.");

                var sourceCollections = Path.Combine(_storageDirectory, "collections");
                var sources = new List<string>();
                var sourceHistory = Path.Combine(_storageDirectory, "history.json");
                if (File.Exists(sourceHistory)) sources.Add(sourceHistory);
                if (Directory.Exists(sourceCollections)) sources.AddRange(Directory.EnumerateFiles(sourceCollections, "*.json"));
                foreach (var source in sources)
                {
                    var target = Path.Combine(destination, Path.GetRelativePath(_storageDirectory, source));
                    Directory.CreateDirectory(Path.GetDirectoryName(target)!);
                    using var input = File.OpenRead(source);
                    using var output = new FileStream(target, FileMode.CreateNew, FileAccess.Write, FileShare.None);
                    copiedFiles.Add(target);
                    input.CopyTo(output);
                }
            }

            Directory.CreateDirectory(_settingsDirectory);
            temporarySettings = Path.Combine(_settingsDirectory, $"settings-{Guid.NewGuid():N}.tmp");
            File.WriteAllText(temporarySettings, JsonSerializer.Serialize(settings, _opts));
            File.Move(temporarySettings, SettingsFile, true);
            _storageDirectory = destination;
            settings.StoragePath = destination;
        }
        catch
        {
            foreach (var file in copiedFiles)
            {
                try { File.Delete(file); } catch { }
            }
            throw;
        }
        finally
        {
            if (temporarySettings != null)
            {
                try { File.Delete(temporarySettings); } catch { }
            }
        }
    }

    private string ResolveStoragePath(string path)
    {
        if (string.IsNullOrWhiteSpace(path)) return _settingsDirectory;
        path = Environment.ExpandEnvironmentVariables(path.Trim());
        if (!Path.IsPathFullyQualified(path)) throw new ArgumentException("Choose an absolute folder path.");
        return Path.TrimEndingDirectorySeparator(Path.GetFullPath(path));
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
