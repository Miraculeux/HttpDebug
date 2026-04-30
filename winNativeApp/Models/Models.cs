using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Text.Json.Serialization;

namespace HttpDebug.Models;

public abstract class ObservableObject : INotifyPropertyChanged
{
    public event PropertyChangedEventHandler? PropertyChanged;

    protected bool SetField<T>(ref T field, T value, [CallerMemberName] string? name = null)
    {
        if (EqualityComparer<T>.Default.Equals(field, value)) return false;
        field = value;
        OnPropertyChanged(name);
        return true;
    }

    protected void OnPropertyChanged([CallerMemberName] string? name = null)
        => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}

public enum HttpMethodKind { GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS, TRACE }

public enum AuthType { None, Basic, Bearer, ApiKey, OAuth2, Digest }

public enum BodyType { None, Json, Raw, FormData, UrlEncoded }

public class KvPair : ObservableObject
{
    private string _key = "";
    private string _value = "";
    private bool _enabled = true;
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Key { get => _key; set => SetField(ref _key, value); }
    public string Value { get => _value; set => SetField(ref _value, value); }
    public bool Enabled { get => _enabled; set => SetField(ref _enabled, value); }
}

public class AuthConfig : ObservableObject
{
    private AuthType _type = AuthType.None;
    private string _basicUsername = "";
    private string _basicPassword = "";
    private string _bearerToken = "";
    private string _bearerPrefix = "Bearer";
    private string _apiKeyKey = "";
    private string _apiKeyValue = "";
    private string _apiKeyAddTo = "header";
    private string _oauth2Token = "";
    private string _digestUsername = "";
    private string _digestPassword = "";

    public AuthType Type { get => _type; set => SetField(ref _type, value); }
    public string BasicUsername { get => _basicUsername; set => SetField(ref _basicUsername, value); }
    public string BasicPassword { get => _basicPassword; set => SetField(ref _basicPassword, value); }
    public string BearerToken { get => _bearerToken; set => SetField(ref _bearerToken, value); }
    public string BearerPrefix { get => _bearerPrefix; set => SetField(ref _bearerPrefix, value); }
    public string ApiKeyKey { get => _apiKeyKey; set => SetField(ref _apiKeyKey, value); }
    public string ApiKeyValue { get => _apiKeyValue; set => SetField(ref _apiKeyValue, value); }
    public string ApiKeyAddTo { get => _apiKeyAddTo; set => SetField(ref _apiKeyAddTo, value); }
    public string OAuth2Token { get => _oauth2Token; set => SetField(ref _oauth2Token, value); }
    public string DigestUsername { get => _digestUsername; set => SetField(ref _digestUsername, value); }
    public string DigestPassword { get => _digestPassword; set => SetField(ref _digestPassword, value); }
}

public class RequestBody : ObservableObject
{
    private BodyType _type = BodyType.None;
    private string _content = "";
    private ObservableCollection<KvPair> _formData = new();

    public BodyType Type { get => _type; set => SetField(ref _type, value); }
    public string Content { get => _content; set => SetField(ref _content, value); }
    public ObservableCollection<KvPair> FormData { get => _formData; set => SetField(ref _formData, value); }
}

public class HttpRequest : ObservableObject
{
    private string _name = "New Request";
    private HttpMethodKind _method = HttpMethodKind.GET;
    private string _url = "";
    private ObservableCollection<KvPair> _headers = new();
    private ObservableCollection<KvPair> _params = new();
    private RequestBody _body = new();
    private AuthConfig _auth = new();

    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get => _name; set => SetField(ref _name, value); }
    public HttpMethodKind Method { get => _method; set => SetField(ref _method, value); }
    public string Url { get => _url; set => SetField(ref _url, value); }
    public ObservableCollection<KvPair> Headers { get => _headers; set => SetField(ref _headers, value); }
    [JsonPropertyName("params")]
    public ObservableCollection<KvPair> Params { get => _params; set => SetField(ref _params, value); }
    public RequestBody Body { get => _body; set => SetField(ref _body, value); }
    public AuthConfig Auth { get => _auth; set => SetField(ref _auth, value); }
}

public class HttpResponseInfo
{
    public int Status { get; set; }
    public string StatusText { get; set; } = "";
    public Dictionary<string, string> Headers { get; set; } = new();
    public string Body { get; set; } = "";
    public int Time { get; set; }
    public int Size { get; set; }
}

public class SavedRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public HttpRequest Request { get; set; } = new();
    public HttpResponseInfo? Response { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class RequestCollection : ObservableObject
{
    private string _name = "";
    private ObservableCollection<SavedRequest> _requests = new();
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get => _name; set => SetField(ref _name, value); }
    public string Description { get; set; } = "";
    public ObservableCollection<SavedRequest> Requests { get => _requests; set => SetField(ref _requests, value); }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class HistoryEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public HttpRequest Request { get; set; } = new();
    public HttpResponseInfo Response { get; set; } = new();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class AppSettings : ObservableObject
{
    private double _timeout = 30;
    private bool _followRedirects = true;
    private bool _validateSSL = true;
    private ObservableCollection<KvPair> _defaultHeaders = new();

    public string StoragePath { get; set; } = "";
    public double Timeout { get => _timeout; set => SetField(ref _timeout, value); }
    public bool FollowRedirects { get => _followRedirects; set => SetField(ref _followRedirects, value); }
    public bool ValidateSSL { get => _validateSSL; set => SetField(ref _validateSSL, value); }
    public ObservableCollection<KvPair> DefaultHeaders { get => _defaultHeaders; set => SetField(ref _defaultHeaders, value); }
}

public static class AuthHelpers
{
    public static AuthType[] AllAuthTypes { get; } =
        (AuthType[])Enum.GetValues(typeof(AuthType));
}
