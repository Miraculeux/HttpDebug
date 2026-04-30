using System;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using HttpDebug.Models;
using HttpDebug.ViewModels;

namespace HttpDebug.Views;

public partial class RequestView : UserControl
{
    public RequestView() { InitializeComponent(); UpdateTabHighlight("params"); }

    private AppState? State => Window.GetWindow(this)?.DataContext as AppState;
    private HttpRequest? Req => DataContext as HttpRequest;

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
