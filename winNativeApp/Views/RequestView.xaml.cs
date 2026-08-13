using System;
using System.ComponentModel;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using HttpDebug.Models;
using HttpDebug.ViewModels;

namespace HttpDebug.Views;

public partial class RequestView : UserControl
{
    private RequestBody? _hookedBody;
    private bool _updatingJsonEditor;

    public RequestView()
    {
        InitializeComponent();
        JsonEditor.SyntaxHighlighting = ResponseView.GetJsonHighlighting();
        DataContextChanged += (_, _) => HookBody();
        Loaded += (_, _) => HookBody();
        UpdateTabHighlight("params");
    }

    private AppState? State => Window.GetWindow(this)?.DataContext as AppState;
    private HttpRequest? Req => DataContext as HttpRequest;

    private void HookBody()
    {
        if (_hookedBody != null) _hookedBody.PropertyChanged -= OnBodyPropertyChanged;
        _hookedBody = Req?.Body;
        if (_hookedBody != null) _hookedBody.PropertyChanged += OnBodyPropertyChanged;
        RefreshJsonEditor();
        UpdateBodyTypeHighlight();
    }

    private void OnBodyPropertyChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName == nameof(RequestBody.Content)) RefreshJsonEditor();
        if (e.PropertyName == nameof(RequestBody.Type)) UpdateBodyTypeHighlight();
    }

    private void UpdateBodyTypeHighlight()
    {
        var selectedType = _hookedBody?.Type ?? BodyType.None;
        var accent = (System.Windows.Media.Brush)FindResource("Accent");
        var selectedBackground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(239, 244, 255));
        var normalBackground = (System.Windows.Media.Brush)FindResource("Surface950");
        var normalBorder = (System.Windows.Media.Brush)FindResource("BorderBrush");
        var normalForeground = (System.Windows.Media.Brush)FindResource("TextSecondary");

        foreach (var button in new[] { NoneBodyType, JsonBodyType, RawBodyType, FormDataBodyType, UrlEncodedBodyType })
        {
            var selected = button.Tag is string tag && Enum.TryParse<BodyType>(tag, out var type) && type == selectedType;
            button.Background = selected ? selectedBackground : normalBackground;
            button.BorderBrush = selected ? accent : normalBorder;
            button.Foreground = selected ? accent : normalForeground;
            button.FontWeight = selected ? FontWeights.SemiBold : FontWeights.Normal;
        }
    }

    private void RefreshJsonEditor()
    {
        var content = _hookedBody?.Content ?? "";
        if (JsonEditor.Text == content) return;

        _updatingJsonEditor = true;
        JsonEditor.Text = content;
        _updatingJsonEditor = false;
    }

    private void JsonEditor_TextChanged(object? sender, EventArgs e)
    {
        if (!_updatingJsonEditor && _hookedBody != null && _hookedBody.Content != JsonEditor.Text)
            _hookedBody.Content = JsonEditor.Text;
    }

    private void SwitchTab_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button b && b.Tag is string t) UpdateTabHighlight(t);
    }

    private void UpdateTabHighlight(string tab)
    {
        ParamsContent.Visibility = tab == "params" ? Visibility.Visible : Visibility.Collapsed;
        HeadersContent.Visibility = tab == "headers" ? Visibility.Visible : Visibility.Collapsed;
        BodyContent.Visibility = tab == "body" ? Visibility.Visible : Visibility.Collapsed;
        AuthContent.Visibility = tab == "auth" ? Visibility.Visible : Visibility.Collapsed;

        var accent = (System.Windows.Media.Brush)FindResource("Accent");
        var dim = (System.Windows.Media.Brush)FindResource("TextSecondary");
        ParamsTab.Foreground = tab == "params" ? accent : dim;
        HeadersTab.Foreground = tab == "headers" ? accent : dim;
        BodyTab.Foreground = tab == "body" ? accent : dim;
        AuthTab.Foreground = tab == "auth" ? accent : dim;
    }

    private void BodyType_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button b && b.Tag is string t && Enum.TryParse<BodyType>(t, out var bt) && Req != null)
            Req.Body.Type = bt;
    }

    private void FormatJson_Click(object sender, RoutedEventArgs e)
    {
        if (Req == null) return;
        try
        {
            using var doc = JsonDocument.Parse(Req.Body.Content);
            Req.Body.Content = JsonSerializer.Serialize(doc.RootElement, new JsonSerializerOptions { WriteIndented = true });
        }
        catch { }
    }
}
