import SwiftUI

struct SidebarView: View {
    @EnvironmentObject var state: AppState
    @State private var activeTab: SidebarTab = .collections
    @State private var showNewForm = false
    @State private var newName = ""
    @State private var expandedIds: Set<UUID> = []
    @State private var historySearch = ""
    @State private var historyScope: HistorySearchScope = .all

    enum SidebarTab: String, CaseIterable {
        case collections = "Collections"
        case history = "History"
    }

    var body: some View {
        VStack(spacing: 0) {
            // Tab bar
            HStack(spacing: 0) {
                ForEach(SidebarTab.allCases, id: \.self) { tab in
                    Button(action: { activeTab = tab }) {
                        HStack(spacing: 4) {
                            Text(tab.rawValue)
                            if tab == .history && !state.history.isEmpty {
                                Text("\(state.history.count)")
                                    .font(.system(size: 11))
                                    .padding(.horizontal, 4)
                                    .padding(.vertical, 1)
                                    .background(Color.gray.opacity(0.3))
                                    .cornerRadius(6)
                            }
                        }
                        .font(.body)
                        .fontWeight(.medium)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                        .foregroundColor(activeTab == tab ? .blue : .secondary)
                        .overlay(alignment: .bottom) {
                            if activeTab == tab {
                                Rectangle().fill(.blue).frame(height: 2)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .background(Color("surface900"))

            Divider()

            if activeTab == .collections {
                collectionsView
            } else {
                historyView
            }
        }
    }

    // MARK: - Collections

    @ViewBuilder
    private var collectionsView: some View {
        // Header
        HStack {
            Text("Collections").font(.body).fontWeight(.semibold).foregroundColor(.secondary)
            Spacer()
            Button(action: { showNewForm.toggle() }) {
                Image(systemName: "plus").font(.body)
            }.buttonStyle(.plain).foregroundColor(.secondary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)

        Divider()

        if showNewForm {
            VStack(spacing: 6) {
                TextField("Collection name", text: $newName)
                    .textFieldStyle(.plain)
                    .font(.body)
                    .padding(6)
                    .background(Color("surface800"))
                    .cornerRadius(4)

                HStack {
                    Button("Create") {
                        if !newName.isEmpty {
                            state.createCollection(name: newName)
                            newName = ""
                            showNewForm = false
                        }
                    }
                    .font(.body)
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)

                    Button("Cancel") {
                        showNewForm = false
                        newName = ""
                    }
                    .font(.body)
                    .controlSize(.small)
                }
            }
            .padding(8)
            Divider()
        }

        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                if state.collections.isEmpty {
                    Text("No collections yet.")
                        .font(.body)
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity)
                        .padding()
                } else {
                    ForEach(state.collections) { collection in
                        collectionRow(collection)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func collectionRow(_ collection: RequestCollection) -> some View {
        let expanded = expandedIds.contains(collection.id)

        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 6) {
                Button(action: { toggleExpand(collection.id) }) {
                    Image(systemName: expanded ? "chevron.down" : "chevron.right")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                }
                .buttonStyle(.plain)

                Text(collection.name)
                    .font(.body)
                    .lineLimit(1)
                    .onTapGesture { toggleExpand(collection.id) }

                Text("(\(collection.requests.count))")
                    .font(.body)
                    .foregroundColor(.secondary)

                Spacer()

                Button(action: { exportCollection(collection) }) {
                    Image(systemName: "square.and.arrow.up").font(.body)
                }
                .buttonStyle(.plain)
                .foregroundColor(.secondary)

                Button(action: {
                    state.deleteCollection(collection.id)
                }) {
                    Image(systemName: "trash").font(.body)
                }
                .buttonStyle(.plain)
                .foregroundColor(.secondary)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .contentShape(Rectangle())

            if expanded {
                ForEach(collection.requests) { saved in
                    HStack(spacing: 6) {
                        Text(saved.request.method.rawValue)
                            .font(.system(.body, design: .monospaced).weight(.bold))
                            .foregroundColor(methodColor(saved.request.method))
                            .frame(width: 45, alignment: .leading)

                        Text(saved.request.name.isEmpty ? saved.request.url : saved.request.name)
                            .font(.body)
                            .foregroundColor(.secondary)
                            .lineLimit(1)

                        Spacer()

                        Button(action: {
                            state.deleteFromCollection(collection.id, requestId: saved.id)
                        }) {
                            Image(systemName: "xmark").font(.system(size: 10))
                        }
                        .buttonStyle(.plain)
                        .foregroundColor(.secondary.opacity(0.5))
                    }
                    .padding(.leading, 30)
                    .padding(.trailing, 12)
                    .padding(.vertical, 4)
                    .contentShape(Rectangle())
                    .onTapGesture {
                        state.loadFromCollection(collection.id, requestId: saved.id)
                    }
                }
            }
        }
    }

    // MARK: - History

    @ViewBuilder
    private var historyView: some View {
        // Header
        HStack {
            Text("History").font(.body).fontWeight(.semibold).foregroundColor(.secondary)
            Spacer()
            if !state.history.isEmpty {
                Button("Clear all") { state.clearHistory() }
                    .font(.body)
                    .foregroundColor(.secondary)
                    .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)

        Divider()

        // Search
        if !state.history.isEmpty {
            VStack(spacing: 6) {
                TextField("Search history...", text: $historySearch)
                    .textFieldStyle(.plain)
                    .font(.body)
                    .padding(6)
                    .background(Color("surface800"))
                    .cornerRadius(4)

                HStack(spacing: 4) {
                    ForEach(HistorySearchScope.allCases, id: \.self) { scope in
                        Button(scope.rawValue) {
                            historyScope = scope
                        }
                        .font(.body)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(historyScope == scope ? Color.blue.opacity(0.2) : Color.clear)
                        .foregroundColor(historyScope == scope ? .blue : .secondary)
                        .cornerRadius(8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(historyScope == scope ? Color.blue : Color.gray.opacity(0.3), lineWidth: 1)
                        )
                    }
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            Divider()
        }

        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                if state.history.isEmpty {
                    Text("No history yet.")
                        .font(.body)
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity)
                        .padding()
                } else {
                    ForEach(groupedHistory, id: \.0) { label, entries in
                        Text(label)
                            .font(.system(.body, weight: .semibold))
                            .foregroundColor(.secondary.opacity(0.7))
                            .padding(.horizontal, 12)
                            .padding(.top, 10)
                            .padding(.bottom, 4)

                        ForEach(entries) { entry in
                            historyRow(entry)
                        }
                    }
                }
            }
        }
    }

    private var groupedHistory: [(String, [HistoryEntry])] {
        let entries = filteredHistory
        let calendar = Calendar.current
        let now = Date()
        let startOfToday = calendar.startOfDay(for: now)
        let startOfYesterday = calendar.date(byAdding: .day, value: -1, to: startOfToday)!
        let startOfWeek = calendar.date(byAdding: .day, value: -7, to: startOfToday)!
        let startOfMonth = calendar.date(byAdding: .month, value: -1, to: startOfToday)!

        var groups: [(String, [HistoryEntry])] = []
        var today: [HistoryEntry] = []
        var yesterday: [HistoryEntry] = []
        var thisWeek: [HistoryEntry] = []
        var thisMonth: [HistoryEntry] = []
        var older: [HistoryEntry] = []

        for entry in entries {
            if entry.timestamp >= startOfToday {
                today.append(entry)
            } else if entry.timestamp >= startOfYesterday {
                yesterday.append(entry)
            } else if entry.timestamp >= startOfWeek {
                thisWeek.append(entry)
            } else if entry.timestamp >= startOfMonth {
                thisMonth.append(entry)
            } else {
                older.append(entry)
            }
        }

        if !today.isEmpty { groups.append(("Today", today)) }
        if !yesterday.isEmpty { groups.append(("Yesterday", yesterday)) }
        if !thisWeek.isEmpty { groups.append(("This Week", thisWeek)) }
        if !thisMonth.isEmpty { groups.append(("This Month", thisMonth)) }
        if !older.isEmpty { groups.append(("Older", older)) }

        return groups
    }

    private var filteredHistory: [HistoryEntry] {
        guard !historySearch.isEmpty else { return state.history }
        let q = historySearch.lowercased()
        return state.history.filter { entry in
            let matchUrl = entry.request.url.lowercased().contains(q)
            let matchReq = matchUrl
                || entry.request.method.rawValue.lowercased().contains(q)
                || entry.request.name.lowercased().contains(q)
                || entry.request.body.content.lowercased().contains(q)
            let matchResp = entry.response.body.lowercased().contains(q)
                || String(entry.response.status).contains(q)

            switch historyScope {
            case .all: return matchReq || matchResp
            case .url: return matchUrl
            case .request: return matchReq
            case .response: return matchResp
            }
        }
    }

    @ViewBuilder
    private func historyRow(_ entry: HistoryEntry) -> some View {
        HStack(spacing: 6) {
            Text(entry.request.method.rawValue)
                .font(.system(.body, design: .monospaced).weight(.bold))
                .foregroundColor(methodColor(entry.request.method))
                .frame(width: 45, alignment: .leading)

            VStack(alignment: .leading, spacing: 2) {
                Text(entry.request.url)
                    .font(.body)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    Text("\(entry.response.status)")
                        .font(.system(.body, weight: .medium))
                        .foregroundColor(statusColor(entry.response.status))

                    Text(relativeTime(entry.timestamp))
                        .font(.body)
                        .foregroundColor(.secondary.opacity(0.6))
                }
            }

            Spacer()

            Button(action: { state.openInNewTab(entry) }) {
                Image(systemName: "arrow.up.right.square").font(.body)
            }
            .buttonStyle(.plain)
            .foregroundColor(.secondary.opacity(0.5))
            .help("Open in new tab")

            Button(action: { state.deleteHistoryEntry(entry.id) }) {
                Image(systemName: "xmark").font(.system(size: 11))
            }
            .buttonStyle(.plain)
            .foregroundColor(.secondary.opacity(0.5))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 5)
        .contentShape(Rectangle())
        .onTapGesture { state.loadFromHistory(entry) }
    }

    // MARK: - Helpers

    private func toggleExpand(_ id: UUID) {
        if expandedIds.contains(id) { expandedIds.remove(id) }
        else { expandedIds.insert(id) }
    }

    private func exportCollection(_ collection: RequestCollection) {
        guard let data = state.exportCollection(collection.id) else { return }
        let panel = NSSavePanel()
        panel.allowedContentTypes = [.json]
        panel.nameFieldStringValue = "\(collection.name).json"
        if panel.runModal() == .OK, let url = panel.url {
            try? data.write(to: url)
        }
    }

    private func methodColor(_ method: HttpMethod) -> Color {
        switch method {
        case .GET: return .green
        case .POST: return .yellow
        case .PUT: return .blue
        case .PATCH: return .purple
        case .DELETE: return .red
        case .HEAD: return .cyan
        case .OPTIONS: return .pink
        case .TRACE: return .orange
        }
    }

    private func statusColor(_ code: Int) -> Color {
        switch code {
        case ..<200: return .blue
        case ..<300: return .green
        case ..<400: return .yellow
        case ..<500: return .orange
        default: return .red
        }
    }

    private func relativeTime(_ date: Date) -> String {
        let diff = Date().timeIntervalSince(date)
        if diff < 60 { return "just now" }
        if diff < 3600 { return "\(Int(diff / 60))m ago" }
        if diff < 86400 { return "\(Int(diff / 3600))h ago" }
        let fmt = DateFormatter()
        fmt.dateFormat = "MMM d"
        return fmt.string(from: date)
    }
}
