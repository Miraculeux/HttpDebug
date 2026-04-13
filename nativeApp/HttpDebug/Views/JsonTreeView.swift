import SwiftUI

struct JsonTreeView: View {
    let value: Any
    var indent: Int = 0

    var body: some View {
        renderValue(value, indent: indent)
    }

    @ViewBuilder
    private func renderValue(_ value: Any, indent: Int) -> some View {
        if value is NSNull {
            Text("null").foregroundColor(.orange).font(.system(.body, design: .monospaced))
        } else if let bool = value as? Bool {
            Text(bool ? "true" : "false").foregroundColor(.orange).font(.system(.body, design: .monospaced))
        } else if let num = value as? NSNumber {
            Text("\(num)").foregroundColor(.purple).font(.system(.body, design: .monospaced))
        } else if let str = value as? String {
            Text("\"\(str)\"").foregroundColor(.green).font(.system(.body, design: .monospaced))
        } else if let arr = value as? [Any] {
            JsonArrayView(array: arr, indent: indent)
        } else if let dict = value as? [String: Any] {
            JsonObjectView(dict: dict, indent: indent)
        } else {
            Text(String(describing: value)).font(.system(.body, design: .monospaced))
        }
    }
}

// MARK: - JSON Object

struct JsonObjectView: View {
    let dict: [String: Any]
    let indent: Int
    @State private var collapsed = false

    private var sortedKeys: [String] {
        dict.keys.sorted()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(spacing: 2) {
                Button(action: { collapsed.toggle() }) {
                    Image(systemName: collapsed ? "chevron.right" : "chevron.down")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                        .frame(width: 14)
                }
                .buttonStyle(.plain)

                Text("{").foregroundColor(.secondary).font(.system(.body, design: .monospaced))

                if collapsed {
                    Text("\(dict.count) keys")
                        .foregroundColor(.secondary)
                        .font(.system(.body, design: .monospaced))
                        .italic()
                    Text("}").foregroundColor(.secondary).font(.system(.body, design: .monospaced))
                }
            }

            if !collapsed {
                ForEach(sortedKeys, id: \.self) { key in
                    HStack(alignment: .top, spacing: 0) {
                        Text(String(repeating: "  ", count: indent + 1))
                            .font(.system(.body, design: .monospaced))
                        Text("\"\(key)\"")
                            .foregroundColor(.blue)
                            .font(.system(.body, design: .monospaced))
                        Text(": ")
                            .foregroundColor(.secondary)
                            .font(.system(.body, design: .monospaced))
                        JsonTreeView(value: dict[key]!, indent: indent + 1)
                    }
                }

                HStack(spacing: 0) {
                    Text(String(repeating: "  ", count: indent))
                        .font(.system(.body, design: .monospaced))
                    Text("}").foregroundColor(.secondary).font(.system(.body, design: .monospaced))
                }
            }
        }
    }
}

// MARK: - JSON Array

struct JsonArrayView: View {
    let array: [Any]
    let indent: Int
    @State private var collapsed = false

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(spacing: 2) {
                Button(action: { collapsed.toggle() }) {
                    Image(systemName: collapsed ? "chevron.right" : "chevron.down")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                        .frame(width: 14)
                }
                .buttonStyle(.plain)

                Text("[").foregroundColor(.secondary).font(.system(.body, design: .monospaced))

                if collapsed {
                    Text("\(array.count) items")
                        .foregroundColor(.secondary)
                        .font(.system(.body, design: .monospaced))
                        .italic()
                    Text("]").foregroundColor(.secondary).font(.system(.body, design: .monospaced))
                }
            }

            if !collapsed {
                ForEach(0..<array.count, id: \.self) { index in
                    HStack(alignment: .top, spacing: 0) {
                        Text(String(repeating: "  ", count: indent + 1))
                            .font(.system(.body, design: .monospaced))
                        JsonTreeView(value: array[index], indent: indent + 1)
                        if index < array.count - 1 {
                            Text(",").foregroundColor(.secondary).font(.system(.body, design: .monospaced))
                        }
                    }
                }

                HStack(spacing: 0) {
                    Text(String(repeating: "  ", count: indent))
                        .font(.system(.body, design: .monospaced))
                    Text("]").foregroundColor(.secondary).font(.system(.body, design: .monospaced))
                }
            }
        }
    }
}

// MARK: - Parse Helper

func parseJSON(_ string: String) -> Any? {
    guard let data = string.data(using: .utf8) else { return nil }
    return try? JSONSerialization.jsonObject(with: data, options: .fragmentsAllowed)
}
