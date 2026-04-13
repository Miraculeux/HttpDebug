import SwiftUI

struct TabBarView: View {
    @EnvironmentObject var state: AppState

    var body: some View {
        HStack(spacing: 0) {
            Button(action: { state.toggleSidebar() }) {
                Image(systemName: state.sidebarVisible ? "sidebar.left" : "sidebar.leading")
                    .font(.body)
                    .foregroundColor(state.sidebarVisible ? .blue : .secondary)
                    .frame(width: 32, height: 28)
            }
            .buttonStyle(.plain)
            .help("Toggle sidebar (⌘J)")

            Divider()
                .frame(height: 16)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 0) {
                    ForEach(state.tabs) { tab in
                        tabButton(tab)
                    }
                }
            }

            Button(action: { state.addTab() }) {
                Image(systemName: "plus")
                    .font(.title3)
                    .foregroundColor(.secondary)
                    .frame(width: 36, height: 36)
            }
            .buttonStyle(.plain)
            .help("New tab (⌘T)")
        }
        .background(Color("surface900"))
    }

    private func tabButton(_ tab: RequestTab) -> some View {
        let isActive = tab.id == state.activeTabId

        return TabButtonView(tab: tab, isActive: isActive, state: state)
    }
}

struct TabButtonView: View {
    let tab: RequestTab
    let isActive: Bool
    @ObservedObject var state: AppState
    @State private var isHovered = false

    var body: some View {
        HStack(spacing: 4) {
            Text(tab.request.method.rawValue)
                .font(.system(.body, design: .monospaced).weight(.bold))
                .foregroundColor(methodColor(tab.request.method))

            Text(tab.displayName)
                .font(.body)
                .lineLimit(1)
                .frame(maxWidth: 140, alignment: .leading)

            if tab.isLoading {
                ProgressView()
                    .scaleEffect(0.5)
                    .frame(width: 12, height: 12)
            }

            Button(action: { state.closeTab(tab.id) }) {
                Image(systemName: "xmark")
                    .font(.system(size: 10))
                    .foregroundColor(.secondary.opacity(isHovered ? 0.8 : 0.5))
            }
            .buttonStyle(.plain)
            .opacity(isActive || isHovered ? 1 : 0)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(isActive ? Color("surface800") : (isHovered ? Color("surface800").opacity(0.5) : Color.clear))
        .overlay(alignment: .bottom) {
            if isActive {
                Rectangle().fill(.blue).frame(height: 2)
            }
        }
        .contentShape(Rectangle())
        .onTapGesture { state.selectTab(tab.id) }
        .onHover { hovering in
            isHovered = hovering
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
}
