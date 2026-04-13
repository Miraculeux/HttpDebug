import SwiftUI

@MainActor
class AppState: ObservableObject {
    // Tabs
    @Published var tabs: [RequestTab] = [RequestTab()]
    @Published var activeTabId: UUID

    // Collections
    @Published var collections: [RequestCollection] = []

    // History
    @Published var history: [HistoryEntry] = []

    // Settings
    @Published var settings: AppSettings = AppSettings()
    @Published var showSettings = false

    // UI
    @Published var sidebarVisible = true

    private let httpClient = HttpClient()
    private let storage = StorageManager.shared

    init() {
        let tab = RequestTab()
        self.tabs = [tab]
        self.activeTabId = tab.id
        loadAll()
    }

    // MARK: - Active Tab

    var activeTab: RequestTab {
        get { tabs.first { $0.id == activeTabId } ?? tabs[0] }
        set {
            if let idx = tabs.firstIndex(where: { $0.id == activeTabId }) {
                tabs[idx] = newValue
            }
        }
    }

    var currentRequest: Binding<HttpRequest> {
        Binding(
            get: { self.activeTab.request },
            set: { self.activeTab.request = $0 }
        )
    }

    // MARK: - Tab Actions

    func addTab() {
        let tab = RequestTab()
        tabs.append(tab)
        activeTabId = tab.id
    }

    func closeTab(_ id: UUID) {
        if tabs.count == 1 {
            let tab = RequestTab()
            tabs = [tab]
            activeTabId = tab.id
            return
        }
        let idx = tabs.firstIndex { $0.id == id } ?? 0
        tabs.removeAll { $0.id == id }
        if activeTabId == id {
            activeTabId = tabs[min(idx, tabs.count - 1)].id
        }
    }

    func selectTab(_ id: UUID) {
        activeTabId = id
    }

    // MARK: - Send Request

    func sendRequest() {
        let tabId = activeTabId
        let request = activeTab.request
        let settings = self.settings

        guard !request.url.isEmpty else {
            activeTab.error = "URL is required"
            return
        }

        activeTab.isLoading = true
        activeTab.error = nil
        activeTab.response = nil

        Task {
            do {
                let response = try await httpClient.send(request, settings: settings)
                if let idx = tabs.firstIndex(where: { $0.id == tabId }) {
                    tabs[idx].response = response
                    tabs[idx].isLoading = false
                }
                // Auto-save to history
                let entry = HistoryEntry(request: request, response: response)
                history.insert(entry, at: 0)
                if history.count > 500 { history = Array(history.prefix(500)) }
                storage.saveHistory(history)
            } catch {
                if let idx = tabs.firstIndex(where: { $0.id == tabId }) {
                    tabs[idx].error = error.localizedDescription
                    tabs[idx].isLoading = false
                }
            }
        }
    }

    func resetRequest() {
        activeTab.request = HttpRequest()
        activeTab.response = nil
        activeTab.error = nil
    }

    // MARK: - Collections

    func loadAll() {
        collections = storage.listCollections()
        history = storage.loadHistory()
        settings = storage.loadSettings()
    }

    func createCollection(name: String) {
        let col = RequestCollection(name: name)
        collections.append(col)
        storage.saveCollection(col)
    }

    func deleteCollection(_ id: UUID) {
        collections.removeAll { $0.id == id }
        storage.deleteCollection(id)
    }

    func saveToCollection(_ collectionId: UUID) {
        guard let idx = collections.firstIndex(where: { $0.id == collectionId }) else { return }
        let saved = SavedRequest(request: activeTab.request, response: activeTab.response)
        collections[idx].requests.append(saved)
        collections[idx].updatedAt = Date()
        storage.saveCollection(collections[idx])
    }

    func loadFromCollection(_ collectionId: UUID, requestId: UUID) {
        guard let col = collections.first(where: { $0.id == collectionId }),
              let saved = col.requests.first(where: { $0.id == requestId }) else { return }
        activeTab.request = saved.request
        activeTab.response = saved.response
        activeTab.error = nil
    }

    func deleteFromCollection(_ collectionId: UUID, requestId: UUID) {
        guard let idx = collections.firstIndex(where: { $0.id == collectionId }) else { return }
        collections[idx].requests.removeAll { $0.id == requestId }
        storage.saveCollection(collections[idx])
    }

    func importCollection(_ data: Data) {
        if let col = storage.importCollection(from: data) {
            collections.append(col)
        }
    }

    func exportCollection(_ id: UUID) -> Data? {
        guard let col = collections.first(where: { $0.id == id }) else { return nil }
        return storage.exportCollection(col)
    }

    // MARK: - History

    func loadFromHistory(_ entry: HistoryEntry) {
        activeTab.request = entry.request
        activeTab.response = entry.response
        activeTab.error = nil
    }

    func openInNewTab(_ entry: HistoryEntry) {
        var tab = RequestTab()
        tab.request = entry.request
        tab.response = entry.response
        tabs.append(tab)
        activeTabId = tab.id
    }

    func deleteHistoryEntry(_ id: UUID) {
        history.removeAll { $0.id == id }
        storage.saveHistory(history)
    }

    func clearHistory() {
        history.removeAll()
        storage.clearHistory()
    }

    // MARK: - Settings

    func updateSettings(_ newSettings: AppSettings) {
        settings = newSettings
        storage.saveSettings(settings)
    }

    func toggleSidebar() {
        sidebarVisible.toggle()
    }
}
