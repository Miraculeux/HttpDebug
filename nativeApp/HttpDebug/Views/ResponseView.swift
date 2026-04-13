import SwiftUI
import AppKit

// MARK: - Selectable Text View (supports Cmd+A)

struct SelectableText: NSViewRepresentable {
    let text: String
    let font: NSFont
    let textColor: NSColor

    func makeNSView(context: Context) -> NSScrollView {
        let textView = FocusableTextView()
        textView.isEditable = false
        textView.isSelectable = true
        textView.isRichText = false
        textView.font = font
        textView.textColor = textColor
        textView.backgroundColor = .clear
        textView.drawsBackground = false
        textView.textContainerInset = NSSize(width: 0, height: 0)
        textView.textContainer?.lineFragmentPadding = 0
        textView.isVerticallyResizable = true
        textView.isHorizontallyResizable = false
        textView.textContainer?.widthTracksTextView = true
        textView.autoresizingMask = [.width]
        textView.allowsUndo = false

        let scrollView = FocusableScrollView()
        scrollView.documentView = textView
        scrollView.hasVerticalScroller = true
        scrollView.hasHorizontalScroller = false
        scrollView.drawsBackground = false
        scrollView.borderType = .noBorder
        scrollView.autohidesScrollers = true
        scrollView.contentView.postsBoundsChangedNotifications = true

        return scrollView
    }

    func updateNSView(_ scrollView: NSScrollView, context: Context) {
        guard let textView = scrollView.documentView as? NSTextView else { return }
        if textView.string != text {
            textView.string = text
            textView.font = font
            textView.textColor = textColor
        }
    }
}

class FocusableScrollView: NSScrollView {
    override var acceptsFirstResponder: Bool { true }

    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }

    override func mouseDown(with event: NSEvent) {
        if let textView = documentView as? NSTextView {
            window?.makeFirstResponder(textView)
        }
        super.mouseDown(with: event)
    }
}

class FocusableTextView: NSTextView {
    override var acceptsFirstResponder: Bool { true }

    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }

    override func performKeyEquivalent(with event: NSEvent) -> Bool {
        if event.modifierFlags.contains(.command) {
            switch event.charactersIgnoringModifiers {
            case "a":
                selectAll(nil)
                return true
            case "c":
                copy(nil)
                return true
            default:
                break
            }
        }
        return super.performKeyEquivalent(with: event)
    }

    override func mouseDown(with event: NSEvent) {
        window?.makeFirstResponder(self)
        super.mouseDown(with: event)
    }
}

struct ResponseView: View {
    @EnvironmentObject var state: AppState
    @State private var activeTab: ResponseTab = .body
    @State private var wordWrap = true
    @State private var rawView = false

    enum ResponseTab: String, CaseIterable {
        case body = "Body"
        case headers = "Headers"
    }

    var body: some View {
        let tab = state.activeTab

        VStack(spacing: 0) {
            // Panel header
            HStack(spacing: 6) {
                Image(systemName: "arrow.down.left.circle.fill")
                    .font(.body)
                    .foregroundColor(.green)
                Text("RESPONSE")
                    .font(.system(.body, weight: .semibold))
                    .foregroundColor(.secondary)
                Spacer()
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color("surface900"))

            Divider()

            if tab.isLoading {
                loadingView
            } else if let error = tab.error {
                errorView(error)
            } else if let response = tab.response {
                responseContent(response)
            } else {
                emptyView
            }
        }
    }

    // MARK: - States

