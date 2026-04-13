import Foundation

// MARK: - HTTP Method

enum HttpMethod: String, CaseIterable, Codable {
    case GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS, TRACE

    var color: String {
        switch self {
        case .GET: return "green"
        case .POST: return "yellow"
        case .PUT: return "blue"
        case .PATCH: return "purple"
        case .DELETE: return "red"
        case .HEAD: return "cyan"
        case .OPTIONS: return "pink"
        case .TRACE: return "orange"
        }
    }
}

// MARK: - Key-Value Pair

struct KeyValuePair: Identifiable, Codable, Equatable {
    var id = UUID()
    var key: String = ""
    var value: String = ""
    var enabled: Bool = true
}

// MARK: - Auth

enum AuthType: String, CaseIterable, Codable {
    case none, basic, bearer, apiKey = "api-key", oauth2, digest
    var label: String {
        switch self {
        case .none: return "None"
        case .basic: return "Basic"
        case .bearer: return "Bearer"
        case .apiKey: return "API Key"
        case .oauth2: return "OAuth 2.0"
        case .digest: return "Digest"
        }
    }
}

struct AuthConfig: Codable, Equatable {
    var type: AuthType = .none
    var basicUsername: String = ""
    var basicPassword: String = ""
    var bearerToken: String = ""
    var bearerPrefix: String = "Bearer"
    var apiKeyKey: String = ""
    var apiKeyValue: String = ""
    var apiKeyAddTo: String = "header"
    var oauth2Token: String = ""
    var digestUsername: String = ""
    var digestPassword: String = ""
}

// MARK: - Body

enum BodyType: String, CaseIterable, Codable {
    case none, json, raw, formData = "form-data", urlEncoded = "x-www-form-urlencoded"
    var label: String {
        switch self {
        case .none: return "None"
        case .json: return "JSON"
        case .raw: return "Raw"
        case .formData: return "Form Data"
        case .urlEncoded: return "URL Encoded"
        }
    }
}

struct RequestBody: Codable, Equatable {
    var type: BodyType = .none
    var content: String = ""
    var formData: [KeyValuePair] = []
}

// MARK: - Request & Response

struct HttpRequest: Identifiable, Codable, Equatable {
    var id = UUID()
    var name: String = "New Request"
    var method: HttpMethod = .GET
    var url: String = ""
    var headers: [KeyValuePair] = []
    var params: [KeyValuePair] = []
    var body: RequestBody = RequestBody()
    var auth: AuthConfig = AuthConfig()
}

struct HttpResponse: Codable, Equatable {
    var status: Int
    var statusText: String
    var headers: [String: String]
    var body: String
    var time: Int // milliseconds
    var size: Int // bytes
}

// MARK: - Collection

struct SavedRequest: Identifiable, Codable {
    var id = UUID()
    var request: HttpRequest
    var response: HttpResponse?
    var createdAt: Date = Date()
    var updatedAt: Date = Date()
}

struct RequestCollection: Identifiable, Codable {
    var id = UUID()
    var name: String
    var description: String = ""
    var requests: [SavedRequest] = []
    var createdAt: Date = Date()
    var updatedAt: Date = Date()
}

// MARK: - History

struct HistoryEntry: Identifiable, Codable {
    var id = UUID()
    var request: HttpRequest
    var response: HttpResponse
    var timestamp: Date = Date()
}

// MARK: - Settings

struct AppSettings: Codable {
    var storagePath: String = ""
    var timeout: TimeInterval = 30
    var followRedirects: Bool = true
    var validateSSL: Bool = true
    var defaultHeaders: [KeyValuePair] = []
}

// MARK: - Tab

struct RequestTab: Identifiable {
    var id = UUID()
    var request: HttpRequest = HttpRequest()
    var response: HttpResponse? = nil
    var isLoading: Bool = false
    var error: String? = nil

    var displayName: String {
        if !request.url.isEmpty {
            let short = request.url
                .replacingOccurrences(of: "https://", with: "")
                .replacingOccurrences(of: "http://", with: "")
                .prefix(30)
            return "\(request.method.rawValue) \(short)"
        }
        return request.name
    }
}

// MARK: - Search

enum HistorySearchScope: String, CaseIterable {
    case all = "All"
    case url = "URL"
    case request = "Request"
    case response = "Response"
}
