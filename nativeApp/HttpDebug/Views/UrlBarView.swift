import SwiftUI

struct UrlBarView: View {
    @EnvironmentObject var state: AppState
    @State private var showSaveMenu = false

    var body: some View {
        HStack(spacing: 8) {
            // Method picker
            Picker("", selection: state.currentRequest.method) {
                ForEach(HttpMethod.allCases, id: \.self) { method in
                    Text(method.rawValue).tag(method)
                }
            }
            .labelsHidden()
            .frame(width: 90)

            // URL input
            TextField("https://api.example.com/endpoint", text: state.currentRequest.url)
                .textFieldStyle(.plain)
                .font(.system(.body, design: .monospaced))
                .padding(8)
                .background(Color("surface800"))
                .cornerRadius(8)
                .onSubmit { state.sendRequest() }

            // Send button
            Button(action: { state.sendRequest() }) {
                HStack(spacing: 4) {
                    if state.activeTab.isLoading {
                        ProgressView()
                            .scaleEffect(0.6)
                            .frame(width: 14, height: 14)
                        Text("Sending")
                    } else {
                        Text("Send")
                    }
                }
                .font(.system(.body, weight: .medium))
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
            }
            .buttonStyle(.borderedProminent)
            .disabled(state.activeTab.isLoading)
            .keyboardShortcut(.return, modifiers: .command)

            // Save to collection
            Menu {
                if state.collections.isEmpty {
                    Text("No collections yet")
                } else {
                    ForEach(state.collections) { col in
                        Button(col.name) {
                            state.saveToCollection(col.id)
                        }
                    }
                }
            } label: {
                Image(systemName: "square.and.arrow.down")
                    .font(.system(size: 14))
            }
            .menuStyle(.borderlessButton)
            .frame(width: 28)
            .help("Save to collection")

            // Reset
            Button(action: { state.resetRequest() }) {
                Image(systemName: "plus")
                    .font(.system(size: 14))
            }
            .buttonStyle(.plain)
            .foregroundColor(.secondary)
            .help("New request")
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Color("surface900").opacity(0.3))
    }
}
