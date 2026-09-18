# HttpDebug — Windows Native (WPF)

A native Windows port of the macOS SwiftUI `nativeApp/`. Built on **.NET 10** + **WPF**.
No web stack: no React, no Vite, no WebView2.

## Build & Run

Requires the .NET 10 SDK on Windows. Framework-dependent builds require the .NET 10 Desktop Runtime to run. Visual Studio users need Visual Studio 2026 (18.0) or later with the .NET desktop development workload.

```powershell
cd winNativeApp
dotnet run
```

Or open `HttpDebug.sln` in Visual Studio and run the `HttpDebugNative` project.

The native project treats compiler and NuGet warnings as errors in all configurations. To also fail on MSBuild warnings when building the solution, run `dotnet build HttpDebug.sln -warnaserror` from the repository root.

## Features (parity with `nativeApp/`)

- Multiple request tabs (Ctrl+T new, Ctrl+W close)
- HTTP method picker (GET / POST / PUT / PATCH / DELETE / HEAD / OPTIONS / TRACE)
- URL bar with Send (Ctrl+Enter)
- Request panel: Params, Headers, Body (None / JSON / Raw / Form Data / URL-encoded), Auth (None / Basic / Bearer / API Key / OAuth2 / Digest)
- JSON pretty-printer (Format button)
- Response panel: status / time / size, Body (tree or raw), Headers, Copy
- Sidebar (Ctrl+J): Collections (create / save / load / delete / import / export) and History (auto-saved, search, open in new tab)
- Dark theme matching the macOS surface palette
- Configurable data folder for history and collections (defaults to `%USERPROFILE%\.httpdebug\`)

## Storage Settings

Open **Settings** using the gear button in the top-right corner. Enter an absolute data folder path or choose a folder, then select **Save**.

- Existing history and collections are copied to the new folder. Original files remain unchanged.
- Subsequent reads and writes use the new folder, including after restarting the app.
- A destination containing history or collections is rejected to avoid overwriting data. Use an empty data folder.
- Settings remain at `%USERPROFILE%\.httpdebug\settings.json` so the app can find the selected data folder on startup.
- Cancel leaves the active path unchanged. Permission errors or failed saves are shown in the window.

Data files can contain authentication tokens and response content. Choose a trusted folder with appropriate access permissions.

Run the isolated storage and settings-window checks from the repository root:

```powershell
dotnet build winNativeApp/HttpDebug.csproj -warnaserror -p:OutDir=obj/StorageSettingsCheck/
pwsh -NoProfile -STA -File winNativeApp/Tests/StorageSettings.Tests.ps1
```

## PowerShell Export

Right-click a request in Collections or History to copy a PowerShell 7 script to the clipboard:

- **Export As PowerShell** replaces authentication headers, cookies, and recognized token/API-key query values with `<AUTH_TOKEN>` placeholders.
- **Export As PowerShell With Auth** includes actual authentication values. Treat the clipboard contents and any pasted script as sensitive.

Both options include enabled parameters, headers, request body, and current request settings. Ordinary export does not inspect arbitrary body content for secrets; review scripts before sharing them.

Run the focused regression checks from the repository root:

```powershell
dotnet build winNativeApp/HttpDebug.csproj -p:OutDir=obj/PowerShellExportCheck/
pwsh -NoProfile -STA -File winNativeApp/Tests/PowerShellExporter.Tests.ps1
```

## Project Layout

```
winNativeApp/
  HttpDebug.csproj       net10.0-windows, UseWPF
  App.xaml(.cs)
  MainWindow.xaml(.cs)
  Themes/Dark.xaml       palette + control styles
  Models/Models.cs       HttpRequest, RequestBody, AuthConfig, KvPair, ...
  Services/
    HttpService.cs       sends requests via HttpClient
    StorageManager.cs    JSON persistence
  ViewModels/AppState.cs MVVM state
  Views/
    TabBarView, UrlBarView, SidebarView, RequestView, ResponseView,
    KeyValueEditor, JsonTreeView
  Converters.cs          value converters (status color, method color, etc.)
  RelayCommand.cs
```
