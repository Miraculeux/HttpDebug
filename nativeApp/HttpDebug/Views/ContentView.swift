import SwiftUI

struct ContentView: View {
    @EnvironmentObject var state: AppState

    var body: some View {
        VStack(spacing: 0) {
            // Tab bar
            TabBarView()

            Divider()

            // URL bar (full width)
            UrlBarView()

            Divider()

            // Error display
            if let error = state.activeTab.error, !state.activeTab.isLoading {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.red)
                        .font(.body)
                    Text(error)
                        .font(.body)
                        .foregroundColor(.red)
                    Spacer()
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.red.opacity(0.05))
            }

            // Main split: sidebar + request + response
            HSplitView {
                // Sidebar
                if state.sidebarVisible {
                    SidebarView()
                        .frame(minWidth: 200, idealWidth: 250, maxWidth: 350)
                        .background(Color("surface900"))
                }

                // Request panel
                RequestView()
                    .frame(minWidth: 300)
                    .overlay(alignment: .leading) {
                        Rectangle().fill(Color.white.opacity(0.08)).frame(width: 1)
                    }

                // Response panel
                ResponseView()
                    .frame(minWidth: 300)
                    .overlay(alignment: .leading) {
                        Rectangle().fill(Color.white.opacity(0.08)).frame(width: 1)
                    }
            }
        }
        .background(Color("surface950"))
        .frame(minWidth: 1000, minHeight: 650)
    }
}
