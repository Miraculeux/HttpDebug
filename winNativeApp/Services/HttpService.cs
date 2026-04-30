using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using HttpDebug.Models;

namespace HttpDebug.Services;

public class HttpService
{
    public async Task<HttpResponseInfo> SendAsync(HttpRequest req, AppSettings settings)
    {
        var url = BuildUrl(req);
        if (url == null) throw new InvalidOperationException($"Invalid URL: {req.Url}");

        var handler = new HttpClientHandler
        {
            AllowAutoRedirect = settings.FollowRedirects,
        };
        if (!settings.ValidateSSL)
        {
            handler.ServerCertificateCustomValidationCallback = (_, _, _, _) => true;
        }

        using var client = new HttpClient(handler)
        {
            Timeout = TimeSpan.FromSeconds(Math.Max(1, settings.Timeout))
        };

        var msg = new HttpRequestMessage(MapMethod(req.Method), url);
        var contentHeaders = new List<KeyValuePair<string, string>>();

        // Default headers
        foreach (var h in settings.DefaultHeaders.Where(h => h.Enabled && !string.IsNullOrEmpty(h.Key)))
            TryAddHeader(msg, contentHeaders, h.Key, h.Value);

        // Request headers
        foreach (var h in req.Headers.Where(h => h.Enabled && !string.IsNullOrEmpty(h.Key)))
            TryAddHeader(msg, contentHeaders, h.Key, h.Value);

        // Auth
        ApplyAuth(msg, req.Auth);

        // Body
        ApplyBody(msg, req.Body, contentHeaders);

        var sw = Stopwatch.StartNew();
        HttpResponseMessage resp;
        try
        {
            resp = await client.SendAsync(msg).ConfigureAwait(false);
        }
        catch (TaskCanceledException) { throw new Exception("Request timeout"); }
        catch (HttpRequestException e) { throw new Exception(e.Message); }

        sw.Stop();

        var bytes = await resp.Content.ReadAsByteArrayAsync().ConfigureAwait(false);
        var bodyStr = TryDecode(bytes);

        var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var h in resp.Headers) headers[h.Key] = string.Join(", ", h.Value);
        foreach (var h in resp.Content.Headers) headers[h.Key] = string.Join(", ", h.Value);

