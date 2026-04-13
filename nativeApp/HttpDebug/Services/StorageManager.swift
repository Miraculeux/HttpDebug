import Foundation

class StorageManager {
    static let shared = StorageManager()

    private let fileManager = FileManager.default
    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        e.outputFormatting = .prettyPrinted
        return e
    }()
    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }()

    private var storageDir: URL {
        let home = fileManager.homeDirectoryForCurrentUser
        let dir = home.appendingPathComponent(".httpdebug")
        try? fileManager.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    private var collectionsDir: URL {
        let dir = storageDir.appendingPathComponent("collections")
        try? fileManager.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    private var settingsFile: URL { storageDir.appendingPathComponent("settings.json") }
    private var historyFile: URL { storageDir.appendingPathComponent("history.json") }

    private let maxHistory = 500

    // MARK: - Settings

    func loadSettings() -> AppSettings {
        guard let data = try? Data(contentsOf: settingsFile),
              let settings = try? decoder.decode(AppSettings.self, from: data) else {
            return AppSettings()
        }
        return settings
    }

    func saveSettings(_ settings: AppSettings) {
        if let data = try? encoder.encode(settings) {
            try? data.write(to: settingsFile)
        }
    }

    // MARK: - Collections

    func listCollections() -> [RequestCollection] {
        guard let files = try? fileManager.contentsOfDirectory(
            at: collectionsDir, includingPropertiesForKeys: nil
        ) else { return [] }

        return files
            .filter { $0.pathExtension == "json" }
            .compactMap { url -> RequestCollection? in
                guard let data = try? Data(contentsOf: url),
                      let col = try? decoder.decode(RequestCollection.self, from: data) else { return nil }
                return col
            }
            .sorted { $0.createdAt < $1.createdAt }
    }

    func saveCollection(_ collection: RequestCollection) {
        let file = collectionsDir.appendingPathComponent("\(collection.id.uuidString).json")
        if let data = try? encoder.encode(collection) {
            try? data.write(to: file)
        }
    }

    func deleteCollection(_ id: UUID) {
        let file = collectionsDir.appendingPathComponent("\(id.uuidString).json")
        try? fileManager.removeItem(at: file)
    }

    func importCollection(from data: Data) -> RequestCollection? {
        guard var collection = try? decoder.decode(RequestCollection.self, from: data) else { return nil }
        collection.id = UUID() // New ID to avoid conflicts
        saveCollection(collection)
        return collection
    }

    func exportCollection(_ collection: RequestCollection) -> Data? {
        try? encoder.encode(collection)
    }

    // MARK: - History

    func loadHistory() -> [HistoryEntry] {
        guard let data = try? Data(contentsOf: historyFile),
              let entries = try? decoder.decode([HistoryEntry].self, from: data) else { return [] }
        return entries
    }

    func saveHistory(_ entries: [HistoryEntry]) {
        let trimmed = Array(entries.prefix(maxHistory))
        if let data = try? encoder.encode(trimmed) {
            try? data.write(to: historyFile)
        }
    }

    func clearHistory() {
        try? fileManager.removeItem(at: historyFile)
    }
}
