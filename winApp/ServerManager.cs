using System.Diagnostics;
using System.IO;
using System.Net.Http;

namespace HttpDebug;

public class ServerManager : IDisposable
{
    private Process? _serverProcess;
    private readonly int _port = 3001;
    private bool _disposed;

    public int Port => _port;

    /// <summary>
    /// Resolves the project root directory (two levels up from winApp/).
    /// </summary>
    private static string GetProjectDirectory()
    {
        // When running from winApp/bin/Debug/net8.0-windows/,
        // walk up to find the project root containing package.json
        var dir = AppDomain.CurrentDomain.BaseDirectory;
        for (var i = 0; i < 10; i++)
        {
            var parent = Directory.GetParent(dir);
            if (parent == null) break;
            dir = parent.FullName;
            if (File.Exists(Path.Combine(dir, "package.json")))
                return dir;
        }

        // Fallback: assume winApp is a sibling of package.json
        var appDir = AppDomain.CurrentDomain.BaseDirectory;
        var winAppDir = Path.GetFullPath(Path.Combine(appDir, "..", "..", "..", ".."));
        return Path.GetFullPath(Path.Combine(winAppDir, ".."));
    }

    public async Task StartAsync()
    {
        if (_serverProcess != null) return;

        var projectDir = GetProjectDirectory();

        // Build frontend if dist/ doesn't exist
        var distIndex = Path.Combine(projectDir, "dist", "index.html");
        if (!File.Exists(distIndex))
        {
            await RunCommandAsync("cmd.exe", "/c npm run build", projectDir);
        }

        // Start the Express server
        var startInfo = new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = "/c npx tsx server/index.ts",
            WorkingDirectory = projectDir,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };
        startInfo.Environment["NODE_ENV"] = "production";

        _serverProcess = Process.Start(startInfo);

        if (_serverProcess == null)
            throw new InvalidOperationException("Failed to start server process.");

        // Read output asynchronously to prevent deadlocks
        _serverProcess.BeginOutputReadLine();
        _serverProcess.BeginErrorReadLine();

        // Wait for the server to become available
        await WaitForServerAsync();
    }

    private async Task WaitForServerAsync()
    {
        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };
        var url = $"http://localhost:{_port}";

        for (var i = 0; i < 30; i++)
        {
            try
            {
                var response = await client.GetAsync(url);
                if (response.IsSuccessStatusCode)
                    return;
            }
            catch
            {
                // Server not ready yet
            }

            await Task.Delay(500);
        }

        throw new TimeoutException("Server did not start within 15 seconds.");
    }

    public void Stop()
    {
        if (_serverProcess == null || _serverProcess.HasExited) return;

        try
        {
            // Kill the process tree to ensure node child processes are terminated
            _serverProcess.Kill(entireProcessTree: true);
        }
        catch (InvalidOperationException)
        {
            // Process already exited
        }

        _serverProcess.Dispose();
        _serverProcess = null;
    }

    private static async Task RunCommandAsync(string fileName, string arguments, string workingDirectory)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            WorkingDirectory = workingDirectory,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };

        using var process = Process.Start(startInfo);
        if (process == null) return;

        await process.WaitForExitAsync();

        if (process.ExitCode != 0)
        {
            var error = await process.StandardError.ReadToEndAsync();
            throw new Exception($"Command failed: {error}");
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        Stop();
        GC.SuppressFinalize(this);
    }

    ~ServerManager() => Dispose();
}