    private var loadingView: some View {
        VStack(spacing: 12) {
            ProgressView()
                .scaleEffect(1.5)
            Text("Sending request...")
                .font(.body)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorView(_ error: String) -> some View {
        VStack(spacing: 8) {
            Image(systemName: "exclamationmark.triangle")
                .font(.title)
                .foregroundColor(.red)
            Text(error)
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 20)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var emptyView: some View {
        VStack(spacing: 8) {
            Image(systemName: "doc.text")
                .font(.title)
                .foregroundColor(.secondary.opacity(0.4))
            Text("Send a request to see the response")
                .font(.body)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Response Content

    private func responseContent(_ response: HttpResponse) -> some View {
        VStack(spacing: 0) {
            // Status bar
            HStack(spacing: 14) {
                Text("\(response.status) \(response.statusText)")
                    .font(.system(.body, weight: .bold))
                    .foregroundColor(statusColor(response.status))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(statusBg(response.status))
                    .cornerRadius(4)

                Text(formatTime(response.time))
                    .font(.body)
                    .foregroundColor(.secondary)

                Text(formatBytes(response.size))
                    .font(.body)
                    .foregroundColor(.secondary)

                Spacer()

                Button("Copy") {
                    NSPasteboard.general.clearContents()
                    NSPasteboard.general.setString(response.body, forType: .string)
                }
                .font(.body)
                .buttonStyle(.plain)
                .foregroundColor(.secondary)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color("surface900").opacity(0.5))

            Divider()

            // Tabs
            HStack(spacing: 0) {
                ForEach(ResponseTab.allCases, id: \.self) { tab in
                    Button(action: { activeTab = tab }) {
                        HStack(spacing: 4) {
                            Text(tab.rawValue)
                            if tab == .headers {
                                Text("\(response.headers.count)")
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

                if activeTab == .body {
                    Button(action: { rawView.toggle() }) {
                        Text(rawView ? "Tree" : "Raw")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color.gray.opacity(0.1))
                            .cornerRadius(4)
                    }
                    .buttonStyle(.plain)

                    Button(action: { wordWrap.toggle() }) {
                        Text("Wrap")
                            .font(.body)
                            .foregroundColor(wordWrap ? .blue : .secondary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(wordWrap ? Color.blue.opacity(0.1) : Color.clear)
                            .cornerRadius(4)
                    }
                    .buttonStyle(.plain)
                    .padding(.trailing, 8)
                }
            }

            Divider()

            // Content
            if activeTab == .body {
                bodyContent(response)
                    .padding(14)
            } else {
                GeometryReader { geo in
                    ScrollView([.horizontal, .vertical]) {
                        headersContent(response)
                            .padding(14)
                            .frame(minWidth: geo.size.width, minHeight: geo.size.height, alignment: .topLeading)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func bodyContent(_ response: HttpResponse) -> some View {
        if let parsed = parseJSON(response.body), !rawView {
            ScrollView {
                JsonTreeView(value: parsed)
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .topLeading)
            }
        } else {
            SelectableText(
                text: parseJSON(response.body).map { prettyPrintJSON($0) } ?? response.body,
                font: NSFont.monospacedSystemFont(ofSize: 13, weight: .regular),
                textColor: .labelColor
            )
            .padding(14)
        }
    }

    private func prettyPrintJSON(_ value: Any) -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: value, options: [.prettyPrinted, .sortedKeys]),
              let str = String(data: data, encoding: .utf8) else {
            return String(describing: value)
        }
        return str
    }

    private func headersContent(_ response: HttpResponse) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header row
            HStack {
                Text("Name")
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundColor(.secondary)
                    .frame(width: 200, alignment: .leading)
                Text("Value")
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundColor(.secondary)
            }
            .padding(.bottom, 6)

            Divider()

            ForEach(response.headers.sorted(by: { $0.key < $1.key }), id: \.key) { key, value in
                HStack(alignment: .top) {
                    Text(key)
                        .font(.system(.body, design: .monospaced))
                        .foregroundColor(.blue)
                        .frame(width: 200, alignment: .leading)

                    Text(value)
                        .font(.system(.body, design: .monospaced))
                        .foregroundColor(.primary.opacity(0.8))
                        .textSelection(.enabled)
                }
                .padding(.vertical, 3)

                Divider().opacity(0.3)
            }
        }
    }

    // MARK: - Helpers

    private func statusColor(_ code: Int) -> Color {
        switch code {
        case ..<200: return .blue
        case ..<300: return .green
        case ..<400: return .yellow
        case ..<500: return .orange
        default: return .red
        }
    }

    private func statusBg(_ code: Int) -> Color {
        statusColor(code).opacity(0.1)
    }

    private func formatTime(_ ms: Int) -> String {
        ms < 1000 ? "\(ms) ms" : String(format: "%.2f s", Double(ms) / 1000)
    }

    private func formatBytes(_ bytes: Int) -> String {
        if bytes < 1024 { return "\(bytes) B" }
        if bytes < 1024 * 1024 { return String(format: "%.1f KB", Double(bytes) / 1024) }
        return String(format: "%.1f MB", Double(bytes) / (1024 * 1024))
    }
}
