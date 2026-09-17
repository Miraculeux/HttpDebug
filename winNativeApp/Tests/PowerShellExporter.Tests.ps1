param([string]$AssemblyPath = "$PSScriptRoot/../obj/PowerShellExportCheck/HttpDebug.dll")

$ErrorActionPreference = 'Stop'
Add-Type -Path (Resolve-Path $AssemblyPath)
$script:assertions = 0

function Assert-True($Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
    $script:assertions++
}

function New-Pair([string]$Key, [string]$Value, [bool]$Enabled = $true) {
    [HttpDebug.Models.KvPair]@{ Key = $Key; Value = $Value; Enabled = $Enabled }
}

function Export-Request($Request, $Settings, [bool]$IncludeAuth) {
    $text = [HttpDebug.Services.PowerShellExporter]::ExportAsync($Request, $Settings, $IncludeAuth).GetAwaiter().GetResult()
    $tokens = $null
    $parseErrors = $null
    $null = [System.Management.Automation.Language.Parser]::ParseInput($text, [ref]$tokens, [ref]$parseErrors)
    Assert-True ($parseErrors.Count -eq 0) "Exported script must parse: $parseErrors"
    $text
}

function Invoke-WebRequest {
    param($Uri, $CustomMethod, $Headers, $Body, $TimeoutSec, [switch]$SkipHttpErrorCheck,
        [switch]$SkipHeaderValidation, $MaximumRedirection, [switch]$SkipCertificateCheck)
    $PSBoundParameters
}

