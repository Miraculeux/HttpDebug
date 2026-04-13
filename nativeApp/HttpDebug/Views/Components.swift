import SwiftUI
import AppKit

// MARK: - Editable Text View (supports Cmd+A)

struct EditableTextView: NSViewRepresentable {
    @Binding var text: String
    let font: NSFont

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeNSView(context: Context) -> NSScrollView {
        let textView = FocusableEditableTextView()
        textView.isEditable = true
        textView.isSelectable = true
        textView.isRichText = false
        textView.font = font
        textView.textColor = .labelColor
        textView.backgroundColor = .clear
        textView.drawsBackground = false
        textView.textContainerInset = NSSize(width: 4, height: 4)
        textView.textContainer?.lineFragmentPadding = 0
        textView.isVerticallyResizable = true
        textView.isHorizontallyResizable = false
        textView.textContainer?.widthTracksTextView = true
        textView.autoresizingMask = [.width]
        textView.allowsUndo = true
        textView.isAutomaticQuoteSubstitutionEnabled = false
        textView.isAutomaticDashSubstitutionEnabled = false
        textView.isAutomaticTextReplacementEnabled = false
        textView.delegate = context.coordinator

        let scrollView = NSScrollView()
        scrollView.documentView = textView
        scrollView.hasVerticalScroller = true
        scrollView.hasHorizontalScroller = false
        scrollView.drawsBackground = false
        scrollView.borderType = .noBorder
        scrollView.autohidesScrollers = true

        return scrollView
    }

    func updateNSView(_ scrollView: NSScrollView, context: Context) {
        guard let textView = scrollView.documentView as? NSTextView else { return }
        if textView.string != text {
            let selectedRanges = textView.selectedRanges
            textView.string = text
            textView.font = font
            textView.selectedRanges = selectedRanges
        }
    }

    class Coordinator: NSObject, NSTextViewDelegate {
        var parent: EditableTextView

        init(_ parent: EditableTextView) {
            self.parent = parent
        }

        func textDidChange(_ notification: Notification) {
            guard let textView = notification.object as? NSTextView else { return }
            parent.text = textView.string
        }
    }
}

class FocusableEditableTextView: NSTextView {
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
            case "v":
                paste(nil)
                return true
            case "x":
                cut(nil)
                return true
            case "z":
                if event.modifierFlags.contains(.shift) {
                    undoManager?.redo()
                } else {
                    undoManager?.undo()
                }
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

struct KeyValueEditorView: View {
    @Binding var items: [KeyValuePair]
    var keyPlaceholder: String = "Key"
    var valuePlaceholder: String = "Value"

    var body: some View {
        VStack(spacing: 4) {
            ForEach($items) { $item in
                HStack(spacing: 6) {
                    Toggle("", isOn: $item.enabled)
                        .toggleStyle(.checkbox)
                        .labelsHidden()

                    TextField(keyPlaceholder, text: $item.key)
                        .textFieldStyle(.plain)
                        .font(.system(.body, design: .monospaced))
                        .padding(6)
                        .background(Color("surface800"))
                        .cornerRadius(4)

                    TextField(valuePlaceholder, text: $item.value)
                        .textFieldStyle(.plain)
                        .font(.system(.body, design: .monospaced))
                        .padding(6)
                        .background(Color("surface800"))
                        .cornerRadius(4)

                    Button(action: { items.removeAll { $0.id == item.id } }) {
                        Image(systemName: "xmark")
                            .font(.body)
                            .foregroundColor(.secondary)
                    }
                    .buttonStyle(.plain)
                }
                .opacity(item.enabled ? 1 : 0.5)
            }

            Button(action: { items.append(KeyValuePair()) }) {
                HStack {
                    Image(systemName: "plus")
                    Text("Add")
                }
                .font(.body)
                .foregroundColor(.secondary)
            }
            .buttonStyle(.plain)
            .padding(.top, 4)
        }
    }
}

// MARK: - Auth Panel

struct AuthPanelView: View {
    @Binding var auth: AuthConfig

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Picker("Auth Type", selection: $auth.type) {
                ForEach(AuthType.allCases, id: \.self) { type in
                    Text(type.label).tag(type)
                }
            }
            .pickerStyle(.segmented)
            .labelsHidden()

