using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using HttpDebug.Models;
using HttpDebug.ViewModels;

namespace HttpDebug.Views;

public partial class UrlBarView : UserControl
{
    public UrlBarView() { InitializeComponent(); }

    private AppState? State => Window.GetWindow(this)?.DataContext as AppState;

    private async void Send_Click(object sender, RoutedEventArgs e)
    {
        if (State != null) await State.SendRequestAsync();
    }

    private async void UrlBox_KeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter && State != null)
        {
            // commit textbox binding
            (sender as TextBox)?.GetBindingExpression(TextBox.TextProperty)?.UpdateSource();
            await State.SendRequestAsync();
        }
    }

    private void Reset_Click(object sender, RoutedEventArgs e) => State?.ResetRequest();

    private void SaveToCollection_Click(object sender, RoutedEventArgs e)
    {
        if (State == null) return;
        var menu = new ContextMenu();
        if (State.Collections.Count == 0)
        {
            menu.Items.Add(new MenuItem { Header = "No collections yet", IsEnabled = false });
        }
        else
        {
            foreach (var c in State.Collections.ToList())
            {
                var col = c;
                var item = new MenuItem { Header = col.Name };
                item.Click += (_, _) => State.SaveToCollection(col);
                menu.Items.Add(item);
            }
        }
        menu.PlacementTarget = (UIElement)sender;
        menu.IsOpen = true;
    }
}
