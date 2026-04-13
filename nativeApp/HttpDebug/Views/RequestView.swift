import SwiftUI

struct RequestView: View {
    @EnvironmentObject var state: AppState
    @State private var activeTab: RequestTab = .params

    enum RequestTab: String, CaseIterable {
        case params = "Params"
        case headers = "Headers"
        case body = "Body"
        case auth = "Auth"
    }

    var body: some View {
        VStack(spacing: 0) {
            // Panel header
            HStack(spacing: 6) {
                Image(systemName: "arrow.up.right.circle.fill")
                    .font(.body)
                    .foregroundColor(.blue)
                Text("REQUEST")
                    .font(.system(.body, weight: .semibold))
                    .foregroundColor(.secondary)
                Spacer()
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color("surface900"))

            Divider()

            // Tabs
            HStack(spacing: 0) {
                ForEach(RequestTab.allCases, id: \.self) { tab in
                    Button(action: { activeTab = tab }) {
                        HStack(spacing: 4) {
                            Text(tab.rawValue)
                            if let count = badgeCount(tab), count > 0 {
                                Text("\(count)")
                                    .font(.system(size: 11))
                                    .padding(.horizontal, 4)
                                    .padding(.vertical, 1)
                                    .background(Color.gray.opacity(0.3))
                                    .cornerRadius(6)
                            }
                        }
                        .font(.body)
                        .fontWeight(.medium)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .foregroundColor(activeTab == tab ? .blue : .secondary)
                        .overlay(alignment: .bottom) {
                            if activeTab == tab {
                                Rectangle().fill(.blue).frame(height: 2)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
                Spacer()
            }

            Divider()

            // Content
            if activeTab == .body {
                BodyEditorView(requestBody: state.currentRequest.body)
                    .padding(14)
            } else {
                ScrollView {
                    VStack(alignment: .leading) {
                        switch activeTab {
                        case .params:
                            KeyValueEditorView(
                                items: state.currentRequest.params,
                                keyPlaceholder: "Parameter name",
                                valuePlaceholder: "Parameter value"
                            )
                        case .headers:
                            KeyValueEditorView(
                                items: state.currentRequest.headers,
                                keyPlaceholder: "Header name",
                                valuePlaceholder: "Header value"
                            )
                        case .body:
                            EmptyView()
                        case .auth:
                            AuthPanelView(auth: state.currentRequest.auth)
                        }
                    }
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
    }

    private func badgeCount(_ tab: RequestTab) -> Int? {
        switch tab {
        case .params: return state.activeTab.request.params.filter(\.enabled).count
        case .headers: return state.activeTab.request.headers.filter(\.enabled).count
        default: return nil
        }
    }
}
