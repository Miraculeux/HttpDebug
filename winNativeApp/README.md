# HttpDebug — Windows Native (WPF)

A native Windows port of the macOS SwiftUI `nativeApp/`. Built on **.NET 8** + **WPF**.
No web stack: no React, no Vite, no WebView2.

## Build & Run

```powershell
cd winNativeApp
dotnet run
```

Or open `HttpDebug.sln` in Visual Studio and run the `HttpDebugNative` project.

## Features (parity with `nativeApp/`)

- Multiple request tabs (Ctrl+T new, Ctrl+W close)
- HTTP method picker (GET / POST / PUT / PATCH / DELETE / HEAD / OPTIONS / TRACE)
- URL bar with Send (Ctrl+Enter)
- Request panel: Params, Headers, Body (None / JSON / Raw / Form Data / URL-encoded), Auth (None / Basic / Bearer / API Key / OAuth2 / Digest)
- JSON pretty-printer (Format button)
- Response panel: status / time / size, Body (tree or raw), Headers, Copy
- Sidebar (Ctrl+J): Collections (create / save / load / delete / import / export) and History (auto-saved, search, open in new tab)
- Dark theme matching the macOS surface palette
- Persistent storage at `%USERPROFILE%\.httpdebug\` (settings, history, collections — same JSON shape used by the macOS app)

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
  HttpDebug.csproj       net8.0-windows, UseWPF
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
