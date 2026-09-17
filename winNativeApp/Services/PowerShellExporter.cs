using System.Text;
using System.Web;
using HttpDebug.Models;

namespace HttpDebug.Services;

public static class PowerShellExporter
{
    public static async Task<string> ExportAsync(HttpRequest request, AppSettings settings, bool includeAuth)
    {
        using var message = HttpService.CreateRequest(request, settings);
        var url = message.RequestUri!.AbsoluteUri;
        if (!includeAuth)
        {
            var builder = new UriBuilder(url);
            var query = HttpUtility.ParseQueryString(builder.Query);
            foreach (var key in query.AllKeys)
                if (key != null && IsAuthField(key, request.Auth)) query[key] = "<AUTH_TOKEN>";
            builder.Query = query.ToString();
            if (!string.IsNullOrEmpty(builder.UserName) || !string.IsNullOrEmpty(builder.Password))
            {
                builder.UserName = "<USERNAME>";
                builder.Password = "<PASSWORD>";
            }
            url = builder.Uri.AbsoluteUri;
        }

        var script = new StringBuilder();
        script.AppendLine("#Requires -Version 7.0");
        script.AppendLine("$ErrorActionPreference = 'Stop'");
        script.AppendLine("$request = @{");
        script.AppendLine($"    Uri = {Quote(url)}");
        script.AppendLine($"    CustomMethod = {Quote(message.Method.Method)}");
        script.AppendLine("    SkipHttpErrorCheck = $true");
        script.AppendLine("    SkipHeaderValidation = $true");
        script.AppendLine($"    TimeoutSec = {Math.Clamp(Math.Ceiling(settings.Timeout), 1, int.MaxValue):0}");
        if (!settings.FollowRedirects) script.AppendLine("    MaximumRedirection = 0");
        if (!settings.ValidateSSL) script.AppendLine("    SkipCertificateCheck = $true");
        script.AppendLine("    Headers = @{");
        var headers = message.Headers.ToDictionary(header => header.Key, header => string.Join(", ", header.Value), StringComparer.OrdinalIgnoreCase);
        if (message.Content != null)
            foreach (var header in message.Content.Headers)
                headers[header.Key] = string.Join(", ", header.Value);
        foreach (var (key, originalValue) in headers)
        {
            if (key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase)) continue;
            var value = !includeAuth && IsAuthField(key, request.Auth) ? "<AUTH_TOKEN>" : originalValue;
            script.AppendLine($"        {Quote(key)} = {Quote(value)}");
        }
        script.AppendLine("    }");
        if (message.Content != null)
        {
            var body = await message.Content.ReadAsStringAsync();
            script.AppendLine($"    Body = [System.Text.Encoding]::UTF8.GetBytes({Quote(body)})");
        }
        script.AppendLine("}");
        script.AppendLine("Invoke-WebRequest @request");
        return script.ToString();
    }

    private static bool IsAuthField(string name, AuthConfig auth)
    {
        var normalized = name.Replace("-", "").Replace("_", "");
        return normalized.Equals("Authorization", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("ProxyAuthorization", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("Cookie", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("Token", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("AccessToken", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("RefreshToken", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("ApiKey", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("XApiKey", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("XAuthToken", StringComparison.OrdinalIgnoreCase)
            || (!string.IsNullOrEmpty(auth.ApiKeyKey) && name.Equals(auth.ApiKeyKey, StringComparison.OrdinalIgnoreCase));
    }

    private static string Quote(string value)
    {
        var escaped = value.Replace("'", "''");
        if (!value.Any(character => character is >= '\u2018' and <= '\u201B'))
            return "'" + escaped + "'";

        for (var codePoint = 0x2018; codePoint <= 0x201B; codePoint++)
            escaped = escaped.Replace(((char)codePoint).ToString(), $"' + [char]{codePoint} + '");
        return "('" + escaped + "')";
    }
}