$settings = [HttpDebug.Models.AppSettings]::new()
$settings.DefaultHeaders.Add((New-Pair 'X-Default' 'default-value'))
$settings.DefaultHeaders.Add((New-Pair 'Proxy-Authorization' 'proxy-secret'))
$settings.FollowRedirects = $false
$settings.ValidateSSL = $false
$request = [HttpDebug.Models.HttpRequest]::new()
$request.Url = 'https://example.test/path?existing=1&access_token=query-secret'
$request.Method = 'POST'
$request.Params.Add((New-Pair 'query' "a'b &value"))
$request.Params.Add((New-Pair 'disabled' 'disabled-secret' $false))
$request.Headers.Add((New-Pair 'X-Literal' '$(throw "must not execute") `value'''))
$request.Headers.Add((New-Pair 'Cookie' 'session=cookie-secret'))
$request.Headers.Add((New-Pair 'Disabled-Header' 'disabled-secret' $false))
$request.Body.Type = 'Json'
$request.Body.Content = "{`n  `"value`": `"O'Brien `$variable``value`"`n}"
$request.Auth.Type = 'Bearer'
$request.Auth.BearerToken = 'bearer-secret'

$redacted = Export-Request $request $settings $false
foreach ($secret in @('bearer-secret', 'query-secret', 'cookie-secret', 'proxy-secret', 'disabled-secret')) {
    Assert-True (-not $redacted.Contains($secret)) "Redacted export leaked $secret"
}
Assert-True ($redacted.Contains('<AUTH_TOKEN>')) 'Redacted export must contain placeholders'
$full = Export-Request $request $settings $true
foreach ($secret in @('bearer-secret', 'query-secret', 'cookie-secret', 'proxy-secret')) {
    Assert-True ($full.Contains($secret)) "Authenticated export omitted $secret"
}
$captured = & ([scriptblock]::Create($full))
Assert-True ($captured.Headers.Authorization -eq 'Bearer bearer-secret') 'Bearer auth must match'
Assert-True ($captured.Headers['X-Literal'] -eq $request.Headers[0].Value) 'Header must remain literal'
Assert-True ($captured.Headers['X-Default'] -eq 'default-value') 'Default headers must be included'
Assert-True ($captured.CustomMethod -eq 'POST') 'HTTP method must match'
Assert-True ($captured.MaximumRedirection -eq 0 -and $captured.SkipCertificateCheck) 'Settings must match'
Assert-True ([Text.Encoding]::UTF8.GetString($captured.Body) -ceq $request.Body.Content) 'JSON body must round trip'
Assert-True ($captured.Uri.Contains('query=a%27b+%26value')) 'Query parameters must be encoded'
Assert-True ($request.Auth.BearerToken -eq 'bearer-secret' -and $request.Url.Contains('query-secret')) 'Export must not mutate source'

foreach ($authType in @('Basic', 'Digest', 'OAuth2', 'ApiKey')) {
    $request.Auth.Type = $authType
    $request.Auth.BasicUsername = 'sample-user'
    $request.Auth.BasicPassword = 'sample-password'
    $request.Auth.DigestUsername = 'sample-user'
    $request.Auth.DigestPassword = 'sample-password'
    $request.Auth.OAuth2Token = 'oauth-secret'
    $request.Auth.ApiKeyKey = 'Custom-Key'
    $request.Auth.ApiKeyValue = 'key-secret'
    $redacted = Export-Request $request $settings $false
    $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('sample-user:sample-password'))
    foreach ($secret in @('sample-password', $encoded, 'oauth-secret', 'key-secret')) {
        Assert-True (-not $redacted.Contains($secret)) "$authType must be redacted"
    }
    $captured = & ([scriptblock]::Create((Export-Request $request $settings $true)))
    switch ($authType) {
        Basic { Assert-True ($captured.Headers.Authorization -eq "Basic $encoded") 'Basic auth must match' }
        Digest { Assert-True ($captured.Headers.Authorization -eq "Basic $encoded") 'Export must match current Digest send behavior' }
        OAuth2 { Assert-True ($captured.Headers.Authorization -eq 'Bearer oauth-secret') 'OAuth token must match' }
        ApiKey { Assert-True ($captured.Headers['Custom-Key'] -eq 'key-secret') 'API key must match' }
    }
}

$request.Auth.Type = 'None'
$request.Headers.Add((New-Pair 'authorization' 'Bearer manual-secret'))
Assert-True (-not (Export-Request $request $settings $false).Contains('manual-secret')) 'Manual auth header must be redacted'
foreach ($bodyType in @('None', 'Raw', 'UrlEncoded', 'FormData')) {
    $request.Body.Type = $bodyType
    $request.Body.FormData.Clear()
    $request.Body.FormData.Add((New-Pair 'field' "one ' two"))
    $request.Body.FormData.Add((New-Pair 'field' 'second'))
    $request.Body.FormData.Add((New-Pair 'disabled' 'disabled-secret' $false))
    $captured = & ([scriptblock]::Create((Export-Request $request $settings $false)))
    $body = if ($captured.ContainsKey('Body')) { [Text.Encoding]::UTF8.GetString($captured.Body) } else { '' }
    switch ($bodyType) {
        None { Assert-True (-not $captured.ContainsKey('Body')) 'None must omit body' }
        Raw { Assert-True ($body -ceq $request.Body.Content) 'Raw body must round trip' }
        UrlEncoded { Assert-True ($body -eq 'field=one+%27+two&field=second') 'Form encoding must preserve repeated keys' }
        FormData {
            Assert-True ($captured.Headers['Content-Type'].StartsWith('multipart/form-data; boundary=')) 'Multipart content type must include boundary'
            Assert-True ($body.Contains("one ' two") -and $body.Contains('second')) 'Multipart values must match'
        }
    }
    Assert-True (-not $body.Contains('disabled-secret')) 'Disabled form values must be omitted'
}

foreach ($codePoint in @(0x2018, 0x2019, 0x201A, 0x201B)) {
    $request.Headers[0].Value = "before$([char]$codePoint)after"
    $captured = & ([scriptblock]::Create((Export-Request $request $settings $true)))
    Assert-True ($captured.Headers['X-Literal'] -ceq $request.Headers[0].Value) 'Smart quotes must remain literal'
}

Add-Type -AssemblyName PresentationFramework
Add-Type -Path (Join-Path (Split-Path (Resolve-Path $AssemblyPath)) 'ICSharpCode.AvalonEdit.dll')
$app = [HttpDebug.App]::new()
$app.InitializeComponent()
$view = [HttpDebug.Views.SidebarView]::new()
$saved = [HttpDebug.Models.SavedRequest]::new()
$history = [HttpDebug.Models.HistoryEntry]::new()
$collection = [HttpDebug.Models.RequestCollection]::new()
$collection.Requests.Add($saved)
$view.DataContext = [pscustomobject]@{ Collections = @($collection); History = @($history) }
$view.Dispatcher.Invoke([Action]{}, [System.Windows.Threading.DispatcherPriority]::ApplicationIdle)

function Get-Descendants($Root) {
    for ($index = 0; $index -lt [System.Windows.Media.VisualTreeHelper]::GetChildrenCount($Root); $index++) {
        $child = [System.Windows.Media.VisualTreeHelper]::GetChild($Root, $index)
        $child
        Get-Descendants $child
    }
}

$view.Measure([System.Windows.Size]::new(350, 700))
$view.Arrange([System.Windows.Rect]::new(0, 0, 350, 700))
Get-Descendants $view | Where-Object { $_ -is [System.Windows.Controls.Expander] } | ForEach-Object { $_.IsExpanded = $true }
$view.FindName('HistoryPanel').Visibility = 'Visible'
$view.Measure([System.Windows.Size]::new(350, 700))
$view.Arrange([System.Windows.Rect]::new(0, 0, 350, 700))
$view.UpdateLayout()
$rows = @(Get-Descendants $view | Where-Object {
    $_ -is [System.Windows.Controls.Border] -and $_.ContextMenu -and
    ($_.DataContext -is [HttpDebug.Models.SavedRequest] -or $_.DataContext -is [HttpDebug.Models.HistoryEntry])
})
Assert-True ($rows.Count -eq 2) "Both collection and history request rows must have a context menu; found $($rows.Count)"
foreach ($row in $rows) {
    $menu = $row.ContextMenu
    $menu.PlacementTarget = $row
    $null = $menu.ApplyTemplate()
    Assert-True ([object]::ReferenceEquals($menu.Items[0].DataContext, $row.DataContext)) 'Export must target the right-clicked row'
    Assert-True ($menu.Items[0].Header -eq 'Export As PowerShell') 'Normal export menu must exist'
    Assert-True ($menu.Items[1].Header -eq 'Export As PowerShell With Auth' -and $menu.Items[1].Tag -eq 'WithAuth') 'Authenticated export menu must exist'
}
$app.Shutdown()
"PASS: $script:assertions PowerShell export and WPF menu assertions; no network requests sent."