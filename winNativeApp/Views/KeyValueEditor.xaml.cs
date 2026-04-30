using System.Collections;
using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Controls;
using HttpDebug.Models;

namespace HttpDebug.Views;

public partial class KeyValueEditor : UserControl
{
    public static readonly DependencyProperty ItemsProperty = DependencyProperty.Register(
        nameof(Items), typeof(ObservableCollection<KvPair>), typeof(KeyValueEditor));
    public static readonly DependencyProperty KeyPlaceholderProperty = DependencyProperty.Register(
        nameof(KeyPlaceholder), typeof(string), typeof(KeyValueEditor), new PropertyMetadata("Key"));
    public static readonly DependencyProperty ValuePlaceholderProperty = DependencyProperty.Register(
        nameof(ValuePlaceholder), typeof(string), typeof(KeyValueEditor), new PropertyMetadata("Value"));

    public ObservableCollection<KvPair>? Items
    {
        get => (ObservableCollection<KvPair>?)GetValue(ItemsProperty);
        set => SetValue(ItemsProperty, value);
    }
    public string KeyPlaceholder
    {
        get => (string)GetValue(KeyPlaceholderProperty);
        set => SetValue(KeyPlaceholderProperty, value);
    }
    public string ValuePlaceholder
    {
        get => (string)GetValue(ValuePlaceholderProperty);
        set => SetValue(ValuePlaceholderProperty, value);
    }

    public KeyValueEditor() { InitializeComponent(); }

    private void Add_Click(object sender, RoutedEventArgs e)
    {
        Items ??= new ObservableCollection<KvPair>();
        Items.Add(new KvPair());
    }

    private void Remove_Click(object sender, RoutedEventArgs e)
    {
        if (sender is FrameworkElement fe && fe.Tag is KvPair kv)
            Items?.Remove(kv);
    }
}
