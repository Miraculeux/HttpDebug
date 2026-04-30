using System;
using System.ComponentModel;
using System.Linq;
using System.Text.Json;
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
    private static IHighlightingDefinition? _jsonHighlighting;

    public ResponseView()
    {
        InitializeComponent();
        EnsureJsonHighlightingLoaded();

        TreeScroller.Visibility = Visibility.Collapsed;
        Editor.Visibility = Visibility.Visible;
        if (RawToggle.Content is TextBlock tb) tb.Text = "Tree";

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
        var resp = (DataContext as RequestTab)?.Response;
        var body = resp?.Body ?? "";
        Editor.Text = body;
        Editor.SyntaxHighlighting = PickHighlighting(resp, body);
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
        if (t.Length == 0 || (t[0] != '{' && t[0] != '[')) return false;
        try { using var _ = JsonDocument.Parse(s); return true; }
        catch { return false; }
    }

    private static void EnsureJsonHighlightingLoaded()
    {
        if (_jsonHighlighting != null) return;
        try
        {
            var uri = new Uri("pack://application:,,,/Assets/Json.xshd");
            using var stream = Application.GetResourceStream(uri)?.Stream;
            if (stream == null) return;
            using var reader = new XmlTextReader(stream);
            _jsonHighlighting = HighlightingLoader.Load(reader, HighlightingManager.Instance);
            HighlightingManager.Instance.RegisterHighlighting("JSON", new[] { ".json" }, _jsonHighlighting);
        }
        catch { }
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
        TreeScroller.Visibility = _rawView ? Visibility.Collapsed : Visibility.Visible;
        Editor.Visibility = _rawView ? Visibility.Visible : Visibility.Collapsed;
        if (RawToggle.Content is TextBlock tb) tb.Text = _rawView ? "Tree" : "Raw";
    }

    private void CopyResponse_Click(object sender, RoutedEventArgs e)
    {
        if (DataContext is RequestTab tab && tab.Response != null)
        {
            try { Clipboard.SetText(tab.Response.Body ?? ""); } catch { }
        }
    }
}
