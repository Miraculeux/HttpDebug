import Foundation

actor HttpClient {

    func send(_ request: HttpRequest, settings: AppSettings) async throws -> HttpResponse {
        guard let url = buildURL(request) else {
            throw HttpError.invalidURL(request.url)
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = request.method.rawValue
        urlRequest.timeoutInterval = settings.timeout

        // Default headers
        for h in settings.defaultHeaders where h.enabled && !h.key.isEmpty {
            urlRequest.setValue(h.value, forHTTPHeaderField: h.key)
        }

        // Request headers
        for h in request.headers where h.enabled && !h.key.isEmpty {
            urlRequest.setValue(h.value, forHTTPHeaderField: h.key)
        }

        // Auth
        applyAuth(request.auth, to: &urlRequest)

        // Body
        applyBody(request.body, to: &urlRequest)

        // Session config
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = settings.timeout
        config.timeoutIntervalForResource = settings.timeout * 2

        if !settings.validateSSL {
            // SSL validation is handled via delegate
        }

        let delegate = settings.validateSSL ? nil : InsecureSessionDelegate()
        let session = URLSession(configuration: config, delegate: delegate, delegateQueue: nil)

        let start = CFAbsoluteTimeGetCurrent()

        do {
            let (data, response) = try await session.data(for: urlRequest)
            let elapsed = Int((CFAbsoluteTimeGetCurrent() - start) * 1000)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw HttpError.invalidResponse
            }

            let headers: [String: String] = Dictionary(
                httpResponse.allHeaderFields.compactMap { key, value -> (String, String)? in
                    guard let k = key as? String, let v = value as? String else { return nil }
                    return (k, v)
                },
                uniquingKeysWith: { _, last in last }
            )

            let bodyString = String(data: data, encoding: .utf8) ?? String(data: data, encoding: .ascii) ?? "<binary data>"

            return HttpResponse(
                status: httpResponse.statusCode,
                statusText: HTTPURLResponse.localizedString(forStatusCode: httpResponse.statusCode),
                headers: headers,
                body: bodyString,
                time: elapsed,
                size: data.count
            )
        } catch let error as HttpError {
            throw error
        } catch {
            throw HttpError.networkError(error.localizedDescription)
        }
    }

    // MARK: - URL Building

    private func buildURL(_ request: HttpRequest) -> URL? {
        guard var components = URLComponents(string: request.url) else { return nil }

        let enabledParams = request.params.filter { $0.enabled && !$0.key.isEmpty }
        if !enabledParams.isEmpty {
            var items = components.queryItems ?? []
            for p in enabledParams {
                items.append(URLQueryItem(name: p.key, value: p.value))
            }
            components.queryItems = items
        }

        return components.url
    }

    // MARK: - Auth

    private func applyAuth(_ auth: AuthConfig, to request: inout URLRequest) {
        switch auth.type {
        case .none:
            break
        case .basic:
            let cred = "\(auth.basicUsername):\(auth.basicPassword)"
            if let data = cred.data(using: .utf8) {
                request.setValue("Basic \(data.base64EncodedString())", forHTTPHeaderField: "Authorization")
            }
        case .bearer:
            let prefix = auth.bearerPrefix.isEmpty ? "Bearer" : auth.bearerPrefix
            request.setValue("\(prefix) \(auth.bearerToken)", forHTTPHeaderField: "Authorization")
        case .apiKey:
            if auth.apiKeyAddTo == "header" {
                request.setValue(auth.apiKeyValue, forHTTPHeaderField: auth.apiKeyKey)
            }
            // Query params handled in URL building would need additional logic
        case .oauth2:
            if !auth.oauth2Token.isEmpty {
                request.setValue("Bearer \(auth.oauth2Token)", forHTTPHeaderField: "Authorization")
            }
        case .digest:
            let cred = "\(auth.digestUsername):\(auth.digestPassword)"
            if let data = cred.data(using: .utf8) {
                request.setValue("Basic \(data.base64EncodedString())", forHTTPHeaderField: "Authorization")
            }
        }
    }

    // MARK: - Body

    private func applyBody(_ body: RequestBody, to request: inout URLRequest) {
        switch body.type {
        case .none:
            break
        case .json:
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = body.content.data(using: .utf8)
        case .raw:
            request.setValue("text/plain", forHTTPHeaderField: "Content-Type")
            request.httpBody = body.content.data(using: .utf8)
        case .formData:
            let boundary = UUID().uuidString
            request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
            var data = Data()
            for field in body.formData where field.enabled && !field.key.isEmpty {
                data.append("--\(boundary)\r\n".data(using: .utf8)!)
                data.append("Content-Disposition: form-data; name=\"\(field.key)\"\r\n\r\n".data(using: .utf8)!)
                data.append("\(field.value)\r\n".data(using: .utf8)!)
            }
            data.append("--\(boundary)--\r\n".data(using: .utf8)!)
            request.httpBody = data
        case .urlEncoded:
            request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
            let encoded = body.formData
                .filter { $0.enabled && !$0.key.isEmpty }
                .map { "\($0.key.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? $0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? $0.value)" }
                .joined(separator: "&")
            request.httpBody = encoded.data(using: .utf8)
        }
    }
}

// MARK: - Errors

enum HttpError: LocalizedError {
    case invalidURL(String)
    case invalidResponse
    case networkError(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL(let url): return "Invalid URL: \(url)"
        case .invalidResponse: return "Invalid response from server"
        case .networkError(let msg): return msg
        }
    }
}

// MARK: - Insecure SSL Delegate

final class InsecureSessionDelegate: NSObject, URLSessionDelegate {
    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        if challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
           let trust = challenge.protectionSpace.serverTrust {
            completionHandler(.useCredential, URLCredential(trust: trust))
        } else {
            completionHandler(.performDefaultHandling, nil)
        }
    }
}
