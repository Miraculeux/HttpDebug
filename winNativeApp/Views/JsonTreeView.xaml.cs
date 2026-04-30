using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace HttpDebug.Views;

public class JsonNode
{
    public string Key { get; set; } = "";
    public bool HasKey => !string.IsNullOrEmpty(Key);
    public string DisplayValue { get; set; } = "";
    public Brush ValueBrush { get; set; } = new SolidColorBrush(Color.FromRgb(0x11, 0x18, 0x27));
    public List<JsonNode> Children { get; set; } = new();
}

public partial class JsonTreeView : UserControl
{
    public static readonly DependencyProperty JsonProperty = DependencyProperty.Register(
        nameof(Json), typeof(string), typeof(JsonTreeView),
        new PropertyMetadata("", OnJsonChanged));

    public string Json
    {
        get => (string)GetValue(JsonProperty);
        set => SetValue(JsonProperty, value);
    }

    public JsonTreeView() { InitializeComponent(); }

    private static void OnJsonChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is JsonTreeView v) v.Refresh();
    }

    private static readonly Brush KeyBrush = new SolidColorBrush(Color.FromRgb(0x1D, 0x4E, 0xD8));
    private static readonly Brush StringBrush = new SolidColorBrush(Color.FromRgb(0x15, 0x80, 0x3D));
    private static readonly Brush NumberBrush = new SolidColorBrush(Color.FromRgb(0x6D, 0x28, 0xD9));
    private static readonly Brush BoolBrush = new SolidColorBrush(Color.FromRgb(0xC2, 0x41, 0x0C));
    private static readonly Brush DimBrush = new SolidColorBrush(Color.FromRgb(0x6B, 0x72, 0x80));
    private static readonly Brush DefaultBrush = new SolidColorBrush(Color.FromRgb(0x11, 0x18, 0x27));

    private void Refresh()
    {
        Tree.ItemsSource = null;
        if (string.IsNullOrWhiteSpace(Json))
        {
            Tree.ItemsSource = new[] { new JsonNode { DisplayValue = "(empty)", ValueBrush = DimBrush } };
            return;
        }
        try
        {
            using var doc = JsonDocument.Parse(Json);
            var root = Build("", doc.RootElement);
            Tree.ItemsSource = new[] { root };
        }
        catch
        {
            // Fallback - show as a single text node
            Tree.ItemsSource = new[] { new JsonNode { DisplayValue = Json, ValueBrush = DefaultBrush } };
        }
    }

    private JsonNode Build(string key, JsonElement el)
    {
        var node = new JsonNode { Key = key };
        switch (el.ValueKind)
        {
            case JsonValueKind.Object:
                node.DisplayValue = $"{{ {el.EnumerateObject().Count()} keys }}";
                node.ValueBrush = DimBrush;
                foreach (var p in el.EnumerateObject())
                    node.Children.Add(Build(p.Name, p.Value));
                break;
            case JsonValueKind.Array:
                {
                    int count = el.GetArrayLength();
                    node.DisplayValue = $"[ {count} items ]";
                    node.ValueBrush = DimBrush;
                    int i = 0;
                    foreach (var item in el.EnumerateArray())
                        node.Children.Add(Build($"[{i++}]", item));
                    break;
                }
            case JsonValueKind.String:
                node.DisplayValue = $"\"{el.GetString()}\"";
                node.ValueBrush = StringBrush;
                break;
            case JsonValueKind.Number:
                node.DisplayValue = el.GetRawText();
                node.ValueBrush = NumberBrush;
                break;
            case JsonValueKind.True:
            case JsonValueKind.False:
                node.DisplayValue = el.GetBoolean() ? "true" : "false";
                node.ValueBrush = BoolBrush;
                break;
            case JsonValueKind.Null:
                node.DisplayValue = "null";
                node.ValueBrush = BoolBrush;
                break;
            default:
                node.DisplayValue = el.GetRawText();
                node.ValueBrush = DefaultBrush;
                break;
        }
        return node;
    }
}
