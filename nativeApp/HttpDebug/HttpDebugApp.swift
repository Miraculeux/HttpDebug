import SwiftUI
import AppKit

@main
struct HttpDebugApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .preferredColorScheme(.dark)
        }
        .windowStyle(.titleBar)
        .defaultSize(width: 1280, height: 800)
        .commands {
            // Keep standard text editing commands (Cmd+A, Cmd+C, Cmd+V, Cmd+X)
            CommandGroup(after: .pasteboard) { }

            CommandGroup(replacing: .newItem) {
                Button("New Tab") { appState.addTab() }
                    .keyboardShortcut("t")

                Button("Close Tab") { appState.closeTab(appState.activeTabId) }
                    .keyboardShortcut("w")
            }

            CommandMenu("View") {
                Button("Toggle Sidebar") { appState.toggleSidebar() }
                    .keyboardShortcut("j")
            }
        }
    }
}
