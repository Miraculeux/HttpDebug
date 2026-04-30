using System.Windows;
using System.Windows.Input;
using HttpDebug.ViewModels;

namespace HttpDebug;

public partial class MainWindow : Window
{
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
    }
}
