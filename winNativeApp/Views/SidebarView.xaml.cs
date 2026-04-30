using System;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Input;
using HttpDebug.Models;
using HttpDebug.ViewModels;
using Microsoft.Win32;

namespace HttpDebug.Views;

public partial class SidebarView : UserControl
{
    public SidebarView() { InitializeComponent(); }

    private AppState? State => Window.GetWindow(this)?.DataContext as AppState;

    private void ShowCollections_Click(object sender, RoutedEventArgs e)
    {
        CollectionsPanel.Visibility = Visibility.Visible;
        HistoryPanel.Visibility = Visibility.Collapsed;
        UpdateTabBrushes(true);
    }

    private void ShowHistory_Click(object sender, RoutedEventArgs e)
    {
        CollectionsPanel.Visibility = Visibility.Collapsed;
        HistoryPanel.Visibility = Visibility.Visible;
        UpdateTabBrushes(false);
    }

    private void UpdateTabBrushes(bool collections)
    {
        var accent = (System.Windows.Media.Brush)FindResource("Accent");
        var dim = (System.Windows.Media.Brush)FindResource("TextSecondary");
        CollectionsTabBtn.Foreground = collections ? accent : dim;
        HistoryTabBtn.Foreground = collections ? dim : accent;
    }

    private void ToggleNewForm_Click(object sender, RoutedEventArgs e)
    {
        NewCollectionForm.Visibility = NewCollectionForm.Visibility == Visibility.Visible
            ? Visibility.Collapsed : Visibility.Visible;
    }

    private void CreateCollection_Click(object sender, RoutedEventArgs e)
    {
        var name = NewCollectionName.Text.Trim();
        if (!string.IsNullOrEmpty(name))
        {
            State?.CreateCollection(name);
            NewCollectionName.Text = "";
            NewCollectionForm.Visibility = Visibility.Collapsed;
        }
    }

    private void CancelNew_Click(object sender, RoutedEventArgs e)
    {
        NewCollectionName.Text = "";
        NewCollectionForm.Visibility = Visibility.Collapsed;
    }

    private void DeleteCollection_Click(object sender, RoutedEventArgs e)
    {
        if (sender is FrameworkElement fe && fe.Tag is RequestCollection c && State != null)
        {
            if (MessageBox.Show($"Delete collection \"{c.Name}\"?", "Confirm",
                MessageBoxButton.YesNo, MessageBoxImage.Question) == MessageBoxResult.Yes)
                State.DeleteCollection(c);
        }
    }

    private void ExportCollection_Click(object sender, RoutedEventArgs e)
    {
        if (sender is FrameworkElement fe && fe.Tag is RequestCollection c && State != null)
        {
            var data = State.ExportCollection(c);
            if (data == null) return;
            var dlg = new SaveFileDialog
            {
                Filter = "JSON|*.json",
                FileName = $"{c.Name}.json"
            };
            if (dlg.ShowDialog() == true)
            {
                File.WriteAllText(dlg.FileName, data);
            }
        }
    }

    private void Import_Click(object sender, RoutedEventArgs e)
    {
        var dlg = new OpenFileDialog { Filter = "JSON|*.json" };
        if (dlg.ShowDialog() == true)
            State?.ImportCollection(dlg.FileName);
    }

    private void SavedRequest_Click(object sender, MouseButtonEventArgs e)
    {
        if (sender is FrameworkElement fe && fe.Tag is SavedRequest s && State != null)
        {
            var col = State.Collections.FirstOrDefault(c => c.Requests.Contains(s));
            if (col != null) State.LoadFromCollection(col, s);
        }
    }

    private void DeleteSavedRequest_Click(object sender, RoutedEventArgs e)
    {
        if (sender is FrameworkElement fe && fe.Tag is SavedRequest s && State != null)
        {
            var col = State.Collections.FirstOrDefault(c => c.Requests.Contains(s));
            if (col != null) State.DeleteFromCollection(col, s);
        }
    }

    private void ClearHistory_Click(object sender, RoutedEventArgs e)
    {
        if (State == null) return;
        if (MessageBox.Show("Clear all history?", "Confirm",
            MessageBoxButton.YesNo, MessageBoxImage.Question) == MessageBoxResult.Yes)
            State.ClearHistory();
    }

    private void HistoryEntry_Click(object sender, MouseButtonEventArgs e)
    {
        if (sender is FrameworkElement fe && fe.Tag is HistoryEntry h)
            State?.LoadFromHistory(h);
    }

    private void OpenInNewTab_Click(object sender, RoutedEventArgs e)
    {
        if (sender is FrameworkElement fe && fe.Tag is HistoryEntry h)
            State?.OpenInNewTab(h);
        e.Handled = true;
    }

    private void DeleteHistory_Click(object sender, RoutedEventArgs e)
    {
        if (sender is FrameworkElement fe && fe.Tag is HistoryEntry h)
            State?.DeleteHistoryEntry(h);
        e.Handled = true;
    }

    private void HistorySearch_Changed(object sender, TextChangedEventArgs e)
    {
        if (State == null) return;
        var q = HistorySearchBox.Text.Trim();
        var view = CollectionViewSource.GetDefaultView(State.History);
        if (string.IsNullOrEmpty(q))
        {
            view.Filter = null;
        }
        else
        {
            var ql = q.ToLowerInvariant();
            view.Filter = obj =>
            {
                if (obj is HistoryEntry h)
                {
                    return h.Request.Url.ToLowerInvariant().Contains(ql)
                        || h.Request.Method.ToString().ToLowerInvariant().Contains(ql)
                        || (h.Response.Body?.ToLowerInvariant().Contains(ql) ?? false)
                        || h.Response.Status.ToString().Contains(ql);
                }
                return false;
            };
        }
    }
}
