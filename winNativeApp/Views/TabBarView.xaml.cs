using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using HttpDebug.ViewModels;

namespace HttpDebug.Views;

public partial class TabBarView : UserControl
{
    public TabBarView() { InitializeComponent(); }

    private AppState? State => DataContext as AppState;

    private void ToggleSidebar_Click(object sender, RoutedEventArgs e) => State?.ToggleSidebar();
    private void NewTab_Click(object sender, RoutedEventArgs e) => State?.AddTab();

    private void TabBorder_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (sender is FrameworkElement fe && fe.DataContext is RequestTab tab && State != null)
            State.ActiveTab = tab;
    }

    private void CloseTab_Click(object sender, RoutedEventArgs e)
    {
        if (sender is FrameworkElement fe && fe.DataContext is RequestTab tab && State != null)
            State.CloseTab(tab);
    }
}
