using System.Windows;
using Microsoft.Web.WebView2.Core;

namespace HttpDebug;

public partial class MainWindow : Window
{
    private readonly ServerManager _serverManager = new();

    public MainWindow()
    {
        InitializeComponent();
        Loaded += MainWindow_Loaded;
        Closing += MainWindow_Closing;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        await StartServerAndLoadAsync();
    }

    private async Task StartServerAndLoadAsync()
    {
        LoadingOverlay.Visibility = Visibility.Visible;
        ErrorOverlay.Visibility = Visibility.Collapsed;
        WebView.Visibility = Visibility.Collapsed;
        StatusText.Text = "Starting server...";

        try
        {
            await _serverManager.StartAsync();

            StatusText.Text = "Loading UI...";

            // Initialize WebView2
            var env = await CoreWebView2Environment.CreateAsync();
            await WebView.EnsureCoreWebView2Async(env);

            WebView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            WebView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;

            WebView.CoreWebView2.Navigate($"http://localhost:{_serverManager.Port}");
            WebView.NavigationCompleted += (_, _) =>
            {
                LoadingOverlay.Visibility = Visibility.Collapsed;
                WebView.Visibility = Visibility.Visible;
            };
        }
        catch (Exception ex)
        {
            LoadingOverlay.Visibility = Visibility.Collapsed;
            ErrorOverlay.Visibility = Visibility.Visible;
            ErrorText.Text = ex.Message;
        }
    }

    private async void RetryButton_Click(object sender, RoutedEventArgs e)
    {
        _serverManager.Stop();
        await StartServerAndLoadAsync();
    }

    private void MainWindow_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
    {
        _serverManager.Dispose();
    }
}
