import Foundation
import SwiftUI

enum LoadState: Equatable {
    case idle
    case loading(String)
    case ready
    case failed(String)
}

@MainActor
final class AppState: ObservableObject {
    @Published var creds: XtreamCreds?
    @Published var catalog = Catalog()
    @Published var state: LoadState = .idle

    private let credsKey = "livebox.xtreamCreds"

    init() {
        if let data = UserDefaults.standard.data(forKey: credsKey),
           let saved = try? JSONDecoder().decode(XtreamCreds.self, from: data) {
            self.creds = saved
            Task { await self.loadCatalog() }
        }
    }

    func login(m3uUrl: String) async {
        let trimmed = m3uUrl.trimmingCharacters(in: .whitespaces)
        guard let parsed = Self.parseXtreamUrl(trimmed) else {
            state = .failed("That doesn’t look like an Xtream M3U URL. Expected something like http://host/get.php?username=…&password=…")
            return
        }
        self.creds = parsed
        await loadCatalog()
        if case .ready = state {
            if let data = try? JSONEncoder().encode(parsed) {
                UserDefaults.standard.set(data, forKey: credsKey)
            }
        }
    }

    static func parseXtreamUrl(_ url: String) -> XtreamCreds? {
        guard let comps = URLComponents(string: url),
              let scheme = comps.scheme, let host = comps.host,
              comps.path.hasSuffix("get.php"),
              let items = comps.queryItems else { return nil }
        let username = items.first(where: { $0.name == "username" })?.value
        let password = items.first(where: { $0.name == "password" })?.value
        guard let username, let password, !username.isEmpty, !password.isEmpty else { return nil }
        var base = "\(scheme)://\(host)"
        if let port = comps.port { base += ":\(port)" }
        return XtreamCreds(baseUrl: base, username: username, password: password)
    }

    func logout() {
        creds = nil
        catalog = Catalog()
        state = .idle
        UserDefaults.standard.removeObject(forKey: credsKey)
    }

    func loadCatalog() async {
        guard let creds else { return }
        state = .loading("Connecting to \(URL(string: creds.baseUrl)?.host ?? creds.baseUrl)…")
        do {
            let client = XtreamClient(creds: creds)
            let cat = try await client.fetchCatalog()
            catalog = cat
            state = .ready
        } catch {
            state = .failed("Couldn’t load catalog: \(error.localizedDescription)")
        }
    }
}