        return new HttpResponseInfo
        {
            Status = (int)resp.StatusCode,
            StatusText = resp.ReasonPhrase ?? "",
            Headers = headers,
            Body = bodyStr,
            Time = (int)sw.ElapsedMilliseconds,
            Size = bytes.Length,
        };
    }

    private static Uri? BuildUrl(HttpRequest req)
    {
        if (!Uri.TryCreate(req.Url, UriKind.Absolute, out var baseUri)) return null;
        var enabled = req.Params.Where(p => p.Enabled && !string.IsNullOrEmpty(p.Key)).ToList();
        if (enabled.Count == 0) return baseUri;

        var b = new UriBuilder(baseUri);
        var existing = b.Query.TrimStart('?');
        var sb = new StringBuilder(existing);
        foreach (var p in enabled)
        {
            if (sb.Length > 0) sb.Append('&');
            sb.Append(WebUtility.UrlEncode(p.Key));
            sb.Append('=');
            sb.Append(WebUtility.UrlEncode(p.Value));
        }
        b.Query = sb.ToString();
        return b.Uri;
    }

    private static HttpMethod MapMethod(HttpMethodKind m) => m switch
    {
        HttpMethodKind.GET => HttpMethod.Get,
        HttpMethodKind.POST => HttpMethod.Post,
        HttpMethodKind.PUT => HttpMethod.Put,
        HttpMethodKind.PATCH => HttpMethod.Patch,
        HttpMethodKind.DELETE => HttpMethod.Delete,
        HttpMethodKind.HEAD => HttpMethod.Head,
        HttpMethodKind.OPTIONS => HttpMethod.Options,
        HttpMethodKind.TRACE => HttpMethod.Trace,
        _ => HttpMethod.Get,
    };

    private static readonly HashSet<string> ContentHeaders = new(StringComparer.OrdinalIgnoreCase)
    {
        "Allow","Content-Disposition","Content-Encoding","Content-Language","Content-Length",
        "Content-Location","Content-MD5","Content-Range","Content-Type","Expires","Last-Modified"
    };

    private static void TryAddHeader(HttpRequestMessage msg, List<KeyValuePair<string, string>> contentHeaders, string key, string value)
    {
        if (ContentHeaders.Contains(key))
        {
            contentHeaders.Add(new KeyValuePair<string, string>(key, value));
            return;
        }
        try { msg.Headers.TryAddWithoutValidation(key, value); } catch { }
    }

    private static void ApplyAuth(HttpRequestMessage msg, AuthConfig auth)
    {
        switch (auth.Type)
        {
            case AuthType.Basic:
                {
                    var raw = $"{auth.BasicUsername}:{auth.BasicPassword}";
                    var b64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(raw));
                    msg.Headers.Authorization = new AuthenticationHeaderValue("Basic", b64);
                    break;
                }
            case AuthType.Bearer:
                {
                    var prefix = string.IsNullOrEmpty(auth.BearerPrefix) ? "Bearer" : auth.BearerPrefix;
                    msg.Headers.TryAddWithoutValidation("Authorization", $"{prefix} {auth.BearerToken}");
                    break;
                }
            case AuthType.ApiKey:
                if (auth.ApiKeyAddTo == "header" && !string.IsNullOrEmpty(auth.ApiKeyKey))
                    msg.Headers.TryAddWithoutValidation(auth.ApiKeyKey, auth.ApiKeyValue);
                break;
            case AuthType.OAuth2:
                if (!string.IsNullOrEmpty(auth.OAuth2Token))
                    msg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth.OAuth2Token);
                break;
            case AuthType.Digest:
                {
                    var raw = $"{auth.DigestUsername}:{auth.DigestPassword}";
                    var b64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(raw));
                    msg.Headers.Authorization = new AuthenticationHeaderValue("Basic", b64);
                    break;
                }
        }
    }

    private static void ApplyBody(HttpRequestMessage msg, RequestBody body, List<KeyValuePair<string, string>> contentHeaders)
    {
        switch (body.Type)
        {
            case BodyType.None: break;
            case BodyType.Json:
                msg.Content = new StringContent(body.Content ?? "", Encoding.UTF8, "application/json");
                break;
            case BodyType.Raw:
                msg.Content = new StringContent(body.Content ?? "", Encoding.UTF8, "text/plain");
                break;
            case BodyType.FormData:
                {
                    var mp = new MultipartFormDataContent();
                    foreach (var f in body.FormData.Where(f => f.Enabled && !string.IsNullOrEmpty(f.Key)))
                        mp.Add(new StringContent(f.Value ?? ""), f.Key);
                    msg.Content = mp;
                    break;
                }
            case BodyType.UrlEncoded:
                {
                    var pairs = body.FormData
                        .Where(f => f.Enabled && !string.IsNullOrEmpty(f.Key))
                        .Select(f => new KeyValuePair<string, string>(f.Key, f.Value ?? ""));
                    msg.Content = new FormUrlEncodedContent(pairs);
                    break;
                }
        }

        // Apply content header overrides (e.g. custom Content-Type)
        if (msg.Content == null) return;
        foreach (var (name, val) in contentHeaders)
        {
            if (string.Equals(name, "Content-Type", StringComparison.OrdinalIgnoreCase))
            {
                try { msg.Content.Headers.ContentType = MediaTypeHeaderValue.Parse(val); } catch { }
            }
            else
            {
                try { msg.Content.Headers.TryAddWithoutValidation(name, val); } catch { }
            }
        }
    }

    private static string TryDecode(byte[] bytes)
    {
        if (bytes.Length == 0) return "";
        try { return Encoding.UTF8.GetString(bytes); } catch { return Convert.ToBase64String(bytes); }
    }
}
