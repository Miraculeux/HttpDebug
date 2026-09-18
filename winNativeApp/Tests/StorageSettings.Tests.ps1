param([string]$AssemblyPath = "$PSScriptRoot/../obj/StorageSettingsCheck/HttpDebug.dll")

$ErrorActionPreference = 'Stop'
Add-Type -Path (Resolve-Path $AssemblyPath)
$script:assertions = 0

function Assert-True($Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
    $script:assertions++
}

function Assert-Fails([scriptblock]$Action, [string]$Message) {
    $failed = $false
    try { & $Action } catch { $failed = $true }
    Assert-True $failed $Message
}

$root = Join-Path ([IO.Path]::GetTempPath()) "HttpDebug-StorageTests-$([guid]::NewGuid())"
$original = Join-Path $root 'original'
$destination = Join-Path $root 'new data'
try {
    $storage = [HttpDebug.Services.StorageManager]::new($original)
    $settings = $storage.LoadSettings()
    Assert-True ($settings.StoragePath -eq $original) 'Default directory must be shown in settings'
    $history = [HttpDebug.Models.HistoryEntry]::new()
    $history.Request.Url = 'https://example.test/saved'
    $collection = [HttpDebug.Models.RequestCollection]::new()
    $collection.Name = 'Test collection'
    $storage.SaveHistory([HttpDebug.Models.HistoryEntry[]]@($history))
    $storage.SaveCollection($collection)
    $settings.StoragePath = $destination
    $storage.SaveSettings($settings)
    Assert-True ($storage.CurrentStoragePath -eq $destination) 'Successful save must activate destination'
    Assert-True (Test-Path "$original/history.json") 'Original history must be retained'
    Assert-True (Test-Path "$original/collections/$($collection.Id).json") 'Original collection must be retained'
    Assert-True (Test-Path "$destination/history.json") 'History must be copied'
    Assert-True (Test-Path "$destination/collections/$($collection.Id).json") 'Collections must be copied'
    Assert-True (Test-Path "$original/settings.json") 'Settings must remain in the bootstrap directory'
    Assert-True (-not (Test-Path "$destination/settings.json")) 'Data directory must not relocate settings'

    $restarted = [HttpDebug.Services.StorageManager]::new($original)
    $loaded = $restarted.LoadSettings()
    Assert-True ($loaded.StoragePath -eq $destination) 'Restart must restore selected directory'
    Assert-True ($restarted.LoadHistory()[0].Id -eq $history.Id) 'Restart must load migrated history'
    Assert-True ($restarted.ListCollections()[0].Id -eq $collection.Id) 'Restart must load migrated collections'
    $restarted.SaveHistory([HttpDebug.Models.HistoryEntry[]]@())
    Assert-True ($restarted.LoadHistory().Count -eq 0) 'New writes must use selected directory'
    Assert-True ((Get-Content "$original/history.json" -Raw | ConvertFrom-Json).Count -eq 1) 'New writes must not change original history'
    $restarted.SaveSettings($loaded)
    Assert-True ($restarted.CurrentStoragePath -eq $destination) 'Saving unchanged path must succeed'

    $settingsBefore = Get-Content "$original/settings.json" -Raw
    $loaded.StoragePath = $original
    Assert-Fails { $restarted.SaveSettings($loaded) } 'Existing target data must not be overwritten'
    Assert-True ($restarted.CurrentStoragePath -eq $destination) 'Conflict must retain active directory'
    Assert-True ((Get-Content "$original/settings.json" -Raw) -ceq $settingsBefore) 'Conflict must preserve settings'
    $loaded.StoragePath = 'relative/path'
    Assert-Fails { $restarted.SaveSettings($loaded) } 'Relative paths must be rejected'
    $loaded.StoragePath = "$original/history.json"
    Assert-Fails { $restarted.SaveSettings($loaded) } 'File paths must be rejected'

    $failedDestination = Join-Path $root 'failed-save'
    $loaded.StoragePath = $failedDestination
    $settingsLock = [IO.File]::Open("$original/settings.json", [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::None)
    try {
        Assert-Fails { $restarted.SaveSettings($loaded) } 'Failure to persist settings must fail migration'
    } finally {
        $settingsLock.Dispose()
    }
    Assert-True ($restarted.CurrentStoragePath -eq $destination) 'Failed settings save must retain active directory'
    Assert-True (-not (Test-Path "$failedDestination/history.json")) 'Failed migration must remove copied history'
    Assert-True (-not (Test-Path "$failedDestination/collections/$($collection.Id).json")) 'Failed migration must remove copied collections'
    Assert-True ((Get-Content "$original/settings.json" -Raw) -ceq $settingsBefore) 'Failed save must preserve persisted settings'
    $loaded.StoragePath = $failedDestination
    $restarted.SaveSettings($loaded)
    Assert-True ($restarted.CurrentStoragePath -eq $failedDestination) 'Retry after failed save must succeed'
    $restarted.DeleteCollection($collection.Id)
    $restarted.ClearHistory()
    Assert-True (-not (Test-Path "$failedDestination/history.json")) 'Clear must use active directory'
    Assert-True (-not (Test-Path "$failedDestination/collections/$($collection.Id).json")) 'Delete must use active directory'
    Assert-True (Test-Path "$destination/history.json") 'Clear must not affect previous directory'
    Add-Type -AssemblyName PresentationFramework
    $app = [HttpDebug.App]::new()
    $app.InitializeComponent()
    $app.ShutdownMode = 'OnExplicitShutdown'
    $loaded.Timeout = 47
    $loaded.FollowRedirects = $false
    $loaded.ValidateSSL = $false
    $loaded.DefaultHeaders.Add([HttpDebug.Models.KvPair]@{ Key = 'X-Test'; Value = 'test' })
    $script:savedSettings = $null
    $window = [HttpDebug.Views.SettingsWindow]::new($loaded, [Action[HttpDebug.Models.AppSettings]]{
        param($updated)
        $script:savedSettings = $updated
    })
    Assert-True ($window.FindName('StoragePathBox').Text -eq $loaded.StoragePath) 'Window must display current directory'
    $window.Show()
    $window.Width = $window.MinWidth
    $window.UpdateLayout()
    Assert-True ($window.FindName('StoragePathBox').ActualWidth -gt 200) 'Path input must remain usable at minimum window width'
    $saveButton = $window.FindName('SaveButton')
    $window.FindName('StoragePathBox').Text = ' '
    $saveButton.RaiseEvent([System.Windows.RoutedEventArgs]::new([System.Windows.Controls.Button]::ClickEvent))
    Assert-True ($window.FindName('ErrorText').Visibility -eq 'Visible') 'Empty path must show inline error'
    Assert-True ($null -eq $script:savedSettings -and $window.IsVisible) 'Validation failure must not save or close window'
    $window.FindName('StoragePathBox').Text = "$root/window-save"
    Assert-True ($loaded.StoragePath -eq $failedDestination) 'Editing must not mutate live settings'
    $saveButton.RaiseEvent([System.Windows.RoutedEventArgs]::new([System.Windows.Controls.Button]::ClickEvent))
    Assert-True ($script:savedSettings.StoragePath -eq "$root/window-save" -and -not $window.IsVisible) 'Save must pass edited path and close window'
    Assert-True ($script:savedSettings.Timeout -eq 47 -and -not $script:savedSettings.ValidateSSL -and -not $script:savedSettings.FollowRedirects) 'Save must preserve unrelated settings'
    Assert-True ($script:savedSettings.DefaultHeaders[0].Value -eq 'test') 'Save must preserve default headers'

    $script:savedSettings = $null
    $cancelWindow = [HttpDebug.Views.SettingsWindow]::new($loaded, [Action[HttpDebug.Models.AppSettings]]{
        param($updated)
        $script:savedSettings = $updated
    })
    $cancelWindow.FindName('StoragePathBox').Text = "$root/cancelled"
    $cancelWindow.Close()
    Assert-True ($null -eq $script:savedSettings -and $loaded.StoragePath -eq $failedDestination) 'Closing without save must not change settings'

    $failedWindow = [HttpDebug.Views.SettingsWindow]::new($loaded, [Action[HttpDebug.Models.AppSettings]]{
        param($updated)
        throw [UnauthorizedAccessException]::new('Test access denied')
    })
    $failedWindow.Show()
    $failedWindow.FindName('SaveButton').RaiseEvent([System.Windows.RoutedEventArgs]::new([System.Windows.Controls.Button]::ClickEvent))
    Assert-True ($failedWindow.IsVisible -and $failedWindow.FindName('ErrorText').Text.Contains('Test access denied')) 'Save failure must keep window open and show the error'
    $failedWindow.Close()
    $app.Shutdown()
    "PASS: $script:assertions storage settings and WPF window assertions; user data untouched."
} finally {
    if (Test-Path $root) { Remove-Item -LiteralPath $root -Recurse -Force }
}