using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;

namespace HttpDebug;

public partial class App : Application
{
	public App()
	{
		EventManager.RegisterClassHandler(typeof(TextBox), UIElement.PreviewMouseDownEvent,
			new MouseButtonEventHandler(TextBox_PreviewMouseDown));
	}

	private static void TextBox_PreviewMouseDown(object sender, MouseButtonEventArgs e)
	{
		if (e.ChangedButton != MouseButton.Left || e.ClickCount != 2)
			return;

		var textBox = (TextBox)sender;
		textBox.Focus();
		textBox.SelectAll();
		e.Handled = true;
	}
}
