import Foundation
import AppKit

class ServerManager: ObservableObject {
    @Published var isRunning = false
    @Published var error: String?
    let port = 3001

    private var serverProcess: Process?
    private var outputPipe: Pipe?

    static let projectDirectory: URL = {
        let sourceFile = URL(fileURLWithPath: #filePath)
        return sourceFile
            .deletingLastPathComponent() // ServerManager.swift → HttpDebugApp/
            .deletingLastPathComponent() // HttpDebugApp/ → macApp/
            .deletingLastPathComponent() // macApp/ → HttpDebug/
    }()

    init() {
        NotificationCenter.default.addObserver(
            forName: NSApplication.willTerminateNotification,
            object: nil, queue: .main
        ) { [weak self] _ in
            self?.stopServer()
        }
    }

    func startServer() {
        guard serverProcess == nil else { return }
        error = nil

        DispatchQueue.global(qos: .userInitiated).async { [self] in
            do {
                // Build frontend if dist/ doesn't exist
                let distIndex = Self.projectDirectory.appendingPathComponent("dist/index.html")
                if !FileManager.default.fileExists(atPath: distIndex.path) {
                    try runShellCommand("npm run build", in: Self.projectDirectory)
                }

                // Start the Express server in production mode
                let process = Process()
                process.executableURL = URL(fileURLWithPath: "/bin/zsh")
                process.arguments = ["-l", "-c", "exec npx tsx server/index.ts"]
                process.currentDirectoryURL = Self.projectDirectory
                process.environment = ProcessInfo.processInfo.environment.merging(
                    ["NODE_ENV": "production"],
                    uniquingKeysWith: { _, new in new }
                )

                let pipe = Pipe()
                process.standardOutput = pipe
                process.standardError = pipe
                outputPipe = pipe

                pipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
                    let data = handle.availableData
                    guard !data.isEmpty else { return }
                    if let output = String(data: data, encoding: .utf8),
                       output.contains("running on") || output.contains("listening") {
                        DispatchQueue.main.async {
                            self?.isRunning = true
                        }
                    }
                }

                process.terminationHandler = { [weak self] proc in
                    DispatchQueue.main.async {
                        self?.isRunning = false
                        self?.serverProcess = nil
                        if proc.terminationStatus != 0 && proc.terminationStatus != 15 {
                            self?.error = "Server exited with code \(proc.terminationStatus)"
                        }
                    }
                }

                try process.run()
                serverProcess = process

                // Fallback: mark as running after a short delay
                Thread.sleep(forTimeInterval: 2.5)
                if process.isRunning {
                    DispatchQueue.main.async {
                        self.isRunning = true
                    }
                }
            } catch {
                DispatchQueue.main.async {
                    self.error = error.localizedDescription
                }
            }
        }
    }

    func stopServer() {
        guard let process = serverProcess, process.isRunning else { return }

        // Kill the entire process group to ensure child processes (node) are also terminated
        let pid = process.processIdentifier
        kill(-pid, SIGTERM)

        DispatchQueue.global().asyncAfter(deadline: .now() + 2.0) {
            if process.isRunning {
                kill(-pid, SIGKILL)
            }
        }

        serverProcess = nil
        outputPipe?.fileHandleForReading.readabilityHandler = nil
        outputPipe = nil
        isRunning = false
    }

    private func runShellCommand(_ command: String, in directory: URL) throws {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/zsh")
        process.arguments = ["-l", "-c", command]
        process.currentDirectoryURL = directory
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice
        try process.run()
        process.waitUntilExit()
        if process.terminationStatus != 0 {
            throw NSError(
                domain: "ServerManager", code: Int(process.terminationStatus),
                userInfo: [NSLocalizedDescriptionKey: "'\(command)' failed with exit code \(process.terminationStatus)"]
            )
        }
    }

    deinit {
        stopServer()
    }
}
