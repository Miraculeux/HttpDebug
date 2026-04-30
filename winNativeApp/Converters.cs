using System;
using System.Globalization;
using System.Windows;
using System.Windows.Data;
using System.Windows.Media;
using HttpDebug.Models;

namespace HttpDebug.Converters;

public class BoolToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        => (value is bool b && b) ? Visibility.Visible : Visibility.Collapsed;
    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        => value is Visibility v && v == Visibility.Visible;
}

public class InverseBoolToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        => (value is bool b && b) ? Visibility.Collapsed : Visibility.Visible;
    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        => value is Visibility v && v != Visibility.Visible;
}

public class BooleanInverseConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        => value is bool b ? !b : value;
    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        => value is bool b ? !b : value;
}

public class NullToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        => value == null || (value is string s && string.IsNullOrEmpty(s)) ? Visibility.Visible : Visibility.Collapsed;
    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture) => Binding.DoNothing;
}

public class NotNullToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        => value != null && !(value is string s && string.IsNullOrEmpty(s)) ? Visibility.Visible : Visibility.Collapsed;
    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture) => Binding.DoNothing;
}

public class MethodToColorConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is HttpMethodKind m)
        {
            return m switch
            {
                HttpMethodKind.GET => new SolidColorBrush(Color.FromRgb(0x16, 0xA3, 0x4A)),
                HttpMethodKind.POST => new SolidColorBrush(Color.FromRgb(0xCA, 0x8A, 0x04)),
                HttpMethodKind.PUT => new SolidColorBrush(Color.FromRgb(0x25, 0x63, 0xEB)),
                HttpMethodKind.PATCH => new SolidColorBrush(Color.FromRgb(0x7C, 0x3A, 0xED)),
                HttpMethodKind.DELETE => new SolidColorBrush(Color.FromRgb(0xDC, 0x26, 0x26)),
                HttpMethodKind.HEAD => new SolidColorBrush(Color.FromRgb(0x06, 0x91, 0xA8)),
                HttpMethodKind.OPTIONS => new SolidColorBrush(Color.FromRgb(0xDB, 0x27, 0x77)),
                HttpMethodKind.TRACE => new SolidColorBrush(Color.FromRgb(0xEA, 0x58, 0x0C)),
                _ => Brushes.Gray,
            };
        }
        return Brushes.Gray;
    }
    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture) => Binding.DoNothing;
}

public class StatusToColorConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is int code)
        {
            if (code < 200) return new SolidColorBrush(Color.FromRgb(0x25, 0x63, 0xEB));
            if (code < 300) return new SolidColorBrush(Color.FromRgb(0x16, 0xA3, 0x4A));
            if (code < 400) return new SolidColorBrush(Color.FromRgb(0xCA, 0x8A, 0x04));
            if (code < 500) return new SolidColorBrush(Color.FromRgb(0xEA, 0x58, 0x0C));
            return new SolidColorBrush(Color.FromRgb(0xDC, 0x26, 0x26));
        }
        return Brushes.Gray;
    }
    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture) => Binding.DoNothing;
}

public class EqualsToBoolConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        => Equals(value?.ToString(), parameter?.ToString());
    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        => value is bool b && b ? parameter! : Binding.DoNothing;
}

public class EqualsToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        => Equals(value?.ToString(), parameter?.ToString()) ? Visibility.Visible : Visibility.Collapsed;
    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture) => Binding.DoNothing;
}

public class CountToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        => value is int i && i > 0 ? Visibility.Visible : Visibility.Collapsed;
    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture) => Binding.DoNothing;
}

public class RelativeTimeConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is DateTime dt)
        {
            var diff = DateTime.UtcNow - dt.ToUniversalTime();
            if (diff.TotalSeconds < 60) return "just now";
            if (diff.TotalMinutes < 60) return $"{(int)diff.TotalMinutes}m ago";
            if (diff.TotalHours < 24) return $"{(int)diff.TotalHours}h ago";
            return dt.ToLocalTime().ToString("MMM d");
        }
        return "";
    }
    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture) => Binding.DoNothing;
}

public class BytesToStringConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is int b)
        {
            if (b < 1024) return $"{b} B";
            if (b < 1024 * 1024) return $"{b / 1024.0:0.0} KB";
            return $"{b / 1024.0 / 1024.0:0.0} MB";
        }
        return "";
    }
    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture) => Binding.DoNothing;
}

public class MillisecondsToStringConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is int ms)
            return ms < 1000 ? $"{ms} ms" : $"{ms / 1000.0:0.00} s";
        return "";
    }
    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture) => Binding.DoNothing;
}
