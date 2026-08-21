using System;
using System.ComponentModel;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Xml;
using HttpDebug.Models;
using HttpDebug.ViewModels;
using ICSharpCode.AvalonEdit.Highlighting;
using ICSharpCode.AvalonEdit.Highlighting.Xshd;

namespace HttpDebug.Views;

public partial class ResponseView : UserControl
{
    private bool _rawView = true;
    private bool _responseIsJson;
    private static IHighlightingDefinition? _jsonHighlighting;
    private static readonly JsonSerializerOptions PrettyJsonOptions = new() { WriteIndented = true };
    private CancellationTokenSource? _formatCts;

    public ResponseView()
    {
        InitializeComponent();
        GetJsonHighlighting();

        TreeScroller.Visibility = Visibility.Collapsed;
        Editor.Visibility = Visibility.Visible;
        UpdateBodyView();

        DataContextChanged += (_, _) => HookTab();
        Loaded += (_, _) => HookTab();
        UpdateTab("body");
    }

    private RequestTab? _hookedTab;

    private void HookTab()
    {
        if (_hookedTab != null) _hookedTab.PropertyChanged -= OnTabPropertyChanged;
        _hookedTab = DataContext as RequestTab;
        if (_hookedTab != null) _hookedTab.PropertyChanged += OnTabPropertyChanged;
        RefreshEditor();
    }

    private void OnTabPropertyChanged(object? s, PropertyChangedEventArgs e)
    {
        if (e.PropertyName == nameof(RequestTab.Response)) RefreshEditor();
    }

    private void RefreshEditor()
    {
        _formatCts?.Cancel();
        _formatCts = new CancellationTokenSource();

        var resp = (DataContext as RequestTab)?.Response;
        var body = resp?.Body ?? "";
        Editor.Text = body;
        Editor.SyntaxHighlighting = PickHighlighting(resp, body);
        _responseIsJson = LooksLikeJson(body);
        _rawView = true;
        if (_responseIsJson)
            _ = FormatJsonAsync(resp, body, _formatCts.Token);

        var isHttpError = resp?.Status >= 400;
        var hasBody = !string.IsNullOrWhiteSpace(body);
        HttpErrorSummary.Visibility = isHttpError ? Visibility.Visible : Visibility.Collapsed;
        EmptyErrorBody.Visibility = isHttpError && !hasBody ? Visibility.Visible : Visibility.Collapsed;
        UpdateBodyView();

        if (resp != null && isHttpError)
        {
            HttpErrorTitle.Text = $"Request failed: {resp.Status} {resp.StatusText}".TrimEnd();
            var contentType = GetHeader(resp, "Content-Type");
            HttpErrorMeta.Text = string.IsNullOrWhiteSpace(contentType)
                ? $"{resp.Size:N0} bytes received"
                : $"{contentType}  |  {resp.Size:N0} bytes received";
        }
    }

    private static string GetHeader(HttpResponseInfo response, string name)
    {
        var key = response.Headers.Keys.FirstOrDefault(k => string.Equals(k, name, StringComparison.OrdinalIgnoreCase));
        return key == null ? "" : response.Headers[key] ?? "";
    }

    private static IHighlightingDefinition? PickHighlighting(HttpResponseInfo? resp, string body)
    {
        string ct = "";
        if (resp?.Headers != null)
        {
            var key = resp.Headers.Keys.FirstOrDefault(k => string.Equals(k, "Content-Type", StringComparison.OrdinalIgnoreCase));
            if (key != null) ct = (resp.Headers[key] ?? "").ToLowerInvariant();
        }

        if (ct.Contains("json") || LooksLikeJson(body)) return _jsonHighlighting;
        if (ct.Contains("html") || ct.Contains("xhtml")) return HighlightingManager.Instance.GetDefinition("HTML");
        if (ct.Contains("xml") || ct.Contains("svg")) return HighlightingManager.Instance.GetDefinition("XML");
        if (ct.Contains("javascript") || ct.Contains("ecmascript")) return HighlightingManager.Instance.GetDefinition("JavaScript");
        if (ct.Contains("css")) return HighlightingManager.Instance.GetDefinition("CSS");
        return null;
    }

    private static bool LooksLikeJson(string s)
    {
        if (string.IsNullOrWhiteSpace(s)) return false;
        var t = s.TrimStart();
        return t.Length > 0 && (t[0] == '{' || t[0] == '[');
    }

    private async Task FormatJsonAsync(HttpResponseInfo? response, string body, CancellationToken cancellationToken)
    {
        try
        {
            var formatted = await Task.Run(() =>
            {
                using var document = JsonDocument.Parse(body);
                return JsonSerializer.Serialize(document.RootElement, PrettyJsonOptions);
            }, cancellationToken);

            if (!cancellationToken.IsCancellationRequested &&
                ReferenceEquals((DataContext as RequestTab)?.Response, response))
            {
                Editor.Text = formatted;
            }
        }
        catch (OperationCanceledException) { }
        catch (JsonException) { }
    }

    internal static IHighlightingDefinition? GetJsonHighlighting()
    {
        if (_jsonHighlighting != null) return _jsonHighlighting;
        try
        {
            var uri = new Uri("pack://application:,,,/Assets/Json.xshd");
            using var stream = Application.GetResourceStream(uri)?.Stream;
            if (stream == null) return null;
            using var reader = new XmlTextReader(stream);
            _jsonHighlighting = HighlightingLoader.Load(reader, HighlightingManager.Instance);
            HighlightingManager.Instance.RegisterHighlighting("JSON", new[] { ".json" }, _jsonHighlighting);
        }
        catch { }
        return _jsonHighlighting;
    }

    private void SwitchTab_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button b && b.Tag is string t) UpdateTab(t);
    }

    private void UpdateTab(string tab)
    {
        BodyArea.Visibility = tab == "body" ? Visibility.Visible : Visibility.Collapsed;
        HeadersArea.Visibility = tab == "headers" ? Visibility.Visible : Visibility.Collapsed;
        BodyControls.Visibility = tab == "body" ? Visibility.Visible : Visibility.Collapsed;

        var accent = (System.Windows.Media.Brush)FindResource("Accent");
        var dim = (System.Windows.Media.Brush)FindResource("TextSecondary");
        BodyTabButton.Foreground = tab == "body" ? accent : dim;
        HeadersTabButton.Foreground = tab == "headers" ? accent : dim;
    }

    private void ToggleRaw_Click(object sender, RoutedEventArgs e)
    {
        _rawView = !_rawView;
        UpdateBodyView();
    }

    private void UpdateBodyView()
    {
        var response = (DataContext as RequestTab)?.Response;
        var hasDisplayableBody = response != null && !string.IsNullOrWhiteSpace(response.Body);
        var showTree = !_rawView && _responseIsJson && hasDisplayableBody;
        if (showTree && JsonTree.Json != response!.Body)
            JsonTree.Json = response.Body;
        TreeScroller.Visibility = showTree ? Visibility.Visible : Visibility.Collapsed;
        Editor.Visibility = !showTree && hasDisplayableBody ? Visibility.Visible : Visibility.Collapsed;
        RawToggle.IsEnabled = _responseIsJson;
        if (RawToggle.Content is TextBlock text) text.Text = showTree ? "Raw" : "Tree";
    }

    private void ViewHeaders_Click(object sender, RoutedEventArgs e) => UpdateTab("headers");

    private void CopyResponse_Click(object sender, RoutedEventArgs e)
    {
        if (DataContext is RequestTab tab && tab.Response != null)
        {
            try { Clipboard.SetText(tab.Response.Body ?? ""); } catch { }
        }
    }
}