            switch auth.type {
            case .none:
                Text("No authentication").font(.body).foregroundColor(.secondary)
            case .basic:
                LabeledField("Username", text: $auth.basicUsername)
                LabeledField("Password", text: $auth.basicPassword, secure: true)
            case .bearer:
                LabeledField("Prefix", text: $auth.bearerPrefix)
                LabeledField("Token", text: $auth.bearerToken, multiline: true)
            case .apiKey:
                LabeledField("Key", text: $auth.apiKeyKey)
                LabeledField("Value", text: $auth.apiKeyValue)
                Picker("Add to", selection: $auth.apiKeyAddTo) {
                    Text("Header").tag("header")
                    Text("Query").tag("query")
                }
                .pickerStyle(.segmented)
            case .oauth2:
                LabeledField("Access Token", text: $auth.oauth2Token, multiline: true)
            case .digest:
                LabeledField("Username", text: $auth.digestUsername)
                LabeledField("Password", text: $auth.digestPassword, secure: true)
            }
        }
    }
}

struct LabeledField: View {
    let label: String
    @Binding var text: String
    var secure: Bool = false
    var multiline: Bool = false

    init(_ label: String, text: Binding<String>, secure: Bool = false, multiline: Bool = false) {
        self.label = label
        self._text = text
        self.secure = secure
        self.multiline = multiline
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label).font(.body).foregroundColor(.secondary)
            if secure {
                SecureField("", text: $text)
                    .textFieldStyle(.plain)
                    .font(.system(.body, design: .monospaced))
                    .padding(6)
                    .background(Color("surface800"))
                    .cornerRadius(4)
            } else if multiline {
                EditableTextView(
                    text: $text,
                    font: NSFont.monospacedSystemFont(ofSize: 13, weight: .regular)
                )
                .background(Color("surface800"))
                .cornerRadius(4)
                .frame(minHeight: 80, maxHeight: 120)
            } else {
                TextField("", text: $text)
                    .textFieldStyle(.plain)
                    .font(.system(.body, design: .monospaced))
                    .padding(6)
                    .background(Color("surface800"))
                    .cornerRadius(4)
            }
        }
    }
}

// MARK: - Body Editor

struct BodyEditorView: View {
    @Binding var requestBody: RequestBody

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                ForEach(BodyType.allCases, id: \.self) { type in
                    Button(type.label) {
                        self.requestBody.type = type
                    }
                    .font(.body)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(self.requestBody.type == type ? Color.blue.opacity(0.2) : Color.clear)
                    .foregroundColor(self.requestBody.type == type ? .blue : .secondary)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(self.requestBody.type == type ? Color.blue : Color.gray.opacity(0.3), lineWidth: 1)
                    )
                }
                Spacer()

                if self.requestBody.type == .json {
                    Button(action: { formatJSON() }) {
                        Text("Format")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color.gray.opacity(0.1))
                            .cornerRadius(4)
                    }
                    .buttonStyle(.plain)
                }
            }

            switch self.requestBody.type {
            case .none:
                Text("This request does not have a body.")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .italic()
                Spacer()
            case .json, .raw:
                EditableTextView(
                    text: $requestBody.content,
                    font: NSFont.monospacedSystemFont(ofSize: 13, weight: .regular)
                )
                .background(Color("surface800"))
                .cornerRadius(6)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            case .formData, .urlEncoded:
                KeyValueEditorView(
                    items: $requestBody.formData,
                    keyPlaceholder: "Field name",
                    valuePlaceholder: "Field value"
                )
                Spacer()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func formatJSON() {
        guard let data = requestBody.content.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data, options: .fragmentsAllowed),
              let pretty = try? JSONSerialization.data(withJSONObject: json, options: [.prettyPrinted, .sortedKeys]),
              let str = String(data: pretty, encoding: .utf8) else { return }
        requestBody.content = str
    }
}

// MARK: - Settings View

struct SettingsView: View {
    @EnvironmentObject var state: AppState
    @Environment(\.dismiss) var dismiss
    @State private var draft: AppSettings

    init(settings: AppSettings) {
        _draft = State(initialValue: settings)
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Settings").font(.headline)
                Spacer()
                Button("Done") {
                    state.updateSettings(draft)
                    dismiss()
                }
                .keyboardShortcut(.return)
            }
            .padding()

            Divider()

            Form {
                Section("Request") {
                    HStack {
                        Text("Timeout (seconds)")
                        Spacer()
                        TextField("", value: $draft.timeout, format: .number)
                            .frame(width: 80)
                            .textFieldStyle(.roundedBorder)
                    }
                    Toggle("Follow Redirects", isOn: $draft.followRedirects)
                    Toggle("Validate SSL Certificates", isOn: $draft.validateSSL)
                }

                Section("Default Headers") {
                    KeyValueEditorView(
                        items: $draft.defaultHeaders,
                        keyPlaceholder: "Header name",
                        valuePlaceholder: "Header value"
                    )
                }
            }
            .formStyle(.grouped)
        }
        .frame(width: 500, height: 400)
    }
}
