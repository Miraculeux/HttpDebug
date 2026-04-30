using System;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using HttpDebug.Models;
using HttpDebug.Services;

namespace HttpDebug.ViewModels;

public class RequestTab : ObservableObject
{
    private HttpRequest _request = new();
    private HttpResponseInfo? _response;
    private bool _isLoading;
    private string? _error;
    private bool _isActive;

    public Guid Id { get; } = Guid.NewGuid();
    public bool IsActive { get => _isActive; set => SetField(ref _isActive, value); }
    public HttpRequest Request
    {
        get => _request;
        set { if (SetField(ref _request, value)) OnPropertyChanged(nameof(DisplayName)); }
    }
    public HttpResponseInfo? Response { get => _response; set => SetField(ref _response, value); }
    public bool IsLoading { get => _isLoading; set => SetField(ref _isLoading, value); }
    public string? Error { get => _error; set => SetField(ref _error, value); }

    public string DisplayName
    {
        get
        {
            if (!string.IsNullOrEmpty(Request.Url))
            {
                var s = Request.Url.Replace("https://", "").Replace("http://", "");
                if (s.Length > 30) s = s.Substring(0, 30);
                return s;
            }
            return Request.Name;
        }
    }

    public RequestTab()
    {
        Request.PropertyChanged += (_, e) =>
        {
            if (e.PropertyName == nameof(HttpRequest.Url) || e.PropertyName == nameof(HttpRequest.Method) || e.PropertyName == nameof(HttpRequest.Name))
                OnPropertyChanged(nameof(DisplayName));
        };
    }
}

public class AppState : ObservableObject
{
    private readonly HttpService _http = new();
    private readonly StorageManager _storage = StorageManager.Shared;

    public ObservableCollection<RequestTab> Tabs { get; } = new();
    public ObservableCollection<RequestCollection> Collections { get; } = new();
    public ObservableCollection<HistoryEntry> History { get; } = new();

    private RequestTab _activeTab;
    public RequestTab ActiveTab
    {
        get => _activeTab;
        set
        {
            var old = _activeTab;
            if (SetField(ref _activeTab, value))
            {
                if (old != null) old.IsActive = false;
                if (value != null) value.IsActive = true;
                OnPropertyChanged(nameof(ActiveRequest));
            }
        }
    }

    public HttpRequest ActiveRequest => ActiveTab?.Request ?? new HttpRequest();

    private AppSettings _settings = new();
    public AppSettings Settings { get => _settings; set => SetField(ref _settings, value); }

    private bool _sidebarVisible = true;
    public bool SidebarVisible { get => _sidebarVisible; set => SetField(ref _sidebarVisible, value); }

    public AppState()
    {
        _activeTab = new RequestTab { IsActive = true };
        Tabs.Add(_activeTab);
        LoadAll();
    }

    public void LoadAll()
    {
        Settings = _storage.LoadSettings();
        Collections.Clear();
        foreach (var c in _storage.ListCollections()) Collections.Add(c);
        History.Clear();
        foreach (var e in _storage.LoadHistory()) History.Add(e);
    }

    // Tabs
    public void AddTab()
    {
        var t = new RequestTab();
        Tabs.Add(t);
        ActiveTab = t;
    }

    public void CloseTab(RequestTab tab)
    {
        if (tab == null) return;
        if (Tabs.Count == 1)
        {
            var t = new RequestTab();
            Tabs.Clear();
            Tabs.Add(t);
            ActiveTab = t;
            return;
        }
        var idx = Tabs.IndexOf(tab);
        Tabs.Remove(tab);
        if (ActiveTab == tab)
            ActiveTab = Tabs[Math.Min(idx, Tabs.Count - 1)];
    }

    // Send
    public async Task SendRequestAsync()
    {
        var tab = ActiveTab;
        if (tab == null) return;
        if (string.IsNullOrWhiteSpace(tab.Request.Url))
        {
            tab.Error = "URL is required";
            return;
        }
        tab.Error = null;
        tab.Response = null;
        tab.IsLoading = true;

        try
        {
            var resp = await _http.SendAsync(tab.Request, Settings).ConfigureAwait(true);
            tab.Response = resp;

            // history
            var entry = new HistoryEntry { Request = CloneRequest(tab.Request), Response = resp };
            History.Insert(0, entry);
            while (History.Count > 500) History.RemoveAt(History.Count - 1);
            _storage.SaveHistory(History);
        }
        catch (Exception ex)
        {
            tab.Error = ex.Message;
        }
        finally
        {
            tab.IsLoading = false;
        }
    }

    public void ResetRequest()
    {
        if (ActiveTab == null) return;
        ActiveTab.Request = new HttpRequest();
        ActiveTab.Response = null;
        ActiveTab.Error = null;
        OnPropertyChanged(nameof(ActiveRequest));
    }

    // Collections
    public void CreateCollection(string name)
    {
        var c = new RequestCollection { Name = name };
        Collections.Add(c);
        _storage.SaveCollection(c);
    }

    public void DeleteCollection(RequestCollection c)
    {
        Collections.Remove(c);
        _storage.DeleteCollection(c.Id);
    }

    public void SaveToCollection(RequestCollection c)
    {
        if (ActiveTab == null) return;
        var saved = new SavedRequest { Request = CloneRequest(ActiveTab.Request), Response = ActiveTab.Response };
        c.Requests.Add(saved);
        c.UpdatedAt = DateTime.UtcNow;
        _storage.SaveCollection(c);
    }

    public void LoadFromCollection(RequestCollection c, SavedRequest s)
    {
        if (ActiveTab == null) return;
        ActiveTab.Request = CloneRequest(s.Request);
        ActiveTab.Response = s.Response;
        ActiveTab.Error = null;
        OnPropertyChanged(nameof(ActiveRequest));
    }

    public void DeleteFromCollection(RequestCollection c, SavedRequest s)
    {
        c.Requests.Remove(s);
        _storage.SaveCollection(c);
    }

    public void ImportCollection(string path)
    {
        var c = _storage.ImportCollection(path);
        if (c != null) Collections.Add(c);
    }

    public string? ExportCollection(RequestCollection c)
    {
        try { return _storage.ExportCollection(c); } catch { return null; }
    }

    // History
    public void LoadFromHistory(HistoryEntry e)
    {
        if (ActiveTab == null) return;
        ActiveTab.Request = CloneRequest(e.Request);
        ActiveTab.Response = e.Response;
        ActiveTab.Error = null;
        OnPropertyChanged(nameof(ActiveRequest));
    }

    public void OpenInNewTab(HistoryEntry e)
    {
        var t = new RequestTab { Request = CloneRequest(e.Request), Response = e.Response };
        Tabs.Add(t);
        ActiveTab = t;
    }

    public void DeleteHistoryEntry(HistoryEntry e)
    {
        History.Remove(e);
        _storage.SaveHistory(History);
    }

    public void ClearHistory()
    {
        History.Clear();
        _storage.ClearHistory();
    }

    public void UpdateSettings(AppSettings s)
    {
        Settings = s;
        _storage.SaveSettings(s);
    }

    public void ToggleSidebar() => SidebarVisible = !SidebarVisible;

    // Deep clone via JSON
    private static HttpRequest CloneRequest(HttpRequest r)
    {
        var json = System.Text.Json.JsonSerializer.Serialize(r);
        return System.Text.Json.JsonSerializer.Deserialize<HttpRequest>(json) ?? new HttpRequest();
    }
}
