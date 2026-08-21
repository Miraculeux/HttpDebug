using System.Windows;
using System.Windows.Input;
using HttpDebug.ViewModels;

namespace HttpDebug;

public partial class MainWindow : Window
{
    private GridLength _sidebarWidth = new(280);

    public AppState State { get; }
    public ICommand NewTabCommand { get; }
    public ICommand CloseTabCommand { get; }
    public ICommand ToggleSidebarCommand { get; }
    public ICommand SendCommand { get; }

    public MainWindow()
    {
        State = new AppState();
        NewTabCommand = new RelayCommand(() => State.AddTab());
        CloseTabCommand = new RelayCommand(() => { if (State.ActiveTab != null) State.CloseTab(State.ActiveTab); });
        ToggleSidebarCommand = new RelayCommand(() => State.ToggleSidebar());
        SendCommand = new RelayCommand(async () => await State.SendRequestAsync());
        DataContext = State;
        InitializeComponent();
        State.PropertyChanged += (_, e) =>
        {
            if (e.PropertyName == nameof(AppState.SidebarVisible))
                UpdateSidebarColumn();
        };
    }

    private void UpdateSidebarColumn()
    {
        if (State.SidebarVisible)
        {
            SidebarCol.MinWidth = 220;
            SidebarCol.Width = _sidebarWidth;
        }
        else
        {
            if (SidebarCol.ActualWidth > 0)
                _sidebarWidth = new GridLength(SidebarCol.ActualWidth);
            SidebarCol.MinWidth = 0;
            SidebarCol.Width = new GridLength(0);
        }
    }
}
