using System.IO;
using System.Windows;
using HttpDebug.Models;
using Microsoft.Win32;

namespace HttpDebug.Views;

public partial class SettingsWindow : Window
{
    private readonly AppSettings _settings;
    private readonly Action<AppSettings> _saveSettings;

    public SettingsWindow(AppSettings settings, Action<AppSettings> saveSettings)
    {
        _settings = settings;
        _saveSettings = saveSettings;
        InitializeComponent();
        StoragePathBox.Text = settings.StoragePath;
    }

    private void Browse_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new OpenFolderDialog { Title = "Choose data folder", Multiselect = false };
        if (Directory.Exists(StoragePathBox.Text)) dialog.InitialDirectory = StoragePathBox.Text;
        if (dialog.ShowDialog(this) == true) StoragePathBox.Text = dialog.FolderName;
    }

    private void Save_Click(object sender, RoutedEventArgs e)
    {
        ErrorText.Visibility = Visibility.Collapsed;
        try
        {
            if (string.IsNullOrWhiteSpace(StoragePathBox.Text))
                throw new ArgumentException("Choose a data folder.");

            var settings = new AppSettings
            {
                StoragePath = StoragePathBox.Text,
                Timeout = _settings.Timeout,
                FollowRedirects = _settings.FollowRedirects,
                ValidateSSL = _settings.ValidateSSL,
                DefaultHeaders = _settings.DefaultHeaders
            };
            _saveSettings(settings);
            Close();
        }
        catch (Exception error)
        {
            ErrorText.Text = error.Message;
            ErrorText.Visibility = Visibility.Visible;
        }
    }
}